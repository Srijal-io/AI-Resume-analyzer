import { NextRequest, NextResponse } from 'next/server';
import { generateTailoredResume } from '@/lib/tailor/generate';
import { TailorGenerateRequestSchema } from '@/lib/tailor/schemas';
import { GatewayContext } from '@/lib/ai/gateway';
import { PipelineError } from '@/lib/pipeline/errors';
import { securityLogger } from '@/lib/security/logger';
import { isKillSwitchActive } from '@/lib/security/budget';
import { validateRequestMethod, validateRequestOrigin } from '@/lib/security/validation';

export const maxDuration = 60;

/**
 * POST /api/tailor/generate
 * Generates tailored resume draft based on candidate's confirmed evidence.
 * Enforces zero-fabrication invariant and deterministic Claim Verifier.
 * Returns tailored canonical resume + audited change report.
 * 
 * Strict Privacy: No raw resume, bullet, or evidence text is logged.
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
    const body = await req.json();
    const parsed = TailorGenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new PipelineError(
        'SCHEMA_VALIDATION_FAILED',
        'Invalid tailor request payload shape. Please provide valid canonical resume and answers.'
      );
    }

    const { resume, requirements, answers, metrics, targetJobTitle } = parsed.data;

    // AI Gateway Context
    const ctx: GatewayContext = {
      requestId,
      signal: req.signal,
      deadline: startTime + 55000,
    };

    securityLogger.info('Tailor generate pipeline started', {
      requestId,
      note: `bulletsTotal=${resume.experience.reduce((acc, e) => acc + e.bullets.length, 0) + resume.projects.reduce((acc, p) => acc + p.bullets.length, 0)}, answersCount=${answers.length}, metricsCount=${metrics.length}`,
    });

    const result = await generateTailoredResume(
      resume,
      requirements,
      answers,
      metrics,
      ctx,
      targetJobTitle
    );

    securityLogger.info('Tailor generate pipeline completed', {
      requestId,
      durationMs: Date.now() - startTime,
      status: 'SUCCESS',
      note: `changes=${result.changeReport.changes.length}, addedSkills=${result.changeReport.addedSkills.length}`,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: standardHeaders,
    });
  } catch (error: unknown) {
    if (error instanceof PipelineError) {
      securityLogger.warn(`Tailor generate pipeline error: ${error.code}`, {
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

    const errMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred during resume tailoring.';
    securityLogger.error('Tailor generate pipeline unhandled failure', {
      requestId,
      durationMs: Date.now() - startTime,
      errorCode: 'TAILOR_GENERATE_FAILED',
      note: errMessage,
    });

    return NextResponse.json(
      {
        error: {
          code: 'TAILOR_GENERATE_FAILED',
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
