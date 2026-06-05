/**
 * Layer 2 — Politically Exposed Persons (PEP)
 *
 * Identifies whether the subject is a PEP — a current or former government official,
 * senior political figure, or close associate/family member of one.
 *
 * A PEP is NOT automatically refused — but triggers enhanced due diligence requirements
 * under FATF guidelines and most national AML regulations.
 *
 * Primary source: OpenSanctions PEP dataset (covers 200+ jurisdictions)
 * Supplementary: Wikidata for heads of state and senior officials
 */

const axios = require('axios');
const logger = require('../../utils/logger');

// PEP position categories — used for risk sub-scoring
const PEP_RISK_TIERS = {
  // Tier 1 — Highest risk (direct political power + control of public funds)
  HEAD_OF_STATE: { tier: 1, label: 'Head of State / Government', riskBoost: 40 },
  SENIOR_POLITICIAN: { tier: 1, label: 'Senior Politician / Minister', riskBoost: 35 },
  SENIOR_MILITARY: { tier: 1, label: 'Senior Military Official', riskBoost: 30 },
  JUDICIARY: { tier: 1, label: 'Senior Judicial Official', riskBoost: 30 },

  // Tier 2 — Elevated risk
  REGIONAL_POLITICIAN: { tier: 2, label: 'Regional/Local Politician', riskBoost: 20 },
  SOE_EXECUTIVE: { tier: 2, label: 'State-Owned Enterprise Executive', riskBoost: 25 },
  INT_ORG_OFFICIAL: { tier: 2, label: 'International Organisation Official', riskBoost: 20 },
  DIPLOMAT: { tier: 2, label: 'Senior Diplomat / Ambassador', riskBoost: 20 },

  // Tier 3 — Family and close associates
  FAMILY_MEMBER: { tier: 3, label: 'Close Family Member of PEP', riskBoost: 15 },
  CLOSE_ASSOCIATE: { tier: 3, label: 'Known Close Associate of PEP', riskBoost: 15 },

  UNKNOWN: { tier: 2, label: 'Political Exposure (Classification Unknown)', riskBoost: 20 },
};

/**
 * Map OpenSanctions position/dataset strings to our PEP tier classification
 */
function classifyPepPosition(datasets = [], positions = []) {
  const allText = [...datasets, ...positions].join(' ').toLowerCase();

  if (allText.includes('head_of_state') || allText.includes('president') || allText.includes('prime_minister')) {
    return PEP_RISK_TIERS.HEAD_OF_STATE;
  }
  if (allText.includes('minister') || allText.includes('senator') || allText.includes('parliament')) {
    return PEP_RISK_TIERS.SENIOR_POLITICIAN;
  }
  if (allText.includes('military') || allText.includes('general') || allText.includes('admiral')) {
    return PEP_RISK_TIERS.SENIOR_MILITARY;
  }
  if (allText.includes('judge') || allText.includes('court') || allText.includes('judiciary')) {
    return PEP_RISK_TIERS.JUDICIARY;
  }
  if (allText.includes('ambassador') || allText.includes('diplomat')) {
    return PEP_RISK_TIERS.DIPLOMAT;
  }
  if (allText.includes('family') || allText.includes('spouse') || allText.includes('child')) {
    return PEP_RISK_TIERS.FAMILY_MEMBER;
  }
  if (allText.includes('associate')) {
    return PEP_RISK_TIERS.CLOSE_ASSOCIATE;
  }
  if (allText.includes('state_owned') || allText.includes('soe')) {
    return PEP_RISK_TIERS.SOE_EXECUTIVE;
  }
  return PEP_RISK_TIERS.UNKNOWN;
}

/**
 * Query OpenSanctions PEP dataset specifically.
 */
async function queryOpenSanctionsPep(subject) {
  const apiKey = process.env.OPEN_SANCTIONS_API_KEY;

  const payload = {
    queries: {
      subject: {
        schema: 'Person',
        properties: {
          name: [subject.fullName, ...(subject.aliases || [])].filter(Boolean),
          ...(subject.dateOfBirth ? { birthDate: [subject.dateOfBirth] } : {}),
          ...(subject.nationality ? { nationality: [subject.nationality] } : {}),
        }
      }
    }
  };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `ApiKey ${apiKey}`;

  try {
    // Use the 'peps' dataset specifically (not sanctions)
    const response = await axios.post(
      'https://api.opensanctions.org/match/peps',
      payload,
      { headers, timeout: 10000 }
    );

    const results = response.data?.responses?.subject?.results || [];

    return results
      .filter(r => r.score >= 0.5)
      .map(r => {
        const pepClass = classifyPepPosition(r.datasets || [], r.properties?.position || []);
        return {
          source: 'OPENSANCTIONS_PEP',
          sourceName: 'OpenSanctions PEP Dataset',
          matchedName: r.caption,
          score: r.score,
          datasets: r.datasets || [],
          positions: r.properties?.position || [],
          country: r.properties?.nationality?.[0] || r.properties?.country?.[0] || null,
          birthDate: r.properties?.birthDate?.[0] || null,
          pepClassification: pepClass,
          entityId: r.id,
          url: `https://www.opensanctions.org/entities/${r.id}/`,
          verdict: r.score >= 0.85 ? 'STRONG_MATCH' : 'POSSIBLE_MATCH',
        };
      });

  } catch (err) {
    if (err.response?.status === 402) {
      logger.warn('OpenSanctions PEP requires API key');
      return [];
    }
    logger.error('OpenSanctions PEP error', { error: err.message });
    return [];
  }
}

/**
 * Wikidata query for senior politicians — free, no API key required.
 * Uses SPARQL to find persons in political positions matching the name.
 */
async function queryWikidata(subject) {
  const nameParts = subject.fullName.split(' ');
  const lastName = nameParts[nameParts.length - 1];

  // SPARQL query: find humans with political positions whose name contains the subject's last name
  const sparqlQuery = `
    SELECT ?person ?personLabel ?positionLabel ?countryLabel ?birthDate WHERE {
      ?person wdt:P31 wd:Q5 .
      ?person wdt:P39 ?position .
      ?position wdt:P279* wd:Q30461 .
      ?person rdfs:label ?name .
      FILTER(CONTAINS(LCASE(?name), "${lastName.toLowerCase()}"))
      FILTER(LANG(?name) = "en")
      OPTIONAL { ?person wdt:P569 ?birthDate }
      OPTIONAL { ?person wdt:P27 ?country }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 10
  `;

  try {
    const response = await axios.get('https://query.wikidata.org/sparql', {
      params: { query: sparqlQuery, format: 'json' },
      headers: { 'User-Agent': 'ClearPath-KYC/1.0 (compliance screening tool)' },
      timeout: 8000,
    });

    const bindings = response.data?.results?.bindings || [];

    return bindings
      .filter(b => {
        // Basic name check against full subject name
        const wikidataName = b.personLabel?.value || '';
        const subjectName = subject.fullName.toLowerCase();
        return wikidataName.toLowerCase().includes(lastName.toLowerCase());
      })
      .map(b => ({
        source: 'WIKIDATA',
        sourceName: 'Wikidata Political Positions',
        matchedName: b.personLabel?.value,
        position: b.positionLabel?.value,
        country: b.countryLabel?.value,
        birthDate: b.birthDate?.value?.slice(0, 10) || null,
        entityId: b.person?.value?.split('/').pop(),
        url: b.person?.value,
        verdict: 'POSSIBLE_MATCH', // Wikidata matches always need human verification
        score: 0.6,
      }));

  } catch (err) {
    logger.warn('Wikidata query failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * Main Layer 2 runner.
 */
async function runPepLayer(subject) {
  logger.debug('Layer 2: PEP screening started', { subject: subject.fullName });
  const startTime = Date.now();

  const [openSanctionsHits, wikidataHits] = await Promise.all([
    queryOpenSanctionsPep(subject),
    queryWikidata(subject),
  ]);

  const allHits = [...openSanctionsHits, ...wikidataHits];
  const strongMatches = allHits.filter(h => h.verdict === 'STRONG_MATCH');
  const possibleMatches = allHits.filter(h => h.verdict === 'POSSIBLE_MATCH');
  const confirmed = strongMatches.length > 0;

  // Determine risk boost based on highest-tier PEP classification found
  let scoreContribution = 0;
  if (confirmed) {
    const classifications = strongMatches
      .filter(h => h.pepClassification)
      .map(h => h.pepClassification.riskBoost);
    scoreContribution = classifications.length > 0 ? Math.max(...classifications) : 30;
  } else if (possibleMatches.length > 0) {
    scoreContribution = 15; // Possible PEP — partial contribution pending review
  }

  const result = {
    layer: 'pep',
    layerName: 'Politically Exposed Person (PEP) Screening',
    durationMs: Date.now() - startTime,
    status: 'complete',

    pepConfirmed: confirmed,
    requiresReview: possibleMatches.length > 0,

    strongMatches,
    possibleMatches,
    scoreContribution,

    summary: confirmed
      ? `PEP CONFIRMED: Subject identified as a politically exposed person. Enhanced due diligence required.`
      : possibleMatches.length > 0
        ? `${possibleMatches.length} possible PEP match(es) identified. Manual verification recommended.`
        : 'No PEP status identified.',

    sourcesQueried: ['OpenSanctions PEP Dataset', 'Wikidata'],
    note: confirmed
      ? 'Being a PEP does not automatically disqualify a customer. It requires enhanced due diligence per FATF guidelines and most national AML regulations.'
      : null,
  };

  logger.debug('Layer 2: Complete', {
    durationMs: result.durationMs,
    pepConfirmed: result.pepConfirmed,
    hits: allHits.length,
  });

  return result;
}

module.exports = { runPepLayer };
