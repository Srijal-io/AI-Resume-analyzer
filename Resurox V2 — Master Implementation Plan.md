# Resurox V2 — Master Implementation Plan

Supersedes the sequencing in *Resurox V2 Architecture and Security Blueprint*. Keeps its core ideas (confirmation gate, provenance, controlled LaTeX, web-first, extension as thin client) and fixes the gaps found in review.

---

## 1. Verdict on the blueprint

**Strong, keep as-is**
- The invariant: a missing qualification stays missing until the user confirms it and supplies evidence.
- Provenance states, requirement states, and "JD and resume are data, not instructions".
- LaTeX as a deterministic rendering layer, never an AI sandbox.
- Web first, extension second, one shared domain model.
- Server-side keys stay the web default; BYOK exists only in the extension.
- Honest BYOK wording: "your key stays on your device and goes directly to your provider".

**Weak or missing** — 24 gaps, listed in section 2. The five that matter most:
1. The provenance rules are only described, not enforced. Nothing stops a rewritten bullet from smuggling in a new technology or number (G1).
2. BYOK mode plus a server-side PDF compile sends the resume to Resurox servers, which contradicts the BYOK privacy promise (G2).
3. LaTeX cannot run on Vercel serverless; a separate sandboxed compile service is needed (G3).
4. Free-tier providers with several LLM calls per format will hit rate limits fast, and there is no budget, caching or abuse design (G4, G5).
5. Session records are required, yet raw resumes must not be persisted. The storage model is undefined (G6).

---

## 2. Gap register

Severity: **C** critical (blocks release), **H** high, **M** medium.

| ID | Sev | Gap | Resolution in this plan |
|---|---|---|---|
| G1 | C | Provenance is documentation, not code. Rewrites can add unsupported tech, numbers or scope. | **Claim Verifier**: deterministic post-check on every generated bullet (section 4.2). Fail closed. |
| G2 | C | BYOK + server compile leaks the resume to Resurox. Blueprint leaves compile location open. | v1 extension runs in **server mode only**; BYOK ships in V2-8 with an explicit privacy notice that PDF rendering happens on Resurox servers, unless a client-side renderer is added later (section 3, D5). |
| G3 | C | Vercel serverless cannot practically host a TeX distribution. | Separate **render service** (container, no network, resource limits). Renderer sits behind an interface so it can be swapped (D4). |
| G4 | H | Free-tier rate limits vs 4–5 LLM calls per job. No queue, caching or budget. | Call budget per job, hash-keyed cache, provider failover, global daily budget circuit breaker (V2-6). |
| G5 | H | Public no-login endpoints that burn LLM and CPU are an abuse target. | Per-IP and per-session limits, Turnstile-style challenge on `/prepare`, request size caps, render concurrency cap. |
| G6 | H | "Store confirmation timestamp in session" vs "don't persist resumes". | **Ephemeral session store** with TTL, encrypted, deleted on download or expiry (section 4.4). |
| G7 | H | Provider data terms unchecked. Some free tiers may train on or retain inputs. Resumes are PII. | Verify each provider's current free-tier data terms before sending real resumes. Record in ADR. Provider allow-list by data policy. |
| G8 | H | No proficiency or context model. "Familiarity only" is mentioned but cannot be stored. | Add `level` and `context` to confirmed skills (section 4.1). |
| G9 | H | Evidence is free text from the user: an injection and XSS vector, and may be rewritten by AI into overclaims. | Treat as untrusted data. User-supplied text is polished for grammar only, then re-checked by the Claim Verifier. |
| G10 | H | No skill ontology. Aliases (Postgres/PostgreSQL), implied skills and versions are undefined. | Versioned ontology in `core`. "Implies" edges are explicit and conservative; implication never counts as evidence by itself. |
| G11 | H | MV3 service workers can be terminated mid-request. Long LLM calls in a service worker are unreliable. | Run AI calls from the side-panel page context; service worker only coordinates. |
| G12 | H | Direct provider calls need host permissions or CORS support. A custom endpoint is arbitrary host access. | `optional_host_permissions`, requested per provider origin at runtime. Never `<all_urls>`. Anthropic needs its browser-access header. |
| G13 | H | Vault design: Web Crypto has PBKDF2 only, not Argon2. Decrypted key "in memory" is lost when the worker dies. | PBKDF2-SHA256 with a high iteration count (or Argon2id via WASM). Hold the unlocked key in `chrome.storage.session`. |
| G14 | H | `/format/render` and `/format/validate` are separate, so an unvalidated PDF could be downloaded. | Render and validate are one atomic step. Download is only offered for validated artifacts. |
| G15 | H | No LLM evaluation harness. Nondeterminism breaks unit tests. | Golden corpus, recorded fixtures for CI, live nightly eval with fabrication-rate metric (section 6). |
| G16 | M | PDF text extraction breaks on ligatures, odd fonts and hyperlinks. | Template must pass extraction tests for ligatures, Unicode names and link text. Fixed font set. |
| G17 | M | No page-fit algorithm. Overflow and one-page vs two-page undefined. | Deterministic content-budget loop with ordered trim rules (section 4.5). |
| G18 | M | Parser limits: scanned PDFs, multi-column layouts, DOCX output. | v1: text PDFs and DOCX in, PDF out. Scanned and image-only rejected with a clear message. DOCX output deferred. |
| G19 | M | Round-trip comparison thresholds undefined. | Fuzzy match with explicit thresholds per field (V2-5). |
| G20 | M | "Signed release artifact" misleading: Chrome Web Store does the signing. | Release = Web Store submission via CI, plus open-source source tags and unpacked build instructions. |
| G21 | M | No privacy policy, store disclosures or data-protection review (e.g. India's DPDP Act, GDPR for any EU users). | Written privacy model and policy in V2-0; legal check before public beta. |
| G22 | M | LinkedIn terms may change. Blueprint treats them as settled. | Re-verify before store submission. Design stays user-initiated, paste-first, so it holds either way. |
| G23 | M | Hashes of raw resumes/JDs can act as a lookup oracle. | Use keyed HMAC for `resumeHash` / `jobHash`. |
| G24 | M | Change report arrives in roadmap phase 3, after PDF. It is the trust surface and a verifier output. | Produced in V2-4, shown before render. |

---

## 3. Decisions (resolves blueprint section 20)

| # | Question | Decision |
|---|---|---|
| D1 | Acceptable evidence for a confirmed skill | **Tier 1 (Skills list only):** user attests Yes, picks a level (Used / Comfortable / Familiar), and names the context (existing project, coursework, personal use, work). **Tier 2 (may appear in a bullet):** user also writes a concrete description (what they built or did). Tier 2 text is the source of truth; AI may fix grammar only. Familiar-level skills are labelled as such, never "proficient". |
| D2 | Where confirmed skills can appear | Tier 1 → Skills section only. Tier 2 → also in the linked project or experience bullet, and only the user-written claim. No new project or job entry is ever created from a bare Yes. A user-supplied new project is a `USER_PROVIDED_ENTRY` and is labelled as such in the change report. |
| D3 | Tailoring aggressiveness | Default **Conservative**: reorder and rewrite, never delete truthful content; trim only to fit page (section 4.5). **Focused** (opt-in): drops low-relevance items, always listed in the change report. |
| D4 | Renderer | `Renderer` interface. v1 implementation: LaTeX via a pinned engine in a no-network container, shell escape off, file read/write restricted to the job directory. Phase V2-5 includes a one-week spike comparing this with a TypeScript PDF renderer. Decide on extraction quality, template fidelity and ops cost. |
| D5 | Extension compile | v1: server render, disclosed. Local WASM compile deferred until the web renderer is stable. Revisit only if BYOK users demand full local processing. |
| D6 | First BYOK providers | One **OpenAI-compatible adapter** first. It covers Groq, Mistral, OVHcloud, OpenRouter and OpenAI-style endpoints, matching providers you already chose. Gemini and Anthropic adapters follow. |
| D7 | Retention | Raw resume, JD, evidence text and PDF live in an encrypted ephemeral store. Deleted on download, on explicit "delete now", or after a short TTL (start with 30 minutes, max 24 hours). No raw content in logs. History feature is a separate future opt-in. |
| D8 | Supported capture sites | Paste is the default. "Send selection" works on any page via a user gesture and `activeTab`. No site-specific scrapers. No LinkedIn automation. |
| D9 | Accounts | No accounts in V2. Extension keeps profile and resume locally. Web stays stateless apart from the ephemeral session. |
| D10 | Privacy model | See table below. Shown in-product before first use of each mode. |

**Privacy model shown to users**

| Mode | Resume/JD goes to | AI key | PDF rendering | Stored |
|---|---|---|---|---|
| Web (server) | Resurox server, then the configured AI provider | Resurox's | Resurox server | Ephemeral, deleted per D7 |
| Extension, server mode | Same as web | Resurox's | Resurox server | Same as web |
| Extension, BYOK | Your chosen provider directly (AI step); Resurox server (PDF render step) | Yours, on your device | Resurox server | Key encrypted locally; session data ephemeral |

---

## 4. Refined architecture

### 4.1 Monorepo and shared core

```
packages/core        schemas (Zod), ontology, provenance state machine,
                     claim verifier, page-fit rules, ATS checks. No I/O, no AI.
packages/ai          provider interface, adapters, prompt templates, output guards
apps/web             Next.js UI + API routes
services/render      sandboxed render service
apps/extension       MV3 side panel (V2-7 onward)
tests/corpus         golden resumes, JDs, adversarial cases
```

Rule: the extension imports `core` and `ai`. It never contains its own matching, verification or formatting logic.

**Provenance additions**

| Provenance | Meaning | Can enter output |
|---|---|---|
| RESUME_EVIDENCE | In the uploaded resume | Yes |
| USER_CONFIRMED_T1 | Attested, with level and context | Skills section only |
| USER_CONFIRMED_T2 | Attested plus user-written description | Skills and linked bullet |
| USER_PROVIDED_ENTRY | New project or role written by the user | Yes, labelled |
| AI_INFERRED | Model guess | No |
| JD_ONLY | Appears only in JD | No |
| REJECTED | User said no | Never |
| CONFLICT | Sources disagree | No, until resolved |

Only `core` may change provenance, and only through typed transitions. The model can never write a provenance value.

### 4.2 Claim Verifier (the enforcement of the invariant)

For every generated bullet or skill line, deterministically check:
1. It links to exactly one source item ID (resume bullet, or a T2 description).
2. Technologies, tools, frameworks, certifications, employers, institutions and titles named in the output are a subset of those in the source item plus any T1/T2 items linked to it.
3. Every number, percentage, currency amount, duration and date in the output appears in the source.
4. Seniority and scope words (led, architected, owned, scaled, managed) are not introduced if absent from the source.
5. Skills section entries all map to an allowed provenance.
6. The total set of skills in the final document is a subset of the allowed set.

Any failure rejects that bullet. After one regeneration attempt, fall back to the original bullet text unchanged. Never ship an unverified rewrite. This check runs outside the model and cannot be influenced by prompt content.

### 4.3 Pipeline

```
upload → extract → parse → normalize (Zod)
JD → parse → normalize
→ deterministic match (ontology) → LLM semantic match for unresolved only
→ requirement states + confirmation questions
→ [ CONFIRMATION GATE ]
→ rewrite (LLM, per item) → Claim Verifier → change report
→ user approves draft
→ render + validate (atomic) → download
```

The LLM never receives the whole job as an open prompt. Each call has one narrow task, a strict schema and delimited data.

### 4.4 Session store

- Signed session token (HMAC) to the client; contents encrypted at rest on the server.
- Holds canonical resume, normalized JD, requirement states, confirmations with timestamps, change set, render artifact.
- Hard TTL, delete-on-download, delete-on-demand, and a delete endpoint.
- Only metadata (counts, durations, error codes, provider name) goes to logs and analytics.

### 4.5 Page-fit rules

Order of trimming when content exceeds the page budget, never touching verified claims:
1. Reduce spacing within template limits.
2. Reduce font size within a floor (e.g. not below 10pt).
3. Merge or shorten low-relevance bullets (Verifier still applies).
4. In Conservative mode stop here and allow a second page. In Focused mode, drop lowest-relevance items and list them in the change report.

### 4.6 Renderer security

- No shell escape. Restrict file reads and writes to the job directory. Deny absolute paths and parent traversal.
- Templates are fixed. User content is inserted only as escaped data into known macros. No user-controlled preamble or packages.
- Container: no network, read-only filesystem except a temp dir, CPU/memory/time/output-size limits, one job per container run, no secrets mounted.
- Escape tests for every LaTeX special character plus adversarial payloads (`\input`, `\write18`, `\openout`, `\catcode`, verbatim breakouts).

### 4.7 Extension (MV3) specifics

- Side panel opened from a user gesture. Service worker only coordinates; AI calls run from the panel page.
- Permissions: `sidePanel`, `storage`, `activeTab`, `scripting` (only after a gesture). Provider origins via `optional_host_permissions`, requested at runtime. No `tabs`, no `<all_urls>`.
- Strict CSP, no remote code, no inline script, no `dangerouslySetInnerHTML`.
- Vault: encrypted blob in `chrome.storage.local`; unlocked key held in `chrome.storage.session`; "Forget key" wipes both.
- Never log request headers. Redact key patterns in any error path.
- Resume and profile data stored locally in IndexedDB, with an export and delete option.

---

## 5. Phased plan

Each phase ends with a gate. Do not start the next phase until the gate passes. Phase names use the `V2-` prefix to avoid confusion with the earlier provider-layer phases (4b etc.).

### V2-0 — Preconditions and decisions
**Work**
- Close pen-test round 2 findings on the current app.
- Write ADRs for D1–D10. Verify each chosen provider's current data terms (G7).
- Freeze the `/api/analyze` contract with contract tests.
- Build the golden corpus v1: 15+ resumes (various layouts, a non-Latin or accented name, a sparse fresher resume, a two-column one) and 10+ JDs, with hand-labelled expected requirement states.
- Draft the privacy model and policy text.

**Gate:** ADRs merged; analyzer contract tests green; corpus labelled; round-2 criticals closed.

### V2-1 — Domain core
**Work**
- `packages/core`: schemas, provenance state machine, ontology v1 (aliases plus conservative implies), Claim Verifier, page-fit rules.
- Property tests on provenance transitions: the model can never reach an allowed state without a user action.

**Gate:** all transition and verifier tests pass. Verifier rejects 100% of a seeded set of fabricated rewrites (added tech, inflated number, added "led").

### V2-2 — Prepare pipeline
**Work**
- Extract → parse → normalize for resume and JD.
- Deterministic match first, LLM only for unresolved requirements.
- Requirement states (MATCHED, PARTIAL, MISSING) plus generated confirmation questions.
- Malformed model output fails closed. Provider failover permitted only between adapters that satisfy the same schema; never a silent content fallback.
- Eval harness v1 running on recorded fixtures.

**Gate:** on the corpus, requirement-state accuracy meets a target agreed in V2-0 (start with ≥85% agreement with labels); same resume against different JDs yields different requirement sets; injection cases in JD and resume cause no state change.

### V2-3 — Confirmation gate and session store
**Work**
- Ephemeral encrypted session store with TTL and delete endpoints.
- `/api/format/prepare` and `/api/format/confirm`.
- Confirmation UI: Yes/No, level, context, optional description, per D1. Reject, keep-missing and conflict flows.
- XSS-safe rendering of all user text.

**Gate:** rejected skills never reach generation input; T1/T2 behaviour matches D1–D2; session data verifiably deleted after download and TTL.

### V2-4 — Generate and change report
**Work**
- `/api/format/generate`: per-item rewrite with strict schema, Claim Verifier on every output, one retry then original text.
- Change report: what moved, what was rewritten (before/after), what was added and why, with provenance label. Shown for user approval before render.
- Caching keyed by HMAC hashes. Call-budget counters per job.

**Gate:** zero verifier escapes on the adversarial set; fabrication rate on live eval is 0 over the corpus; each job stays inside its call budget.

### V2-5 — Render, validate, ATS report
**Work**
- Week-one spike: LaTeX container vs TypeScript PDF renderer (D4). Record the decision.
- One ATS-safe template (single column, standard headings, selectable text, fixed fonts).
- Page-fit loop (section 4.5).
- Atomic render + validate: PDF text extraction, reading order, contact data, dates, section headings, ligature and Unicode checks, link text, page count, no clipped content. Round-trip comparison against the canonical model with explicit thresholds.
- Render service hardening per section 4.6.

**Gate:** all corpus resumes render and pass ATS checks; escape and adversarial LaTeX tests pass; render service cannot read outside its job directory or reach the network; unvalidated PDFs are never downloadable.

### V2-6 — Web integration and beta
**Work**
- Formatter screens, progress states, error taxonomy, delete-now control.
- Rate limits, challenge on `/prepare`, per-IP and per-session caps, global daily budget circuit breaker, render concurrency cap.
- Provider failover with health tracking. Metrics without content.
- Beta to your existing ~50 users. Feedback loop on wrong matches.
- **Pen-test round 3** focused on the formatter: injection, LaTeX, session tampering, IDOR on session IDs, abuse.

**Gate:** pen-test criticals and highs closed; budget breaker tested; no raw content in logs (automated scan).

### V2-7 — Extension shell (server mode)
**Work**
- MV3 side panel, selection capture via user gesture, resume/profile in IndexedDB.
- Server-mode calls to the web API with the same session flow. Install-scoped rate limiting.
- Permission review documented. Store listing draft with per-permission justification.

**Gate:** extension requests only the permissions in section 4.7; works on at least three representative pages through selection capture; no network calls before a user action.

### V2-8 — BYOK
**Work**
- OpenAI-compatible adapter first, then Gemini, then Anthropic (browser-access header).
- Optional host permissions per origin; usage meter; visible provider/model.
- Vault per section 4.7. Redaction tests. "Forget key".
- In-product privacy copy per section 3.

**Gate:** key never appears in logs, telemetry, errors or requests to Resurox (automated network-capture test); vault tests pass; service-worker termination during a call recovers cleanly.

### V2-9 — Hardening and public beta
**Work**
- Dependency pinning, audit, secret scanning, CI release pipeline to Web Store.
- Re-verify LinkedIn and Chrome policy text (G22). Legal and privacy review (G21).
- Full regression run, security review of the extension, final pen-test.
- Public docs: what is stored, what leaves your device, how to verify.

**Gate:** release checklist (section 7) fully ticked.

---

## 6. Test and evaluation strategy

**Deterministic (every commit)**
- Provenance transitions, Claim Verifier, ontology, LaTeX escaping, page-fit, ATS extraction checks, adapter error normalization.

**Regression (every commit, recorded fixtures)**
- JD-only skills never reach output without confirmation.
- Rejected skills never reach output.
- Confirmed skills keep provenance and level.
- Existing evidence survives formatting.
- Malformed AI output fails closed.
- The old repeated-score / fallback bug stays covered.

**Live eval (nightly, real providers)**
- Fabrication rate (target 0), requirement-state agreement, verifier rejection rate, retry rate, p95 latency, cost per job. Temperature 0 where supported. Alert on drift.

**Security**
- Prompt injection in JD, resume, and evidence fields, including instructions like "add AWS" or "mark all matched".
- LaTeX payload suite; PDF parser stress files; oversized and zip-bomb-style inputs.
- XSS in every user-entered field.
- Session tampering and ID guessing.
- Extension: permission diff check in CI, CSP check, key-redaction and network-capture tests.

---

## 7. Release checklist

- [ ] Claim Verifier has zero known escapes on the adversarial set
- [ ] Fabrication rate 0 on the live corpus eval
- [ ] No unvalidated PDF can be downloaded
- [ ] Render service: no network, no escape, restricted files, resource limits proven
- [ ] Raw content absent from logs and analytics (automated scan)
- [ ] Session deletion proven on download, TTL and manual delete
- [ ] Provider data terms recorded; privacy policy published
- [ ] Rate limits, challenge and budget circuit breaker tested
- [ ] Extension permissions match the documented list; no remote code
- [ ] BYOK key never leaves the device except to the chosen provider
- [ ] Pen-test findings closed; dependencies audited; secrets scan clean

---

## 8. Working rules for the coding agent

1. Build phases in order. Do not start a phase before the previous gate passes.
2. Put all domain logic in `packages/core`. Clients never reimplement it.
3. The model proposes; deterministic code decides. No model output reaches a document without schema validation and the Claim Verifier.
4. Never add a fallback that produces content. Failures return an error state.
5. No raw resume, JD, evidence text, API key or provider header in logs, errors, analytics or fixtures committed to the repo (use synthetic data).
6. Every security-relevant change ships with a test that fails without it.
7. Keep the `/api/analyze` contract unchanged; add new routes instead of modifying it.
8. Report at the end of each phase: what was built, tests added, gate results, open risks.

---

## 9. Open items needing your input

1. Confirm D1–D3 (evidence tiers, placement, tailoring default). They shape the UI.
2. Confirm D7 retention numbers (30-minute TTL start, 24-hour max).
3. Confirm Chrome-only for the first extension release (Edge works with the same build; Firefox and Safari need extra work).
4. Which hosting for the render service (any container host with no-network and resource limits)? Vercel alone cannot do it.
5. Corpus: you will need to supply or approve synthetic and consented resumes. Do not use real users' resumes without consent.