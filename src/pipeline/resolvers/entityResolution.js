/**
 * Entity Resolution
 *
 * The core challenge in AML screening: "John Smith" returns 10,000 results.
 * This module scores how likely a given result is to be the same person
 * as the subject we're checking.
 *
 * Returns a confidence score 0–1.
 */

/**
 * Normalise a name for comparison.
 * Handles unicode, extra whitespace, punctuation.
 */
function normaliseName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate name similarity using token overlap.
 * Handles reordered names (e.g. "Smith John" vs "John Smith").
 */
function nameConfidence(subjectName, candidateName) {
  if (!subjectName || !candidateName) return 0;

  const subjectTokens = new Set(normaliseName(subjectName).split(' '));
  const candidateTokens = new Set(normaliseName(candidateName).split(' '));

  // Exact normalised match
  if (normaliseName(subjectName) === normaliseName(candidateName)) return 1.0;

  // Token overlap (handles "John Smith" vs "Smith, John")
  const intersection = [...subjectTokens].filter(t => candidateTokens.has(t));
  const union = new Set([...subjectTokens, ...candidateTokens]);
  const jaccardSimilarity = intersection.length / union.size;

  // Boost if all subject tokens appear in candidate
  const fullCoverage = [...subjectTokens].every(t => candidateTokens.has(t));
  if (fullCoverage) return Math.min(0.95, jaccardSimilarity + 0.2);

  return jaccardSimilarity;
}

/**
 * Date of birth match.
 */
function dobConfidence(subjectDob, candidateDob) {
  if (!subjectDob || !candidateDob) return null; // null = unknown, not a negative signal

  const norm = (d) => d.replace(/[^0-9]/g, '').slice(0, 8);
  if (norm(subjectDob) === norm(candidateDob)) return 1.0;

  // Year-only match (common in PEP databases)
  const subjectYear = subjectDob.slice(0, 4);
  const candidateYear = candidateDob.slice(0, 4);
  if (subjectYear === candidateYear) return 0.5;

  return 0.0; // DOB mismatch is a strong negative signal
}

/**
 * Nationality / country match.
 */
function nationalityConfidence(subjectNationality, candidateNationality) {
  if (!subjectNationality || !candidateNationality) return null;
  return subjectNationality.toUpperCase() === candidateNationality.toUpperCase() ? 1.0 : 0.0;
}

/**
 * Master entity resolution function.
 *
 * @param {object} subject - The subject being checked
 * @param {object} candidate - A potential match from a data source
 * @param {object} candidate.name - Candidate's name
 * @param {object} candidate.dob - Candidate's date of birth (optional)
 * @param {object} candidate.nationality - Candidate's nationality (optional)
 * @param {string[]} candidate.aliases - Alternative names (optional)
 *
 * @returns {{ confidence: number, breakdown: object, verdict: string }}
 */
function resolveEntity(subject, candidate) {
  // Check aliases too — use highest name score across all name variants
  const allCandidateNames = [
    candidate.name,
    ...(candidate.aliases || [])
  ].filter(Boolean);

  const allSubjectNames = [
    subject.fullName,
    ...(subject.aliases || [])
  ].filter(Boolean);

  // Best name match across all name combinations
  let bestNameScore = 0;
  for (const sName of allSubjectNames) {
    for (const cName of allCandidateNames) {
      const score = nameConfidence(sName, cName);
      if (score > bestNameScore) bestNameScore = score;
    }
  }

  const dobScore = dobConfidence(subject.dateOfBirth, candidate.dob);
  const nationalityScore = nationalityConfidence(subject.nationality, candidate.nationality);

  // Weighted composite confidence
  // Name is the primary signal. DOB and nationality are confirming/refuting signals.
  let confidence = bestNameScore;

  if (dobScore !== null) {
    if (dobScore === 0) {
      // DOB mismatch — significant penalty but not disqualifying (data errors exist)
      confidence *= 0.4;
    } else {
      // DOB match — boost confidence
      confidence = Math.min(1.0, confidence + (dobScore * 0.2));
    }
  }

  if (nationalityScore !== null) {
    if (nationalityScore === 0) {
      // Nationality mismatch — moderate penalty
      confidence *= 0.7;
    } else {
      // Nationality match — small boost
      confidence = Math.min(1.0, confidence + 0.05);
    }
  }

  // Verdict thresholds
  let verdict;
  if (confidence >= 0.85) verdict = 'STRONG_MATCH';
  else if (confidence >= 0.65) verdict = 'POSSIBLE_MATCH';
  else if (confidence >= 0.40) verdict = 'WEAK_MATCH';
  else verdict = 'NO_MATCH';

  return {
    confidence: Math.round(confidence * 100) / 100,
    verdict,
    breakdown: {
      nameScore: Math.round(bestNameScore * 100) / 100,
      dobScore,
      nationalityScore,
    }
  };
}

module.exports = { resolveEntity, normaliseName, nameConfidence };
