chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action !== "getPageText") return;

  const tabId = message.tabId;

  if (typeof tabId !== "number") {
    sendResponse({ text: "", error: "tabId invalide" });
    return; // pas besoin return true
  }

  chrome.tabs.sendMessage(tabId, { action: "getPageText" }, (resp) => {
    if (chrome.runtime.lastError) {
      sendResponse({ text: "", error: chrome.runtime.lastError.message });
      return;
    }
    sendResponse(resp || { text: "" });
  });

  // IMPORTANT en MV3: on répond async
  return true;
});