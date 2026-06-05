/**
 * ClearPath Pipeline Tests
 *
 * Basic tests to verify the pipeline components work correctly
 * without needing external API keys.
 */

require('dotenv').config();
const { resolveEntity, nameConfidence } = require('../src/pipeline/resolvers/entityResolution');
const { scoreRiskReport } = require('../src/scoring/scoringEngine');
const { SubjectSchema } = require('../src/utils/schemas');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`);
    failed++;
  }
}

// ── ENTITY RESOLUTION TESTS ──────────────────────────────────────────────────
console.log('\n── Entity Resolution ──');

// Exact match
let result = resolveEntity(
  { fullName: 'John Smith' },
  { name: 'John Smith' }
);
assert(result.confidence >= 0.95, 'Exact name match should have high confidence');
assert(result.verdict === 'STRONG_MATCH', 'Exact match should be STRONG_MATCH');

// Reordered name
result = resolveEntity(
  { fullName: 'John Smith' },
  { name: 'Smith, John' }
);
assert(result.confidence >= 0.7, 'Reordered name should still match well');

// DOB boost
result = resolveEntity(
  { fullName: 'John Smith', dateOfBirth: '1975-03-15' },
  { name: 'John Smith', dob: '1975-03-15' }
);
assert(result.confidence >= 0.98, 'Name + DOB match should boost confidence to near 1.0');

// DOB mismatch penalty
result = resolveEntity(
  { fullName: 'John Smith', dateOfBirth: '1975-03-15' },
  { name: 'John Smith', dob: '1985-06-20' }
);
assert(result.confidence < 0.5, 'DOB mismatch should significantly reduce confidence');

// Alias match
result = resolveEntity(
  { fullName: 'John Smith', aliases: ['Johnny Smith'] },
  { name: 'Johnny Smith' }
);
assert(result.confidence >= 0.7, 'Alias match should be detected');

// Non-match
result = resolveEntity(
  { fullName: 'John Smith' },
  { name: 'Zhang Wei' }
);
assert(result.verdict === 'NO_MATCH', 'Completely different names should not match');

// ── SCHEMA VALIDATION TESTS ───────────────────────────────────────────────────
console.log('\n── Input Schema Validation ──');

// Valid subject
let parsed = SubjectSchema.safeParse({
  fullName: 'Jane Doe',
  dateOfBirth: '1980-05-20',
  nationality: 'US',
  checkLayers: ['sanctions', 'pep'],
});
assert(parsed.success, 'Valid subject should parse successfully');
assert(parsed.data?.nationality === 'US', 'Nationality should be uppercased');

// Invalid DOB format
parsed = SubjectSchema.safeParse({
  fullName: 'Jane Doe',
  dateOfBirth: '20/05/1980', // Wrong format
});
assert(!parsed.success, 'Invalid DOB format should fail validation');

// Name too short
parsed = SubjectSchema.safeParse({ fullName: 'J' });
assert(!parsed.success, 'Single character name should fail validation');

// Default layers
parsed = SubjectSchema.safeParse({ fullName: 'Jane Doe' });
assert(parsed.success && parsed.data.checkLayers.includes('sanctions'), 'Default layers should include sanctions');

// ── SCORING ENGINE TESTS ──────────────────────────────────────────────────────
console.log('\n── Scoring Engine ──');

// Clean subject
let score = scoreRiskReport([
  { layer: 'sanctions', status: 'complete', hardStop: false, sanctioned: false, scoreContribution: 0 },
  { layer: 'pep', status: 'complete', pepConfirmed: false, scoreContribution: 0 },
  { layer: 'adverseMedia', status: 'complete', findingsCount: 0, scoreContribution: 0 },
]);
assert(score.riskLevel === 'LOW', 'No signals should produce LOW risk');
assert(score.score === 0, 'No signals should produce score of 0');

// Hard stop
score = scoreRiskReport([
  { layer: 'sanctions', status: 'complete', hardStop: true, sanctioned: true, scoreContribution: 'HARD_STOP' },
  { layer: 'pep', status: 'complete', pepConfirmed: false, scoreContribution: 0 },
]);
assert(score.riskLevel === 'HIGH', 'Sanctions hard stop should produce HIGH risk');
assert(score.score === 100, 'Hard stop should produce score of 100');
assert(score.hardStop === true, 'Hard stop flag should be set');

// PEP + adverse media combination
score = scoreRiskReport([
  { layer: 'sanctions', status: 'complete', hardStop: false, scoreContribution: 0 },
  { layer: 'pep', status: 'complete', pepConfirmed: true, scoreContribution: 35, strongMatches: [{ pepClassification: { label: 'Senior Politician' } }] },
  { layer: 'adverseMedia', status: 'complete', criticalCount: 1, significantCount: 0, scoreContribution: 20 },
]);
assert(score.riskLevel === 'MEDIUM', 'PEP + critical adverse media (55pts) should produce MEDIUM risk');
assert(score.score >= 55, 'PEP + adverse media should score 55+');

// Medium risk — bump contributions to land in MEDIUM band (31-60)
score = scoreRiskReport([
  { layer: 'sanctions', status: 'complete', hardStop: false, scoreContribution: 0 },
  { layer: 'pep', status: 'complete', pepConfirmed: false, requiresReview: true, scoreContribution: 20 },
  { layer: 'adverseMedia', status: 'complete', criticalCount: 0, significantCount: 1, scoreContribution: 15 },
]);
assert(score.riskLevel === 'MEDIUM', 'Moderate signals (35pts) should produce MEDIUM risk');
assert(score.recommendations.length > 0, 'MEDIUM risk should have recommendations');

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log(`\n── Results: ${passed} passed, ${failed} failed ──`);
if (failed > 0) {
  console.error('Some tests failed');
  process.exit(1);
} else {
  console.log('All tests passed ✓');
}
