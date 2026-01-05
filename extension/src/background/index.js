// Background Service Worker
console.log("IntelliAsk AI Background Service Worker Loaded");

// Ensure Side Panel opens when the extension icon is clicked
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'openSidePanel' && sender.tab) {
        chrome.sidePanel.open({ tabId: sender.tab.id });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("IntelliAsk AI Installed");

    // Create Context Menus
    chrome.contextMenus.create({
        id: "explain-selection",
        title: "Explain \"%s\"",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "summarize-page",
        title: "Summarize Page",
        contexts: ["page"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "explain-selection") {
        console.log("Explain Selection:", info.selectionText);
        // TODO: Send to popup or open popup with query
    }
});
