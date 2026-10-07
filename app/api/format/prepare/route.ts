import { NextRequest, NextResponse } from 'next/server';
import { runFormatPreparePipeline } from '@/lib/pipeline/formatPrepare';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let resumeText = '';
    let jobDescriptionText = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      resumeText = body.resumeText || '';
      jobDescriptionText = body.jobDescription || body.jobDescriptionText || '';
    } else {
      const formData = await req.formData();
      resumeText = (formData.get('resumeText') as string) || '';
      jobDescriptionText = (formData.get('jobDescription') as string) || '';
    }

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json(
        { error: { code: 'INVALID_RESUME_TEXT', message: 'Resume text is missing or too short.' } },
        { status: 400 }
      );
    }

    if (!jobDescriptionText || jobDescriptionText.trim().length < 20) {
      return NextResponse.json(
        { error: { code: 'INVALID_JOB_DESCRIPTION', message: 'Job description text is missing or too short.' } },
        { status: 400 }
      );
    }

    const result = await runFormatPreparePipeline({
      resumeText,
      jobDescriptionText,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'PREPARE_PIPELINE_ERROR', message: msg } },
      { status: 500 }
    );
  }
}
