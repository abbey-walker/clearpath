/**
 * Layer 4 — Corporate & Ownership Intelligence
 *
 * Identifies corporate entities linked to the subject — directorships,
 * shareholdings, beneficial ownership, and associated jurisdictions.
 *
 * High-risk signals:
 * - Directorships in high-risk jurisdictions (BVI, Cayman, Panama, etc.)
 * - Multiple dissolved or struck-off companies
 * - Companies with opaque beneficial ownership structures
 * - Disqualified director status
 *
 * Sources:
 * - UK Companies House API (free, excellent data)
 * - OpenCorporates API (free tier)
 */

const axios = require('axios');
const { nameConfidence } = require('../resolvers/entityResolution');
const logger = require('../../utils/logger');

// Jurisdictions that add risk — not automatic disqualification, but a signal
const HIGH_RISK_JURISDICTIONS = new Set([
  'VG', // British Virgin Islands
  'KY', // Cayman Islands
  'PA', // Panama
  'BS', // Bahamas
  'BZ', // Belize
  'SC', // Seychelles
  'MU', // Mauritius
  'LI', // Liechtenstein
  'MC', // Monaco
  'AD', // Andorra
]);

const HIGH_RISK_JURISDICTION_NAMES = new Set([
  'british virgin islands', 'cayman islands', 'panama', 'bahamas',
  'belize', 'seychelles', 'mauritius', 'liechtenstein', 'monaco',
  'andorra', 'isle of man', 'jersey', 'guernsey',
]);

function isHighRiskJurisdiction(countryCode, countryName) {
  return HIGH_RISK_JURISDICTIONS.has((countryCode || '').toUpperCase()) ||
    HIGH_RISK_JURISDICTION_NAMES.has((countryName || '').toLowerCase());
}

/**
 * Companies House (UK) — director search.
 */
async function searchCompaniesHouse(subject) {
  try {
    const response = await axios.get(
      'https://api.company-information.service.gov.uk/search/officers',
      {
        params: { q: subject.fullName, items_per_page: 20 },
        timeout: 10000,
        // Companies House requires Basic Auth with API key as username, no password
        auth: { username: process.env.COMPANIES_HOUSE_API_KEY || '', password: '' },
      }
    );

    const officers = response.data?.items || [];

    const matched = officers.filter(officer => {
      const candidateName = officer.title || '';
      return nameConfidence(subject.fullName, candidateName) > 0.65;
    });

    // For each matched officer, get their appointment details
    const results = await Promise.all(matched.slice(0, 5).map(async officer => {
      let appointments = [];
      try {
        const appResponse = await axios.get(
          `https://api.company-information.service.gov.uk${officer.links?.officer?.appointments}`,
          {
            timeout: 8000,
            auth: { username: process.env.COMPANIES_HOUSE_API_KEY || '', password: '' },
          }
        );
        appointments = appResponse.data?.items || [];
      } catch (e) { /* skip */ }

      const active = appointments.filter(a => !a.resigned_on);
      const dissolved = appointments.filter(a =>
        a.appointed_to?.company_status === 'dissolved' ||
        a.appointed_to?.company_status === 'liquidation'
      );

      return {
        source: 'COMPANIES_HOUSE',
        sourceName: 'UK Companies House',
        officerName: officer.title,
        officerId: officer.links?.self?.split('/').pop(),
        totalAppointments: officer.appointment_count || appointments.length,
        activeAppointments: active.length,
        dissolvedOrLiquidated: dissolved.length,
        appointments: appointments.slice(0, 10).map(a => ({
          companyName: a.appointed_to?.company_name,
          companyNumber: a.appointed_to?.company_number,
          role: a.officer_role,
          appointedOn: a.appointed_on,
          resignedOn: a.resigned_on || null,
          status: a.appointed_to?.company_status,
          jurisdiction: 'GB',
        })),
        url: `https://find-and-update.company-information.service.gov.uk/officers/${officer.links?.self?.split('/').pop()}/appointments`,
      };
    }));

    return results;

  } catch (err) {
    if (err.response?.status === 401) {
      logger.warn('Companies House API key not set or invalid');
      return [];
    }
    logger.warn('Companies House search failed', { error: err.message });
    return [];
  }
}

/**
 * OpenCorporates — global company registry search.
 */
async function searchOpenCorporates(subject) {
  try {
    const params = {
      q: subject.fullName,
      per_page: 10,
    };
    if (process.env.OPENCORPORATES_API_KEY) {
      params.api_token = process.env.OPENCORPORATES_API_KEY;
    }

    const response = await axios.get(
      'https://api.opencorporates.com/v0.4/officers/search',
      { params, timeout: 10000 }
    );

    const officers = response.data?.results?.officers || [];

    return officers
      .filter(({ officer }) => nameConfidence(subject.fullName, officer.name || '') > 0.6)
      .map(({ officer }) => ({
        source: 'OPENCORPORATES',
        sourceName: 'OpenCorporates',
        officerName: officer.name,
        companyName: officer.company?.name,
        companyNumber: officer.company?.company_number,
        jurisdiction: officer.company?.jurisdiction_code,
        role: officer.position,
        startDate: officer.start_date,
        endDate: officer.end_date || null,
        isHighRiskJurisdiction: isHighRiskJurisdiction(officer.company?.jurisdiction_code, officer.company?.name),
        url: officer.opencorporates_url,
      }));

  } catch (err) {
    logger.warn('OpenCorporates search failed', { error: err.message });
    return [];
  }
}

/**
 * Check if subject is a disqualified director in the UK.
 */
async function checkDisqualifiedDirectors(subject) {
  try {
    const response = await axios.get(
      'https://api.company-information.service.gov.uk/search/disqualified-officers',
      {
        params: { q: subject.fullName },
        timeout: 8000,
        auth: { username: process.env.COMPANIES_HOUSE_API_KEY || '', password: '' },
      }
    );

    const disqualified = response.data?.items || [];

    return disqualified
      .filter(d => nameConfidence(subject.fullName, d.title || '') > 0.7)
      .map(d => ({
        source: 'COMPANIES_HOUSE_DISQUALIFIED',
        sourceName: 'UK Disqualified Directors Register',
        officerName: d.title,
        dateOfBirth: d.date_of_birth,
        disqualifiedFrom: d.disqualifications?.[0]?.disqualified_from,
        disqualifiedUntil: d.disqualifications?.[0]?.disqualified_until,
        reason: d.disqualifications?.[0]?.reason?.description_identifier,
        url: `https://find-and-update.company-information.service.gov.uk${d.links?.self}`,
        severity: 'CRITICAL',
        scoreBoost: 25,
      }));

  } catch (err) {
    logger.warn('Disqualified directors check failed', { error: err.message });
    return [];
  }
}

/**
 * Main Layer 4 runner.
 */
async function runCorporateLayer(subject) {
  logger.debug('Layer 4: Corporate intelligence started', { subject: subject.fullName });
  const startTime = Date.now();

  const [chResults, ocResults, disqualifiedResults] = await Promise.all([
    searchCompaniesHouse(subject),
    searchOpenCorporates(subject),
    checkDisqualifiedDirectors(subject),
  ]);

  const totalCompanies = chResults.reduce((sum, r) => sum + (r.totalAppointments || 0), 0) +
    ocResults.length;
  const highRiskJurisdictions = ocResults.filter(r => r.isHighRiskJurisdiction);
  const dissolvedCount = chResults.reduce((sum, r) => sum + (r.dissolvedOrLiquidated || 0), 0);
  const isDisqualified = disqualifiedResults.length > 0;

  // Score contribution
  let scoreContribution = 0;
  if (isDisqualified) scoreContribution += 25;
  if (highRiskJurisdictions.length > 0) scoreContribution += Math.min(15, highRiskJurisdictions.length * 5);
  if (dissolvedCount > 3) scoreContribution += 10;
  if (totalCompanies > 10) scoreContribution += 5; // Unusually high number of directorships
  scoreContribution = Math.min(scoreContribution, 25);

  const result = {
    layer: 'corporate',
    layerName: 'Corporate & Ownership Intelligence',
    durationMs: Date.now() - startTime,
    status: 'complete',

    totalLinkedCompanies: totalCompanies,
    highRiskJurisdictionCount: highRiskJurisdictions.length,
    dissolvedCompaniesCount: dissolvedCount,
    disqualifiedDirector: isDisqualified,

    companiesHouseResults: chResults,
    openCorporatesResults: ocResults,
    disqualifications: disqualifiedResults,

    scoreContribution,

    flags: [
      ...(isDisqualified ? ['DISQUALIFIED_DIRECTOR'] : []),
      ...(highRiskJurisdictions.length > 0 ? ['HIGH_RISK_JURISDICTION_EXPOSURE'] : []),
      ...(dissolvedCount > 3 ? ['MULTIPLE_DISSOLVED_COMPANIES'] : []),
      ...(totalCompanies > 10 ? ['UNUSUALLY_HIGH_DIRECTORSHIPS'] : []),
    ],

    summary: totalCompanies === 0
      ? 'No corporate links found in searched registries.'
      : `${totalCompanies} corporate link(s) found.${isDisqualified ? ' DISQUALIFIED DIRECTOR.' : ''}${highRiskJurisdictions.length > 0 ? ` ${highRiskJurisdictions.length} high-risk jurisdiction(s).` : ''}`,

    sourcesQueried: ['UK Companies House', 'OpenCorporates', 'UK Disqualified Directors Register'],
  };

  logger.debug('Layer 4: Complete', {
    durationMs: result.durationMs,
    companies: totalCompanies,
    flags: result.flags,
  });

  return result;
}

module.exports = { runCorporateLayer };
