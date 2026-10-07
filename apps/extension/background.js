// Background service worker for Resurox V2 Chrome Extension
// Responsibilities: Side panel opening upon user action, coordinate runtime messages.

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('SidePanel setup error:', error));

chrome.runtime.onInstalled.addListener(() => {
  console.log('Resurox V2 Assistant installed.');
});
