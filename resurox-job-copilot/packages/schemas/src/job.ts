import { z } from "zod";

export const ExtractionMethodSchema = z.enum([
  "SCHEMA_ORG_JSON_LD",
  "SITE_ADAPTER",
  "DOM_HEURISTIC",
  "USER_SELECTION",
  "MANUAL_PASTE"
]);
export type ExtractionMethod = z.infer<typeof ExtractionMethodSchema>;

export const RequirementKindSchema = z.enum(["REQUIRED", "PREFERRED"]);
export type RequirementKind = z.infer<typeof RequirementKindSchema>;

export const RequirementStateSchema = z.enum([
  "FULL",
  "PARTIAL",
  "USER_CONFIRMED",
  "UNVERIFIED",
  "MISSING",
  "CONFLICT"
]);
export type RequirementState = z.infer<typeof RequirementStateSchema>;

export const JobRequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: RequirementKindSchema,
  canonicalSkill: z.string().optional(),
  category: z.enum([
    "LANGUAGE",
    "FRAMEWORK",
    "DATABASE",
    "TOOL",
    "ARCHITECTURE",
    "EDUCATION",
    "EXPERIENCE_YEARS",
    "GENERAL"
  ]).default("GENERAL")
});
export type JobRequirement = z.infer<typeof JobRequirementSchema>;

export const JobPostingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  sourceUrl: z.string().optional(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  employmentType: z.string().optional(),
  rawJd: z.string(),
  rawJdHash: z.string(),
  requirements: z.array(JobRequirementSchema).default([]),
  extractionMethod: ExtractionMethodSchema,
  createdAt: z.string()
});
export type JobPosting = z.infer<typeof JobPostingSchema>;
