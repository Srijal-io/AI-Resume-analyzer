import { EvidenceRecord, GroundingState } from "@resurox/schemas";
import { normalizeSkill, areSkillsEquivalent } from "./alias-map";

export interface EvidenceVerificationResult {
  verified: boolean;
  reason?: string;
  sourceSpanValid: boolean;
  charStart?: number;
  charEnd?: number;
}

/**
 * Validates that an evidence record has an authentic, verbatim source span
 * inside the candidate's raw resume text.
 */
export function verifyEvidenceSpan(
  rawResumeText: string,
  sourceSpan: string
): EvidenceVerificationResult {
  if (!rawResumeText || !sourceSpan) {
    return {
      verified: false,
      reason: "Missing resume text or source span",
      sourceSpanValid: false
    };
  }

  const normalizedResume = rawResumeText.replace(/\r\n/g, "\n");
  const normalizedSpan = sourceSpan.replace(/\r\n/g, "\n").trim();

  if (normalizedSpan.length < 2) {
    return {
      verified: false,
      reason: "Source span is too short to constitute verifiable evidence",
      sourceSpanValid: false
    };
  }

  const index = normalizedResume.indexOf(normalizedSpan);
  if (index === -1) {
    // Try case-insensitive fallback check
    const lowerResume = normalizedResume.toLowerCase();
    const lowerSpan = normalizedSpan.toLowerCase();
    const lowerIndex = lowerResume.indexOf(lowerSpan);

    if (lowerIndex === -1) {
      return {
        verified: false,
        reason: "Source span not found as a verbatim substring in the resume text",
        sourceSpanValid: false
      };
    }

    return {
      verified: true,
      sourceSpanValid: true,
      charStart: lowerIndex,
      charEnd: lowerIndex + normalizedSpan.length
    };
  }

  return {
    verified: true,
    sourceSpanValid: true,
    charStart: index,
    charEnd: index + normalizedSpan.length
  };
}

/**
 * Finds all verified evidence records from candidate's profile that support a target skill/requirement.
 */
export function findSupportingEvidence(
  targetSkillOrText: string,
  evidenceRecords: EvidenceRecord[],
  rawResumeText: string
): EvidenceRecord[] {
  const normalizedTarget = normalizeSkill(targetSkillOrText);

  return evidenceRecords.filter((rec) => {
    // Must be RESUME_EVIDENCE or USER_CONFIRMED
    if (rec.state !== "RESUME_EVIDENCE" && rec.state !== "USER_CONFIRMED") {
      return false;
    }

    // Verify source span against raw text for resume evidence
    if (rec.state === "RESUME_EVIDENCE") {
      const spanCheck = verifyEvidenceSpan(rawResumeText, rec.sourceSpan);
      if (!spanCheck.verified) return false;
    }

    // Check canonical skill equivalence or text inclusion
    if (rec.canonicalSkill && areSkillsEquivalent(rec.canonicalSkill, normalizedTarget)) {
      return true;
    }

    if (rec.claimText.toLowerCase().includes(targetSkillOrText.toLowerCase())) {
      return true;
    }

    return false;
  });
}
