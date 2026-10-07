import { z } from "zod";

export const ConfirmationAnswerSchema = z.enum(["YES", "NO", "NOT_SURE"]);
export type ConfirmationAnswer = z.infer<typeof ConfirmationAnswerSchema>;

export const ConfirmationRecordSchema = z.object({
  id: z.string(),
  analysisId: z.string(),
  requirementId: z.string(),
  requirementText: z.string(),
  canonicalSkill: z.string().optional(),
  answer: ConfirmationAnswerSchema,
  notes: z.string().optional(),
  createdAt: z.string()
});
export type ConfirmationRecord = z.infer<typeof ConfirmationRecordSchema>;

export const ConfirmGapRequestSchema = z.object({
  analysisId: z.string(),
  requirementId: z.string(),
  answer: ConfirmationAnswerSchema,
  notes: z.string().optional()
});
export type ConfirmGapRequest = z.infer<typeof ConfirmGapRequestSchema>;
