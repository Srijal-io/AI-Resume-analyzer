import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@resurox/db";
import { createSrijalProfile } from "@resurox/resume";
import { ResumeProfileSchema } from "@resurox/schemas";

const DEFAULT_USER_ID = "user-srijal";

export async function GET(req: NextRequest) {
  const db = getRepository();
  const userId = req.nextUrl.searchParams.get("userId") || DEFAULT_USER_ID;

  let profile = await db.getProfile(userId);
  if (!profile) {
    // Seed Srijal's full stack profile automatically
    profile = createSrijalProfile();
    await db.saveProfile(profile);
  }

  return NextResponse.json({
    status: "OK",
    data: profile
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ResumeProfileSchema.parse(body);

    const db = getRepository();
    await db.saveProfile(parsed);

    return NextResponse.json({
      status: "OK",
      data: parsed
    });
  } catch (err) {
    return NextResponse.json(
      { status: "FAILED", error: { code: "INVALID_PROFILE_DATA", message: String(err) } },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") || DEFAULT_USER_ID;
  const db = getRepository();
  await db.deleteProfile(userId);

  return NextResponse.json({
    status: "OK",
    message: "Resume profile and associated evidence records successfully deleted."
  });
}
