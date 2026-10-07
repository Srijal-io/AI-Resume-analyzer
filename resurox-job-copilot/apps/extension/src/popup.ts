/**
 * Popup UI Logic
 */
const API_BASE = "http://localhost:3000/api";

const extractTabBtn = document.getElementById("extractTabBtn") as HTMLButtonElement;
const analyzeBtn = document.getElementById("analyzeBtn") as HTMLButtonElement;
const jobTitleInput = document.getElementById("jobTitle") as HTMLInputElement;
const companyInput = document.getElementById("company") as HTMLInputElement;
const rawJdTextarea = document.getElementById("rawJd") as HTMLTextAreaElement;

const resultCard = document.getElementById("resultCard") as HTMLDivElement;
const scoreDisplay = document.getElementById("scoreDisplay") as HTMLDivElement;
const statusText = document.getElementById("statusText") as HTMLDivElement;
const strengthsDisplay = document.getElementById("strengthsDisplay") as HTMLDivElement;
const gapsDisplay = document.getElementById("gapsDisplay") as HTMLDivElement;
const openWebBtn = document.getElementById("openWebBtn") as HTMLButtonElement;

// Extract from active tab
extractTabBtn.addEventListener("click", async () => {
  extractTabBtn.innerText = "Extracting...";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");

    chrome.tabs.sendMessage(tab.id, { action: "EXTRACT_JOB" }, (res: any) => {
      if (res?.status === "OK" && res.data) {
        jobTitleInput.value = res.data.title || "Target Role";
        companyInput.value = res.data.company || "Company";
        rawJdTextarea.value = res.data.rawJd || "";
        extractTabBtn.innerText = "Captured! Click Analyze Below";
      } else {
        extractTabBtn.innerText = "Paste Manually Below";
      }
    });
  } catch {
    extractTabBtn.innerText = "Use Manual Paste Below";
  }
});

// Analyze job
analyzeBtn.addEventListener("click", async () => {
  const rawJd = rawJdTextarea.value.trim();
  if (!rawJd) {
    alert("Please paste or extract a job description first.");
    return;
  }

  analyzeBtn.innerText = "Analyzing Evidence...";
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawJd,
        title: jobTitleInput.value || "Full Stack Developer",
        company: companyInput.value || "Target Company",
        extractionMethod: "MANUAL_PASTE",
        userId: "user-srijal"
      })
    });

    const json = await res.json();
    if (json.status === "OK" && json.data) {
      const a = json.data.analysis;
      resultCard.style.display = "block";
      scoreDisplay.innerText = `${a.score}%`;
      statusText.innerText = `Verified Score: ${a.earnedTotal}/${a.possibleTotal} Pts`;
      strengthsDisplay.innerHTML = `<strong>Strengths:</strong> ${a.strengths.slice(0, 3).join(", ") || "Fundamentals"}`;
      gapsDisplay.innerHTML = `<strong>Gaps:</strong> ${a.gaps.slice(0, 2).join(", ") || "None"}`;
    }
  } catch (err) {
    alert("Make sure Resurox web app is running at localhost:3000");
  } finally {
    analyzeBtn.innerText = "Analyze Match & Gaps";
  }
});

openWebBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: "http://localhost:3000" });
});
