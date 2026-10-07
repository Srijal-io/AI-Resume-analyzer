import { JobRequirement } from '../types/job';
import { RequirementMatch } from '../types/matching';
import { ProvenanceState } from '../types/provenance';

export interface ConfirmationQuestion {
  id: string;
  requirementId: string;
  skillOrRequirementText: string;
  question: string;
  currentState: 'MISSING' | 'PARTIAL' | 'CLAIMED_ONLY';
  provenance: ProvenanceState;
  suggestedAction: 'CONFIRM_T1' | 'CONFIRM_T2' | 'REJECT';
}

export interface PrepareAnalysisResult {
  sessionId: string;
  matches: RequirementMatch[];
  questions: ConfirmationQuestion[];
  stats: {
    totalRequirements: number;
    matchedCount: number;
    partialCount: number;
    missingCount: number;
    claimedOnlyCount: number;
  };
}

/**
 * Builds confirmation questions for any requirement that is not fully verified with strong evidence.
 * Follows Decision D1:
 * - Tier 1: User attests Yes, picks level (Used / Comfortable / Familiar) + context (project/work/personal).
 * - Tier 2: User also writes concrete description.
 */
export function buildConfirmationQuestions(matches: RequirementMatch[]): ConfirmationQuestion[] {
  const questions: ConfirmationQuestion[] = [];

  for (const match of matches) {
    if (match.status === 'MATCHED') {
      continue;
    }

    const reqText = match.requirement.normalizedSkill || match.requirement.text;
    let questionText = `Do you have experience with ${reqText}?`;
    let suggestedAction: 'CONFIRM_T1' | 'CONFIRM_T2' | 'REJECT' = 'CONFIRM_T1';

    if (match.status === 'CLAIMED_ONLY') {
      questionText = `You listed '${reqText}' in your skills, but without project context. Would you like to provide a short description of how you applied it (Tier 2 evidence)?`;
      suggestedAction = 'CONFIRM_T2';
    } else if (match.status === 'PARTIAL') {
      questionText = `We found related skills, but '${reqText}' is explicitly required. Can you attest your familiarity or provide project experience?`;
      suggestedAction = 'CONFIRM_T1';
    } else {
      questionText = `'${reqText}' was not detected in your resume. Do you have experience with this requirement?`;
      suggestedAction = 'CONFIRM_T1';
    }

    questions.push({
      id: `q_${match.requirementId}`,
      requirementId: match.requirementId,
      skillOrRequirementText: reqText,
      question: questionText,
      currentState: match.status,
      provenance: match.status === 'CLAIMED_ONLY' ? 'RESUME_EVIDENCE' : 'JD_ONLY',
      suggestedAction,
    });
  }

  return questions;
}
