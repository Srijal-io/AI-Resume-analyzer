import { ProvenanceState } from '../types/provenance';
import { SourceBulletItem, verifyClaim } from '../matching/claimVerifier';

export interface ChangeReportItem {
  id: string;
  section: string;
  originalText: string;
  rewrittenText: string;
  provenance: ProvenanceState;
  verified: boolean;
  notes?: string;
}

export interface FormatGenerateOutput {
  sessionId: string;
  changeReport: ChangeReportItem[];
  formattedBullets: Array<{ id: string; text: string; section: string }>;
  verifiedAll: boolean;
}

/**
 * Executes bullet rewrite step with strict Claim Verifier gating (Phase V2-4).
 * If a generated rewrite attempts to smuggle unverified claims,
 * it falls back automatically to the original truthful text.
 */
export function generateFormatAndChangeReport(
  bullets: Array<{ id: string; text: string; section: string; candidateRewrite?: string }>,
  allowedSkills: Set<string>,
  provenanceMap: Record<string, ProvenanceState>
): FormatGenerateOutput {
  const changeReport: ChangeReportItem[] = [];
  const formattedBullets: Array<{ id: string; text: string; section: string }> = [];

  for (const b of bullets) {
    const prov = provenanceMap[b.id] || 'RESUME_EVIDENCE';

    // Source numbers extracted from original
    const sourceNumbers = (b.text.match(/\d+(?:\.\d+)?%?/g) || []);
    const sourceItem: SourceBulletItem = {
      id: b.id,
      text: b.text,
      technologies: Array.from(allowedSkills),
      numbers: sourceNumbers,
      dates: [],
    };

    let targetText = b.candidateRewrite || b.text;
    const verification = verifyClaim(targetText, sourceItem, allowedSkills, prov);

    if (!verification.valid) {
      // Revert to original on verification failure (fail closed)
      targetText = verification.fallbackText;
    }

    const changed = targetText !== b.text;

    changeReport.push({
      id: b.id,
      section: b.section,
      originalText: b.text,
      rewrittenText: targetText,
      provenance: prov,
      verified: verification.valid,
      notes: changed
        ? (verification.valid ? 'Rewritten and verified against source evidence' : 'Verification failed: ungrounded claim reverted')
        : 'Kept original text',
    });

    formattedBullets.push({
      id: b.id,
      section: b.section,
      text: targetText,
    });
  }

  const verifiedAll = changeReport.every((c) => c.verified || c.rewrittenText === c.originalText);

  return {
    sessionId: 'session_active',
    changeReport,
    formattedBullets,
    verifiedAll,
  };
}
