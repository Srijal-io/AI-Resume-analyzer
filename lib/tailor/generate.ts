import { z } from 'zod';
import {
  CanonicalResumeType,
  RequirementType,
  AnswerType,
  MetricAnswerType,
  BulletChangeType,
  AddedSkillType,
  ChangeReportType,
  TailorGenerateResponseType,
  ProvenanceType,
} from './schemas';
import { verifyBullet, assertSkillsAllowed, assertCarryOver, assertNoStructuralDrift } from './verify';
import { canon, findTerms } from './ontology';
import { executeWithGateway, GatewayContext } from '../ai/gateway';
import { securityLogger } from '../security/logger';

const BulletRewriteOutputSchema = z.object({
  rewrittenText: z.string().max(500),
});

/**
 * Extracts raw numbers, percentages, multipliers, and metrics from arbitrary text.
 */
function extractNumbers(text: string): string[] {
  return (
    text
      .match(/\d+(?:[.,]\d+)?\s?(?:%|k|m|x|\+)?/gi)
      ?.map((n) => n.replace(/\s/g, '').toLowerCase()) ?? []
  );
}

/**
 * Deep clones a canonical resume.
 */
function cloneResume(resume: CanonicalResumeType): CanonicalResumeType {
  return JSON.parse(JSON.stringify(resume));
}

/**
 * Core Tailor Generation Engine (Phase W3).
 * Enforces the Resurox Invariant:
 * 1. Zero-fabrication: unconfirmed skills/metrics are never introduced.
 * 2. Strict Claim Verifier on every rewritten bullet.
 * 3. Fail-closed: on verifier rejection, fallback safely to original bullet.
 * 4. Full document verification (carry-over, zero structural drift, skills allowed).
 */
export async function generateTailoredResume(
  originalResume: CanonicalResumeType,
  requirements: RequirementType[],
  answers: AnswerType[],
  metrics: MetricAnswerType[] = [],
  ctx: GatewayContext,
  targetJobTitle?: string
): Promise<TailorGenerateResponseType> {
  const tailoredResume = cloneResume(originalResume);
  const changes: BulletChangeType[] = [];
  const addedSkills: AddedSkillType[] = [];
  const allowedSkillsSet = new Set<string>();

  // Populate initially allowed skills from original resume
  for (const group of originalResume.skills) {
    for (const item of group.items) {
      allowedSkillsSet.add(canon(item));
    }
  }

  // Map requirements by ID for fast lookup
  const reqMap = new Map<string, RequirementType>();
  for (const r of requirements) {
    reqMap.set(r.id, r);
  }

  // 1. Process Answers for Skills (T1 & T2)
  const yesAnswers = answers.filter((a) => a.answer === 'YES');
  const bulletsTargetedForT2 = new Map<string, { answer: AnswerType; req?: RequirementType }>();

  for (const ans of yesAnswers) {
    const req = reqMap.get(ans.requirementId);
    const skillTerms = req?.terms && req.terms.length > 0 ? req.terms : (req ? [req.text] : []);

    const isT2 = Boolean(ans.linkedItemId && ans.description && ans.description.trim().length > 0);
    const provenance: ProvenanceType = isT2 ? 'USER_CONFIRMED_T2' : 'USER_CONFIRMED_T1';

    for (const term of skillTerms) {
      const canonicalTerm = canon(term);
      if (!allowedSkillsSet.has(canonicalTerm)) {
        allowedSkillsSet.add(canonicalTerm);

        // Find or create category in tailoredResume.skills
        let targetGroup = tailoredResume.skills.find((g) =>
          /technical|skills|technologies|tools|languages|frameworks/i.test(g.category)
        );

        if (!targetGroup) {
          if (tailoredResume.skills.length > 0) {
            targetGroup = tailoredResume.skills[0];
          } else {
            targetGroup = {
              id: 'skill-verified',
              category: 'Technical Skills',
              items: [],
            };
            tailoredResume.skills.push(targetGroup);
          }
        }

        // Only add if not already in items
        if (!targetGroup.items.some((it) => canon(it) === canonicalTerm)) {
          targetGroup.items.push(term);
          addedSkills.push({
            category: targetGroup.category,
            name: term,
            provenance,
            context: ans.context,
          });
        }
      }
    }

    if (isT2 && ans.linkedItemId) {
      bulletsTargetedForT2.set(ans.linkedItemId, { answer: ans, req });
    }
  }

  // Map metric answers by bullet ID
  const metricMap = new Map<string, MetricAnswerType>();
  for (const m of metrics) {
    if (m.bulletId && m.metric.trim().length > 0) {
      metricMap.set(m.bulletId, m);
    }
  }

  // 2. Iterate and Rewrite Candidate Bullets
  let totalBulletsCount = 0;
  let unchangedBulletsCount = 0;

  // Helper to process a single bullet rewrite
  const processBullet = async (
    bulletId: string,
    originalText: string,
    section: 'experience' | 'projects' | 'achievements' | 'other',
    parentTitle: string
  ): Promise<string> => {
    totalBulletsCount++;
    const t2Data = bulletsTargetedForT2.get(bulletId);
    const metricData = metricMap.get(bulletId);

    // If not targeted, keep unchanged
    if (!t2Data && !metricData) {
      unchangedBulletsCount++;
      return originalText;
    }

    // Determine allowed extras
    const allowedExtraTerms: string[] = [];
    const allowedNumbers: string[] = [];

    let reason = '';
    let provenance: ProvenanceType = 'RESUME_EVIDENCE';

    if (t2Data) {
      provenance = 'USER_CONFIRMED_T2';
      reason = `Integrated confirmed evidence for ${t2Data.req?.text || 'requirement'}`;
      if (t2Data.req?.terms) {
        allowedExtraTerms.push(...t2Data.req.terms);
      }
      if (t2Data.answer.description) {
        allowedExtraTerms.push(...findTerms(t2Data.answer.description));
        allowedNumbers.push(...extractNumbers(t2Data.answer.description));
      }
    }

    if (metricData) {
      const metricNumbers = extractNumbers(metricData.metric);
      allowedNumbers.push(...metricNumbers);
      allowedExtraTerms.push(...findTerms(metricData.metric));
      reason = reason ? `${reason}; Quantified with metric` : `Quantified with user-provided metric: ${metricData.metric}`;
      if (!t2Data) {
        provenance = 'USER_CONFIRMED_T1';
      }
    }

    // Generate candidate rewrite
    let candidateRewrite = originalText;

    try {
      const prompt = `SYSTEM INSTRUCTIONS:
You are a Constrained ATS Resume Bullet Editor.
Your job is to rewrite a single bullet point by incorporating verified candidate evidence while preserving 100% factual accuracy.

CRITICAL INVARIANTS:
1. NEVER invent, extrapolate, or introduce technologies, tools, libraries, or certifications not in the Original Bullet or Verified Evidence.
2. NEVER introduce ungrounded metrics or numbers.
3. NEVER add unearned seniority words (e.g. led, architected, managed, pioneered, founded) if not present in the original bullet.
4. Output concise, action-oriented, professional bullet phrasing.

ORIGINAL BULLET:
"${originalText}"

VERIFIED USER EVIDENCE:
${t2Data?.answer.description ? `Experience: "${t2Data.answer.description}"` : 'None'}
${metricData?.metric ? `Quantified Metric: "${metricData.metric}"` : 'None'}
${targetJobTitle ? `Target Role Context: "${targetJobTitle}"` : ''}

Output ONLY valid JSON matching this schema:
{
  "rewrittenText": "Enhanced concise bullet point incorporating only the verified evidence"
}`;

      // Call AI Gateway with fallback to safe deterministic synthesis
      const res = await executeWithGateway(
        prompt,
        BulletRewriteOutputSchema,
        ctx,
        'explanation'
      );

      if (res && res.rewrittenText && res.rewrittenText.trim().length > 0) {
        candidateRewrite = res.rewrittenText.trim();
      }
    } catch (err: unknown) {
      // Deterministic graceful fallback synthesizer if AI call fails or in test/mock mode
      securityLogger.warn('AI rewrite call failed, using deterministic synthesis', {
        requestId: ctx.requestId,
        note: `bulletId=${bulletId}, err=${err instanceof Error ? err.message : String(err)}`,
      });

      let synthesized = originalText.replace(/[.]+$/, '');
      if (metricData?.metric) {
        synthesized += `, ${metricData.metric.toLowerCase().startsWith('by') ? '' : 'achieving '}${metricData.metric}`;
      }
      if (t2Data?.answer.description) {
        synthesized += `; leveraged ${t2Data.answer.description}`;
      }
      synthesized += '.';
      candidateRewrite = synthesized;
    }

    // 3. Claim Verifier Execution (Deterministic Gate)
    const verifyResult = verifyBullet({
      source: originalText,
      output: candidateRewrite,
      allowedExtraTerms,
      allowedNumbers,
    });

    if (verifyResult.ok) {
      changes.push({
        id: bulletId,
        section,
        parentTitle,
        original: originalText,
        rewritten: candidateRewrite,
        provenance,
        reason,
        status: 'APPROVED_BY_VERIFIER',
      });
      return candidateRewrite;
    } else {
      // FAIL CLOSED: Revert to original bullet text
      securityLogger.warn('Claim Verifier rejected candidate rewrite', {
        requestId: ctx.requestId,
        note: `bulletId=${bulletId}, reasons=${verifyResult.reasons.join(', ')}`,
      });

      unchangedBulletsCount++;
      changes.push({
        id: bulletId,
        section,
        parentTitle,
        original: originalText,
        rewritten: originalText,
        provenance: 'RESUME_EVIDENCE',
        reason: `Reverted to original: Claim Verifier rejected rewrite (${verifyResult.reasons.join(', ')})`,
        status: 'UNCHANGED_FALLBACK',
        reasons: verifyResult.reasons,
      });
      return originalText;
    }
  };

  // Process Experience Bullets
  for (const exp of tailoredResume.experience) {
    for (let i = 0; i < exp.bullets.length; i++) {
      const b = exp.bullets[i];
      const newText = await processBullet(b.id, b.text, 'experience', `${exp.title} at ${exp.org}`);
      exp.bullets[i].text = newText;
    }
  }

  // Process Project Bullets
  for (const proj of tailoredResume.projects) {
    for (let i = 0; i < proj.bullets.length; i++) {
      const b = proj.bullets[i];
      const newText = await processBullet(b.id, b.text, 'projects', proj.name);
      proj.bullets[i].text = newText;
    }
  }

  // Process Achievements
  for (let i = 0; i < tailoredResume.achievements.length; i++) {
    const ach = tailoredResume.achievements[i];
    const newText = await processBullet(ach.id, ach.text, 'achievements', 'Achievements');
    tailoredResume.achievements[i].text = newText;
  }

  // Process Other Sections
  for (const oth of tailoredResume.other) {
    for (let i = 0; i < oth.lines.length; i++) {
      const line = oth.lines[i];
      const newText = await processBullet(line.id, line.text, 'other', oth.heading);
      oth.lines[i].text = newText;
    }
  }

  // 4. Invariant Assertions
  const carryOverCheck = assertCarryOver(originalResume, tailoredResume);
  if (!carryOverCheck.ok) {
    throw new Error(`Integrity violation: Dropped bullets detected: ${carryOverCheck.missingIds.join(', ')}`);
  }

  const structuralCheck = assertNoStructuralDrift(originalResume, tailoredResume);
  if (!structuralCheck.ok) {
    throw new Error(`Integrity violation: Structural drift detected: ${structuralCheck.drifts.join(', ')}`);
  }

  const allSkills = tailoredResume.skills.flatMap((s) => s.items);
  const skillsCheck = assertSkillsAllowed(allSkills, allowedSkillsSet);
  if (!skillsCheck.ok) {
    throw new Error(`Integrity violation: Disallowed skills found: ${skillsCheck.disallowed.join(', ')}`);
  }

  // 5. Construct Change Report
  const provenanceBreakdown: Record<string, number> = {
    RESUME_EVIDENCE: 0,
    USER_CONFIRMED_T1: 0,
    USER_CONFIRMED_T2: 0,
    USER_PROVIDED_ENTRY: 0,
    USER_EDITED: 0,
  };

  for (const ch of changes) {
    provenanceBreakdown[ch.provenance] = (provenanceBreakdown[ch.provenance] || 0) + 1;
  }
  for (const sk of addedSkills) {
    provenanceBreakdown[sk.provenance] = (provenanceBreakdown[sk.provenance] || 0) + 1;
  }

  const approvedRewrites = changes.filter((c) => c.status === 'APPROVED_BY_VERIFIER');
  const summary = `Generated tailored resume draft with ${approvedRewrites.length} verified bullet rewrites and ${addedSkills.length} confirmed skill additions. 0% ungrounded claims verified by Claim Verifier.`;

  const changeReport: ChangeReportType = {
    summary,
    changes,
    addedSkills,
    unchangedBulletsCount,
    totalBulletsCount,
    provenanceBreakdown,
    zeroHallucinationVerified: true,
  };

  return {
    tailoredResume,
    changeReport,
  };
}
