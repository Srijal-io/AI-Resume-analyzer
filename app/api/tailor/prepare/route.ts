import { NextRequest, NextResponse } from 'next/server';
import { ingestDocument } from '@/lib/tailor/ingest';
import { parseResume } from '@/lib/tailor/parse';
import { parseJob } from '@/lib/tailor/job';
import { matchRequirements } from '@/lib/tailor/match';
import { generateQuestions } from '@/lib/tailor/questions';
import { GatewayContext } from '@/lib/ai/gateway';
import { PipelineError } from '@/lib/pipeline/errors';
import { securityLogger } from '@/lib/security/logger';
import { isKillSwitchActive } from '@/lib/security/budget';
import { validateRequestMethod, validateRequestOrigin } from '@/lib/security/validation';

export const maxDuration = 60;

/**
 * POST /api/tailor/prepare
 * Ingests resume & job description, extracts canonical structures,
 * calculates deterministic & semantic requirement matches, and generates
 * consent gap questions.
 * 
 * Strict Privacy: No raw resume or JD text is logged.
 */
export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const standardHeaders = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Request-Id': requestId,
  };

  // 1. Kill switch check
  if (await isKillSwitchActive()) {
    return NextResponse.json(
      { error: { code: 'SERVICE_BUSY', message: 'Service is temporarily under maintenance.', requestId } },
      { status: 503, headers: { ...standardHeaders, 'Retry-After': '60' } }
    );
  }

  // 2. Security validation
  const methodCheck = validateRequestMethod(req);
  if (!methodCheck.valid) {
    return NextResponse.json(
      { error: { code: methodCheck.errorCode, message: methodCheck.errorMessage, requestId } },
      { status: methodCheck.httpStatus || 405, headers: standardHeaders }
    );
  }

  const originCheck = validateRequestOrigin(req);
  if (!originCheck.valid) {
    return NextResponse.json(
      { error: { code: originCheck.errorCode, message: originCheck.errorMessage, requestId } },
      { status: originCheck.httpStatus || 403, headers: standardHeaders }
    );
  }

  try {
    let resumeText = '';
    let jdText = '';
    let analyzerImprovements: Array<{ bulletId?: string; suggestion: string }> = [];

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      jdText = String(formData.get('jdText') || '').trim();

      const resumeFile = formData.get('resumeFile') as File | null;
      if (resumeFile && resumeFile.size > 0) {
        const buffer = Buffer.from(await resumeFile.arrayBuffer());
        resumeText = await ingestDocument(buffer);
      } else {
        resumeText = String(formData.get('resumeText') || '').trim();
      }

      const rawImprovements = formData.get('analyzerImprovements');
      if (rawImprovements && typeof rawImprovements === 'string') {
        try {
          analyzerImprovements = JSON.parse(rawImprovements);
        } catch {
          // Ignore invalid JSON in optional field
        }
      }
    } else {
      const body = await req.json();
      resumeText = String(body.resumeText || '').trim();
      jdText = String(body.jdText || '').trim();
      if (Array.isArray(body.analyzerImprovements)) {
        analyzerImprovements = body.analyzerImprovements;
      }
    }

    if (!resumeText || resumeText.length < 50) {
      throw new PipelineError(
        'NOT_A_RESUME',
        'A readable resume is required (minimum 50 characters). Please upload a valid PDF, DOCX, or paste resume text.'
      );
    }

    if (!jdText || jdText.length < 50) {
      throw new PipelineError(
        'JOB_DESCRIPTION_INVALID',
        'A job description is required (minimum 50 characters). Please provide the job description.'
      );
    }

    // Prepare AI Gateway Context
    const ctx: GatewayContext = {
      requestId,
      signal: req.signal,
      deadline: startTime + 55000,
    };

    // Rule 7 Compliance: Log ONLY metadata (lengths, timing, request id), never user text
    securityLogger.info('Tailor prepare pipeline started', {
      requestId,
      note: `resumeChars=${resumeText.length}, jdChars=${jdText.length}`,
    });

    // 1. Parse Resume into CanonicalResume
    const resume = await parseResume(resumeText, ctx);

    // 2. Parse Job Description into RawRequirements
    const rawRequirements = await parseJob(jdText, ctx);

    // 3. Match Requirements (Deterministic first, then strict semantic for unresolved)
    const requirements = await matchRequirements(resume, rawRequirements, ctx);

    // 4. Generate consent Gap Questions
    const questions = generateQuestions(requirements, resume, analyzerImprovements);

    securityLogger.info('Tailor prepare pipeline completed', {
      requestId,
      durationMs: Date.now() - startTime,
      status: 'SUCCESS',
      note: `reqs=${requirements.length}, qs=${questions.length}`,
    });

    return NextResponse.json(
      {
        resume,
        requirements,
        questions,
      },
      {
        status: 200,
        headers: standardHeaders,
      }
    );
  } catch (error: unknown) {
    if (error instanceof PipelineError) {
      securityLogger.warn(`Tailor prepare pipeline error: ${error.code}`, {
        requestId,
        durationMs: Date.now() - startTime,
        errorCode: error.code,
        httpStatus: error.httpStatus,
      });

      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.userMessage,
            requestId,
            ...(error.retryAfterSec ? { retryAfterSec: error.retryAfterSec } : {}),
          },
        },
        {
          status: error.httpStatus,
          headers: {
            ...standardHeaders,
            ...(error.retryAfterSec ? { 'Retry-After': String(error.retryAfterSec) } : {}),
          },
        }
      );
    }

    const errMessage = error instanceof Error ? error.message : 'An unexpected error occurred during resume preparation.';
    securityLogger.error('Tailor prepare pipeline unhandled failure', {
      requestId,
      durationMs: Date.now() - startTime,
      errorCode: 'PREPARE_FAILED',
      note: errMessage,
    });

    return NextResponse.json(
      {
        error: {
          code: 'PREPARE_FAILED',
          message: errMessage,
          requestId,
        },
      },
      {
        status: 500,
        headers: standardHeaders,
      }
    );
  }
}
