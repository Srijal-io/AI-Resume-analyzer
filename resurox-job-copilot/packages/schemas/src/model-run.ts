import { z } from "zod";

export const ModelProviderSchema = z.enum(["ollama", "mock", "hosted-open"]);
export type ModelProvider = z.infer<typeof ModelProviderSchema>;

export const ModelRunOutcomeSchema = z.enum(["SUCCESS", "REPAIRED", "FAILED"]);
export type ModelRunOutcome = z.infer<typeof ModelRunOutcomeSchema>;

export const ModelRunSchema = z.object({
  id: z.string(),
  analysisId: z.string().optional(),
  step: z.enum([
    "REQUIREMENTS_EXTRACTION",
    "EVIDENCE_MAPPING",
    "EXPLANATION_GENERATION",
    "TAILORING_REWRITE"
  ]),
  provider: ModelProviderSchema,
  model: z.string(),
  promptVersion: z.string(),
  latencyMs: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  outcome: ModelRunOutcomeSchema,
  rawError: z.string().optional(),
  createdAt: z.string()
});
export type ModelRun = z.infer<typeof ModelRunSchema>;
