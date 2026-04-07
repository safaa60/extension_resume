chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action !== "getPageText") return;

  try {
    const text = document.body?.innerText || "";
    sendResponse({ text });
  } catch (e) {
    sendResponse({ text: "", error: "Impossible de lire le DOM" });
  }
});