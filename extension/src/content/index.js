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
    if (document.getElementById("lazyy-notes-button")) return;

    const target = document.querySelector("#owner");
    if (target) {
        const btn = document.createElement("button");
        btn.id = "lazyy-notes-button";
        btn.innerText = "🦉 Open Lazzy";
        btn.style.cssText = `
      background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
      color: white; 
      border: 1px solid rgba(255,255,255,0.2); 
      padding: 8px 16px; 
      margin-left: 10px; 
      border-radius: 20px; 
      font-weight: 600; 
      cursor: pointer; 
      font-family: 'Inter', Roboto, Arial, sans-serif;
      font-size: 13px;
      vertical-align: middle;
      box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    `;

        btn.onmouseover = () => {
            btn.style.transform = "translateY(-1px)";
            btn.style.boxShadow = "0 6px 8px -1px rgba(99, 102, 241, 0.4)";
        };
        btn.onmouseout = () => {
            btn.style.transform = "translateY(0)";
            btn.style.boxShadow = "0 4px 6px -1px rgba(99, 102, 241, 0.3)";
        };

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

    if (request.action === "captureVideoFrame") {
        const video = document.querySelector("video");
        if (video) {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL("image/jpeg");
                const time = new Date(video.currentTime * 1000).toISOString().substring(14, 19);
                sendResponse({ success: true, imageData: dataUrl, time: time });
            } catch (e) {
                console.error("Frame capture error:", e);
                sendResponse({ success: false, error: e.toString() });
            }
        } else {
            sendResponse({ success: false, error: "No video found" });
        }
        return true; // Keep channel open for async response
    }
    return true;
});
