'use client';

import React from 'react';
import { CandidateProfile } from '@/lib/types/resume';
import { RequirementMatch } from '@/lib/types/matching';
import { MultiDimensionalScores } from '@/lib/types/scoring';
import { ScoreBreakdown, ExplanationFeedback } from '@/lib/types';
import { ScoreStamp } from '@/components/ScoreStamp';
import { MarginNote } from '@/components/MarginNote';
import { RequirementMatrix } from '@/components/RequirementMatrix';
import { MultiScoreBreakdown } from '@/components/MultiScoreBreakdown';

interface ResumeDocumentProps {
  resume: CandidateProfile;
  scores: ScoreBreakdown;
  multiDimensionalScores?: MultiDimensionalScores;
  requirementMatches?: RequirementMatch[];
  explanation: ExplanationFeedback;
  onStartTailoring?: () => void;
}

export const ResumeDocument: React.FC<ResumeDocumentProps> = ({
  resume,
  scores,
  multiDimensionalScores,
  requirementMatches,
  explanation,
  onStartTailoring,
}) => {
  const matchedSkillsMap = new Set(
    scores.skillsMatrix.filter(s => s.status === 'matched').map(s => s.skill.toLowerCase())
  );
  const partialSkillsMap = new Set(
    scores.skillsMatrix.filter(s => s.status === 'partial').map(s => s.skill.toLowerCase())
  );
  const missingSkills = scores.skillsMatrix.filter(s => s.status === 'missing');

  const renderAnnotatedText = (text: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);

    return words.map((word, idx) => {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      const isMatched = cleanWord && matchedSkillsMap.has(cleanWord);
      const isPartial = cleanWord && partialSkillsMap.has(cleanWord);

      if (isMatched) {
        return (
          <span
            key={idx}
            className="border-b-2 border-[#2F5233] pb-0.5 font-medium text-[#1C1B19]"
            title="Matched Skill"
          >
            {word}
          </span>
        );
      }
      if (isPartial) {
        return (
          <span
            key={idx}
            className="border-b-2 border-dashed border-[#B8860B] pb-0.5 font-medium text-[#1C1B19]"
            title="Partial Skill Match"
          >
            {word}
          </span>
        );
      }
      return <React.Fragment key={idx}>{word}</React.Fragment>;
    });
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto bg-[#F7F5F0] border border-[#1C1B19]/20 shadow-xl p-6 sm:p-12 md:p-16 my-8 text-[#1C1B19] rounded-none">
      {/* Header Section with Title and Rotated Stamp */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-[#1C1B19] pb-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1C1B19]">
            {resume.basics?.name || 'Candidate Profile'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#1C1B19]/70 mt-2">
            {resume.basics?.email && <span>{resume.basics.email}</span>}
            {resume.basics?.github && <span>• GitHub: {resume.basics.github}</span>}
            {resume.currentTitle && <span className="font-semibold text-[#1C1B19]">• {resume.currentTitle}</span>}
          </div>
        </div>
        <div className="shrink-0 self-end sm:self-auto">
          <ScoreStamp score={multiDimensionalScores?.overallEvaluation ?? scores.overallScore} label={scores.matchLabel} />
        </div>
      </div>

      {/* Tailoring Action Banner */}
      {onStartTailoring && (
        <div className="bg-[#1C1B19] text-[#F7F5F0] p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#B8860B] block mb-1">
              ATS TAILORING AVAILABLE
            </span>
            <h3 className="font-serif font-bold text-lg text-white">
              Tailor My Resume for this Role
            </h3>
            <p className="font-serif italic text-xs text-[#F7F5F0]/80 mt-0.5">
              Review identified qualification gaps, confirm your real background, and produce a new ATS-optimized PDF resume. Nothing is added without your consent.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartTailoring}
            className="w-full sm:w-auto shrink-0 px-6 py-3 bg-[#7A1F1F] hover:bg-[#8B2E2E] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Tailor My Resume →
          </button>
        </div>
      )}

      {/* Asymmetric Manuscript Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        {/* Document Column (~70% / 8 Cols) */}
        <div className="md:col-span-8 space-y-6 font-serif leading-relaxed text-base sm:text-lg max-w-[70ch]">

          {/* Upgraded Multi-Dimensional Score Breakdown */}
          {multiDimensionalScores ? (
            <MultiScoreBreakdown scores={multiDimensionalScores} />
          ) : (
            <div className="bg-[#1C1B19]/5 border border-[#1C1B19]/20 p-4 font-mono text-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="block text-[10px] uppercase text-[#1C1B19]/60">Skills Match</span>
                <span className="text-base font-bold text-[#1C1B19]">{scores.subScores.skillsMatch}%</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-[#1C1B19]/60">Experience</span>
                <span className="text-base font-bold text-[#1C1B19]">{scores.subScores.experienceMatch}%</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-[#1C1B19]/60">Education</span>
                <span className="text-base font-bold text-[#1C1B19]">{scores.subScores.educationMatch}%</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-[#1C1B19]/60">Semantic</span>
                <span className="text-base font-bold text-[#1C1B19]">{scores.subScores.semanticMatch}%</span>
              </div>
            </div>
          )}

          {/* Executive Recruiter Verdict Banner */}
          {explanation.executiveSummary && (
            <div className="border-l-4 border-[#7A1F1F] bg-[#7A1F1F]/5 p-4 my-4">
              <span className="font-mono text-xs font-bold uppercase text-[#7A1F1F]">Recruiter Executive Verdict</span>
              <p className="font-serif italic text-sm text-[#1C1B19] mt-1">{explanation.executiveSummary}</p>
            </div>
          )}

          {/* Detailed Requirement Match Matrix */}
          {requirementMatches && requirementMatches.length > 0 && (
            <RequirementMatrix matches={requirementMatches} />
          )}

          {/* Summary */}
          {resume.summary && (
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C1B19]/60 mb-2">
                {`//`} Candidate Summary
              </h3>
              <p className="text-[#1C1B19] text-base leading-relaxed">
                {renderAnnotatedText(resume.summary)}
              </p>
            </div>
          )}

          {/* Skills Section */}
          {resume.skills && resume.skills.length > 0 && (
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C1B19]/60 mb-2">
                {`//`} Demonstrated &amp; Claimed Skills
              </h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {resume.skills.map((skill, i) => {
                  const norm = skill.toLowerCase();
                  const isMatched = matchedSkillsMap.has(norm);
                  const isPartial = partialSkillsMap.has(norm);

                  return (
                    <span
                      key={i}
                      className={`px-2 py-0.5 border ${
                        isMatched
                          ? 'border-[#2F5233] text-[#2F5233] font-semibold underline'
                          : isPartial
                          ? 'border-[#B8860B] text-[#B8860B] font-semibold underline stroke-dashed'
                          : 'border-[#1C1B19]/30 text-[#1C1B19]'
                      }`}
                    >
                      {skill}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Technical Projects Section */}
          {resume.projects && resume.projects.length > 0 && (
            <div className="space-y-6 pt-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C1B19]/60">
                {`//`} Technical Projects ({resume.projects.length} Projects)
              </h3>
              {resume.projects.map((proj, i) => (
                <div key={i} className="border-l-2 border-[#1C1B19]/20 pl-4 space-y-1.5">
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h4 className="font-bold text-base text-[#1C1B19]">{proj.name}</h4>
                    {proj.githubUrl && (
                      <span className="font-mono text-xs text-[#1C1B19]/60">
                        {proj.githubUrl}
                      </span>
                    )}
                  </div>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 py-0.5">
                      {proj.technologies.map((tech, tIdx) => (
                        <span key={tIdx} className="font-mono text-[11px] bg-[#1C1B19]/5 px-1.5 py-0.5 border border-[#1C1B19]/15">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.description && (
                    <p className="text-sm text-[#1C1B19]/90 leading-relaxed">
                      {renderAnnotatedText(proj.description)}
                    </p>
                  )}
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1 pt-1 text-[#1C1B19]/90">
                      {proj.highlights.map((hl, hIdx) => (
                        <li key={hIdx}>{renderAnnotatedText(hl)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Work Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <div className="space-y-6 pt-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C1B19]/60">
                {`//`} Work History ({resume.totalExperienceYears} Years Total)
              </h3>
              {resume.experience.map((exp, i) => (
                <div key={i} className="border-l-2 border-[#1C1B19]/20 pl-4 space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-base text-[#1C1B19]">{exp.title}</h4>
                    <span className="font-mono text-xs text-[#1C1B19]/60">
                      {exp.startDate} - {exp.endDate || 'Present'}
                    </span>
                  </div>
                  <p className="font-mono text-xs font-semibold text-[#1C1B19]/80">{exp.company}</p>
                  {exp.responsibilities && exp.responsibilities.length > 0 && (
                    <ul className="list-disc list-inside text-sm space-y-1 pt-1 text-[#1C1B19]/90">
                      {exp.responsibilities.map((resp, rIdx) => (
                        <li key={rIdx}>{renderAnnotatedText(resp)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education Section */}
          {resume.education && resume.education.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#1C1B19]/10">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C1B19]/60">
                {`//`} Education &amp; Credentials
              </h3>
              {resume.education.map((edu, i) => (
                <div key={i} className="border-l-2 border-[#1C1B19]/20 pl-4">
                  <h4 className="font-bold text-sm text-[#1C1B19]">{edu.degree}</h4>
                  {edu.institution && (
                    <p className="font-mono text-xs text-[#1C1B19]/70">{edu.institution}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Margin Column (~30% / 4 Cols) — Editor Annotations */}
        <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-[#1C1B19]/15 pt-6 md:pt-0 md:pl-6 space-y-6">
          <div className="border-b border-[#1C1B19]/20 pb-2">
            <h3 className="font-serif italic font-bold text-lg text-[#8B2E2E]">
              Editor&apos;s Marginalia
            </h3>
            <p className="font-mono text-[11px] text-[#1C1B19]/60">
              Evidence Audit &amp; Gaps
            </p>
          </div>

          {/* Critical Gaps Section */}
          {explanation.criticalGaps && explanation.criticalGaps.length > 0 && (
            <div className="border-l-2 border-[#8B2E2E] pl-3 py-1">
              <h4 className="font-serif italic font-bold text-xs text-[#8B2E2E] uppercase tracking-wider mb-1">
                Critical Requirement Gaps
              </h4>
              <ul className="space-y-1.5">
                {explanation.criticalGaps.map((gap, idx) => (
                  <li key={idx} className="text-xs font-serif italic text-[#8B2E2E]">
                    ! {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Skills Margin Notes */}
          {missingSkills.map((item, idx) => (
            <MarginNote
              key={idx}
              status="missing"
              skillOrSubject={item.skill}
              reason={item.reason || 'Missing required qualification'}
              delayMs={idx * 150}
            />
          ))}

          {/* Verified Strengths */}
          {explanation.strengths && (
            <div className="pt-4 border-t border-[#1C1B19]/15">
              <h4 className="font-serif italic font-bold text-sm text-[#2F5233] mb-2">
                Verified Strengths
              </h4>
              <ul className="space-y-2">
                {explanation.strengths.map((str, idx) => (
                  <li key={idx} className="text-xs font-serif italic text-[#1C1B19]/90 border-l border-[#2F5233] pl-2">
                    &ldquo;{str}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Editorial Advice */}
          {explanation.recommendations && (
            <div className="pt-4 border-t border-[#1C1B19]/15">
              <h4 className="font-serif italic font-bold text-sm text-[#1C1B19] mb-2">
                Actionable Revisions
              </h4>
              <ul className="space-y-2">
                {explanation.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs font-serif italic text-[#1C1B19]/90 border-l border-[#1C1B19]/40 pl-2">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
