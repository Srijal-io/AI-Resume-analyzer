import {
  ExtractedRequirementsPayload,
  ProposedMappingsPayload,
  ExplanationPayload,
  TailoredResumePayload
} from "./types.js";
import { TECH_ALIAS_MAP, normalizeSkill } from "@resurox/matching";

/**
 * Deterministic Mock Provider for offline tests, fast local dev, and cold-start fallback.
 */
export class MockProvider {
  static extractRequirements(rawJd: string): ExtractedRequirementsPayload {
    const text = rawJd.toLowerCase();
    const requirements: ExtractedRequirementsPayload["requirements"] = [];

    // Scan for common full stack technologies in the JD
    const candidates: [string, "LANGUAGE" | "FRAMEWORK" | "DATABASE" | "TOOL"][] = [
      ["typescript", "LANGUAGE"],
      ["javascript", "LANGUAGE"],
      ["python", "LANGUAGE"],
      ["react", "FRAMEWORK"],
      ["next.js", "FRAMEWORK"],
      ["node.js", "FRAMEWORK"],
      ["express", "FRAMEWORK"],
      ["postgresql", "DATABASE"],
      ["mongodb", "DATABASE"],
      ["supabase", "DATABASE"],
      ["docker", "TOOL"],
      ["aws", "TOOL"],
      ["git", "TOOL"],
      ["tailwind", "FRAMEWORK"]
    ];

    for (const [tech, cat] of candidates) {
      if (text.includes(tech)) {
        const canonical = normalizeSkill(tech);
        const isRequired = !text.includes(`preferred: ${tech}`) && !text.includes(`plus: ${tech}`);
        requirements.push({
          text: `Proficiency in ${canonical}`,
          kind: isRequired ? "REQUIRED" : "PREFERRED",
          canonicalSkill: canonical,
          category: cat
        });
      }
    }

    if (requirements.length === 0) {
      requirements.push(
        { text: "Hands-on experience with modern Web Development", kind: "REQUIRED", category: "GENERAL" },
        { text: "Proficiency in JavaScript or TypeScript", kind: "REQUIRED", canonicalSkill: "TypeScript", category: "LANGUAGE" },
        { text: "Experience with Relational Databases (SQL)", kind: "REQUIRED", canonicalSkill: "PostgreSQL", category: "DATABASE" }
      );
    }

    return { requirements };
  }

  static proposeMappings(
    requirements: { id: string; canonicalSkill?: string; text: string }[],
    rawResumeText: string
  ): ProposedMappingsPayload {
    const lowerResume = rawResumeText.toLowerCase();
    const mappings: ProposedMappingsPayload["mappings"] = [];

    for (const req of requirements) {
      const skill = req.canonicalSkill ? req.canonicalSkill.toLowerCase() : "";
      const textMatch = req.text.toLowerCase();

      let matched = false;
      let span = "";

      if (skill && lowerResume.includes(skill)) {
        matched = true;
        span = req.canonicalSkill!;
      } else if (lowerResume.includes("typescript") && textMatch.includes("typescript")) {
        matched = true;
        span = "TypeScript";
      } else if (lowerResume.includes("react") && textMatch.includes("react")) {
        matched = true;
        span = "React";
      } else if (lowerResume.includes("postgresql") && textMatch.includes("sql")) {
        matched = true;
        span = "PostgreSQL";
      }

      if (matched) {
        mappings.push({
          requirementId: req.id,
          proposedState: "FULL",
          candidateEvidenceSpans: [span],
          notes: `Verified in candidate resume (${span})`
        });
      } else {
        mappings.push({
          requirementId: req.id,
          proposedState: "MISSING",
          candidateEvidenceSpans: [],
          notes: "No direct evidence found in resume"
        });
      }
    }

    return { mappings };
  }

  static generateExplanation(
    score: number,
    strengths: string[],
    gaps: string[]
  ): ExplanationPayload {
    return {
      explanation: `You achieved a grounded match score of ${score}%. Your profile demonstrates strong verified competency in core full-stack technologies including ${strengths.slice(0, 3).join(", ") || "core fundamentals"}. Missing or unverified requirements such as ${gaps.slice(0, 2).join(", ") || "none"} can be clarified in the gap confirmation step.`,
      keyStrengths: strengths,
      primaryGaps: gaps
    };
  }

  static tailorResume(
    candidateName: string,
    targetTitle: string,
    company: string,
    existingSkills: string[],
    confirmedSkills: string[]
  ): TailoredResumePayload {
    const allSkills = Array.from(new Set([...existingSkills, ...confirmedSkills]));

    return {
      summary: `Proactive Computer Science undergraduate and Full Stack Developer with hands-on experience designing responsive web applications. Prepared to deliver immediate value as a ${targetTitle} at ${company}.`,
      sections: [
        {
          heading: "Technical Skills",
          content: `Languages & Frameworks: ${allSkills.join(", ")}`
        },
        {
          heading: "Projects",
          content: "Full-Stack Web Application: Developed scalable REST APIs and modern React frontends with verified performance optimizations."
        },
        {
          heading: "Education",
          content: "Bachelor of Technology in Computer Science & Engineering (3rd Year Undergrad)"
        }
      ]
    };
  }
}
