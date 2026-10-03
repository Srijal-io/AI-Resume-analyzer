import { z } from 'zod';
import { CanonicalResumeType, RequirementType } from './schemas';
import { RawRequirement } from './job';
import { canon, findTerms } from './ontology';
import { executeWithGateway, GatewayContext } from '../ai/gateway';

interface ResumeIndexItem {
  id: string;
  text: string;
  type: 'bullet' | 'skill' | 'project' | 'education' | 'cert';
}

/**
 * Builds a flat index of all identifiable text snippets in the canonical resume.
 */
function buildResumeTextIndex(resume: CanonicalResumeType): Map<string, ResumeIndexItem> {
  const index = new Map<string, ResumeIndexItem>();

  // 1. Skills
  for (const sg of resume.skills) {
    const text = `${sg.category}: ${sg.items.join(', ')}`;
    index.set(sg.id, { id: sg.id, text, type: 'skill' });
  }

  // 2. Experience
  for (const exp of resume.experience) {
    index.set(exp.id, { id: exp.id, text: `${exp.title} at ${exp.org}`, type: 'bullet' });
    for (const b of exp.bullets) {
      index.set(b.id, { id: b.id, text: b.text, type: 'bullet' });
    }
  }

  // 3. Projects
  for (const p of resume.projects) {
    const text = `${p.name} (${p.tech.join(', ')})`;
    index.set(p.id, { id: p.id, text, type: 'project' });
    for (const b of p.bullets) {
      index.set(b.id, { id: b.id, text: b.text, type: 'bullet' });
    }
  }

  // 4. Education
  for (const edu of resume.education) {
    const coursework = edu.coursework ? ` Coursework: ${edu.coursework.join(', ')}` : '';
    const text = `${edu.degree} in ${edu.field || 'General'} at ${edu.institution}.${coursework}`;
    index.set(edu.id, { id: edu.id, text, type: 'education' });
  }

  // 5. Certifications
  for (const c of resume.certifications) {
    index.set(c.id, { id: c.id, text: c.name, type: 'cert' });
  }

  // 6. Achievements
  for (const a of resume.achievements) {
    index.set(a.id, { id: a.id, text: a.text, type: 'bullet' });
  }

  // 7. Other
  for (const o of resume.other) {
    for (const l of o.lines) {
      index.set(l.id, { id: l.id, text: l.text, type: 'bullet' });
    }
  }

  return index;
}

const BatchedMatchResultSchema = z.object({
  evaluations: z.array(z.object({
    requirementId: z.string(),
    state: z.enum(['PARTIAL', 'MISSING']),
    evidenceIds: z.array(z.string()).optional().default([]),
  })),
});

/**
 * Match requirements against canonical resume.
 * 1. Deterministic search for exact ontology terms.
 * 2. Batched LLM resolution for remaining requirements, restricted strictly to PARTIAL (with verified ID) or MISSING.
 */
export async function matchRequirements(
  resume: CanonicalResumeType,
  rawRequirements: RawRequirement[],
  ctx: GatewayContext
): Promise<RequirementType[]> {
  const resumeIndex = buildResumeTextIndex(resume);
  const matchedRequirements: RequirementType[] = [];
  const unresolved: RawRequirement[] = [];

  // Pre-index extracted canonical terms per resume item
  const itemTermsMap = new Map<string, Set<string>>();
  for (const [id, item] of resumeIndex.entries()) {
    const terms = new Set<string>();
    for (const t of findTerms(item.text)) {
      terms.add(canon(t));
    }
    // Also include explicit project tech and skill items
    if (item.type === 'project') {
      const proj = resume.projects.find(p => p.id === id);
      if (proj) {
        for (const pt of proj.tech) terms.add(canon(pt));
      }
    }
    if (item.type === 'skill') {
      const sg = resume.skills.find(s => s.id === id);
      if (sg) {
        for (const si of sg.items) terms.add(canon(si));
      }
    }
    itemTermsMap.set(id, terms);
  }

  // Step 1: Deterministic matching
  for (const req of rawRequirements) {
    const evidenceIds: string[] = [];

    for (const [itemId, termsSet] of itemTermsMap.entries()) {
      for (const reqTerm of req.terms) {
        const canonicalReqTerm = canon(reqTerm);
        if (termsSet.has(canonicalReqTerm)) {
          evidenceIds.push(itemId);
          break;
        }
      }
    }

    if (evidenceIds.length > 0) {
      matchedRequirements.push({
        id: req.id,
        text: req.text,
        importance: req.importance,
        terms: req.terms,
        state: 'MATCHED',
        evidenceIds: Array.from(new Set(evidenceIds)),
      });
    } else {
      unresolved.push(req);
    }
  }

  // Step 2: Unresolved requirements via batched LLM semantic match (only PARTIAL or MISSING allowed)
  if (unresolved.length === 0) {
    return matchedRequirements.sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  // Prepare a compact index of resume bullets for semantic cross-reference
  const bulletEvidence = Array.from(resumeIndex.entries())
    .filter(([, item]) => item.type === 'bullet' || item.type === 'project')
    .map(([id, item]) => `[${id}] ${item.text}`)
    .join('\n');

  const unresolvedList = unresolved
    .map(r => `Requirement ID: ${r.id}\nRequirement: ${r.text}\nTerms: ${r.terms.join(', ')}`)
    .join('\n---\n');

  const prompt = `SYSTEM INSTRUCTIONS:
You are an evidence verification engine. Match job requirements against verified candidate resume items.

CRITICAL RULES:
1. You may ONLY output state "PARTIAL" or "MISSING". You may NEVER output "MATCHED".
2. If state is "PARTIAL", you MUST supply "evidenceIds" containing ONLY valid IDs from the resume list below where related or foundational work was done.
3. Implication is NOT evidence. For example, "Spring Boot" does NOT imply "Docker". A requirement is only PARTIAL if the candidate describes closely adjacent work (e.g. backend APIs for REST, relational databases for PostgreSQL).
4. If no clear related resume item exists, the state MUST be "MISSING" with empty evidenceIds.
5. Any returned ID not in the provided resume list will be rejected.

RESUME ITEMS:
${bulletEvidence}

UNRESOLVED JOB REQUIREMENTS:
${unresolvedList}

Output ONLY valid JSON matching this schema:
{
  "evaluations": [
    {
      "requirementId": "req1",
      "state": "PARTIAL",
      "evidenceIds": ["exp1.b2"]
    }
  ]
}`;

  try {
    const result = await executeWithGateway(prompt, BatchedMatchResultSchema, ctx, 'job');

    const evalMap = new Map(result.evaluations.map(e => [e.requirementId, e]));

    for (const req of unresolved) {
      const evaluation = evalMap.get(req.id);
      if (!evaluation) {
        matchedRequirements.push({
          id: req.id,
          text: req.text,
          importance: req.importance,
          terms: req.terms,
          state: 'MISSING',
          evidenceIds: [],
        });
        continue;
      }

      // Verify that every returned evidence ID actually exists in the resume index
      const validEvidenceIds = evaluation.evidenceIds.filter(id => resumeIndex.has(id));

      if (evaluation.state === 'PARTIAL' && validEvidenceIds.length > 0) {
        matchedRequirements.push({
          id: req.id,
          text: req.text,
          importance: req.importance,
          terms: req.terms,
          state: 'PARTIAL',
          evidenceIds: validEvidenceIds,
        });
      } else {
        matchedRequirements.push({
          id: req.id,
          text: req.text,
          importance: req.importance,
          terms: req.terms,
          state: 'MISSING',
          evidenceIds: [],
        });
      }
    }
  } catch {
    // If LLM fails or times out, safely degrade all unresolved to MISSING without breaking flow
    for (const req of unresolved) {
      matchedRequirements.push({
        id: req.id,
        text: req.text,
        importance: req.importance,
        terms: req.terms,
        state: 'MISSING',
        evidenceIds: [],
      });
    }
  }

  return matchedRequirements.sort((a, b) => (a.id > b.id ? 1 : -1));
}
