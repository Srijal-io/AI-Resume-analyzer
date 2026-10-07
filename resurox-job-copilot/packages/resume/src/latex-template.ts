import { ResumeProfile } from "@resurox/schemas";

/**
 * Escapes special LaTeX characters to guarantee safety (PRD §10.4).
 */
export function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[{}]/g, "\\$0")
    .replace(/[$&#%_]/g, "\\$0")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export interface TailoredResumeInput {
  candidateName: string;
  targetRole: string;
  email?: string;
  phone?: string;
  location?: string;
  summary: string;
  skills: Record<string, string[]>;
  projects: {
    name: string;
    technologies: string[];
    highlights: string[];
  }[];
  experience: {
    company: string;
    role: string;
    highlights: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    graduationYear?: string;
  }[];
}

/**
 * Generates ATS-safe, clean single-column LaTeX.
 * Avoids tables, multi-column layouts, icons, or complex packages.
 */
export function generateAtsLatex(data: TailoredResumeInput): string {
  const name = escapeLatex(data.candidateName);
  const role = escapeLatex(data.targetRole);
  const email = data.email ? escapeLatex(data.email) : "";
  const phone = data.phone ? escapeLatex(data.phone) : "";
  const location = data.location ? escapeLatex(data.location) : "";

  const contactLine = [email, phone, location].filter(Boolean).join(" $\\vert$ ");

  let skillsSection = "";
  for (const [category, items] of Object.entries(data.skills)) {
    if (items.length > 0) {
      skillsSection += `\\textbf{${escapeLatex(category)}:} ${escapeLatex(items.join(", "))} \\\\\n`;
    }
  }

  let projectsSection = "";
  for (const p of data.projects) {
    projectsSection += `\\textbf{${escapeLatex(p.name)}} $\\vert$ \\textit{${escapeLatex(p.technologies.join(", "))}} \\\\\n\\begin{itemize}[leftmargin=1.2em, noitemsep, topsep=0pt]\n`;
    for (const h of p.highlights) {
      projectsSection += `  \\item ${escapeLatex(h)}\n`;
    }
    projectsSection += `\\end{itemize}\n\\vspace{4pt}\n`;
  }

  let experienceSection = "";
  for (const exp of data.experience) {
    experienceSection += `\\textbf{${escapeLatex(exp.company)}} -- \\textit{${escapeLatex(exp.role)}} \\\\\n\\begin{itemize}[leftmargin=1.2em, noitemsep, topsep=0pt]\n`;
    for (const h of exp.highlights) {
      experienceSection += `  \\item ${escapeLatex(h)}\n`;
    }
    experienceSection += `\\end{itemize}\n\\vspace{4pt}\n`;
  }

  let educationSection = "";
  for (const edu of data.education) {
    educationSection += `\\textbf{${escapeLatex(edu.institution)}} \\\\\n${escapeLatex(edu.degree)} ${edu.graduationYear ? `(${escapeLatex(edu.graduationYear)})` : ""} \\\\\n`;
  }

  return `\\documentclass[10pt,letterpaper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\hypersetup{colorlinks=false, pdfborder={0 0 0}}
\\pagestyle{empty}

\\begin{document}

% Header
\\begin{center}
  {\\LARGE \\textbf{${name}}} \\\\[3pt]
  {\\large ${role}} \\\\[2pt]
  {\\small ${contactLine}}
\\end{center}
\\vspace{-4pt}
\\hrule
\\vspace{6pt}

% Professional Summary
\\section*{Summary}
${escapeLatex(data.summary)}
\\vspace{4pt}

% Technical Skills
\\section*{Technical Skills}
${skillsSection}
\\vspace{4pt}

% Technical Projects
\\section*{Projects}
${projectsSection}

% Experience
\\section*{Experience}
${experienceSection}

% Education
\\section*{Education}
${educationSection}

\\end{document}
`;
}
