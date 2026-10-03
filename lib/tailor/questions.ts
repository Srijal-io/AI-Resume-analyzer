import { CanonicalResumeType, QuestionType, RequirementType } from './schemas';

export interface AnalyzerImprovement {
  bulletId?: string;
  suggestion: string;
}

/**
 * Pure deterministic generation of gap confirmation questions.
 * No LLM is involved — questions directly reflect requirement states and resume evidence.
 */
export function generateQuestions(
  requirements: RequirementType[],
  resume: CanonicalResumeType,
  analyzerImprovements: AnalyzerImprovement[] = []
): QuestionType[] {
  const questions: QuestionType[] = [];
  let qCounter = 1;

  // Build a lookup map of bullet ID to bullet text
  const bulletMap = new Map<string, string>();
  for (const exp of resume.experience) {
    for (const b of exp.bullets) bulletMap.set(b.id, b.text);
  }
  for (const proj of resume.projects) {
    for (const b of proj.bullets) bulletMap.set(b.id, b.text);
  }
  for (const ach of resume.achievements) {
    bulletMap.set(ach.id, ach.text);
  }
  for (const oth of resume.other) {
    for (const l of oth.lines) bulletMap.set(l.id, l.text);
  }

  // 1. Generate questions for MISSING requirements (Must-have first, then Nice-to-have)
  const missingReqs = requirements
    .filter(r => r.state === 'MISSING')
    .sort((a, b) => (a.importance === 'must' && b.importance !== 'must' ? -1 : 1));

  for (const req of missingReqs) {
    const mainTerm = req.terms[0] || req.text;
    const importanceLabel = req.importance === 'must' ? 'Core Requirement' : 'Preferred';

    questions.push({
      id: `q${qCounter++}`,
      type: 'MISSING_SKILL',
      requirementId: req.id,
      term: mainTerm,
      title: `The job asks for **${mainTerm}**. Do you have real experience?`,
      prompt: `This is a ${importanceLabel} for the role: "${req.text}". If yes or learning, you can specify where you used it so it can be accurately incorporated.`,
      importance: req.importance,
      suggestedContexts: ['PROJECT', 'WORK', 'COURSEWORK', 'PERSONAL'],
    });
  }

  // 2. Generate questions for PARTIAL requirements
  const partialReqs = requirements.filter(r => r.state === 'PARTIAL');
  for (const req of partialReqs) {
    const mainTerm = req.terms[0] || req.text;
    const evidenceId = req.evidenceIds[0];
    const evidenceText = evidenceId ? bulletMap.get(evidenceId) : undefined;

    const snippet = evidenceText
      ? evidenceText.length > 80
        ? `"${evidenceText.slice(0, 77)}..."`
        : `"${evidenceText}"`
      : 'your existing background';

    questions.push({
      id: `q${qCounter++}`,
      type: 'PARTIAL_MATCH',
      requirementId: req.id,
      bulletId: evidenceId,
      term: mainTerm,
      title: `Your resume mentions ${snippet}. Does this include **${mainTerm}**?`,
      prompt: `If confirmed, the term "${mainTerm}" may be safely used in this bullet point during resume tailoring.`,
      evidenceText: evidenceText,
      importance: req.importance,
    });
  }

  // 3. Generate questions for Improvement / Metric suggestions
  // If analyzer provided improvements with bullet IDs, prioritize those
  const handledBulletIds = new Set<string>();

  for (const imp of analyzerImprovements) {
    if (imp.bulletId && bulletMap.has(imp.bulletId) && !handledBulletIds.has(imp.bulletId)) {
      handledBulletIds.add(imp.bulletId);
      const bText = bulletMap.get(imp.bulletId)!;
      questions.push({
        id: `q${qCounter++}`,
        type: 'IMPROVEMENT_METRIC',
        bulletId: imp.bulletId,
        title: `Do you have a measurable number or metric for this bullet? (optional)`,
        prompt: `"${bText}" — If you have real numbers (e.g. 25% latency reduction, 10k+ users, 2x faster), enter them below. They will be inserted verbatim without exaggeration.`,
        evidenceText: bText,
      });
    }
  }

  // If no analyzer metrics were provided, find up to 2 high-impact bullets that lack numbers
  if (handledBulletIds.size === 0) {
    let metricCount = 0;
    for (const [bulletId, text] of bulletMap.entries()) {
      if (metricCount >= 2) break;
      const hasNumber = /\d+/.test(text);
      if (!hasNumber && text.length > 35) {
        questions.push({
          id: `q${qCounter++}`,
          type: 'IMPROVEMENT_METRIC',
          bulletId,
          title: `Do you have a measurable number or metric for this bullet? (optional)`,
          prompt: `"${text}" — If you have a real number or concrete metric (e.g. 40%, 5k+ MAU, 3x), enter it below. It will be inserted verbatim without exaggeration.`,
          evidenceText: text,
        });
        metricCount++;
      }
    }
  }

  return questions;
}
