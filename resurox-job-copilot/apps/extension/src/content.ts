/**
 * Content Script: Extraction Ladder (PRD §11.3)
 * 1. Schema.org JobPosting JSON-LD
 * 2. DOM heuristic (headings "Responsibilities", "Requirements", "Qualifications")
 * 3. User Selection fallback
 */

export interface ExtractionResult {
  title: string;
  company: string;
  rawJd: string;
  extractionMethod: "SCHEMA_ORG_JSON_LD" | "DOM_HEURISTIC" | "USER_SELECTION";
}

export function extractJobFromPage(): ExtractionResult {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of Array.from(scripts)) {
    try {
      const data = JSON.parse(s.textContent || "");
      if (data["@type"] === "JobPosting" || data["@type"]?.includes("JobPosting")) {
        return {
          title: data.title || document.title,
          company: data.hiringOrganization?.name || "Company",
          rawJd: data.description ? data.description.replace(/<[^>]*>?/gm, " ") : document.body.innerText,
          extractionMethod: "SCHEMA_ORG_JSON_LD"
        };
      }
    } catch {}
  }

  const selectedText = window.getSelection()?.toString().trim();
  if (selectedText && selectedText.length > 80) {
    return {
      title: document.title.split("-")[0].trim() || "Target Job",
      company: "Job Posting",
      rawJd: selectedText,
      extractionMethod: "USER_SELECTION"
    };
  }

  const headings = Array.from(document.querySelectorAll("h1, h2, h3"));
  let candidateContainer: HTMLElement | null = null;

  for (const h of headings) {
    const text = h.textContent?.toLowerCase() || "";
    if (text.includes("requirement") || text.includes("qualification") || text.includes("responsibilit")) {
      candidateContainer = h.parentElement;
      break;
    }
  }

  const rawJd = candidateContainer ? candidateContainer.innerText : document.body.innerText.slice(0, 10000);

  return {
    title: document.querySelector("h1")?.innerText.trim() || document.title,
    company: "Company",
    rawJd,
    extractionMethod: "DOM_HEURISTIC"
  };
}

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === "EXTRACT_JOB") {
    const result = extractJobFromPage();
    sendResponse({ status: "OK", data: result });
  }
  return true;
});
