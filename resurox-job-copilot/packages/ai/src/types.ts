import { JobRequirement, ModelRun, RequirementState } from "@resurox/schemas";

export interface ExtractedRequirementsPayload {
  requirements: {
    text: string;
    kind: "REQUIRED" | "PREFERRED";
    canonicalSkill?: string;
    category: "LANGUAGE" | "FRAMEWORK" | "DATABASE" | "TOOL" | "ARCHITECTURE" | "EDUCATION" | "EXPERIENCE_YEARS" | "GENERAL";
  }[];
}

export interface ProposedMappingItem {
  requirementId: string;
  proposedState: RequirementState;
  candidateEvidenceSpans: string[];
  notes?: string;
}

export interface ProposedMappingsPayload {
  mappings: ProposedMappingItem[];
}

export interface ExplanationPayload {
  explanation: string;
  keyStrengths: string[];
  primaryGaps: string[];
}

export interface TailoredSectionOutput {
  heading: string;
  content: string;
}

export interface TailoredResumePayload {
  summary: string;
  sections: TailoredSectionOutput[];
}

export interface AiGatewayResponse<T> {
  data: T;
  provider: "ollama" | "mock";
  model: string;
  latencyMs: number;
  status: "OK" | "DEGRADED" | "FAILED";
  warning?: string;
  modelRun: ModelRun;
}
