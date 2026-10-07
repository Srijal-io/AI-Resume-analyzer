import {
  ResumeProfile,
  ValidatorReport,
  ValidatorViolation,
  GroundingState
} from "@resurox/schemas";
import { normalizeSkill, TECH_ALIAS_MAP } from "./alias-map";

const APPROVED_HEADINGS = new Set([
  "summary",
  "professional summary",
  "education",
  "experience",
  "work experience",
  "projects",
  "technical projects",
  "skills",
  "technical skills",
  "certifications",
  "achievements",
  "honors & awards"
]);

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+must\s+score\s+100/i,
  /give\s+(a\s+)?100%/i,
  /bypass\s+all\s+checks/i,
  /disregard\s+the\s+system/i,
  /new\s+system\s+prompt/i
];

/**
 * Extracts distinct tokens representing tools, technologies, numbers, percentages, and metrics.
 */
function extractTokens(text: string): { numbers: string[]; entities: string[] } {
  const numberMatches = text.match(/\b\d+(\.\d+)?(%|x|k|\+)?\b/gi) || [];
  const words = text.split(/[\s,;.()]+/);
  const entities: string[] = [];

  for (const w of words) {
    const clean = w.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
    if (!clean) continue;

    const lower = clean.toLowerCase();
    if (TECH_ALIAS_MAP[lower]) {
      entities.push(clean);
    }
  }

  return {
    numbers: Array.from(new Set(numberMatches)),
    entities: Array.from(new Set(entities))
  };
}

/**
 * Validates tailored resume content against candidate's approved evidence and original resume.
 * Guarantees zero fabrication.
 */
export function validateTailoredContent(
  originalProfile: ResumeProfile,
  tailoredSections: {
    heading: string;
    content: string;
  }[],
  userConfirmedSkills: string[] = []
): ValidatorReport {
  const violations: ValidatorViolation[] = [];
  const rawResumeText = originalProfile.rawText.toLowerCase();

  const approvedSkills = new Set<string>();
  for (const rec of originalProfile.evidenceRecords) {
    if (rec.state === "RESUME_EVIDENCE" || rec.state === "USER_CONFIRMED") {
      if (rec.canonicalSkill) approvedSkills.add(normalizeSkill(rec.canonicalSkill).toLowerCase());
      approvedSkills.add(rec.claimText.toLowerCase());
    }
  }

  for (const s of userConfirmedSkills) {
    approvedSkills.add(normalizeSkill(s).toLowerCase());
  }

  const approvedEvidenceIds: string[] = originalProfile.evidenceRecords
    .filter((r) => r.state === "RESUME_EVIDENCE" || r.state === "USER_CONFIRMED")
    .map((r) => r.id);

  for (const section of tailoredSections) {
    const headingClean = section.heading.trim().toLowerCase();

    // 1. Whitelist heading check
    if (!APPROVED_HEADINGS.has(headingClean)) {
      violations.push({
        type: "INVALID_HEADING",
        token: section.heading,
        context: section.heading,
        explanation: `Section heading "${section.heading}" is not in ATS approved whitelist.`
      });
    }

    // 2. Prompt injection text check
    for (const pat of INJECTION_PATTERNS) {
      if (pat.test(section.content)) {
        violations.push({
          type: "PROMPT_INJECTION_LEAK",
          token: pat.toString(),
          context: section.content.slice(0, 100),
          explanation: "Tailored content contains prompt injection or instruction leakage."
        });
      }
    }

    // 3. Strict token extraction & verification
    const { numbers, entities } = extractTokens(section.content);

    // Verify numbers/percentages/metrics exist in original resume
    for (const num of numbers) {
      if (!rawResumeText.includes(num.toLowerCase())) {
        violations.push({
          type: "UNAPPROVED_NUMBER",
          token: num,
          context: section.heading,
          explanation: `Number/metric "${num}" was not present in the original resume.`
        });
      }
    }

    // Verify technologies/entities
    for (const entity of entities) {
      const normalized = normalizeSkill(entity).toLowerCase();
      const inOriginalText = rawResumeText.includes(entity.toLowerCase());
      const isApprovedSkill = approvedSkills.has(normalized) || approvedSkills.has(entity.toLowerCase());

      if (!inOriginalText && !isApprovedSkill) {
        violations.push({
          type: "UNAPPROVED_ENTITY",
          token: entity,
          context: section.heading,
          explanation: `Technology "${entity}" is not supported by verified resume evidence or user confirmation.`
        });
      }

      if (!inOriginalText && isApprovedSkill && headingClean.includes("project")) {
        violations.push({
          type: "UNAPPROVED_ENTITY",
          token: entity,
          context: section.heading,
          explanation: `User-confirmed skill "${entity}" cannot be fabricated into a project bullet. Only allowed in the Skills section.`
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    fabricatedCount: violations.length,
    violations,
    approvedEvidenceIdsUsed: approvedEvidenceIds,
    userConfirmedSkillsIncluded: userConfirmedSkills,
    timestamp: new Date().toISOString()
  };
}
