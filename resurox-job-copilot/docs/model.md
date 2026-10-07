# Open-Source AI Strategy & Gemma Architecture

## 1. Model Choice: Gemma 2 (Local Ollama Serving)

For Resurox Job Application Copilot, we chose **Google's open-weights Gemma 2 (`gemma2:2b`)** served locally via **Ollama**.

### Why Gemma 2?
- **Local & 100% Private:** Resume data never leaves Srijal's machine during local dev/privacy mode.
- **Superior Structured Extraction:** High accuracy in identifying technical requirements and programming libraries from unstructured job descriptions.
- **Low Footprint:** Runs comfortably on standard laptop hardware with minimal VRAM consumption.
- **Zero Closed Dependencies:** No API tokens, subscription fees, or vendor lock-in to proprietary closed APIs.

---

## 2. Division of Labor: "The Model Proposes, Code Disposes"

Small and medium-sized language models are prone to hallucinations and JSON drift if given full autonomy. We established a strict architectural boundary:

```text
┌─────────────────────────────────────────────────────────────┐
│                    LLM (Gemma 2)                            │
│  - Parses natural language JDs into structured requirements │
│  - Proposes requirement <-> evidence mappings               │
│  - Wording human-friendly explanations                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Structured JSON proposals
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Deterministic Code Engine                   │
│  - Verifies verbatim evidence substrings in raw resume text │
│  - Normalizes canonical skills via alias map                │
│  - Computes ATS match score by exact mathematical formula   │
│  - Diff validator rejects ANY unapproved skill or metric    │
└─────────────────────────────────────────────────────────────┘
```

The LLM **never** decides the final score, **never** marks ATS compliance, and **never** has write access to fabricate experiences.

---

## 3. Reliability & Fault-Tolerant Repair Loop

1. **Strict Zod Schemas:** Every model output is constrained and validated against runtime Zod definitions.
2. **1-Attempt Repair Retry:** If the local model returns invalid JSON, the gateway automatically feeds the syntax error back to the model with an explicit schema repair prompt.
3. **Deterministic Mock Fallback:** If Ollama daemon is offline or model is still downloading, the system gracefully degrades to the deterministic mock provider with an explicit indicator in the UI. Zero crashes.
