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
 * Generate a plain-English explanation of the score.
 */
function buildExplanation(layers, score, riskLevel, hardStop) {
  const lines = [];

  if (hardStop) {
    lines.push('This subject has been identified on one or more international sanctions lists. This is an automatic HIGH RISK designation requiring immediate compliance review.');
    return lines.join(' ');
  }

  if (riskLevel === 'LOW') {
    lines.push('No significant risk signals were identified across the screened data sources.');
  } else if (riskLevel === 'MEDIUM') {
    lines.push('One or more risk signals were identified that require further review before onboarding.');
  } else {
    lines.push('Multiple significant risk signals were identified. Manual review and enhanced due diligence are required.');
  }

  // Describe what contributed
  const drivers = [];

  const sanctions = layers.find(l => l.layer === 'sanctions');
  if (sanctions?.requiresReview) drivers.push('possible sanctions list match');

  const pep = layers.find(l => l.layer === 'pep');
  if (pep?.pepConfirmed) drivers.push(`confirmed PEP status (${pep.strongMatches?.[0]?.pepClassification?.label || 'political exposure'})`);
  else if (pep?.requiresReview) drivers.push('possible PEP status');

  const media = layers.find(l => l.layer === 'adverseMedia');
  if (media?.criticalCount > 0) drivers.push(`${media.criticalCount} critical adverse media finding(s)`);
  else if (media?.significantCount > 0) drivers.push(`${media.significantCount} significant adverse media finding(s)`);

  const corporate = layers.find(l => l.layer === 'corporate');
  if (corporate?.flags?.includes('DISQUALIFIED_DIRECTOR')) drivers.push('disqualified director status (UK)');
  if (corporate?.flags?.includes('HIGH_RISK_JURISDICTION_EXPOSURE')) drivers.push('corporate exposure to high-risk jurisdictions');

  const crypto = layers.find(l => l.layer === 'crypto');
  if (crypto?.criticalFlagCount > 0) drivers.push(`${crypto.criticalFlagCount} critical crypto wallet risk flag(s)`);
  else if (crypto?.highFlagCount > 0) drivers.push('elevated crypto wallet risk exposure');

  if (drivers.length > 0) {
    lines.push(`Primary risk drivers: ${drivers.join('; ')}.`);
  }

  return lines.join(' ');
}

/**
 * Build a structured list of recommended actions based on the score.
 */
function buildRecommendations(riskLevel, layers, hardStop) {
  const actions = [];

  if (hardStop) {
    return [
      'DO NOT ONBOARD — refer immediately to your MLRO (Money Laundering Reporting Officer)',
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
    actions.push('Conduct Enhanced Due Diligence (EDD) — source of funds, source of wealth');
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
function scoreRiskReport(layerResults) {
  logger.debug('Scoring engine: calculating composite risk score');

  const completedLayers = layerResults.filter(l => l.status === 'complete' || l.status === 'error');

  // Check for hard stop (sanctions match)
  const hardStop = completedLayers.some(l => l.hardStop === true);

  if (hardStop) {
    return {
      score: 100,
      riskLevel: 'HIGH',
      hardStop: true,
      explanation: buildExplanation(completedLayers, 100, 'HIGH', true),
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
    explanation: buildExplanation(completedLayers, totalScore, riskLevel, false),
    recommendations: buildRecommendations(riskLevel, completedLayers, false),
    scoreBreakdown: layerContributions,
    dataQualityNote: completedLayers.some(l => l.status === 'error')
      ? 'One or more data sources returned errors. Score may be incomplete. Manual review recommended.'
      : null,
  };
}

module.exports = { scoreRiskReport, getRiskLevel, RISK_BANDS };
