import { OllamaProvider } from "./ollama-provider";
import { MockProvider } from "./mock-provider";
import {
  ExtractedRequirementsPayload,
  ProposedMappingsPayload,
  ExplanationPayload,
  TailoredResumePayload,
  AiGatewayResponse
} from "./types";
import {
  PROMPT_VERSION,
  buildRequirementsExtractionPrompt,
  buildEvidenceMappingPrompt,
  buildExplanationPrompt,
  buildTailoringPrompt
} from "./prompts";
import { ModelRun } from "@resurox/schemas";
import { randomUUID } from "node:crypto";

export class AiGateway {
  private ollama: OllamaProvider;
  private forcedProvider?: "ollama" | "mock";

  constructor(options: { forcedProvider?: "ollama" | "mock"; model?: string } = {}) {
    this.ollama = new OllamaProvider({ model: options.model });
    this.forcedProvider = options.forcedProvider;
  }

  async extractRequirements(rawJd: string, analysisId?: string): Promise<AiGatewayResponse<ExtractedRequirementsPayload>> {
    const startTime = Date.now();
    const prompt = buildRequirementsExtractionPrompt(rawJd);

    const useMock = this.forcedProvider === "mock" || !(await this.ollama.isAvailable());

    if (!useMock) {
      try {
        const { data, repaired } = await this.ollama.generateJson<ExtractedRequirementsPayload>(prompt, "ExtractedRequirementsPayload");
        const latencyMs = Date.now() - startTime;

        const modelRun: ModelRun = {
          id: randomUUID(),
          analysisId,
          step: "REQUIREMENTS_EXTRACTION",
          provider: "ollama",
          model: process.env.OLLAMA_MODEL || "gemma2:2b",
          promptVersion: PROMPT_VERSION,
          latencyMs,
          outcome: repaired ? "REPAIRED" : "SUCCESS",
          createdAt: new Date().toISOString()
        };

        return {
          data,
          provider: "ollama",
          model: modelRun.model,
          latencyMs,
          status: "OK",
          modelRun
        };
      } catch (err) {
        // Fallback gracefully to mock
      }
    }

    // Graceful degradation / Mock fallback
    const data = MockProvider.extractRequirements(rawJd);
    const latencyMs = Date.now() - startTime;

    const modelRun: ModelRun = {
      id: randomUUID(),
      analysisId,
      step: "REQUIREMENTS_EXTRACTION",
      provider: "mock",
      model: "mock-gemma-deterministic",
      promptVersion: PROMPT_VERSION,
      latencyMs,
      outcome: "SUCCESS",
      createdAt: new Date().toISOString()
    };

    return {
      data,
      provider: "mock",
      model: "mock-gemma-deterministic",
      latencyMs,
      status: "DEGRADED",
      warning: "Ollama not reachable; served via deterministic Mock Provider.",
      modelRun
    };
  }

  async proposeMappings(
    requirements: { id: string; canonicalSkill?: string; text: string }[],
    rawResumeText: string,
    analysisId?: string
  ): Promise<AiGatewayResponse<ProposedMappingsPayload>> {
    const startTime = Date.now();
    const prompt = buildEvidenceMappingPrompt(JSON.stringify(requirements), rawResumeText);

    const useMock = this.forcedProvider === "mock" || !(await this.ollama.isAvailable());

    if (!useMock) {
      try {
        const { data, repaired } = await this.ollama.generateJson<ProposedMappingsPayload>(prompt, "ProposedMappingsPayload");
        const latencyMs = Date.now() - startTime;

        const modelRun: ModelRun = {
          id: randomUUID(),
          analysisId,
          step: "EVIDENCE_MAPPING",
          provider: "ollama",
          model: process.env.OLLAMA_MODEL || "gemma2:2b",
          promptVersion: PROMPT_VERSION,
          latencyMs,
          outcome: repaired ? "REPAIRED" : "SUCCESS",
          createdAt: new Date().toISOString()
        };

        return {
          data,
          provider: "ollama",
          model: modelRun.model,
          latencyMs,
          status: "OK",
          modelRun
        };
      } catch {
        // Fallback
      }
    }

    const data = MockProvider.proposeMappings(requirements, rawResumeText);
    const latencyMs = Date.now() - startTime;

    const modelRun: ModelRun = {
      id: randomUUID(),
      analysisId,
      step: "EVIDENCE_MAPPING",
      provider: "mock",
      model: "mock-gemma-deterministic",
      promptVersion: PROMPT_VERSION,
      latencyMs,
      outcome: "SUCCESS",
      createdAt: new Date().toISOString()
    };

    return {
      data,
      provider: "mock",
      model: "mock-gemma-deterministic",
      latencyMs,
      status: "DEGRADED",
      warning: "Served via deterministic Mock Provider.",
      modelRun
    };
  }

  async generateExplanation(
    score: number,
    earnedTotal: number,
    possibleTotal: number,
    strengths: string[],
    gaps: string[],
    warnings: string[],
    analysisId?: string
  ): Promise<AiGatewayResponse<ExplanationPayload>> {
    const startTime = Date.now();
    const prompt = buildExplanationPrompt(score, earnedTotal, possibleTotal, strengths, gaps, warnings);

    const useMock = this.forcedProvider === "mock" || !(await this.ollama.isAvailable());

    if (!useMock) {
      try {
        const { data, repaired } = await this.ollama.generateJson<ExplanationPayload>(prompt, "ExplanationPayload");
        const latencyMs = Date.now() - startTime;

        const modelRun: ModelRun = {
          id: randomUUID(),
          analysisId,
          step: "EXPLANATION_GENERATION",
          provider: "ollama",
          model: process.env.OLLAMA_MODEL || "gemma2:2b",
          promptVersion: PROMPT_VERSION,
          latencyMs,
          outcome: repaired ? "REPAIRED" : "SUCCESS",
          createdAt: new Date().toISOString()
        };

        return {
          data,
          provider: "ollama",
          model: modelRun.model,
          latencyMs,
          status: "OK",
          modelRun
        };
      } catch {
        // Fallback
      }
    }

    const data = MockProvider.generateExplanation(score, strengths, gaps);
    const latencyMs = Date.now() - startTime;

    const modelRun: ModelRun = {
      id: randomUUID(),
      analysisId,
      step: "EXPLANATION_GENERATION",
      provider: "mock",
      model: "mock-gemma-deterministic",
      promptVersion: PROMPT_VERSION,
      latencyMs,
      outcome: "SUCCESS",
      createdAt: new Date().toISOString()
    };

    return {
      data,
      provider: "mock",
      model: "mock-gemma-deterministic",
      latencyMs,
      status: "DEGRADED",
      modelRun
    };
  }
}
