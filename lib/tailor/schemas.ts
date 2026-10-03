import { z } from "zod";

export const Bullet = z.object({
  id: z.string(),
  text: z.string().max(500),
});

export const CanonicalResume = z.object({
  basics: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    location: z.string().max(100).optional(),
    links: z.array(z.object({ label: z.string(), url: z.string() })).max(6),
  }),
  summary: z.string().max(600).optional(),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string(),
    degree: z.string(),
    field: z.string().optional(),
    start: z.string().optional(),
    end: z.string().optional(),
    grade: z.string().optional(),
    coursework: z.array(z.string()).optional(),
  })),
  experience: z.array(z.object({
    id: z.string(),
    org: z.string(),
    title: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    location: z.string().optional(),
    bullets: z.array(Bullet),
  })),
  projects: z.array(z.object({
    id: z.string(),
    name: z.string(),
    tech: z.array(z.string()),
    link: z.string().optional(),
    bullets: z.array(Bullet),
  })),
  skills: z.array(z.object({
    id: z.string(),
    category: z.string(),
    items: z.array(z.string()),
  })),
  certifications: z.array(z.object({
    id: z.string(),
    name: z.string(),
    issuer: z.string().optional(),
    date: z.string().optional(),
  })),
  achievements: z.array(Bullet),
  // Catch-all so nothing from the old resume is lost
  other: z.array(z.object({
    id: z.string(),
    heading: z.string(),
    lines: z.array(Bullet),
  })),
});

export const Requirement = z.object({
  id: z.string(),
  text: z.string(),
  importance: z.enum(["must", "nice"]),
  terms: z.array(z.string()),
  state: z.enum(["MATCHED", "PARTIAL", "MISSING"]),
  evidenceIds: z.array(z.string()),
});

export const Answer = z.object({
  requirementId: z.string(),
  answer: z.enum(["YES", "LEARNING", "NO"]),
  context: z.enum(["PROJECT", "WORK", "COURSEWORK", "PERSONAL"]).optional(),
  linkedItemId: z.string().optional(),
  description: z.string().max(600).optional(),
});

export const MetricAnswer = z.object({
  bulletId: z.string(),
  metric: z.string().max(120),
});

export const Provenance = z.enum([
  "RESUME_EVIDENCE",
  "USER_CONFIRMED_T1",
  "USER_CONFIRMED_T2",
  "USER_PROVIDED_ENTRY",
  "USER_EDITED",
]);

export const Question = z.object({
  id: z.string(),
  type: z.enum(["MISSING_SKILL", "PARTIAL_MATCH", "IMPROVEMENT_METRIC"]),
  requirementId: z.string().optional(),
  bulletId: z.string().optional(),
  term: z.string().optional(),
  title: z.string(),
  prompt: z.string(),
  evidenceText: z.string().optional(),
  importance: z.enum(["must", "nice"]).optional(),
  suggestedContexts: z.array(z.enum(["PROJECT", "WORK", "COURSEWORK", "PERSONAL"])).optional(),
});

export const PrepareResponseSchema = z.object({
  resume: CanonicalResume,
  requirements: z.array(Requirement),
  questions: z.array(Question),
});

export type BulletType = z.infer<typeof Bullet>;
export type CanonicalResumeType = z.infer<typeof CanonicalResume>;
export type RequirementType = z.infer<typeof Requirement>;
export type AnswerType = z.infer<typeof Answer>;
export type MetricAnswerType = z.infer<typeof MetricAnswer>;
export type ProvenanceType = z.infer<typeof Provenance>;
export type QuestionType = z.infer<typeof Question>;
export type PrepareResponseType = z.infer<typeof PrepareResponseSchema>;

/**
 * Assigns stable, deterministic IDs across CanonicalResume hierarchy.
 * Follows Rule 4.2: the model does NOT create IDs.
 */
export function assignDeterministicIds(resume: CanonicalResumeType): CanonicalResumeType {
  return {
    ...resume,
    education: resume.education.map((edu, idx) => ({
      ...edu,
      id: `edu${idx + 1}`,
    })),
    experience: resume.experience.map((exp, eIdx) => ({
      ...exp,
      id: `exp${eIdx + 1}`,
      bullets: exp.bullets.map((b, bIdx) => ({
        ...b,
        id: `exp${eIdx + 1}.b${bIdx + 1}`,
      })),
    })),
    projects: resume.projects.map((proj, pIdx) => ({
      ...proj,
      id: `proj${pIdx + 1}`,
      bullets: proj.bullets.map((b, bIdx) => ({
        ...b,
        id: `proj${pIdx + 1}.b${bIdx + 1}`,
      })),
    })),
    skills: resume.skills.map((skillGroup, sIdx) => ({
      ...skillGroup,
      id: `skill${sIdx + 1}`,
    })),
    certifications: resume.certifications.map((cert, cIdx) => ({
      ...cert,
      id: `cert${cIdx + 1}`,
    })),
    achievements: resume.achievements.map((ach, aIdx) => ({
      ...ach,
      id: `ach${aIdx + 1}`,
    })),
    other: resume.other.map((oth, oIdx) => ({
      ...oth,
      id: `oth${oIdx + 1}`,
      lines: oth.lines.map((b, bIdx) => ({
        ...b,
        id: `oth${oIdx + 1}.b${bIdx + 1}`,
      })),
    })),
  };
}
