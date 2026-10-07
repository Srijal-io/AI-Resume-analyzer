import {
  JobRequirement,
  RequirementResult,
  RequirementState,
  MatchAnalysis,
  ConfidenceLevel,
  AnalysisStatus
} from "@resurox/schemas";
import { createHash } from "node:crypto";

export interface CandidateMapping {
  requirementId: string;
  state: RequirementState;
  matchedEvidenceIds: string[];
  evidenceContext?: "PROJECT_OR_EXPERIENCE" | "SKILL_LIST_ONLY";
  notes?: string;
}

export const SCORING_WEIGHTS = {
  REQUIRED: 3,
  PREFERRED: 1
} as const;

export const STATE_VALUES: Record<RequirementState, number> = {
  FULL: 1.0,
  PARTIAL: 0.5,
  USER_CONFIRMED: 0.9,
  UNVERIFIED: 0.0,
  MISSING: 0.0,
  CONFLICT: 0.0
};

export const CONTEXT_MULTIPLIERS = {
  PROJECT_OR_EXPERIENCE: 1.0,
  SKILL_LIST_ONLY: 0.75
} as const;

export function generateInputHash(
  resumeVersion: number,
  normalizedJdHash: string,
  scoringVersion = "v1.1.0",
  aliasMapVersion = "v1.1.0"
): string {
  return createHash("sha256")
    .update(`${resumeVersion}:${normalizedJdHash}:${scoringVersion}:${aliasMapVersion}`)
    .digest("hex");
}

/**
 * Deterministically computes requirement points and the overall match score.
 * Formula: score = round( 100 * Σ(w · s · m) / Σ(w) )
 */
export function computeDeterministicScore(
  requirements: JobRequirement[],
  mappings: CandidateMapping[]
): {
  score: number;
  earnedTotal: number;
  possibleTotal: number;
  requirementResults: RequirementResult[];
  strengths: string[];
  gaps: string[];
  warnings: string[];
} {
  const mappingMap = new Map<string, CandidateMapping>();
  for (const m of mappings) {
    mappingMap.set(m.requirementId, m);
  }

  let earnedSum = 0;
  let possibleSum = 0;

  const results: RequirementResult[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];
  const warnings: string[] = [];

  for (const req of requirements) {
    const w = req.kind === "REQUIRED" ? SCORING_WEIGHTS.REQUIRED : SCORING_WEIGHTS.PREFERRED;
    const mapping = mappingMap.get(req.id);

    const state: RequirementState = mapping ? mapping.state : "MISSING";
    const s = STATE_VALUES[state] ?? 0;

    let m = 1.0;
    if (state === "USER_CONFIRMED") {
      m = 1.0; // USER_CONFIRMED uses s = 0.9 directly
    } else if (state === "FULL" || state === "PARTIAL") {
      const ctx = mapping?.evidenceContext ?? "SKILL_LIST_ONLY";
      m = ctx === "PROJECT_OR_EXPERIENCE"
        ? CONTEXT_MULTIPLIERS.PROJECT_OR_EXPERIENCE
        : CONTEXT_MULTIPLIERS.SKILL_LIST_ONLY;
    }

    const earned = w * s * m;
    const possible = w;

    earnedSum += earned;
    possibleSum += possible;

    const label = req.canonicalSkill || req.text;

    if (state === "FULL" || (state === "USER_CONFIRMED" && earned > 0)) {
      strengths.push(`${label} (${state === "USER_CONFIRMED" ? "User Confirmed" : "Verified"})`);
    } else if (state === "MISSING" || state === "UNVERIFIED") {
      gaps.push(`${label} (${req.kind.toLowerCase()})`);
    } else if (state === "CONFLICT") {
      warnings.push(`Conflict detected on requirement: "${req.text}"`);
    }

    results.push({
      requirementId: req.id,
      requirementText: req.text,
      kind: req.kind,
      canonicalSkill: req.canonicalSkill,
      state,
      matchedEvidenceIds: mapping?.matchedEvidenceIds ?? [],
      evidenceContext: mapping?.evidenceContext,
      weight: w,
      earnedPoints: Number(earned.toFixed(3)),
      possiblePoints: possible,
      notes: mapping?.notes
    });
  }

  const finalScore = possibleSum > 0
    ? Math.round((100 * earnedSum) / possibleSum)
    : 0;

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    earnedTotal: Number(earnedSum.toFixed(3)),
    possibleTotal: possibleSum,
    requirementResults: results,
    strengths,
    gaps,
    warnings
  };
}
