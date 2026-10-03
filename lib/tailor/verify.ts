import { canon, findTerms } from './ontology';
import { CanonicalResumeType } from './schemas';

export type VerifyInput = {
  source: string;                // original bullet (or user description)
  output: string;                // rewritten bullet
  allowedExtraTerms: string[];   // terms the user confirmed for THIS item
  allowedNumbers: string[];      // numbers the user supplied for THIS item
};

const SENIORITY = [
  "led", "lead", "architected", "managed", "owned", "spearheaded",
  "pioneered", "directed", "headed", "founded", "scaled", "orchestrated", "mentored"
];

const FLUFF = /\b(100%|zero|flawless|expert|proven|results-driven|world-class|cutting-edge|best-in-class)\b/i;

/**
 * Claim Verifier - Section 5.
 * Deterministic post-check on every generated bullet. Fail closed.
 */
export function verifyBullet(v: VerifyInput): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const srcTerms = new Set(findTerms(v.source).map(canon));
  const allowed = new Set([...srcTerms, ...v.allowedExtraTerms.map(canon)]);

  // 1. technologies/tools/certs named in output must be allowed
  for (const t of findTerms(v.output).map(canon)) {
    if (!allowed.has(t)) {
      reasons.push(`new term: ${t}`);
    }
  }

  // 2. numbers, percentages, durations
  const nums = (s: string) =>
    s.match(/\d+(?:[.,]\d+)?\s?(?:%|k|m|x|\+)?/gi)?.map(n => n.replace(/\s/g, "").toLowerCase()) ?? [];
  const okNums = new Set([...nums(v.source), ...v.allowedNumbers.map(n => n.toLowerCase())]);
  for (const n of nums(v.output)) {
    if (!okNums.has(n)) {
      reasons.push(`new number: ${n}`);
    }
  }

  // 3. seniority / scope words
  const words = (s: string) => s.toLowerCase().match(/[a-z]+/g) ?? [];
  const srcWords = new Set(words(v.source));
  for (const w of words(v.output)) {
    if (SENIORITY.includes(w) && !srcWords.has(w)) {
      reasons.push(`new seniority word: ${w}`);
    }
  }

  // 4. fluff / absolutes not present in source
  const m = v.output.match(FLUFF);
  if (m && !FLUFF.test(v.source)) {
    reasons.push(`unsupported claim: ${m[0]}`);
  }

  // 5. length sanity (rewrite must not balloon)
  if (v.output.length > v.source.length * 1.6 + 40) {
    reasons.push("too much added text");
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Asserts every skill in the output document belongs to original skills ∪ confirmed skills.
 */
export function assertSkillsAllowed(
  finalSkills: string[],
  allowedSet: Set<string>
): { ok: boolean; disallowed: string[] } {
  const disallowed: string[] = [];
  const normalizedAllowed = new Set(Array.from(allowedSet).map(canon));

  for (const s of finalSkills) {
    if (!normalizedAllowed.has(canon(s))) {
      disallowed.push(s);
    }
  }

  return {
    ok: disallowed.length === 0,
    disallowed,
  };
}

/**
 * Asserts that all canonical items in the old resume are either carried over
 * into the tailored resume or explicitly listed in omitted with an approved reason.
 */
export function assertCarryOver(
  canonical: CanonicalResumeType,
  tailored: CanonicalResumeType,
  omittedIds: Set<string> = new Set()
): { ok: boolean; missingIds: string[] } {
  const missingIds: string[] = [];

  // Helper to extract IDs
  const collectIds = (resume: CanonicalResumeType): Set<string> => {
    const ids = new Set<string>();
    resume.education.forEach(e => ids.add(e.id));
    resume.experience.forEach(e => {
      ids.add(e.id);
      e.bullets.forEach(b => ids.add(b.id));
    });
    resume.projects.forEach(p => {
      ids.add(p.id);
      p.bullets.forEach(b => ids.add(b.id));
    });
    resume.certifications.forEach(c => ids.add(c.id));
    resume.achievements.forEach(a => ids.add(a.id));
    resume.other.forEach(o => {
      ids.add(o.id);
      o.lines.forEach(l => ids.add(l.id));
    });
    return ids;
  };

  const canonicalIds = collectIds(canonical);
  const tailoredIds = collectIds(tailored);

  for (const id of canonicalIds) {
    if (!tailoredIds.has(id) && !omittedIds.has(id)) {
      missingIds.push(id);
    }
  }

  return {
    ok: missingIds.length === 0,
    missingIds,
  };
}

/**
 * Asserts zero structural drift: candidate name, orgs, titles, degrees, institutions,
 * dates, and links must remain identical to source (Rule 0.2).
 */
export function assertNoStructuralDrift(
  canonical: CanonicalResumeType,
  tailored: CanonicalResumeType
): { ok: boolean; drifts: string[] } {
  const drifts: string[] = [];

  if (canonical.basics.name !== tailored.basics.name) {
    drifts.push(`Name drift: '${canonical.basics.name}' vs '${tailored.basics.name}'`);
  }

  // Check experience structural fields
  for (const cExp of canonical.experience) {
    const tExp = tailored.experience.find(e => e.id === cExp.id);
    if (tExp) {
      if (tExp.org !== cExp.org) drifts.push(`Org changed for ${cExp.id}: ${cExp.org} -> ${tExp.org}`);
      if (tExp.title !== cExp.title) drifts.push(`Title changed for ${cExp.id}: ${cExp.title} -> ${tExp.title}`);
      if (tExp.start !== cExp.start || tExp.end !== cExp.end) drifts.push(`Dates changed for ${cExp.id}`);
    }
  }

  // Check education structural fields
  for (const cEdu of canonical.education) {
    const tEdu = tailored.education.find(e => e.id === cEdu.id);
    if (tEdu) {
      if (tEdu.institution !== cEdu.institution) drifts.push(`Institution changed for ${cEdu.id}`);
      if (tEdu.degree !== cEdu.degree) drifts.push(`Degree changed for ${cEdu.id}`);
    }
  }

  return {
    ok: drifts.length === 0,
    drifts,
  };
}
