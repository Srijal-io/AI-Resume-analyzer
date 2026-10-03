import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { inspectDocumentBinary } from '../security/upload';
import { normalizeExtractedText } from '../security/redact';

export class IngestError extends Error {
  constructor(message: string, public code: string = 'INGEST_ERROR') {
    super(message);
    this.name = 'IngestError';
  }
}

/**
 * Robust extraction of text from PDF buffer using pdf2json stream parser.
 * Fails closed on scanned or empty documents (under 200 characters).
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, true);

    const timer = setTimeout(() => {
      parser.removeAllListeners();
      reject(new IngestError('PDF extraction timed out.', 'TIMEOUT'));
    }, 15000);

    parser.on('pdfParser_dataReady', (pdfData) => {
      clearTimeout(timer);
      try {
        let extracted = '';
        if (pdfData && pdfData.Pages) {
          for (const page of pdfData.Pages) {
            if (page.Texts) {
              for (const textItem of page.Texts) {
                for (const r of textItem.R) {
                  extracted += decodeURIComponent(r.T) + ' ';
                }
              }
              extracted += '\n';
            }
          }
        }
        resolve(extracted.trim());
      } catch (e) {
        reject(new IngestError(`Failed to decode PDF text stream: ${e instanceof Error ? e.message : String(e)}`));
      }
    });

    parser.on('pdfParser_dataError', (err: unknown) => {
      clearTimeout(timer);
      const msg = err && typeof err === 'object' && 'parserError' in err
        ? String((err as { parserError: unknown }).parserError)
        : (err instanceof Error ? err.message : String(err));
      reject(new IngestError(`PDF parsing failed: ${msg}`));
    });

    try {
      parser.parseBuffer(buffer);
    } catch (e) {
      clearTimeout(timer);
      reject(new IngestError(`PDF parse error: ${e instanceof Error ? e.message : String(e)}`));
    }
  });
}

/**
 * Extraction of text from Word (.docx) documents using mammoth.
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  } catch (e) {
    throw new IngestError(`DOCX extraction failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Ingest document file (PDF or DOCX), enforce magic bytes, extract real text,
 * and validate non-empty readable threshold (>= 200 characters).
 */
export async function ingestDocument(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new IngestError("Uploaded file is empty.", "EMPTY_FILE");
  }

  // 1. Inspect binary magic bytes
  const inspection = inspectDocumentBinary(buffer);
  if (!inspection.isValid) {
    throw new IngestError(inspection.error || "Invalid document format.", "INVALID_FORMAT");
  }

  // 2. Extract plain text
  let rawText = '';
  if (inspection.fileType === 'pdf') {
    rawText = await extractPdfText(buffer);
  } else if (inspection.fileType === 'docx') {
    rawText = await extractDocxText(buffer);
  }

  const normalized = normalizeExtractedText(rawText);

  // 3. Reject scanned or unreadable text (under 200 characters)
  if (normalized.trim().length < 200) {
    throw new IngestError(
      "We couldn't read text from this PDF. It appears to be scanned or image-only. Please provide a text-based document.",
      "SCANNED_OR_EMPTY_PDF"
    );
  }

  return normalized;
}
