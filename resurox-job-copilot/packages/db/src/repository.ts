import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  ResumeProfile,
  JobPosting,
  MatchAnalysis,
  ConfirmationRecord,
  ModelRun,
  TailoredResume
} from "@resurox/schemas";
import { randomUUID } from "node:crypto";

export interface ResuroxRepository {
  // Profile
  getProfile(userId: string): Promise<ResumeProfile | null>;
  saveProfile(profile: ResumeProfile): Promise<void>;
  deleteProfile(userId: string): Promise<void>;

  // Jobs
  getJob(id: string): Promise<JobPosting | null>;
  saveJob(job: JobPosting): Promise<void>;

  // Analyses
  getAnalysis(id: string): Promise<MatchAnalysis | null>;
  saveAnalysis(analysis: MatchAnalysis): Promise<void>;

  // Confirmations
  saveConfirmation(confirmation: ConfirmationRecord): Promise<void>;
  getConfirmations(analysisId: string): Promise<ConfirmationRecord[]>;

  // Tailored Resumes
  saveTailoredResume(tailored: TailoredResume): Promise<void>;
  getTailoredResume(id: string): Promise<TailoredResume | null>;

  // Model Runs
  logModelRun(run: ModelRun): Promise<void>;
}

/**
 * Local in-memory repository with zero-config instant bootstrapping.
 */
class LocalRepository implements ResuroxRepository {
  private profiles = new Map<string, ResumeProfile>();
  private jobs = new Map<string, JobPosting>();
  private analyses = new Map<string, MatchAnalysis>();
  private confirmations = new Map<string, ConfirmationRecord[]>();
  private tailoredResumes = new Map<string, TailoredResume>();
  private modelRuns: ModelRun[] = [];

  async getProfile(userId: string): Promise<ResumeProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async saveProfile(profile: ResumeProfile): Promise<void> {
    this.profiles.set(profile.userId, profile);
  }

  async deleteProfile(userId: string): Promise<void> {
    this.profiles.delete(userId);
  }

  async getJob(id: string): Promise<JobPosting | null> {
    return this.jobs.get(id) || null;
  }

  async saveJob(job: JobPosting): Promise<void> {
    this.jobs.set(job.id, job);
  }

  async getAnalysis(id: string): Promise<MatchAnalysis | null> {
    return this.analyses.get(id) || null;
  }

  async saveAnalysis(analysis: MatchAnalysis): Promise<void> {
    this.analyses.set(analysis.id, analysis);
  }

  async saveConfirmation(confirmation: ConfirmationRecord): Promise<void> {
    const list = this.confirmations.get(confirmation.analysisId) || [];
    // Replace if exists
    const idx = list.findIndex((c) => c.requirementId === confirmation.requirementId);
    if (idx >= 0) list[idx] = confirmation;
    else list.push(confirmation);
    this.confirmations.set(confirmation.analysisId, list);
  }

  async getConfirmations(analysisId: string): Promise<ConfirmationRecord[]> {
    return this.confirmations.get(analysisId) || [];
  }

  async saveTailoredResume(tailored: TailoredResume): Promise<void> {
    this.tailoredResumes.set(tailored.id, tailored);
  }

  async getTailoredResume(id: string): Promise<TailoredResume | null> {
    return this.tailoredResumes.get(id) || null;
  }

  async logModelRun(run: ModelRun): Promise<void> {
    this.modelRuns.push(run);
  }
}

/**
 * Supabase client implementation for production cloud persistence.
 */
class SupabaseRepository implements ResuroxRepository {
  private client: SupabaseClient;

  constructor(url: string, key: string) {
    this.client = createClient(url, key);
  }

  async getProfile(userId: string): Promise<ResumeProfile | null> {
    const { data, error } = await this.client
      .from("resume_profiles")
      .select("*")
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.structured_json as ResumeProfile;
  }

  async saveProfile(profile: ResumeProfile): Promise<void> {
    await this.client.from("resume_profiles").upsert({
      id: profile.id,
      user_id: profile.userId,
      version: profile.version,
      candidate_name: profile.candidateName,
      target_role: profile.targetRole,
      raw_text: profile.rawText,
      structured_json: profile,
      updated_at: new Date().toISOString()
    });
  }

  async deleteProfile(userId: string): Promise<void> {
    await this.client.from("resume_profiles").delete().eq("user_id", userId);
  }

  async getJob(id: string): Promise<JobPosting | null> {
    const { data, error } = await this.client
      .from("jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      company: data.company,
      title: data.title,
      rawJd: data.raw_jd,
      rawJdHash: data.raw_jd_hash,
      requirements: data.requirements,
      extractionMethod: data.extraction_method,
      createdAt: data.created_at
    };
  }

  async saveJob(job: JobPosting): Promise<void> {
    await this.client.from("jobs").upsert({
      id: job.id,
      user_id: job.userId,
      company: job.company,
      title: job.title,
      raw_jd: job.rawJd,
      raw_jd_hash: job.rawJdHash,
      requirements: job.requirements,
      extraction_method: job.extractionMethod,
      created_at: job.createdAt
    });
  }

  async getAnalysis(id: string): Promise<MatchAnalysis | null> {
    const { data, error } = await this.client
      .from("analyses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return data.data as MatchAnalysis;
  }

  async saveAnalysis(analysis: MatchAnalysis): Promise<void> {
    await this.client.from("analyses").upsert({
      id: analysis.id,
      job_id: analysis.jobId,
      score: analysis.score,
      status: analysis.status,
      data: analysis,
      created_at: analysis.createdAt
    });
  }

  async saveConfirmation(confirmation: ConfirmationRecord): Promise<void> {
    await this.client.from("confirmations").upsert({
      id: confirmation.id,
      analysis_id: confirmation.analysisId,
      requirement_id: confirmation.requirementId,
      answer: confirmation.answer,
      notes: confirmation.notes,
      created_at: confirmation.createdAt
    });
  }

  async getConfirmations(analysisId: string): Promise<ConfirmationRecord[]> {
    const { data } = await this.client
      .from("confirmations")
      .select("*")
      .eq("analysis_id", analysisId);

    return (data || []).map((d) => ({
      id: d.id,
      analysisId: d.analysis_id,
      requirementId: d.requirement_id,
      requirementText: d.requirement_text || "",
      answer: d.answer,
      notes: d.notes,
      createdAt: d.created_at
    }));
  }

  async saveTailoredResume(tailored: TailoredResume): Promise<void> {
    await this.client.from("tailored_resumes").upsert({
      id: tailored.id,
      user_id: tailored.userId,
      job_id: tailored.jobId,
      data: tailored,
      created_at: tailored.createdAt
    });
  }

  async getTailoredResume(id: string): Promise<TailoredResume | null> {
    const { data } = await this.client
      .from("tailored_resumes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? (data.data as TailoredResume) : null;
  }

  async logModelRun(run: ModelRun): Promise<void> {
    await this.client.from("model_runs").insert({
      id: run.id,
      analysis_id: run.analysisId,
      step: run.step,
      provider: run.provider,
      model: run.model,
      prompt_version: run.promptVersion,
      latency_ms: run.latencyMs,
      outcome: run.outcome,
      created_at: run.createdAt
    });
  }
}

// Global singleton instance
let repositoryInstance: ResuroxRepository | null = null;

export function getRepository(): ResuroxRepository {
  if (repositoryInstance) return repositoryInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    repositoryInstance = new SupabaseRepository(url, key);
  } else {
    repositoryInstance = new LocalRepository();
  }

  return repositoryInstance;
}
