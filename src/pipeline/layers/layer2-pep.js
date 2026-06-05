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
 * Map position/dataset strings to our PEP tier classification.
 * Handles both OpenSanctions snake_case identifiers and natural-language
 * Wikidata position labels (e.g. "Prime Minister of Australia").
 */
function classifyPepPosition(datasets = [], positions = []) {
  const allText = [...datasets, ...positions].join(' ').toLowerCase();

  if (
    allText.includes('head_of_state') || allText.includes('head of state') ||
    allText.includes('prime_minister') || allText.includes('prime minister') ||
    allText.includes('president') || allText.includes('chancellor') ||
    allText.includes('premier') || allText.includes('head of government')
  ) {
    return PEP_RISK_TIERS.HEAD_OF_STATE;
  }
  if (
    allText.includes('minister') || allText.includes('senator') ||
    allText.includes('parliament') || allText.includes('congressman') ||
    allText.includes('member of') || allText.includes('deputy') ||
    allText.includes('secretary of state') || allText.includes('governor')
  ) {
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

// Maps ISO-3166 nationality codes to Wikidata country label substrings.
const NATIONALITY_COUNTRY_MAP = {
  AU: ['australia'], GB: ['united kingdom', 'great britain', 'england', 'scotland', 'wales'],
  US: ['united states'], NZ: ['new zealand'], CA: ['canada'], IE: ['ireland'],
  DE: ['germany'], FR: ['france'], IT: ['italy'], ES: ['spain'], NL: ['netherlands'],
  BE: ['belgium'], CH: ['switzerland'], AT: ['austria'], SE: ['sweden'],
  NO: ['norway'], DK: ['denmark'], FI: ['finland'], JP: ['japan'], CN: ['china'],
  IN: ['india'], SG: ['singapore'], HK: ['hong kong'], ZA: ['south africa'],
  BR: ['brazil'], MX: ['mexico'], RU: ['russia'], AE: ['united arab emirates'],
  SA: ['saudi arabia'], NG: ['nigeria'], KE: ['kenya'], PK: ['pakistan'],
  PH: ['philippines'], MY: ['malaysia'], TH: ['thailand'], ID: ['indonesia'],
  TR: ['turkey'], PL: ['poland'], PT: ['portugal'], GR: ['greece'],
  IL: ['israel'], EG: ['egypt'], MA: ['morocco'], QA: ['qatar'], KW: ['kuwait'],
};

/**
 * Returns true if the Wikidata country label matches the subject's nationality,
 * false if they conflict, null if we can't determine (missing data).
 */
function wikidataCountryMatchesNationality(wikidataCountry, subjectNationality) {
  if (!wikidataCountry || !subjectNationality) return null;
  const country = wikidataCountry.toLowerCase();
  const expected = NATIONALITY_COUNTRY_MAP[subjectNationality] || [];
  if (expected.length === 0) return null;
  return expected.some(c => country.includes(c));
}

/**
 * Wikidata query for politicians — free, no API key required.
 *
 * Two passes:
 *  1. Exact English label match → STRONG_MATCH (high confidence)
 *  2. First + last name both present → POSSIBLE_MATCH (needs review)
 *
 * Previous version used `wdt:P279* wd:Q30461` (subclass of head of government)
 * which fails for most political offices — they use P31 (instance of), not P279.
 * Now we match on politician occupation (Q82955) or any held position (P39).
 */
async function queryWikidata(subject) {
  const nameParts = subject.fullName.trim().split(/\s+/);
  const lastName  = nameParts[nameParts.length - 1].toLowerCase();
  const firstName = nameParts[0].toLowerCase();
  const fullNameLower = subject.fullName.toLowerCase();

  // Pass 1: exact label match + politician or any held office
  const exactQuery = `
    SELECT DISTINCT ?person ?personLabel ?positionLabel ?countryLabel ?birthDate WHERE {
      ?person wdt:P31 wd:Q5 .
      ?person rdfs:label "${subject.fullName}"@en .
      { ?person wdt:P39 ?position . }
      UNION
      { ?person wdt:P106/wdt:P279* wd:Q82955 . BIND(wd:Q82955 AS ?position) }
      OPTIONAL { ?person wdt:P569 ?birthDate }
      OPTIONAL { ?person wdt:P27 ?country }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 10
  `;

  // Pass 2: loose last-name match for politicians (catches name variants)
  const looseQuery = `
    SELECT DISTINCT ?person ?personLabel ?positionLabel ?countryLabel ?birthDate WHERE {
      ?person wdt:P31 wd:Q5 .
      ?person wdt:P106/wdt:P279* wd:Q82955 .
      ?person rdfs:label ?name .
      FILTER(LANG(?name) = "en")
      FILTER(CONTAINS(LCASE(?name), "${lastName}"))
      OPTIONAL { ?person wdt:P39 ?position }
      OPTIONAL { ?person wdt:P569 ?birthDate }
      OPTIONAL { ?person wdt:P27 ?country }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
    }
    LIMIT 20
  `;

  async function runSparql(query) {
    const response = await axios.get('https://query.wikidata.org/sparql', {
      params: { query, format: 'json' },
      headers: { 'User-Agent': 'ClearPath-KYC/1.0 (compliance screening tool)' },
      timeout: 25000,
    });
    return response.data?.results?.bindings || [];
  }

  try {
    // Run exact query first — only fall back to loose if it returns nothing.
    // Sequential avoids doubling SPARQL load on the free Wikidata endpoint.
    const exactBindings = await runSparql(exactQuery).catch(() => []);
    const looseBindings = exactBindings.length === 0
      ? await runSparql(looseQuery).catch(() => [])
      : [];

    // Collect all bindings, grouping multiple positions per person.
    // The earlier implementation deduped by entityId too early, dropping
    // e.g. "Prime Minister of Australia" in favour of the first binding ("MP").
    const byPerson = {};

    const collectBinding = (b, isExact) => {
      const entityId = b.person?.value?.split('/').pop();
      if (!entityId) return;
      if (!byPerson[entityId]) {
        byPerson[entityId] = {
          entityId,
          matchedName: b.personLabel?.value || '',
          positions: [],
          country: b.countryLabel?.value || null,
          birthDate: b.birthDate?.value?.slice(0, 10) || null,
          url: b.person?.value,
          isExact,
        };
      }
      const pos = b.positionLabel?.value;
      if (pos && !byPerson[entityId].positions.includes(pos)) {
        byPerson[entityId].positions.push(pos);
      }
    };

    exactBindings.forEach(b => collectBinding(b, true));

    // Loose results only supplement if exact pass found nothing
    if (exactBindings.length === 0) {
      looseBindings.forEach(b => collectBinding(b, false));
    }

    const subjectBirthYear = subject.dateOfBirth ? parseInt(subject.dateOfBirth.slice(0, 4)) : null;

    return Object.values(byPerson)
      .filter(p => {
        const n = p.matchedName.toLowerCase();
        return n.includes(firstName) && n.includes(lastName);
      })
      .map(p => {
        const nameMatch = p.matchedName.toLowerCase();
        const bothNamesPresent = nameMatch.includes(firstName) && nameMatch.includes(lastName);
        const pepClassification = classifyPepPosition([], p.positions);

        // ── Cross-reference: birth date ──────────────────────────────────────
        const wikidataBirthYear = p.birthDate ? parseInt(p.birthDate.slice(0, 4)) : null;

        // Discard if Wikidata birth year exists and clearly doesn't match subject
        if (wikidataBirthYear && subjectBirthYear) {
          if (Math.abs(wikidataBirthYear - subjectBirthYear) > 2) return null;
        }
        // Discard if this is clearly a historical figure and subject is alive today
        if (wikidataBirthYear && wikidataBirthYear < 1900) return null;

        // ── Cross-reference: nationality / country ───────────────────────────
        const countryMatch = wikidataCountryMatchesNationality(p.country, subject.nationality);
        // If we have both and they conflict, demote — don't discard (Wikidata country data is imperfect)
        const hasCountryMismatch = countryMatch === false;

        // ── Verdict ──────────────────────────────────────────────────────────
        // Exact name + no country conflict → STRONG_MATCH
        // Exact name + country mismatch → POSSIBLE_MATCH (different person, same name)
        // Both names present + no conflict → STRONG_MATCH
        // Anything else → POSSIBLE_MATCH
        let verdict;
        if ((p.isExact || bothNamesPresent) && !hasCountryMismatch) {
          verdict = 'STRONG_MATCH';
        } else {
          verdict = 'POSSIBLE_MATCH';
        }

        return {
          source: 'WIKIDATA',
          sourceName: 'Wikidata Political Positions',
          matchedName: p.matchedName,
          positions: p.positions,
          country: p.country,
          birthDate: p.birthDate,
          entityId: p.entityId,
          url: p.url,
          verdict,
          score: verdict === 'STRONG_MATCH' ? (p.isExact ? 0.95 : 0.8) : 0.55,
          pepClassification,
          _countryMismatch: hasCountryMismatch || undefined,
        };
      })
      .filter(Boolean);

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
