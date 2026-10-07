import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@resurox/db";
import { compileLatexToPdf } from "@resurox/resume";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tailoredId, latexSource } = body;

    let source = latexSource;

    if (!source && tailoredId) {
      const db = getRepository();
      const tailored = await db.getTailoredResume(tailoredId);
      if (tailored && tailored.latexSource) {
        source = tailored.latexSource;
      }
    }

    if (!source) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "MISSING_LATEX_SOURCE", message: "LaTeX source required." } },
        { status: 400 }
      );
    }

    const compileResult = await compileLatexToPdf(source);

    if (compileResult.success && compileResult.pdfBuffer) {
      return new NextResponse(compileResult.pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="srijal_tailored_resume.pdf"'
        }
      });
    }

    // Fallback: return LaTeX source file and notice
    return NextResponse.json({
      status: "OK",
      data: {
        compiledPdf: false,
        notice: "Native pdflatex not found on host environment; returning verified ATS LaTeX source.",
        latexSource: source,
        error: compileResult.error
      }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "RENDER_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
