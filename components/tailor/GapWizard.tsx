'use client';

import React, { useState } from 'react';
import { QuestionType, AnswerType, MetricAnswerType, CanonicalResumeType } from '@/lib/tailor/schemas';
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface GapWizardProps {
  questions: QuestionType[];
  resume: CanonicalResumeType;
  onComplete: (answers: AnswerType[], metrics: MetricAnswerType[]) => void;
  onCancel: () => void;
}

export const GapWizard: React.FC<GapWizardProps> = ({
  questions,
  resume,
  onComplete,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AnswerType>>(new Map());
  const [metrics, setMetrics] = useState<Map<string, MetricAnswerType>>(new Map());

  const currentQ = questions[currentIndex];

  if (!currentQ || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-[#F7F5F0] border-2 border-[#1C1B19] p-8 text-center my-10">
        <p className="font-serif text-lg font-bold">No qualification gaps identified for this role.</p>
        <button
          onClick={onCancel}
          className="mt-4 px-6 py-2 bg-[#1C1B19] text-[#F7F5F0] font-mono text-xs uppercase"
        >
          Return to Analysis
        </button>
      </div>
    );
  }

  const qKey = currentQ.requirementId || currentQ.id;
  const currentAnswer = answers.get(qKey);
  const currentMetric = currentQ.bulletId ? metrics.get(currentQ.bulletId) : undefined;

  const updateMissingAnswer = (val: 'YES' | 'LEARNING' | 'NO') => {
    const next = new Map(answers);
    const existing = next.get(qKey) || {
      requirementId: qKey,
      answer: val,
      context: 'PROJECT',
      linkedItemId: resume.projects[0]?.id || resume.experience[0]?.id || '',
      description: '',
    };
    next.set(qKey, { ...existing, answer: val });
    setAnswers(next);
  };

  const updateContext = (ctx: 'PROJECT' | 'WORK' | 'COURSEWORK' | 'PERSONAL') => {
    const next = new Map(answers);
    const existing = next.get(qKey);
    if (existing) {
      next.set(qKey, { ...existing, context: ctx });
      setAnswers(next);
    }
  };

  const updateLinkedItem = (itemId: string) => {
    const next = new Map(answers);
    const existing = next.get(qKey);
    if (existing) {
      next.set(qKey, { ...existing, linkedItemId: itemId });
      setAnswers(next);
    }
  };

  const updateDescription = (desc: string) => {
    const next = new Map(answers);
    const existing = next.get(qKey);
    if (existing) {
      next.set(qKey, { ...existing, description: desc });
      setAnswers(next);
    }
  };

  const updatePartialAnswer = (val: 'YES' | 'NO') => {
    const next = new Map(answers);
    next.set(qKey, {
      requirementId: qKey,
      answer: val,
    });
    setAnswers(next);
  };

  const updateMetricInput = (val: string) => {
    if (!currentQ.bulletId) return;
    const next = new Map(metrics);
    next.set(currentQ.bulletId, {
      bulletId: currentQ.bulletId,
      metric: val,
    });
    setMetrics(next);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(Array.from(answers.values()), Array.from(metrics.values()));
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete(Array.from(answers.values()), Array.from(metrics.values()));
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto my-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase text-[#1C1B19]/70 hover:text-[#7A1F1F] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Wizard</span>
        </button>
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#1C1B19]">
          <ShieldCheck className="w-4 h-4 text-[#2F5233]" />
          <span>Consent Gate: Nothing is added without your confirmation</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#1C1B19]/10 h-2 mb-6">
        <div
          className="bg-[#7A1F1F] h-2 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Card */}
      <div className="bg-[#F7F5F0] border-2 border-[#1C1B19] p-6 sm:p-10 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1C1B19]/20 pb-4 mb-6">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#7A1F1F]">
            Requirement Gap {currentIndex + 1} of {questions.length}
          </span>
          {currentQ.importance && (
            <span
              className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 border ${
                currentQ.importance === 'must'
                  ? 'border-[#8B2E2E] text-[#8B2E2E] bg-[#8B2E2E]/10'
                  : 'border-[#1C1B19]/40 text-[#1C1B19]/70'
              }`}
            >
              {currentQ.importance === 'must' ? 'Core Requirement' : 'Preferred Skill'}
            </span>
          )}
        </div>

        {/* Question Title & Prompt */}
        <div className="mb-6">
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1C1B19] leading-tight mb-2">
            {currentQ.title}
          </h3>
          <p className="font-serif text-sm text-[#1C1B19]/80 leading-relaxed">
            {currentQ.prompt}
          </p>
        </div>

        {/* Card Body by Question Type */}
        {currentQ.type === 'MISSING_SKILL' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => updateMissingAnswer('YES')}
                className={`p-3.5 text-left border-2 font-mono text-xs transition-all ${
                  currentAnswer?.answer === 'YES'
                    ? 'border-[#2F5233] bg-[#2F5233]/10 font-bold text-[#2F5233]'
                    : 'border-[#1C1B19]/30 hover:border-[#1C1B19] text-[#1C1B19]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>YES</span>
                  {currentAnswer?.answer === 'YES' && <CheckCircle2 className="w-4 h-4 text-[#2F5233]" />}
                </div>
                <span className="text-[11px] font-serif block opacity-80">I have real experience</span>
              </button>

              <button
                type="button"
                onClick={() => updateMissingAnswer('LEARNING')}
                className={`p-3.5 text-left border-2 font-mono text-xs transition-all ${
                  currentAnswer?.answer === 'LEARNING'
                    ? 'border-[#B8860B] bg-[#B8860B]/10 font-bold text-[#B8860B]'
                    : 'border-[#1C1B19]/30 hover:border-[#1C1B19] text-[#1C1B19]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>LEARNING</span>
                  {currentAnswer?.answer === 'LEARNING' && <CheckCircle2 className="w-4 h-4 text-[#B8860B]" />}
                </div>
                <span className="text-[11px] font-serif block opacity-80">Familiar / in progress</span>
              </button>

              <button
                type="button"
                onClick={() => updateMissingAnswer('NO')}
                className={`p-3.5 text-left border-2 font-mono text-xs transition-all ${
                  currentAnswer?.answer === 'NO'
                    ? 'border-[#8B2E2E] bg-[#8B2E2E]/10 font-bold text-[#8B2E2E]'
                    : 'border-[#1C1B19]/30 hover:border-[#1C1B19] text-[#1C1B19]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span>NO</span>
                  {currentAnswer?.answer === 'NO' && <CheckCircle2 className="w-4 h-4 text-[#8B2E2E]" />}
                </div>
                <span className="text-[11px] font-serif block opacity-80">No experience (keep omitted)</span>
              </button>
            </div>

            {/* Context & Description if YES or LEARNING */}
            {(currentAnswer?.answer === 'YES' || currentAnswer?.answer === 'LEARNING') && (
              <div className="p-4 bg-white/60 border border-[#1C1B19]/20 space-y-4">
                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-[#1C1B19] mb-1.5">
                    Where did you use or learn this?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['PROJECT', 'WORK', 'COURSEWORK', 'PERSONAL'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateContext(c)}
                        className={`py-1.5 px-2 border text-center font-mono text-[11px] ${
                          (currentAnswer.context || 'PROJECT') === c
                            ? 'border-[#1C1B19] bg-[#1C1B19] text-white font-bold'
                            : 'border-[#1C1B19]/30 text-[#1C1B19]/70 hover:border-[#1C1B19]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-[#1C1B19] mb-1.5">
                    Associate with an existing resume item (optional):
                  </label>
                  <select
                    value={currentAnswer.linkedItemId || ''}
                    onChange={e => updateLinkedItem(e.target.value)}
                    className="w-full p-2 bg-[#F7F5F0] border border-[#1C1B19]/40 font-mono text-xs text-[#1C1B19] rounded-none outline-none"
                  >
                    <option value="">-- Standalone (Skills section only) --</option>
                    <optgroup label="Projects">
                      {resume.projects.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Experience">
                      {resume.experience.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.title} at {e.org}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-mono text-xs font-bold uppercase text-[#1C1B19]">
                      Short description of real usage (optional):
                    </label>
                    <span className="font-serif italic text-[11px] text-[#1C1B19]/60">
                      Required if you want it included in a bullet point
                    </span>
                  </div>
                  <textarea
                    value={currentAnswer.description || ''}
                    onChange={e => updateDescription(e.target.value)}
                    placeholder="e.g. Deployed microservices using Docker containers to AWS ECS; configured Dockerfiles for local test environments."
                    rows={3}
                    className="w-full p-2.5 bg-[#F7F5F0] border border-[#1C1B19]/40 font-serif text-xs text-[#1C1B19] placeholder:text-[#1C1B19]/40 resize-none rounded-none outline-none"
                  />
                  <p className="font-serif text-[11px] text-[#1C1B19]/70 mt-1">
                    ℹ️ If description is left blank, the term will only appear in your Skills section (Tier 1).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentQ.type === 'PARTIAL_MATCH' && (
          <div className="space-y-4">
            {currentQ.evidenceText && (
              <div className="p-4 bg-[#F7F5F0] border-l-4 border-[#B8860B] font-serif italic text-xs text-[#1C1B19]">
                <p className="font-mono not-italic font-bold text-[10px] text-[#B8860B] mb-1">
                  CURRENT RESUME EVIDENCE:
                </p>
                &ldquo;{currentQ.evidenceText}&rdquo;
              </div>
            )}

            <p className="font-serif text-xs text-[#1C1B19]/80">
              Does your experience in this bullet encompass <span className="font-bold">{currentQ.term}</span>?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updatePartialAnswer('YES')}
                className={`p-3 text-center border-2 font-mono text-xs transition-all ${
                  currentAnswer?.answer === 'YES'
                    ? 'border-[#2F5233] bg-[#2F5233]/10 font-bold text-[#2F5233]'
                    : 'border-[#1C1B19]/30 hover:border-[#1C1B19] text-[#1C1B19]'
                }`}
              >
                YES, CONFIRM INCLUSION
              </button>

              <button
                type="button"
                onClick={() => updatePartialAnswer('NO')}
                className={`p-3 text-center border-2 font-mono text-xs transition-all ${
                  currentAnswer?.answer === 'NO'
                    ? 'border-[#8B2E2E] bg-[#8B2E2E]/10 font-bold text-[#8B2E2E]'
                    : 'border-[#1C1B19]/30 hover:border-[#1C1B19] text-[#1C1B19]'
                }`}
              >
                NO, KEEP UNCHANGED
              </button>
            </div>
          </div>
        )}

        {currentQ.type === 'IMPROVEMENT_METRIC' && (
          <div className="space-y-4">
            {currentQ.evidenceText && (
              <div className="p-4 bg-[#F7F5F0] border-l-4 border-[#1C1B19]/40 font-serif italic text-xs text-[#1C1B19]">
                <p className="font-mono not-italic font-bold text-[10px] text-[#1C1B19]/60 mb-1">
                  TARGET BULLET POINT:
                </p>
                &ldquo;{currentQ.evidenceText}&rdquo;
              </div>
            )}

            <div>
              <label className="block font-mono text-xs font-bold uppercase text-[#1C1B19] mb-1.5">
                Exact metric or number (e.g. 40%, 10k users, 2.5x):
              </label>
              <input
                type="text"
                value={currentMetric?.metric || ''}
                onChange={e => updateMetricInput(e.target.value)}
                placeholder="e.g. 35% reduction in latency, serving 25,000 monthly users"
                className="w-full p-2.5 bg-[#F7F5F0] border border-[#1C1B19]/40 font-mono text-xs text-[#1C1B19] placeholder:text-[#1C1B19]/40 rounded-none outline-none"
              />
              <p className="font-serif italic text-[11px] text-[#1C1B19]/60 mt-1">
                This number will be inserted verbatim into the rewritten bullet. Leave empty to skip.
              </p>
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="mt-8 pt-6 border-t border-[#1C1B19]/20 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={handlePrevious}
            className={`flex items-center gap-1.5 px-4 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed text-[#1C1B19]'
                : 'border border-[#1C1B19] hover:bg-[#1C1B19] hover:text-[#F7F5F0] text-[#1C1B19]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 font-mono text-xs text-[#1C1B19]/70 hover:text-[#1C1B19] uppercase underline underline-offset-4"
            >
              Skip Card
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-2 bg-[#7A1F1F] hover:bg-[#8B2E2E] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <span>{currentIndex === questions.length - 1 ? 'Finish & Generate' : 'Confirm & Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
