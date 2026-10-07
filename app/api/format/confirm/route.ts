import { NextRequest, NextResponse } from 'next/server';
import { ephemeralSessionStore, UserConfirmationPayload } from '@/lib/security/sessionStore';
import { transitionProvenance, ProvenanceState } from '@/lib/types/provenance';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, confirmations } = body as {
      sessionId: string;
      confirmations: UserConfirmationPayload[];
    };

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_SESSION_ID', message: 'Valid sessionId is required.' } },
        { status: 400 }
      );
    }

    if (!Array.isArray(confirmations)) {
      return NextResponse.json(
        { error: { code: 'INVALID_CONFIRMATIONS', message: 'Confirmations array is required.' } },
        { status: 400 }
      );
    }

    const session = await ephemeralSessionStore.getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: { code: 'SESSION_EXPIRED', message: 'Session not found or has expired. Please re-run prepare.' } },
        { status: 404 }
      );
    }

    // Process each confirmation deterministically
    const nowIso = new Date().toISOString();
    for (const conf of confirmations) {
      let targetProvenance: ProvenanceState = 'REJECTED';

      if (conf.confirmed) {
        if (conf.description && conf.description.trim().length > 5) {
          // Tier 2: User provided concrete description of experience
          targetProvenance = transitionProvenance('JD_ONLY', 'USER_CONFIRM_T2');
        } else {
          // Tier 1: User attested familiarity/used with context
          targetProvenance = transitionProvenance('JD_ONLY', 'USER_CONFIRM_T1');
        }
      } else {
        targetProvenance = transitionProvenance('JD_ONLY', 'USER_REJECT');
      }

      session.confirmations[conf.requirementId] = {
        ...conf,
        provenance: targetProvenance,
        confirmedAt: nowIso,
      };
    }

    // Save updated session
    await ephemeralSessionStore.saveSession(session);

    return NextResponse.json(
      {
        success: true,
        sessionId,
        updatedConfirmationsCount: Object.keys(session.confirmations).length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: { code: 'CONFIRM_ERROR', message: msg } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json(
        { error: { code: 'INVALID_SESSION_ID', message: 'sessionId is required.' } },
        { status: 400 }
      );
    }

    await ephemeralSessionStore.deleteSession(sessionId);
    return NextResponse.json({ success: true, message: 'Session deleted successfully.' }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: msg } }, { status: 500 });
  }
}
