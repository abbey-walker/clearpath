/**
 * Scoring Engine
 *
 * Takes the results from all pipeline layers and produces a final composite
 * risk score (0–100) with a risk level (LOW / MEDIUM / HIGH) and a plain-English
 * explanation of what drove the score.
 */

const logger = require('../utils/logger');

const RISK_BANDS = {
  LOW: { min: 0, max: 30, label: 'LOW', colour: 'green' },
  MEDIUM: { min: 31, max: 60, label: 'MEDIUM', colour: 'amber' },
  HIGH: { min: 61, max: 100, label: 'HIGH', colour: 'red' },
};

function getRiskLevel(score) {
  if (score <= 30) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Generate a specific, analyst-style explanation of the score.
 * Cites actual findings — positions held, article titles, keywords — so the
 * reasoning behind every risk marker is transparent.
 */
function buildExplanation(layers, score, riskLevel, hardStop, subject) {
  const name = subject?.fullName || 'The subject';
  const parts = [];

  if (hardStop) {
    parts.push(`${name} has been identified on one or more international sanctions lists. This is an automatic HIGH risk designation - onboarding must not proceed.`);
    const sanctions = layers.find(l => l.layer === 'sanctions');
    if (sanctions?.hits?.length > 0) {
      const hit = sanctions.hits[0];
      parts.push(`Sanctions match: "${hit.matchedName || hit.caption}" (score ${hit.score?.toFixed(2) || 'n/a'}) via ${hit.sourceName || hit.source || 'sanctions database'}.`);
    }
    return parts.join(' ');
  }

  // Opening verdict
  parts.push(`${name} has been assigned a ${riskLevel} risk rating with a composite score of ${score}/100.`);

  // PEP — cite actual positions
  const pep = layers.find(l => l.layer === 'pep');
  if (pep?.pepConfirmed) {
    const match = pep.strongMatches?.[0];
    const classification = match?.pepClassification?.label || 'Political Exposure';
    const positions = (match?.positions || []).filter(p => p !== 'politician').slice(0, 4);
    if (positions.length > 0) {
      parts.push(`${name} is a confirmed Politically Exposed Person (PEP) at the ${classification} tier, having held the following positions: ${positions.join(', ')}.`);
    } else {
      parts.push(`${name} is a confirmed Politically Exposed Person (PEP) at the ${classification} tier.`);
    }
    if (match?.country) parts.push(`Country of political exposure: ${match.country}.`);
  } else if (pep?.requiresReview) {
    const possible = pep.possibleMatches?.[0];
    parts.push(`A possible PEP match was identified for "${possible?.matchedName || name}" - manual verification is required to confirm or dismiss.`);
  }

  // Adverse media — cite top finding titles and keywords
  const media = layers.find(l => l.layer === 'adverseMedia');
  if (media?.findings?.length > 0) {
    const total = media.findingsCount;
    const breakdown = [
      media.criticalCount > 0 && `${media.criticalCount} critical`,
      media.significantCount > 0 && `${media.significantCount} significant`,
      media.notableCount > 0 && `${media.notableCount} notable`,
    ].filter(Boolean).join(', ');

    parts.push(`Adverse media screening returned ${total} finding(s) (${breakdown}).`);

    // Cite up to 2 specific findings
    media.findings.slice(0, 2).forEach(f => {
      const kws = f.keywords?.slice(0, 3).join(', ');
      const via = f.sourceName || f.source;
      if (f.title) {
        parts.push(`${f.severity} finding via ${via}: "${f.title}"${kws ? ` - keywords: ${kws}` : ''}.`);
      }
    });
  }

  // Sanctions possible match
  const sanctions = layers.find(l => l.layer === 'sanctions');
  if (sanctions?.requiresReview && !hardStop) {
    parts.push(`A possible sanctions list match requires review before proceeding.`);
  }

  // Corporate
  const corporate = layers.find(l => l.layer === 'corporate');
  if (corporate?.flags?.includes('DISQUALIFIED_DIRECTOR')) {
    parts.push(`Subject appears on the UK Disqualified Directors Register.`);
  }
  if (corporate?.flags?.includes('HIGH_RISK_JURISDICTION_EXPOSURE')) {
    parts.push(`Corporate connections to high-risk jurisdictions were identified.`);
  }

  // Crypto
  const crypto = layers.find(l => l.layer === 'crypto');
  if (crypto?.criticalFlagCount > 0) {
    parts.push(`${crypto.criticalFlagCount} critical on-chain risk flag(s) were identified against the provided wallet address.`);
  } else if (crypto?.highFlagCount > 0) {
    parts.push(`Elevated on-chain risk exposure was detected for the provided wallet address.`);
  }

  // Closing
  if (riskLevel === 'HIGH') {
    parts.push(`Enhanced due diligence and senior compliance sign-off are required. Do not onboard without MLRO review.`);
  } else if (riskLevel === 'MEDIUM') {
    parts.push(`Enhanced due diligence is recommended before any onboarding decision.`);
  } else {
    parts.push(`No significant risk signals were identified. Standard onboarding procedures apply, subject to your internal policy.`);
  }

  return parts.join(' ');
}

/**
 * Build a structured list of recommended actions based on the score.
 */
function buildRecommendations(riskLevel, layers, hardStop) {
  const actions = [];

  if (hardStop) {
    return [
      'DO NOT ONBOARD - refer immediately to your MLRO (Money Laundering Reporting Officer)',
      'File a Suspicious Activity Report (SAR) as required by applicable AML regulations',
      'Document all findings and retain for a minimum of 5 years',
      'Do not inform the subject that a SAR has been filed (tipping off offence)',
    ];
  }

  if (riskLevel === 'LOW') {
    actions.push('Standard onboarding may proceed subject to your internal policy');
    actions.push('Retain this report in your customer compliance file');
    actions.push('Schedule periodic re-screening (recommended: annually or on trigger events)');
    return actions;
  }

  if (riskLevel === 'MEDIUM') {
    actions.push('Enhanced due diligence (EDD) is recommended before onboarding');
    actions.push('Escalate to your compliance team or MLRO for review');
    actions.push('Request additional documentation from the subject to clarify flagged signals');
  }

  if (riskLevel === 'HIGH') {
    actions.push('Do not onboard without explicit senior compliance sign-off');
    actions.push('Escalate to MLRO immediately');
    actions.push('Conduct Enhanced Due Diligence (EDD) - source of funds, source of wealth');
    actions.push('Consider filing a Suspicious Activity Report (SAR)');
  }

  const pep = layers.find(l => l.layer === 'pep');
  if (pep?.pepConfirmed) {
    actions.push('PEP identified: obtain senior management approval before onboarding');
    actions.push('Establish source of funds and source of wealth documentation');
    actions.push('Apply enhanced ongoing monitoring');
  }

  const corporate = layers.find(l => l.layer === 'corporate');
  if (corporate?.flags?.length > 0) {
    actions.push('Investigate corporate connections flagged in the report');
  }

  actions.push('Retain this report and all supporting documentation per your record-keeping policy');

  return actions;
}

/**
 * Master scoring function.
 *
 * @param {object[]} layerResults - Array of results from each pipeline layer
 * @returns {object} Final scored risk report
 */
function scoreRiskReport(layerResults, subject) {
  logger.debug('Scoring engine: calculating composite risk score');

  const completedLayers = layerResults.filter(l => l.status === 'complete' || l.status === 'error');

  // Check for hard stop (sanctions match)
  const hardStop = completedLayers.some(l => l.hardStop === true);

  if (hardStop) {
    return {
      score: 100,
      riskLevel: 'HIGH',
      hardStop: true,
      explanation: buildExplanation(completedLayers, 100, 'HIGH', true, subject),
      recommendations: buildRecommendations('HIGH', completedLayers, true),
      scoreBreakdown: completedLayers.map(l => ({
        layer: l.layer,
        layerName: l.layerName,
        contribution: l.hardStop ? 'HARD_STOP' : (l.scoreContribution || 0),
      })),
    };
  }

  // Additive scoring with caps per layer to prevent any single layer dominating
  // (except sanctions which is always a hard stop)
  const layerContributions = completedLayers.map(l => {
    const raw = typeof l.scoreContribution === 'number' ? l.scoreContribution : 0;
    return {
      layer: l.layer,
      layerName: l.layerName,
      contribution: raw,
    };
  });

  const totalScore = Math.min(100, layerContributions.reduce((sum, l) => sum + l.contribution, 0));
  const riskLevel = getRiskLevel(totalScore);

  return {
    score: Math.round(totalScore),
    riskLevel,
    hardStop: false,
    explanation: buildExplanation(completedLayers, totalScore, riskLevel, false, subject),
    recommendations: buildRecommendations(riskLevel, completedLayers, false),
    scoreBreakdown: layerContributions,
    dataQualityNote: completedLayers.some(l => l.status === 'error')
      ? 'One or more data sources returned errors. Score may be incomplete. Manual review recommended.'
      : null,
  };
}

module.exports = { scoreRiskReport, getRiskLevel, RISK_BANDS };
