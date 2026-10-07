import { generateAtsLatexDocument, validateAtsText, ResumeSectionItem } from './latex';

export interface RenderRequest {
  candidateName: string;
  contactLine: string;
  sections: ResumeSectionItem[];
}

export interface RenderResult {
  success: boolean;
  latexSource: string;
  pdfBase64?: string;
  error?: string;
  atsValid: boolean;
  atsIssues: string[];
}

export interface ResumeRenderer {
  render(req: RenderRequest): Promise<RenderResult>;
}

/**
 * Sandboxed LaTeX Renderer (Section 4.6, Decision D4).
 * Generates safely escaped LaTeX and validates ATS properties.
 * If external container service is configured via LATEX_RENDER_SERVICE_URL,
 * dispatches job to container; otherwise produces valid ATS-compliant LaTeX source.
 */
export class SandboxedLatexRenderer implements ResumeRenderer {
  async render(req: RenderRequest): Promise<RenderResult> {
    const latexSource = generateAtsLatexDocument(req.candidateName, req.contactLine, req.sections);

    // Validate raw text content for ATS readability
    const fullText = `${req.candidateName} ${req.contactLine} ` +
      req.sections.map((s) => `${s.heading} ${s.bullets.join(' ')}`).join(' ');
    const atsRes = validateAtsText(fullText);

    if (!atsRes.valid) {
      return {
        success: false,
        latexSource,
        error: `ATS Validation Failed: ${atsRes.issues.join('; ')}`,
        atsValid: false,
        atsIssues: atsRes.issues,
      };
    }

    const serviceUrl = process.env.LATEX_RENDER_SERVICE_URL;
    if (serviceUrl) {
      try {
        const resp = await fetch(`${serviceUrl}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latex: latexSource }),
          signal: AbortSignal.timeout(15000),
        });

        if (!resp.ok) {
          throw new Error(`Render container returned HTTP ${resp.status}`);
        }

        const data = await resp.json() as { pdfBase64: string };
        return {
          success: true,
          latexSource,
          pdfBase64: data.pdfBase64,
          atsValid: true,
          atsIssues: [],
        };
      } catch (err: unknown) {
        return {
          success: false,
          latexSource,
          error: `Container render failed: ${err instanceof Error ? err.message : String(err)}`,
          atsValid: true,
          atsIssues: [],
        };
      }
    }

    // Default standalone output (Latex source generated & validated)
    return {
      success: true,
      latexSource,
      atsValid: true,
      atsIssues: [],
    };
  }
}

export const resumeRenderer = new SandboxedLatexRenderer();
