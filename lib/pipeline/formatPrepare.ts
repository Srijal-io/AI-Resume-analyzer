import { randomUUID } from 'node:crypto';
import { extractResumeHeuristically } from '../heuristic/resume';
import { extractJobHeuristically } from '../heuristic/job';
import { resolveCandidateEvidence } from '../evidence/resolver';
import { matchRequirements } from '../matching/requirements';
import { buildConfirmationQuestions, PrepareAnalysisResult } from '../matching/confirmation';

export interface FormatPrepareInput {
  resumeText: string;
  jobDescriptionText: string;
}

/**
 * Executes Phase V2-2 Prepare Pipeline:
 * - Deterministic parsing & normalization of resume + JD
 * - Evidence resolution against claimed skills
 * - Deterministic requirement matching
 * - Generation of structured confirmation questions for non-matched items
 */
export async function runFormatPreparePipeline(
  input: FormatPrepareInput
): Promise<PrepareAnalysisResult> {
  const sessionId = randomUUID();

  // 1. Structured heuristic parsing
  const candidate = extractResumeHeuristically(input.resumeText);
  const jd = extractJobHeuristically(input.jobDescriptionText);

  // 2. Evidence resolution (cross-references claimed skills against experience bullets)
  const evidenceList = resolveCandidateEvidence(candidate);

  // 3. Requirement matching
  const matches = matchRequirements(jd, evidenceList);

  // 4. Build confirmation questions (for missing, partial, or claimed-only requirements)
  const questions = buildConfirmationQuestions(matches);

  const matchedCount = matches.filter((m) => m.status === 'MATCHED').length;
  const partialCount = matches.filter((m) => m.status === 'PARTIAL').length;
  const missingCount = matches.filter((m) => m.status === 'MISSING').length;
  const claimedOnlyCount = matches.filter((m) => m.status === 'CLAIMED_ONLY').length;

  return {
    sessionId,
    matches,
    questions,
    stats: {
      totalRequirements: matches.length,
      matchedCount,
      partialCount,
      missingCount,
      claimedOnlyCount,
    },
  };
}
