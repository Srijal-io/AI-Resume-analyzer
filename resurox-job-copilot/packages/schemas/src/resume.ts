import { z } from "zod";

export const GroundingStateSchema = z.enum([
  "RESUME_EVIDENCE",
  "USER_CONFIRMED",
  "AI_INFERRED",
  "JD_ONLY"
]);
export type GroundingState = z.infer<typeof GroundingStateSchema>;

export const ClaimTypeSchema = z.enum([
  "SKILL",
  "PROJECT",
  "EXPERIENCE",
  "EDUCATION",
  "CERTIFICATION",
  "ACHIEVEMENT"
]);
export type ClaimType = z.infer<typeof ClaimTypeSchema>;

export const EvidenceRecordSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  claimType: ClaimTypeSchema,
  claimText: z.string(),
  canonicalSkill: z.string().optional(),
  sourceSpan: z.string(), // Must be verbatim substring from raw resume text
  charStart: z.number().int().nonnegative().optional(),
  charEnd: z.number().int().nonnegative().optional(),
  contextType: z.enum(["PROJECT_OR_EXPERIENCE", "SKILL_LIST_ONLY"]),
  state: GroundingStateSchema.default("RESUME_EVIDENCE"),
  createdAt: z.string()
});
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const EducationItemSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string().optional(),
  graduationYear: z.string().optional(),
  gpa: z.string().optional()
});

export const ExperienceItemSchema = z.object({
  company: z.string(),
  role: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  highlights: z.array(z.string())
});

export const ProjectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  link: z.string().optional(),
  highlights: z.array(z.string())
});

export const ResumeProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  version: z.number().int().positive().default(1),
  candidateName: z.string(),
  targetRole: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(z.string()).default([]),
  summary: z.string().optional(),
  education: z.array(EducationItemSchema).default([]),
  experience: z.array(ExperienceItemSchema).default([]),
  projects: z.array(ProjectItemSchema).default([]),
  skills: z.record(z.string(), z.array(z.string())).default({}), // e.g. { "Languages": ["TypeScript", "Python"], ... }
  certifications: z.array(z.string()).default([]),
  rawText: z.string(),
  evidenceRecords: z.array(EvidenceRecordSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
