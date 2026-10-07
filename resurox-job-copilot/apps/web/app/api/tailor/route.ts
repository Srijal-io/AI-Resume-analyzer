import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@resurox/db";
import { validateTailoredContent } from "@resurox/matching";
import { MockProvider } from "@resurox/ai";
import { generateAtsLatex } from "@resurox/resume";
import { TailoredResume } from "@resurox/schemas";
import { randomUUID } from "node:crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysisId, userId = "user-srijal" } = body;

    const db = getRepository();
    const analysis = await db.getAnalysis(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "NOT_FOUND", message: "Analysis not found." } },
        { status: 404 }
      );
    }

    const job = await db.getJob(analysis.jobId);
    const profile = await db.getProfile(userId);

    if (!job || !profile) {
      return NextResponse.json(
        { status: "FAILED", error: { code: "NOT_FOUND", message: "Job or Profile missing." } },
        { status: 404 }
      );
    }

    // Identify user-confirmed skills
    const confirmations = await db.getConfirmations(analysisId);
    const confirmedSkills = confirmations
      .filter((c) => c.answer === "YES" && c.canonicalSkill)
      .map((c) => c.canonicalSkill!);

    // Extract existing skills from profile
    const existingSkills = Object.values(profile.skills).flat();

    // Generate constrained tailored resume
    const tailoredOutput = MockProvider.tailorResume(
      profile.candidateName,
      job.title,
      job.company,
      existingSkills,
      confirmedSkills
    );

    // Validate with anti-hallucination diff validator
    const validatorReport = validateTailoredContent(
      profile,
      tailoredOutput.sections,
      confirmedSkills
    );

    // Format for LaTeX ATS template
    const tailoredSkills: Record<string, string[]> = {
      ...profile.skills,
      "Additional Skills": confirmedSkills
    };

    const latexSource = generateAtsLatex({
      candidateName: profile.candidateName,
      targetRole: `${job.title} Candidate`,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      summary: tailoredOutput.summary,
      skills: tailoredSkills,
      projects: profile.projects.map((p) => ({
        name: p.name,
        technologies: p.technologies,
        highlights: p.highlights
      })),
      experience: profile.experience.map((e) => ({
        company: e.company,
        role: e.role,
        highlights: e.highlights
      })),
      education: profile.education.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        graduationYear: edu.graduationYear
      }))
    });

    const tailoredResume: TailoredResume = {
      id: `tailored-${randomUUID().slice(0, 8)}`,
      userId,
      jobId: job.id,
      analysisId,
      summary: tailoredOutput.summary,
      skills: tailoredSkills,
      experience: profile.experience.map((e) => ({
        company: e.company,
        role: e.role,
        location: e.location,
        period: e.startDate,
        highlights: e.highlights
      })),
      projects: profile.projects.map((p) => ({
        name: p.name,
        description: p.description,
        technologies: p.technologies,
        highlights: p.highlights
      })),
      education: profile.education.map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        graduationYear: edu.graduationYear,
        gpa: edu.gpa
      })),
      validatorReport,
      latexSource,
      createdAt: new Date().toISOString()
    };

    await db.saveTailoredResume(tailoredResume);

    return NextResponse.json({
      status: "OK",
      data: {
        tailoredResume,
        validatorReport
      }
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "TAILOR_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
