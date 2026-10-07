# Resurox — Job Application Copilot

> **Built for Srijal.** Powered by Open-Source AI (**Gemma 2**).  
> *The model proposes; the code disposes.*  
> Submission for **DEV Hacktoberfest 2026 Weekend Challenge — Build for a Friend**

---

## What is Resurox Job Copilot?

When applying for full-stack developer internships, candidates manually copy job descriptions into generative AI tools and end up with fabricated metrics, exaggerated claims, or generic summaries that trigger ATS filters.

**Resurox flips this model on its head:**
1. **Parses & Indexes Once:** Candidate's verified resume is parsed into verbatim evidence spans with character offsets.
2. **Analyzes Anywhere:** Captures job descriptions via Chrome Extension (or first-class manual paste).
3. **Deterministic Scoring:** Local open-weights **Gemma 2** proposes requirement mappings, while deterministic code verifies evidence spans and computes an exact match score with zero hallucination.
4. **Interactive Gap Confirmation:** Candidates confirm or deny missing skills honestly.
5. **Anti-Hallucination Tailoring:** A strict diff validator guarantees 0% fabricated tools or numbers before compiling to an authentic single-column ATS LaTeX PDF.

---

## Monorepo Architecture

```text
resurox-job-copilot/
├── apps/
│   ├── web/            # Next.js 15 App Router web application
│   └── extension/      # Chrome MV3 extension with extraction ladder
├── packages/
│   ├── ai/             # Local Ollama Gemma gateway, safe prompts, repair loop, mock fallback
│   ├── schemas/        # Shared Zod data schemas
│   ├── matching/       # Deterministic scoring formula & anti-hallucination diff validator
│   ├── db/             # Supabase & zero-config local repository
│   └── resume/         # Verbatim evidence parser & ATS LaTeX generator
├── docs/
│   ├── friend-study.md # Srijal's before/after study (71% time reduction)
│   ├── model.md        # Gemma local evaluation and serving architecture
│   ├── reuse.md        # Lineage disclosure and reuse ledger
│   └── security.md     # Injection delimiters and data retention
└── Dockerfile          # Alpine Linux + TeXLive container
```

---

## 5-Minute Quickstart

### 1. Prerequisites
- Node.js 18+ installed
- (Optional for local inference) [Ollama](https://ollama.com) running with Gemma:
  ```bash
  ollama run gemma2:2b
  ```
  *(Note: If Ollama is offline, Resurox automatically uses the built-in deterministic mock provider so you can test end-to-end immediately without setup!)*

### 2. Install & Start Web App
```bash
# Navigate to web app
cd apps/web

# Start local server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 3. Load Chrome Extension
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `apps/extension` folder.
4. Click the Resurox icon on any job posting or paste requirements manually!

---

## The Rule That Mattered

```text
LLM  = interpretation + extraction + proposing mappings + wording explanations
Code = validation + evidence verification + deterministic scoring + authorization
```

The mathematical formula guarantees reproducibility:
$$\text{score} = \text{round}\left( 100 \times \frac{\sum (w \cdot s \cdot m)}{\sum w} \right)$$
- Weights $w$: Required = 3, Preferred = 1
- State $s$: Full = 1.0, Partial = 0.5, User Confirmed = 0.9, Missing = 0
- Context $m$: Project/Experience = 1.0, Skills-list = 0.75

---

## Hacktoberfest 2026 Target Categories
- **Best Use of Gemma:** Local open-weights Gemma 2 parsing unstructured JDs with structured schema enforcement.
- **Best Use of Render:** Alpine Linux container running minimal TeXLive for ATS LaTeX PDF compilation.

## License
MIT License. Built with ❤️ for Srijal.
