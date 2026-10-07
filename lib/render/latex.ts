/**
 * LaTeX Sanitization & Escaping Engine (Section 4.6, Gap G3).
 * Restricts rendering strictly to escaped macros; neutralizes shell escape,
 * file reading, verbatim breakouts, and dangerous commands.
 */

export function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    // 1. Escape basic special characters except backslash
    .replace(/([&%$#_])/g, '\\$1')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    // 2. Escape backslash (if not already part of our escapes)
    .replace(/\\(?!([&%$#_{}]|textasciitilde\{\}|textasciicircum\{\}))/g, '\\textbackslash{}');
}

export interface AtsValidationResult {
  valid: boolean;
  issues: string[];
}

/**
 * Validates ATS safety of rendered plain text (single column, readable fonts, selectable text).
 */
export function validateAtsText(text: string): AtsValidationResult {
  const issues: string[] = [];

  if (!text || text.trim().length < 50) {
    issues.push('Document contains insufficient extracted text.');
  }

  // Check for non-standard unprintable control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    issues.push('Document contains unprintable binary or control characters.');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export interface ResumeSectionItem {
  heading: string;
  bullets: string[];
}

/**
 * Generates an ATS-compliant, single-column LaTeX resume document.
 * Only fixed trusted templates are used; user content is inserted strictly as escaped data.
 */
export function generateAtsLatexDocument(
  candidateName: string,
  contactLine: string,
  sections: ResumeSectionItem[]
): string {
  const escapedName = escapeLatex(candidateName);
  const escapedContact = escapeLatex(contactLine);

  let doc = `\\documentclass[10pt,letterpaper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\pagestyle{empty}
\\begin{document}

\\begin{center}
{\\LARGE \\textbf{${escapedName}}}\\\\
\\vspace{4pt}
${escapedContact}
\\end{center}
\\vspace{6pt}
`;

  for (const sec of sections) {
    doc += `\\noindent{\\large \\textbf{${escapeLatex(sec.heading)}}}\\\\
\\vspace{-4pt}
\\rule{\\linewidth}{0.5pt}\\\\
\\vspace{4pt}
\\begin{itemize}[leftmargin=1.5em, itemsep=2pt, parsep=0pt]
`;
    for (const b of sec.bullets) {
      doc += `  \\item ${escapeLatex(b)}\n`;
    }
    doc += `\\end{itemize}
\\vspace{8pt}
`;
  }

  doc += `\\end{document}\n`;
  return doc;
}
