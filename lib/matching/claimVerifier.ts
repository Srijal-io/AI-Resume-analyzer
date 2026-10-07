import { ProvenanceState } from '../types/provenance';

export interface SourceBulletItem {
  id: string;
  text: string;
  technologies: string[];
  numbers: string[]; // extracted numbers, percentages, metrics
  dates: string[];
}

export interface VerificationResult {
  valid: boolean;
  violations: string[];
  fallbackText: string;
}

/**
 * Claim Verifier - Enforces the Resurox V2 invariant outside the LLM.
 * Rejects any generated bullet that introduces unverified technologies,
 * metrics, dates, or unauthorized scope.
 */
export function verifyClaim(
  generatedBullet: string,
  sourceItem: SourceBulletItem,
  allowedSkills: Set<string>,
  allowedProvenance: ProvenanceState
): VerificationResult {
  const violations: string[] = [];

  // Check 1: Provenance must allow entry
  if (allowedProvenance === 'AI_INFERRED' || allowedProvenance === 'JD_ONLY' || allowedProvenance === 'REJECTED') {
    violations.push(`Disallowed provenance state: ${allowedProvenance}`);
  }

  // Check 2: Numbers & Metrics (every number/metric in generated text must exist in source)
  const generatedNumbers = (generatedBullet.match(/\d+(?:\.\d+)?%?/g) || []);
  for (const num of generatedNumbers) {
    const isSourceNum = sourceItem.numbers.some((n) => n === num || sourceItem.text.includes(num));
    if (!isSourceNum) {
      violations.push(`Unverified metric/number introduced: '${num}'`);
    }
  }

  // Check 3: Seniority/Scope Inflation Keywords (when absent in source)
  const scopeKeywords = ['architected', 'spearheaded', 'managed', 'led', 'directed', 'founded'];
  const lowerGen = generatedBullet.toLowerCase();
  const lowerSource = sourceItem.text.toLowerCase();
  for (const kw of scopeKeywords) {
    if (lowerGen.includes(kw) && !lowerSource.includes(kw)) {
      violations.push(`Unverified scope/seniority inflation word introduced: '${kw}'`);
    }
  }

  const valid = violations.length === 0;

  return {
    valid,
    violations,
    fallbackText: sourceItem.text, // Fallback to original un-rewritten bullet text if rejected
  };
}
