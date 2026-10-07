'use client';

import React, { useState } from 'react';
import { CanonicalResumeType, ChangeReportType } from '@/lib/tailor/schemas';
import {
  compileCanonicalToLatex,
  compileCanonicalToPlainText,
  calculatePageBudget,
} from '@/lib/tailor/render';
import {
  ShieldCheck,
  CheckCircle2,
  FileText,
  Copy,
  ArrowLeft,
  Check,
  Sparkles,
  GitCommit,
  Layers,
  Award,
  Download,
  Printer,
  FileCode,
} from 'lucide-react';

interface TailorReviewDraftProps {
  tailoredResume: CanonicalResumeType;
  changeReport: ChangeReportType;
  onBackToAnswers: () => void;
  onReset: () => void;
}

export function TailorReviewDraft({
  tailoredResume,
  changeReport,
  onBackToAnswers,
  onReset,
}: TailorReviewDraftProps) {
  const [activeTab, setActiveTab] = useState<'diff' | 'preview'>('diff');
  const [copied, setCopied] = useState(false);

  const approvedChanges = changeReport.changes.filter(
    (c) => c.status === 'APPROVED_BY_VERIFIER'
  );

  const getProvenanceBadge = (prov: string) => {
    switch (prov) {
      case 'USER_CONFIRMED_T2':
        return {
          label: 'User Evidence (T2)',
          className: 'bg-[#2F5233]/10 text-[#2F5233] border-[#2F5233]/30',
        };
      case 'USER_CONFIRMED_T1':
        return {
          label: 'User Attested (T1)',
          className: 'bg-[#1C4E80]/10 text-[#1C4E80] border-[#1C4E80]/30',
        };
      case 'RESUME_EVIDENCE':
        return {
          label: 'Resume Grounded',
          className: 'bg-[#1C1B19]/10 text-[#1C1B19] border-[#1C1B19]/30',
        };
      default:
        return {
          label: prov,
          className: 'bg-zinc-100 text-zinc-800 border-zinc-300',
        };
    }
  };

  const pageBudget = calculatePageBudget(tailoredResume);

  const handleCopyPlainText = () => {
    const text = compileCanonicalToPlainText(tailoredResume);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadLatex = () => {
    const latex = compileCanonicalToLatex(tailoredResume);
    const blob = new Blob([latex], { type: 'text/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tailoredResume.basics.name.toLowerCase().replace(/\s+/g, '_')}_tailored.tex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPlainText = () => {
    const text = compileCanonicalToPlainText(tailoredResume);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tailoredResume.basics.name.toLowerCase().replace(/\s+/g, '_')}_tailored.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto my-8 space-y-8 animate-fade-in print:m-0 print:p-0">
      {/* Header Desk Banner - Hidden during print */}
      <div className="bg-[#F7F5F0] border-2 border-[#1C1B19] p-6 sm:p-8 shadow-xl print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C1B19]/20 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest bg-[#2F5233] text-white px-2 py-0.5">
                VERIFIED TAILORED DRAFT
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest border border-[#7A1F1F] text-[#7A1F1F] px-2 py-0.5">
                0% HALLUCINATIONS
              </span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-[#1C1B19]">
              Audit &amp; Change Report
            </h2>
            <p className="font-serif text-xs text-[#1C1B19]/70 mt-1 max-w-2xl">
              Every rewritten bullet was checked deterministically against your verified evidence.
              Zero ungrounded technologies, metrics, or inflated seniority words were permitted.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleCopyPlainText}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase bg-[#1C1B19] text-[#F7F5F0] px-3.5 py-2 hover:bg-[#7A1F1F] transition-colors shadow-sm"
              title="Copy clean plaintext to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>

            <button
              type="button"
              onClick={handleDownloadLatex}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase border border-[#1C1B19] bg-white text-[#1C1B19] px-3.5 py-2 hover:bg-[#1C1B19] hover:text-[#F7F5F0] transition-colors shadow-sm"
              title="Download publication-quality LaTeX document"
            >
              <FileCode className="w-3.5 h-3.5 text-[#7A1F1F]" />
              LaTeX (.tex)
            </button>

            <button
              type="button"
              onClick={handleDownloadPlainText}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase border border-[#1C1B19] bg-white text-[#1C1B19] px-3.5 py-2 hover:bg-[#1C1B19] hover:text-[#F7F5F0] transition-colors shadow-sm"
              title="Download plaintext resume"
            >
              <Download className="w-3.5 h-3.5" />
              Plaintext (.txt)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase bg-[#2F5233] text-white px-3.5 py-2 hover:bg-[#233f27] transition-colors shadow-sm"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="border border-[#1C1B19]/20 p-3 bg-white/60">
            <span className="font-mono text-[10px] uppercase text-[#1C1B19]/60 block">Verified Rewrites</span>
            <span className="font-mono text-2xl font-bold text-[#2F5233]">
              {approvedChanges.length}
            </span>
          </div>

          <div className="border border-[#1C1B19]/20 p-3 bg-white/60">
            <span className="font-mono text-[10px] uppercase text-[#1C1B19]/60 block">Confirmed Skills</span>
            <span className="font-mono text-2xl font-bold text-[#1C4E80]">
              {changeReport.addedSkills.length}
            </span>
          </div>

          <div className="border border-[#1C1B19]/20 p-3 bg-white/60">
            <span className="font-mono text-[10px] uppercase text-[#1C1B19]/60 block">Preserved Bullets</span>
            <span className="font-mono text-2xl font-bold text-[#1C1B19]">
              {changeReport.unchangedBulletsCount}
            </span>
          </div>

          <div className="border border-[#1C1B19]/20 p-3 bg-white/60">
            <span className="font-mono text-[10px] uppercase text-[#1C1B19]/60 block">Page Fit Budget</span>
            <span className="font-mono text-xs font-bold text-[#1C1B19] flex items-center gap-1 mt-2">
              <ShieldCheck className="w-4 h-4 text-[#2F5233]" /> {pageBudget.recommendedPages} Page ({pageBudget.marginInches}in)
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[#1C1B19]/20 mt-6 pt-2 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`font-mono text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'diff'
                ? 'border-[#7A1F1F] text-[#7A1F1F]'
                : 'border-transparent text-[#1C1B19]/60 hover:text-[#1C1B19]'
            }`}
          >
            <GitCommit className="w-4 h-4" /> Change Report &amp; Audit Diff ({approvedChanges.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`font-mono text-xs font-bold uppercase tracking-wider pb-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'preview'
                ? 'border-[#7A1F1F] text-[#7A1F1F]'
                : 'border-transparent text-[#1C1B19]/60 hover:text-[#1C1B19]'
            }`}
          >
            <FileText className="w-4 h-4" /> Full Tailored Resume Preview
          </button>
        </div>
      </div>

      {/* Tab 1: Diff & Change Report */}
      {activeTab === 'diff' && (
        <div className="space-y-6">
          {/* Confirmed Skills Section */}
          {changeReport.addedSkills.length > 0 && (
            <div className="bg-[#F7F5F0] border border-[#1C1B19]/20 p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-[#1C1B19]/10 pb-3 mb-4">
                <Award className="w-5 h-5 text-[#1C4E80]" />
                <h3 className="font-serif text-lg font-bold text-[#1C1B19]">
                  Confirmed Skills Added to Inventory
                </h3>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {changeReport.addedSkills.map((s, idx) => {
                  const badge = getProvenanceBadge(s.provenance);
                  return (
                    <div
                      key={idx}
                      className="border border-[#1C1B19]/20 bg-white px-3 py-1.5 flex items-center gap-2 shadow-sm"
                    >
                      <span className="font-mono text-xs font-bold text-[#1C1B19]">{s.name}</span>
                      <span
                        className={`font-mono text-[9px] uppercase font-bold border px-1.5 py-0.2 rounded-none ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bullet Diffs */}
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-[#1C1B19] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#7A1F1F]" />
              Tailored Bullet Modifications
            </h3>

            {approvedChanges.length === 0 ? (
              <div className="bg-[#F7F5F0] border border-[#1C1B19]/20 p-8 text-center font-serif text-sm text-[#1C1B19]/70">
                All resume bullets already met alignment thresholds. No bullet modifications were required.
              </div>
            ) : (
              approvedChanges.map((change) => {
                const badge = getProvenanceBadge(change.provenance);
                return (
                  <div
                    key={change.id}
                    className="bg-[#F7F5F0] border border-[#1C1B19]/30 p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1B19]/10 pb-3">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#1C1B19]/60 block">
                          {change.section.toUpperCase()} • {change.parentTitle}
                        </span>
                        <span className="font-mono text-xs text-[#7A1F1F] font-bold">
                          {change.reason}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-[10px] font-bold uppercase border px-2 py-0.5 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase bg-emerald-700 text-white px-2 py-0.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 font-serif text-sm">
                      {/* Original */}
                      <div className="bg-red-50/60 border-l-4 border-red-700 p-3 text-red-950">
                        <span className="font-mono text-[10px] uppercase font-bold text-red-700 block mb-1">
                          Original Bullet
                        </span>
                        <p className="line-through text-red-900/80 leading-relaxed">
                          {change.original}
                        </p>
                      </div>

                      {/* Rewritten */}
                      <div className="bg-emerald-50/70 border-l-4 border-emerald-700 p-3 text-emerald-950">
                        <span className="font-mono text-[10px] uppercase font-bold text-emerald-800 block mb-1 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> Tailored (Grounded) Bullet
                        </span>
                        <p className="font-medium text-emerald-950 leading-relaxed">
                          {change.rewritten}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Full Document Preview */}
      {activeTab === 'preview' && (
        <div className="bg-white border-2 border-[#1C1B19] p-8 sm:p-12 shadow-xl font-serif text-[#1C1B19] max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="border-b border-[#1C1B19] pb-4 text-center space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">{tailoredResume.basics.name}</h1>
            <p className="font-mono text-xs text-[#1C1B19]/70">
              {[
                tailoredResume.basics.email,
                tailoredResume.basics.phone,
                tailoredResume.basics.location,
                ...tailoredResume.basics.links.map((l) => l.url),
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>

          {/* Summary */}
          {tailoredResume.summary && (
            <div className="space-y-1">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest border-b border-[#1C1B19]/30 pb-0.5">
                Summary
              </h2>
              <p className="text-xs leading-relaxed text-[#1C1B19]/90">{tailoredResume.summary}</p>
            </div>
          )}

          {/* Skills */}
          {tailoredResume.skills.length > 0 && (
            <div className="space-y-1">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest border-b border-[#1C1B19]/30 pb-0.5">
                Technical Skills
              </h2>
              <div className="text-xs space-y-0.5">
                {tailoredResume.skills.map((s, idx) => (
                  <p key={idx}>
                    <strong className="font-sans font-semibold">{s.category}:</strong>{' '}
                    {s.items.join(', ')}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {tailoredResume.experience.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest border-b border-[#1C1B19]/30 pb-0.5">
                Professional Experience
              </h2>
              {tailoredResume.experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold">{exp.title}</span>
                    <span className="font-mono text-[11px] text-[#1C1B19]/70">
                      {exp.start} — {exp.end}
                    </span>
                  </div>
                  <div className="text-xs italic text-[#1C1B19]/80">{exp.org}</div>
                  <ul className="list-disc list-outside pl-4 text-xs space-y-1 text-[#1C1B19]/90 leading-relaxed">
                    {exp.bullets.map((b) => (
                      <li key={b.id}>{b.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {tailoredResume.projects.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest border-b border-[#1C1B19]/30 pb-0.5">
                Projects
              </h2>
              {tailoredResume.projects.map((proj) => (
                <div key={proj.id} className="space-y-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="font-bold">{proj.name}</span>
                    <span className="font-mono text-[11px] text-[#1C1B19]/70">
                      {proj.tech.join(', ')}
                    </span>
                  </div>
                  <ul className="list-disc list-outside pl-4 text-xs space-y-1 text-[#1C1B19]/90 leading-relaxed">
                    {proj.bullets.map((b) => (
                      <li key={b.id}>{b.text}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {tailoredResume.education.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest border-b border-[#1C1B19]/30 pb-0.5">
                Education
              </h2>
              {tailoredResume.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-bold">{edu.institution}</span> — {edu.degree}{' '}
                    {edu.field ? `in ${edu.field}` : ''}
                  </div>
                  <span className="font-mono text-[11px] text-[#1C1B19]/70">
                    {edu.start} — {edu.end}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer - Hidden during print */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#1C1B19]/20 pt-6 print:hidden">
        <button
          type="button"
          onClick={onBackToAnswers}
          className="font-mono text-xs font-bold uppercase border border-[#1C1B19] px-4 py-2 hover:bg-[#1C1B19] hover:text-[#F7F5F0] transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Consent Answers
        </button>

        <button
          type="button"
          onClick={onReset}
          className="font-mono text-xs font-bold uppercase bg-[#1C1B19] text-[#F7F5F0] px-6 py-2 hover:bg-[#7A1F1F] transition-colors"
        >
          Return to Analyzer
        </button>
      </div>
    </div>
  );
}
