/**
 * Layer 3 — Adverse Media
 *
 * Scans news sources, regulatory enforcement actions, and insolvency records
 * for negative coverage of the subject.
 *
 * Sources:
 * - NewsAPI (general news — requires free API key)
 * - FCA Enforcement Actions (UK regulator — free, public)
 * - SEC Enforcement Actions (US regulator — EDGAR API, free)
 * - FinCEN Enforcement (US — public web)
 * - UK Insolvency Register (free API)
 *
 * The key challenge here is relevance scoring — a common name will return
 * hundreds of irrelevant articles. We apply keyword + context filtering.
 */

const axios = require('axios');
const { nameConfidence } = require('../resolvers/entityResolution');
const logger = require('../../utils/logger');

// Risk keywords — articles containing these are flagged as adverse media
const ADVERSE_KEYWORDS = {
  critical: [
    'money laundering', 'aml', 'sanctions', 'fraud', 'bribery', 'corruption',
    'terrorist financing', 'drug trafficking', 'human trafficking', 'ponzi',
    'embezzlement', 'extortion', 'criminal charges', 'indicted', 'convicted',
    'arrested', 'imprisoned', 'wire fraud', 'securities fraud',
  ],
  significant: [
    'investigated', 'investigation', 'regulatory action', 'fca fine', 'sec charges',
    'lawsuit', 'sued', 'civil penalty', 'enforcement action', 'banned', 'disqualified',
    'insolvency', 'bankruptcy', 'default', 'whistleblower', 'tax evasion',
  ],
  notable: [
    'controversy', 'misconduct', 'dismissed', 'fired', 'resigned under pressure',
    'probe', 'audit findings', 'reputational', 'allegation',
  ]
};

/**
 * Score an article's severity based on keyword presence.
 * Returns { severity: 'CRITICAL'|'SIGNIFICANT'|'NOTABLE', keywords: string[], scoreBoost: number }
 */
function scoreArticleSeverity(text) {
  const lowerText = text.toLowerCase();
  const foundCritical = ADVERSE_KEYWORDS.critical.filter(kw => lowerText.includes(kw));
  const foundSignificant = ADVERSE_KEYWORDS.significant.filter(kw => lowerText.includes(kw));
  const foundNotable = ADVERSE_KEYWORDS.notable.filter(kw => lowerText.includes(kw));

  if (foundCritical.length > 0) {
    return {
      severity: 'CRITICAL',
      keywords: foundCritical,
      scoreBoost: Math.min(30, 15 + foundCritical.length * 3)
    };
  }
  if (foundSignificant.length > 0) {
    return {
      severity: 'SIGNIFICANT',
      keywords: foundSignificant,
      scoreBoost: Math.min(20, 8 + foundSignificant.length * 2)
    };
  }
  if (foundNotable.length > 0) {
    return {
      severity: 'NOTABLE',
      keywords: foundNotable,
      scoreBoost: 5
    };
  }
  return null;
}

/**
 * Check if an article is likely about our subject (not just name collision).
 * Returns a relevance score 0–1.
 */
function articleRelevance(subject, articleText, articleTitle) {
  const fullText = `${articleTitle} ${articleText}`.toLowerCase();
  const subjectName = subject.fullName.toLowerCase();

  // Name presence check
  const nameParts = subjectName.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];

  // Full name appears in article
  if (fullText.includes(subjectName)) return 0.9;

  // Last name + first name both appear (possibly separated)
  if (fullText.includes(lastName) && fullText.includes(firstName)) return 0.75;

  // Last name only — less reliable
  if (fullText.includes(lastName)) return 0.4;

  return 0.1;
}

/**
 * Search NewsAPI for adverse media.
 */
async function searchNewsApi(subject) {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    logger.warn('NEWS_API_KEY not set — skipping NewsAPI search');
    return [];
  }

  // Build targeted query — name + adverse context
  const query = `"${subject.fullName}" AND (fraud OR "money laundering" OR investigation OR arrested OR convicted OR sanction)`;

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: query,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: 20,
        apiKey,
      },
      timeout: 8000,
    });

    const articles = response.data?.articles || [];

    return articles
      .map(article => {
        const relevance = articleRelevance(subject, article.description || '', article.title || '');
        if (relevance < 0.4) return null;

        const severityResult = scoreArticleSeverity(
          `${article.title} ${article.description} ${article.content || ''}`
        );
        if (!severityResult) return null;

        return {
          source: 'NEWS_API',
          sourceName: article.source?.name || 'News',
          title: article.title,
          summary: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          relevanceScore: relevance,
          ...severityResult,
        };
      })
      .filter(Boolean);

  } catch (err) {
    logger.error('NewsAPI error', { error: err.message });
    return [];
  }
}

/**
 * Check FCA (UK Financial Conduct Authority) enforcement actions.
 * Public search endpoint.
 */
async function checkFcaEnforcement(subject) {
  try {
    // FCA Individual Register — checks if person is flagged/banned
    const nameParts = subject.fullName.split(' ');
    const response = await axios.get(
      `https://register.fca.org.uk/services/V0.1/Individuals`,
      {
        params: { lastname: nameParts[nameParts.length - 1] },
        timeout: 8000,
      }
    );

    const individuals = response.data?.Data || [];

    return individuals
      .filter(ind => {
        const fullName = `${ind.Individual_Firstname || ''} ${ind.Individual_Surname || ''}`.trim();
        return nameConfidence(subject.fullName, fullName) > 0.6;
      })
      .map(ind => ({
        source: 'FCA_REGISTER',
        sourceName: 'FCA Individual Register (UK)',
        matchedName: `${ind.Individual_Firstname} ${ind.Individual_Surname}`,
        status: ind.Status,
        url: `https://register.fca.org.uk/s/individualdetails?id=${ind.Individual_Reference_Number}`,
        severity: ind.Status?.toLowerCase().includes('ban') ? 'CRITICAL' : 'SIGNIFICANT',
        keywords: ['FCA regulatory action'],
        scoreBoost: ind.Status?.toLowerCase().includes('ban') ? 25 : 12,
        publishedAt: null,
      }));

  } catch (err) {
    logger.warn('FCA register check failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * Check SEC EDGAR enforcement actions.
 * EDGAR full-text search for the subject's name in enforcement releases.
 */
async function checkSecEnforcement(subject) {
  try {
    const response = await axios.get(
      'https://efts.sec.gov/LATEST/search-index?q=%22' +
      encodeURIComponent(subject.fullName) +
      '%22&dateRange=custom&startdt=2000-01-01&forms=LR,AAER',
      { timeout: 8000 }
    );

    const hits = response.data?.hits?.hits || [];

    return hits.slice(0, 5).map(hit => ({
      source: 'SEC_EDGAR',
      sourceName: 'SEC EDGAR Enforcement Actions (US)',
      title: hit._source?.file_date ? `SEC Action (${hit._source.file_date})` : 'SEC Enforcement Action',
      summary: hit._source?.period_of_report || null,
      url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${encodeURIComponent(subject.fullName)}&type=LR&dateb=&owner=include&count=10`,
      publishedAt: hit._source?.file_date || null,
      severity: 'CRITICAL',
      keywords: ['SEC enforcement'],
      scoreBoost: 25,
      relevanceScore: 0.8,
    }));

  } catch (err) {
    logger.warn('SEC EDGAR check failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * Check UK Insolvency Register.
 */
async function checkInsolvencyRegister(subject) {
  try {
    const response = await axios.get(
      `https://api.insolvency.service.gov.uk/individuals/search`,
      {
        params: { q: subject.fullName },
        timeout: 8000,
      }
    );

    const results = response.data?.results || [];

    return results
      .filter(r => nameConfidence(subject.fullName, r.name || '') > 0.65)
      .map(r => ({
        source: 'UK_INSOLVENCY',
        sourceName: 'UK Insolvency Register',
        matchedName: r.name,
        caseType: r.case_type,
        startDate: r.start_date,
        url: r.url || 'https://www.insolvencydirect.bis.gov.uk/',
        severity: 'SIGNIFICANT',
        keywords: ['insolvency', r.case_type?.toLowerCase()].filter(Boolean),
        scoreBoost: 12,
        relevanceScore: 0.9,
        publishedAt: r.start_date,
      }));

  } catch (err) {
    logger.warn('Insolvency register check failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * GDELT Global News search — free, no API key, international coverage.
 * Good for non-UK/US subjects where FCA/SEC/Insolvency won't apply.
 */
async function searchGdelt(subject) {
  try {
    const response = await axios.get('https://api.gdeltproject.org/api/v2/doc/doc', {
      params: {
        query: `"${subject.fullName}"`,
        mode: 'artlist',
        maxrecords: 25,
        format: 'json',
        sort: 'HybridRel',
      },
      timeout: 15000,
    });

    const articles = response.data?.articles || [];

    return articles
      .map(article => {
        const text = `${article.title || ''} ${article.seendate || ''}`;
        const severityResult = scoreArticleSeverity(text);
        if (!severityResult) return null;

        return {
          source: 'GDELT',
          sourceName: 'GDELT Global News',
          title: article.title,
          url: article.url,
          publishedAt: article.seendate || null,
          relevanceScore: 0.75,
          ...severityResult,
        };
      })
      .filter(Boolean);

  } catch (err) {
    logger.warn('GDELT search failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * Google Custom Search — requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID env vars.
 * Searches the open web for adverse coverage with targeted query.
 */
async function searchGoogle(subject) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId  = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) {
    logger.debug('GOOGLE_CSE_API_KEY / GOOGLE_CSE_ID not set — skipping Google search');
    return [];
  }

  const query = `"${subject.fullName}" (scandal OR fraud OR corruption OR investigation OR controversy OR arrested OR convicted OR bribery OR "money laundering")`;

  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: apiKey, cx: cseId, q: query, num: 10 },
      timeout: 8000,
    });

    const items = response.data?.items || [];

    return items
      .map(item => {
        const text = `${item.title || ''} ${item.snippet || ''}`;
        const severityResult = scoreArticleSeverity(text);
        if (!severityResult) return null;

        return {
          source: 'GOOGLE_CSE',
          sourceName: 'Google Web Search',
          title: item.title,
          summary: item.snippet,
          url: item.link,
          publishedAt: null,
          relevanceScore: 0.8,
          ...severityResult,
        };
      })
      .filter(Boolean);

  } catch (err) {
    logger.warn('Google CSE search failed — skipping', { error: err.message });
    return [];
  }
}

/**
 * Main Layer 3 runner.
 */
async function runAdverseMediaLayer(subject) {
  logger.debug('Layer 3: Adverse media screening started', { subject: subject.fullName });
  const startTime = Date.now();

  const [newsHits, fcaHits, secHits, insolvencyHits, gdeltHits, googleHits] = await Promise.all([
    searchNewsApi(subject),
    checkFcaEnforcement(subject),
    checkSecEnforcement(subject),
    checkInsolvencyRegister(subject),
    searchGdelt(subject),
    searchGoogle(subject),
  ]);

  const allFindings = [...newsHits, ...fcaHits, ...secHits, ...insolvencyHits, ...gdeltHits, ...googleHits];

  // Deduplicate by URL
  const seen = new Set();
  const deduped = allFindings.filter(f => {
    if (!f.url || seen.has(f.url)) return f.url ? false : true;
    seen.add(f.url);
    return true;
  });

  // Sort by severity
  const severityOrder = { CRITICAL: 0, SIGNIFICANT: 1, NOTABLE: 2 };
  deduped.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  const criticalCount = deduped.filter(f => f.severity === 'CRITICAL').length;
  const significantCount = deduped.filter(f => f.severity === 'SIGNIFICANT').length;
  const notableCount = deduped.filter(f => f.severity === 'NOTABLE').length;

  // Score contribution: highest individual boost, not additive (prevents over-scoring)
  const scoreContribution = deduped.length > 0
    ? Math.min(30, Math.max(...deduped.map(f => f.scoreBoost || 0)))
    : 0;

  const result = {
    layer: 'adverseMedia',
    layerName: 'Adverse Media & Enforcement Actions',
    durationMs: Date.now() - startTime,
    status: 'complete',

    findingsCount: deduped.length,
    criticalCount,
    significantCount,
    notableCount,
    findings: deduped,
    scoreContribution,

    summary: deduped.length === 0
      ? 'No adverse media findings.'
      : `${deduped.length} adverse media finding(s): ${criticalCount} critical, ${significantCount} significant, ${notableCount} notable.`,

    sourcesQueried: ['NewsAPI', 'GDELT Global News', 'Google Web Search', 'FCA Register', 'SEC EDGAR', 'UK Insolvency Register'],
  };

  logger.debug('Layer 3: Complete', {
    durationMs: result.durationMs,
    findings: deduped.length,
  });

  return result;
}

module.exports = { runAdverseMediaLayer };
