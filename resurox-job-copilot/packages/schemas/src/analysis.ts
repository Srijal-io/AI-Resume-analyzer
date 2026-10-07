import { z } from "zod";
import { RequirementKindSchema, RequirementStateSchema } from "./job";
import { GroundingStateSchema } from "./resume";

export const RequirementResultSchema = z.object({
  requirementId: z.string(),
  requirementText: z.string(),
  kind: RequirementKindSchema,
  canonicalSkill: z.string().optional(),
  state: RequirementStateSchema,
  matchedEvidenceIds: z.array(z.string()).default([]),
  evidenceContext: z.enum(["PROJECT_OR_EXPERIENCE", "SKILL_LIST_ONLY"]).optional(),
  weight: z.number().positive(),
  earnedPoints: z.number().nonnegative(),
  possiblePoints: z.number().positive(),
  notes: z.string().optional()
});
export type RequirementResult = z.infer<typeof RequirementResultSchema>;

export const AnalysisStatusSchema = z.enum(["OK", "DEGRADED", "FAILED"]);
export type AnalysisStatus = z.infer<typeof AnalysisStatusSchema>;

export const ConfidenceLevelSchema = z.enum(["HIGH", "MEDIUM", "LIMITED"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const MatchAnalysisSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  resumeProfileId: z.string(),
  resumeVersion: z.number().int().positive(),
  scoringVersion: z.string().default("v1.1.0"),
  inputHash: z.string(),
  score: z.number().min(0).max(100),
  earnedTotal: z.number().nonnegative(),
  possibleTotal: z.number().positive(),
  status: AnalysisStatusSchema,
  confidence: ConfidenceLevelSchema,
  strengths: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  requirementResults: z.array(RequirementResultSchema),
  explanation: z.string(),
  createdAt: z.string()
});
export type MatchAnalysis = z.infer<typeof MatchAnalysisSchema>;
