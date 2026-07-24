// Background Service Worker
console.log("Lazzy Notes Background Service Worker Loaded");

// Ensure Side Panel opens when the extension icon is clicked
try {
    if (chrome.sidePanel && typeof chrome.sidePanel.setPanelBehavior === 'function') {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
            console.log("SidePanel behavior set error:", err);
        });
    }
} catch (e) {
    console.log("SidePanel API not available:", e);
}

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'openSidePanel' && sender && sender.tab) {
        try {
            chrome.sidePanel.open({ tabId: sender.tab.id });
        } catch (e) {
            console.log("Could not open sidePanel:", e);
        }
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("Lazzy Notes Installed");

    try {
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: "explain-selection",
                title: "Explain \"%s\"",
                contexts: ["selection"]
            });

            chrome.contextMenus.create({
                id: "summarize-page",
                title: "Summarize Page with Lazzy",
                contexts: ["page"]
            });
        });
    } catch (e) {
        console.log("ContextMenus creation error:", e);
    }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    try {
        if (info.menuItemId === "explain-selection" && tab && tab.id) {
            chrome.sidePanel.open({ tabId: tab.id });
        }
    } catch (e) {
        console.log("Context menu click handler error:", e);
    }
});
