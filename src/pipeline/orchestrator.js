/**
 * Pipeline Orchestrator
 *
 * Coordinates all screening layers, handles errors gracefully (a failing layer
 * should never crash the whole check), and assembles the final report.
 *
 * Layer execution strategy:
 * - Layer 1 (Sanctions) always runs
 * - Layers 2–5 run in parallel after Layer 1 completes
 * - If Layer 1 returns a hard stop, remaining layers still run (for a complete report)
 *   but the final score is locked to HIGH regardless
 */

const { v4: uuidv4 } = require('uuid');
const { runSanctionsLayer } = require('./layers/layer1-sanctions');
const { runPepLayer } = require('./layers/layer2-pep');
const { runAdverseMediaLayer } = require('./layers/layer3-adverseMedia');
const { runCorporateLayer } = require('./layers/layer4-corporate');
const { runCryptoLayer } = require('./layers/layer5-crypto');
const { scoreRiskReport } = require('../scoring/scoringEngine');
const logger = require('../utils/logger');

/**
 * Safely run a layer — catches errors and returns a structured error result
 * rather than crashing the pipeline.
 */
async function safeRun(layerFn, subject, layerName) {
  try {
    return await layerFn(subject);
  } catch (err) {
    logger.error(`Layer ${layerName} threw an unexpected error`, { error: err.message, stack: err.stack });
    return {
      layer: layerName,
      layerName: layerName,
      status: 'error',
      error: err.message,
      scoreContribution: 0,
      summary: `Layer failed to complete: ${err.message}`,
    };
  }
}

/**
 * Run the full screening pipeline for a subject.
 *
 * @param {object} subject - Validated subject data (from SubjectSchema)
 * @param {string} [checkId] - Optional pre-generated check ID
 * @returns {object} Complete check result with all layer outputs and final score
 */
async function runPipeline(subject, checkId = null) {
  const id = checkId || uuidv4();
  const startTime = Date.now();

  logger.info('Pipeline started', {
    checkId: id,
    subject: subject.fullName,
    layers: subject.checkLayers,
  });

  // ── LAYER 1: SANCTIONS (always first — hard stop gate) ──────────────────────
  const sanctionsResult = await safeRun(runSanctionsLayer, subject, 'sanctions');

  // ── LAYERS 2–5: Run in parallel ─────────────────────────────────────────────
  // Build the list of layer runners based on what was requested
  const parallelLayers = [];
  const requestedLayers = subject.checkLayers || ['sanctions', 'pep', 'adverseMedia'];

  if (requestedLayers.includes('pep')) {
    parallelLayers.push(safeRun(runPepLayer, subject, 'pep'));
  }
  if (requestedLayers.includes('adverseMedia')) {
    parallelLayers.push(safeRun(runAdverseMediaLayer, subject, 'adverseMedia'));
  }
  if (requestedLayers.includes('corporate')) {
    parallelLayers.push(safeRun(runCorporateLayer, subject, 'corporate'));
  }
  if (requestedLayers.includes('crypto')) {
    parallelLayers.push(safeRun(runCryptoLayer, subject, 'crypto'));
  }

  const parallelResults = await Promise.all(parallelLayers);

  // ── ASSEMBLE ALL LAYER RESULTS ───────────────────────────────────────────────
  const allLayers = [sanctionsResult, ...parallelResults];

  // ── SCORE ────────────────────────────────────────────────────────────────────
  const scoring = scoreRiskReport(allLayers, subject);

  const durationMs = Date.now() - startTime;

  // ── FINAL REPORT ─────────────────────────────────────────────────────────────
  const report = {
    checkId: id,
    createdAt: new Date().toISOString(),
    durationMs,
    status: 'complete',

    checkLayers: subject.checkLayers || [],

    // Subject (sanitised — no internal metadata)
    subject: {
      fullName: subject.fullName,
      dateOfBirth: subject.dateOfBirth || null,
      nationality: subject.nationality || null,
      aliases: subject.aliases || [],
      companyName: subject.companyName || null,
      walletAddress: subject.walletAddress || null,
    },

    // The headline result
    riskLevel: scoring.riskLevel,
    score: scoring.score,
    hardStop: scoring.hardStop,

    // Explanation and actions
    explanation: scoring.explanation,
    recommendations: scoring.recommendations,
    scoreBreakdown: scoring.scoreBreakdown,
    dataQualityNote: scoring.dataQualityNote,

    // Full layer results
    layers: {
      sanctions: sanctionsResult,
      pep: parallelResults.find(r => r.layer === 'pep') || null,
      adverseMedia: parallelResults.find(r => r.layer === 'adverseMedia') || null,
      corporate: parallelResults.find(r => r.layer === 'corporate') || null,
      crypto: parallelResults.find(r => r.layer === 'crypto') || null,
    },

    // Metadata for audit trail
    meta: {
      checkId: id,
      layersRun: allLayers.map(l => l.layer),
      sourcesQueried: allLayers.flatMap(l => l.sourcesQueried || []),
      checkVersion: '1.0.0',
      disclaimer: 'This report is provided for decision-support purposes only. ClearPath does not guarantee the completeness or accuracy of public data sources. This report does not constitute legal or compliance advice. The user is responsible for all compliance decisions.',
    },
  };

  logger.info('Pipeline complete', {
    checkId: id,
    durationMs,
    riskLevel: scoring.riskLevel,
    score: scoring.score,
  });

  return report;
}

module.exports = { runPipeline };
