import { exec } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  pdfPath?: string;
  pdfBuffer?: Buffer;
  error?: string;
  latexSource: string;
}

/**
 * Compiles LaTeX source string to PDF using pdflatex if available,
 * or safely falls back to returning the valid source for export.
 */
export async function compileLatexToPdf(latexSource: string): Promise<CompileResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "resurox-tex-"));
  const texFile = path.join(tmpDir, "resume.tex");
  const pdfFile = path.join(tmpDir, "resume.pdf");

  try {
    await fs.writeFile(texFile, latexSource, "utf8");

    // Attempt pdflatex compilation with shell escape disabled
    await execAsync("pdflatex -no-shell-escape -interaction=nonstopmode resume.tex", {
      cwd: tmpDir,
      timeout: 15000
    });

    const pdfBuffer = await fs.readFile(pdfFile);
    return {
      success: true,
      pdfPath: pdfFile,
      pdfBuffer,
      latexSource
    };
  } catch (err) {
    return {
      success: false,
      error: `pdflatex compilation failed or not available on local host: ${String(err)}`,
      latexSource
    };
  } finally {
    // Attempt cleanup
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
