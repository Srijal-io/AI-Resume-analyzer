import { NextRequest, NextResponse } from "next/server";
import { AiGateway } from "@resurox/ai";
import { getRepository } from "@resurox/db";
import {
  computeDeterministicScore,
  generateInputHash,
  verifyEvidenceSpan,
  CandidateMapping
} from "@resurox/matching";
import { createSrijalProfile } from "@resurox/resume";
import { JobPosting, MatchAnalysis, RequirementState } from "@resurox/schemas";
import { createHash, randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId,
      rawJd,
      company = "Target Company",
      title = "Full Stack Developer",
      extractionMethod = "MANUAL_PASTE",
      userId = "user-srijal"
    } = body;

    const db = getRepository();

    // 1. Ensure profile exists
    let profile = await db.getProfile(userId);
    if (!profile) {
      profile = createSrijalProfile();
      await db.saveProfile(profile);
    }

    // 2. Fetch or create Job
    let job: JobPosting | null = null;
    if (jobId) {
      job = await db.getJob(jobId);
    }

    const gateway = new AiGateway();

    if (!job) {
      if (!rawJd || rawJd.trim().length < 10) {
        return NextResponse.json(
          { status: "FAILED", error: { code: "EXTRACTION_FAILED", message: "Job description is missing or invalid." } },
          { status: 400 }
        );
      }

      const rawJdHash = createHash("sha256").update(rawJd.trim()).digest("hex");
      const extractRes = await gateway.extractRequirements(rawJd);
      await db.logModelRun(extractRes.modelRun);

      job = {
        id: `job-${randomUUID().slice(0, 8)}`,
        userId,
        company,
        title,
        rawJd,
        rawJdHash,
        requirements: extractRes.data.requirements.map((r, i) => ({
          id: `req-${i + 1}`,
          text: r.text,
          kind: r.kind,
          canonicalSkill: r.canonicalSkill,
          category: r.category
        })),
        extractionMethod,
        createdAt: new Date().toISOString()
      };
      await db.saveJob(job);
    }

    // 3. Propose candidate mappings via AI Gateway
    const mappingRes = await gateway.proposeMappings(
      job.requirements.map((r) => ({ id: r.id, canonicalSkill: r.canonicalSkill, text: r.text })),
      profile.rawText
    );
    await db.logModelRun(mappingRes.modelRun);

    // 4. Code verifies evidence spans and assigns final state ("LLM proposes, code disposes")
    const verifiedMappings: CandidateMapping[] = [];

    for (const proposed of mappingRes.data.mappings) {
      let finalState: RequirementState = proposed.proposedState;
      const matchedIds: string[] = [];
      let evidenceContext: "PROJECT_OR_EXPERIENCE" | "SKILL_LIST_ONLY" = "SKILL_LIST_ONLY";

      if (proposed.proposedState === "FULL" || proposed.proposedState === "PARTIAL") {
        // Verify candidate spans against raw resume text
        let spanVerified = false;

        for (const span of proposed.candidateEvidenceSpans) {
          const check = verifyEvidenceSpan(profile.rawText, span);
          if (check.verified) {
            spanVerified = true;
            // Find existing evidence record or match
            const existing = profile.evidenceRecords.find((r) => r.sourceSpan.toLowerCase().includes(span.toLowerCase()));
            if (existing) {
              matchedIds.push(existing.id);
              if (existing.contextType === "PROJECT_OR_EXPERIENCE") {
                evidenceContext = "PROJECT_OR_EXPERIENCE";
              }
            }
          }
        }

        if (!spanVerified) {
          // LLM proposed a match but code could not verify the verbatim span
          finalState = "MISSING";
        }
      }

      verifiedMappings.push({
        requirementId: proposed.requirementId,
        state: finalState,
        matchedEvidenceIds: matchedIds,
        evidenceContext,
        notes: proposed.notes
      });
    }

    // 5. Deterministic scoring calculation
    const scoring = computeDeterministicScore(job.requirements, verifiedMappings);

    // 6. Generate human-readable explanation based on facts
    const explanationRes = await gateway.generateExplanation(
      scoring.score,
      scoring.earnedTotal,
      scoring.possibleTotal,
      scoring.strengths,
      scoring.gaps,
      scoring.warnings
    );
    await db.logModelRun(explanationRes.modelRun);

    const inputHash = generateInputHash(profile.version, job.rawJdHash);
    const analysisId = `analysis-${randomUUID().slice(0, 8)}`;

    const analysis: MatchAnalysis = {
      id: analysisId,
      jobId: job.id,
      resumeProfileId: profile.id,
      resumeVersion: profile.version,
      scoringVersion: "v1.1.0",
      inputHash,
      score: scoring.score,
      earnedTotal: scoring.earnedTotal,
      possibleTotal: scoring.possibleTotal,
      status: mappingRes.status === "OK" ? "OK" : "DEGRADED",
      confidence: mappingRes.status === "OK" ? "HIGH" : "MEDIUM",
      strengths: scoring.strengths,
      gaps: scoring.gaps,
      warnings: scoring.warnings,
      requirementResults: scoring.requirementResults,
      explanation: explanationRes.data.explanation,
      createdAt: new Date().toISOString()
    };

    await db.saveAnalysis(analysis);

    return NextResponse.json({
      status: "OK",
      data: {
        analysis,
        job
      }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "ANALYSIS_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
