import { NextRequest, NextResponse } from "next/server";
import { AiGateway } from "@resurox/ai";
import { getRepository } from "@resurox/db";
import { JobPosting, JobRequirement } from "@resurox/schemas";
import { createHash, randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawJd, company, title, extractionMethod = "MANUAL_PASTE", userId = "user-srijal" } = body;

    if (!rawJd || typeof rawJd !== "string" || rawJd.trim().length < 10) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "EXTRACTION_FAILED", message: "Job description is too short or empty." } },
        { status: 400 }
      );
    }

    const rawJdHash = createHash("sha256").update(rawJd.trim()).digest("hex");
    const gateway = new AiGateway();

    const { data, status, warning, modelRun } = await gateway.extractRequirements(rawJd);

    const db = getRepository();
    await db.logModelRun(modelRun);

    const requirements: JobRequirement[] = data.requirements.map((r, i) => ({
      id: `req-${i + 1}`,
      text: r.text,
      kind: r.kind,
      canonicalSkill: r.canonicalSkill,
      category: r.category
    }));

    const jobPosting: JobPosting = {
      id: `job-${randomUUID().slice(0, 8)}`,
      userId,
      company: company || "Target Company",
      title: title || "Full Stack Developer",
      rawJd,
      rawJdHash,
      requirements,
      extractionMethod,
      createdAt: new Date().toISOString()
    };

    await db.saveJob(jobPosting);

    return NextResponse.json({
      status: "OK",
      data: {
        job: jobPosting,
        warning
      }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "EXTRACTION_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
