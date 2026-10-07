import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@resurox/db";
import { computeDeterministicScore, CandidateMapping } from "@resurox/matching";
import { ConfirmGapRequestSchema, ConfirmationRecord } from "@resurox/schemas";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, requirementId, answer, notes } = ConfirmGapRequestSchema.parse(body);

    const db = getRepository();
    const analysis = await db.getAnalysis(analysisId);

    if (!analysis) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "NOT_FOUND", message: "Analysis not found." } },
        { status: 404 }
      );
    }

    const job = await db.getJob(analysis.jobId);
    if (!job) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "NOT_FOUND", message: "Associated job not found." } },
        { status: 404 }
      );
    }

    // Persist confirmation record
    const targetReq = job.requirements.find((r) => r.id === requirementId);
    const confirmation: ConfirmationRecord = {
      id: `conf-${randomUUID().slice(0, 8)}`,
      analysisId,
      requirementId,
      requirementText: targetReq ? targetReq.text : "",
      canonicalSkill: targetReq?.canonicalSkill,
      answer,
      notes,
      createdAt: new Date().toISOString()
    };
    await db.saveConfirmation(confirmation);

    // Fetch all confirmations for this analysis
    const allConfirmations = await db.getConfirmations(analysisId);
    const confMap = new Map(allConfirmations.map((c) => [c.requirementId, c.answer]));

    // Rebuild candidate mappings with confirmed states
    const candidateMappings: CandidateMapping[] = analysis.requirementResults.map((res) => {
      let state = res.state;
      const confAnswer = confMap.get(res.requirementId);

      if (confAnswer === "YES") {
        state = "USER_CONFIRMED";
      } else if (confAnswer === "NO") {
        state = "MISSING";
      } else if (confAnswer === "NOT_SURE") {
        state = "UNVERIFIED";
      }

      return {
        requirementId: res.requirementId,
        state,
        matchedEvidenceIds: res.matchedEvidenceIds,
        evidenceContext: res.evidenceContext,
        notes: res.notes
      };
    });

    // Re-score deterministically
    const reScoring = computeDeterministicScore(job.requirements, candidateMappings);

    // Update analysis object
    analysis.score = reScoring.score;
    analysis.earnedTotal = reScoring.earnedTotal;
    analysis.possibleTotal = reScoring.possibleTotal;
    analysis.strengths = reScoring.strengths;
    analysis.gaps = reScoring.gaps;
    analysis.warnings = reScoring.warnings;
    analysis.requirementResults = reScoring.requirementResults;

    await db.saveAnalysis(analysis);

    return NextResponse.json({
      status: "OK",
      data: {
        analysis,
        confirmation
      }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "CONFIRMATION_FAILED", message: String(err) } },
      { status: 400 }
    );
  }
}
