import { z } from "zod";

export const ValidatorViolationSchema = z.object({
  type: z.enum([
    "UNAPPROVED_ENTITY",
    "UNAPPROVED_NUMBER",
    "UNAPPROVED_DATE",
    "UNAPPROVED_METRIC",
    "INVALID_HEADING",
    "PROMPT_INJECTION_LEAK"
  ]),
  token: z.string(),
  context: z.string(),
  explanation: z.string()
});
export type ValidatorViolation = z.infer<typeof ValidatorViolationSchema>;

export const ValidatorReportSchema = z.object({
  valid: z.boolean(),
  fabricatedCount: z.number().int().nonnegative(),
  violations: z.array(ValidatorViolationSchema).default([]),
  approvedEvidenceIdsUsed: z.array(z.string()).default([]),
  userConfirmedSkillsIncluded: z.array(z.string()).default([]),
  timestamp: z.string()
});
export type ValidatorReport = z.infer<typeof ValidatorReportSchema>;

export const TailoredResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  analysisId: z.string(),
  summary: z.string(),
  skills: z.record(z.string(), z.array(z.string())),
  experience: z.array(z.object({
    company: z.string(),
    role: z.string(),
    location: z.string().optional(),
    period: z.string().optional(),
    highlights: z.array(z.string())
  })),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    highlights: z.array(z.string())
  })),
  education: z.array(z.object({
    institution: z.string(),
    degree: z.string(),
    graduationYear: z.string().optional(),
    gpa: z.string().optional()
  })),
  validatorReport: ValidatorReportSchema,
  latexSource: z.string().optional(),
  pdfUrl: z.string().optional(),
  createdAt: z.string()
});
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
