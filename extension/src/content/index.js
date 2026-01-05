// Content Script
console.log("IntelliAsk AI Content Script Loaded");

// Function to toggle In-Page Sidebar
function toggleSidebar() {
    const secondary = document.querySelector("#secondary");
    if (!secondary) {
        alert("Could not find YouTube sidebar (secondary column).");
        return;
    }

    let iframe = document.getElementById("intelliask-sidebar");
    if (iframe) {
        // Toggle visibility
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
    } else {
        // Create Iframe
        iframe = document.createElement("iframe");
        iframe.id = "intelliask-sidebar";
        iframe.src = chrome.runtime.getURL("sidepanel.html");
        iframe.style.cssText = `
      width: 100%; 
      height: 600px; 
      border: none; 
      border-radius: 12px; 
      margin-bottom: 16px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 999;
    `;

        // Insert at the top of the secondary column
        secondary.insertBefore(iframe, secondary.firstChild);
    }
}

// Function to inject button on YouTube
function injectButton() {
    if (document.getElementById("intelliask-button")) return;

    const target = document.querySelector("#owner"); // Element below video title (channel owner)
    if (target) {
        const btn = document.createElement("button");
        btn.id = "intelliask-button";
        btn.innerText = "📝 Open Notes";
        btn.style.cssText = `
      background-color: #FACC15; 
      color: black; 
      border: none; 
      padding: 8px 16px; 
      margin-left: 10px; 
      border-radius: 18px; 
      font-weight: bold; 
      cursor: pointer; 
      font-family: Roboto, Arial, sans-serif;
      font-size: 14px;
      vertical-align: middle;
    `;

        btn.onclick = () => {
            toggleSidebar();
        };

        target.appendChild(btn);
    }
}

// Observer to handle YouTube navigation (SPA)
const observer = new MutationObserver(() => {
    if (window.location.href.includes("youtube.com/watch")) {
        injectButton();

        // Also re-inject sidebar if it was lost during navigation but should be open? 
        // For now let's keep it manual toggle.
    }
});

observer.observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageText") {
        const text = document.body.innerText;
        sendResponse({ text: text });
    }

    if (request.action === "getVideoTime") {
        const video = document.querySelector("video");
        if (video) {
            const time = new Date(video.currentTime * 1000).toISOString().substring(14, 19);
            sendResponse({ time: time });
        } else {
            sendResponse({ time: null });
        }
    }
    return true;
});
