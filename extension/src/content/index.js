// Content Script
console.log("Lazzy Content Script Loaded");

// --- Platform Detection ---
const IS_YOUTUBE = window.location.hostname.includes("youtube.com");
const IS_LEETCODE = window.location.hostname.includes("leetcode.com");
const IS_CODEFORCES = window.location.hostname.includes("codeforces.com");

// --- YouTube Sidebar Logic ---
function toggleYouTubeSidebar() {
    const secondary = document.querySelector("#secondary");
    if (!secondary) {
        alert("Could not find YouTube sidebar (secondary column).");
        return;
    }

    let iframe = document.getElementById("lazyy-sidebar-yt");
    if (iframe) {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
    } else {
        iframe = document.createElement("iframe");
        iframe.id = "lazyy-sidebar-yt";
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
        secondary.insertBefore(iframe, secondary.firstChild);
    }
}

function injectYouTubeButton() {
    if (document.getElementById("lazyy-notes-button")) return;
    const target = document.querySelector("#owner");
    if (target) {
        const btn = document.createElement("button");
        btn.id = "lazyy-notes-button";
        btn.innerHTML = "🦉 Open Lazzy";
        btn.style.cssText = `
            background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
            color: white; border: 1px solid rgba(255,255,255,0.2); 
            padding: 8px 16px; margin-left: 10px; border-radius: 20px; 
            font-weight: 600; cursor: pointer; font-size: 13px;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
            transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px;
        `;
        btn.onclick = toggleYouTubeSidebar;
        target.appendChild(btn);
    }
}

// --- LeetCode Sidebar Logic ---
function toggleLeetCodeSidebar() {
    let container = document.getElementById("lazyy-leetcode-container");
    if (container) {
        container.classList.toggle("lazyy-visible");
    } else {
        container = document.createElement("div");
        container.id = "lazyy-leetcode-container";
        container.style.cssText = `
            position: fixed; top: 0; right: -420px; width: 400px; height: 100vh;
            background: white; z-index: 10000; transition: right 0.3s ease;
            box-shadow: -5px 0 15px rgba(0,0,0,0.1); border-left: 1px solid #eee;
            display: flex; flex-direction: column;
        `;

        const iframe = document.createElement("iframe");
        iframe.src = chrome.runtime.getURL("sidepanel.html?context=leetcode");
        iframe.style.cssText = "width: 100%; height: 100%; border: none;";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "✕";
        closeBtn.style.cssText = `
            position: absolute; left: -30px; top: 20px; width: 30px; height: 30px;
            background: white; border: 1px solid #eee; border-radius: 5px 0 0 5px;
            cursor: pointer; font-weight: bold; color: #666;
        `;
        closeBtn.onclick = () => container.classList.remove("lazyy-visible");

        container.appendChild(closeBtn);
        container.appendChild(iframe);
        document.body.appendChild(container);

        // Add style for visibility toggle
        const style = document.createElement("style");
        style.textContent = `
            #lazyy-leetcode-container.lazyy-visible { right: 0 !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => container.classList.add("lazyy-visible"), 10);
    }
}

function injectLeetCodeButton() {
    if (document.getElementById("lazyy-lc-plus-btn")) return;

    // Attempt multiple selectors for LeetCode title
    // Based on the user image "1161. Maximum Level Sum...", it's likely a standard title class
    const titleSelectors = [
        'div[data-cy="question-title"]', // Common Cy Selector
        '.text-title-large', // New UI
        'span.text-2xl', // Another New UI variant
        '.mr-2.text-xl', // And another
        'div.flex.items-center div.text-title-large',
        'a[href^="/problems/"]' // Fallback to problem link if title specific fails
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
        // We look for something that contains text and looks like a title
        const candidates = document.querySelectorAll(selector);
        for (const candidate of candidates) {
            if (candidate.innerText && candidate.innerText.length > 5) {
                titleElement = candidate;
                break;
            }
        }
        if (titleElement) break;
    }

    if (titleElement) {
        const btn = document.createElement("button");
        btn.id = "lazyy-lc-plus-btn";

        // --- Difficulty Detection ---
        let difficultyColor = "#1a1a1a"; // Default black
        let difficultyClass = "";

        // Try to find difficulty element
        const difficultySelectors = [
            'div.text-difficulty-easy',
            'div.text-difficulty-medium',
            'div.text-difficulty-hard',
            'span#result-state', // Sometimes used
            'div[class*="text-green-"]',
            'div[class*="text-yellow-"]',
            'div[class*="text-pink-"]'
        ];

        // Check text content if specific class not found
        const bodyText = document.body.innerText;
        if (bodyText.includes("Easy")) {
            difficultyColor = "#00b8a3"; // Green
            difficultyClass = "easy";
        } else if (bodyText.includes("Medium")) {
            difficultyColor = "#ffc01e"; // Yellow
            difficultyClass = "medium";
        } else if (bodyText.includes("Hard")) {
            difficultyColor = "#ff375f"; // Red
            difficultyClass = "hard";
        }

        // More precise DOM check
        const easyEl = document.querySelector('.text-difficulty-easy') || Array.from(document.querySelectorAll('div')).find(el => el.innerText === 'Easy');
        const medEl = document.querySelector('.text-difficulty-medium') || Array.from(document.querySelectorAll('div')).find(el => el.innerText === 'Medium');
        const hardEl = document.querySelector('.text-difficulty-hard') || Array.from(document.querySelectorAll('div')).find(el => el.innerText === 'Hard');

        if (easyEl) difficultyColor = "#00b8a3";
        else if (medEl) difficultyColor = "#ffa116"; // Standard LeetCode Yellow
        else if (hardEl) difficultyColor = "#ff375f";

        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Notes
        `;
        btn.title = "View Notes";
        btn.style.cssText = `
            margin-left: 12px;
            padding: 6px 14px;
            border-radius: 20px;
            background-color: #2d2d2d;
            color: ${difficultyColor};
            border: 1px solid rgba(255,255,255,0.1);
            font-size: 13px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            line-height: 1;
            transition: all 0.2s ease;
            vertical-align: middle;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        btn.onmouseover = () => {
            btn.style.transform = "translateY(-1px)";
            btn.style.backgroundColor = "#383838";
            btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
        };
        btn.onmouseout = () => {
            btn.style.transform = "translateY(0)";
            btn.style.backgroundColor = "#2d2d2d";
            btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        };
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLeetCodeSidebar();
        };

        // Ensure flex layout for the title to align button properly
        // Check computed style first to avoid breaking existing layout if not flex
        const style = window.getComputedStyle(titleElement);
        if (style.display !== 'flex') {
            titleElement.style.display = 'inline-flex';
            titleElement.style.alignItems = 'center';
        } else {
            titleElement.style.alignItems = 'center';
        }

        titleElement.appendChild(btn);
    }
}

// --- Codeforces Sidebar Logic ---
function toggleCodeforcesSidebar() {
    let container = document.getElementById("lazyy-codeforces-container");
    if (container) {
        container.classList.toggle("lazyy-visible");
    } else {
        container = document.createElement("div");
        container.id = "lazyy-codeforces-container";
        container.style.cssText = `
            position: fixed; top: 0; right: -420px; width: 400px; height: 100vh;
            background: white; z-index: 10000; transition: right 0.3s ease;
            box-shadow: -5px 0 15px rgba(0,0,0,0.1); border-left: 1px solid #eee;
            display: flex; flex-direction: column;
        `;

        const iframe = document.createElement("iframe");
        iframe.src = chrome.runtime.getURL("sidepanel.html?context=codeforces");
        iframe.style.cssText = "width: 100%; height: 100%; border: none;";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "✕";
        closeBtn.style.cssText = `
            position: absolute; left: -30px; top: 20px; width: 30px; height: 30px;
            background: white; border: 1px solid #eee; border-radius: 5px 0 0 5px;
            cursor: pointer; font-weight: bold; color: #666;
        `;
        closeBtn.onclick = () => container.classList.remove("lazyy-visible");

        container.appendChild(closeBtn);
        container.appendChild(iframe);
        document.body.appendChild(container);

        // Add style for visibility toggle
        const style = document.createElement("style");
        style.textContent = `
            #lazyy-codeforces-container.lazyy-visible { right: 0 !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => container.classList.add("lazyy-visible"), 10);
    }
}

function injectCodeforcesButton() {
    if (document.getElementById("lazyy-cf-notes-btn")) return;

    // Codeforces problem title is typically in .problem-statement .title or .header .title
    const titleSelectors = [
        '.problem-statement .title',
        '.problem-statement .header .title',
        'div.title',
        '.header .title'
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
        const candidates = document.querySelectorAll(selector);
        for (const candidate of candidates) {
            if (candidate.innerText && candidate.innerText.trim().length > 0) {
                titleElement = candidate;
                break;
            }
        }
        if (titleElement) break;
    }

    if (titleElement) {
        const btn = document.createElement("button");
        btn.id = "lazyy-cf-notes-btn";

        // Codeforces typically uses blue theme
        const cfColor = "#1e88e5"; // Codeforces blue

        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Notes
        `;
        btn.title = "View Notes";
        btn.style.cssText = `
            margin-left: 12px;
            padding: 6px 14px;
            border-radius: 6px;
            background-color: #2d2d2d;
            color: ${cfColor};
            border: 1px solid rgba(255,255,255,0.1);
            font-size: 13px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            line-height: 1;
            transition: all 0.2s ease;
            vertical-align: middle;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        btn.onmouseover = () => {
            btn.style.transform = "translateY(-1px)";
            btn.style.backgroundColor = "#383838";
            btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
        };
        btn.onmouseout = () => {
            btn.style.transform = "translateY(0)";
            btn.style.backgroundColor = "#2d2d2d";
            btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        };
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCodeforcesSidebar();
        };

        titleElement.style.display = 'inline-flex';
        titleElement.style.alignItems = 'center';
        titleElement.appendChild(btn);
    }
}

// --- Initialization ---
const observer = new MutationObserver(() => {
    if (IS_YOUTUBE && window.location.href.includes("youtube.com/watch")) {
        injectYouTubeButton();
    }
    if (IS_LEETCODE && window.location.href.includes("leetcode.com/problems")) {
        injectLeetCodeButton();
    }
    if (IS_CODEFORCES && (window.location.href.includes("codeforces.com/problemset/problem") || window.location.href.includes("codeforces.com/contest"))) {
        injectCodeforcesButton();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageText") {
        sendResponse({ text: document.body.innerText });
    }

    if (request.action === "getVideoTime") {
        const video = document.querySelector("video");
        sendResponse({ time: video ? new Date(video.currentTime * 1000).toISOString().substring(14, 19) : null });
    }

    if (request.action === "captureVideoFrame") {
        const video = document.querySelector("video");
        if (video) {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
                sendResponse({
                    success: true,
                    imageData: canvas.toDataURL("image/jpeg"),
                    time: new Date(video.currentTime * 1000).toISOString().substring(14, 19)
                });
            } catch (e) {
                sendResponse({ success: false, error: e.toString() });
            }
        } else {
            sendResponse({ success: false, error: "No video found" });
        }
        return true;
    }
    if (request.action === "getLeetCodeProblemDetails") {
        // Reuse logic from injectLeetCodeButton to find title and difficulty
        const titleSelectors = [
            'div[data-cy="question-title"]',
            '.text-title-large',
            'span.text-2xl',
            '.mr-2.text-xl',
            'div.flex.items-center div.text-title-large',
            'a[href^="/problems/"]'
        ];

        let title = "Unknown Problem";
        for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el && el.innerText && el.innerText.length > 5) {
                title = el.innerText.split('. ').pop(); // Remove number if present e.g. "1. Two Sum" -> "Two Sum"
                // Actually usually we want the full title. Let's keep it simple.
                title = el.innerText;
                break;
            }
        }

        let difficulty = "Medium"; // Default
        const bodyText = document.body.innerText;
        if (document.querySelector('.text-difficulty-easy') || bodyText.includes("Easy")) difficulty = "Easy";
        else if (document.querySelector('.text-difficulty-hard') || bodyText.includes("Hard")) difficulty = "Hard";

        // More precise check if specific elements exist
        if (document.querySelector('.text-difficulty-easy')) difficulty = "Easy";
        else if (document.querySelector('.text-difficulty-medium')) difficulty = "Medium";
        else if (document.querySelector('.text-difficulty-hard')) difficulty = "Hard";

        sendResponse({
            title: title,
            difficulty: difficulty,
            url: window.location.href
        });
        return true;
    }

    if (request.action === "getCodeforcesProblemDetails") {
        // Extract title from Codeforces problem page
        const titleSelectors = [
            '.problem-statement .title',
            '.problem-statement .header .title',
            'div.title'
        ];

        let title = "Unknown Problem";
        for (const selector of titleSelectors) {
            const el = document.querySelector(selector);
            if (el && el.innerText && el.innerText.trim().length > 0) {
                title = el.innerText.trim();
                break;
            }
        }

        // Extract rating from problem tags if available
        let rating = "Unrated";
        const tagElements = document.querySelectorAll('.tag-box');
        for (const tag of tagElements) {
            const tagText = tag.innerText.trim();
            // Ratings are typically like "*1200", "*1600", etc.
            if (tagText.startsWith('*')) {
                rating = tagText.substring(1); // Remove the asterisk
                break;
            }
        }

        // Extract contest and problem ID from URL
        // URL patterns: /problemset/problem/123/A or /contest/1234/problem/B
        const urlParts = window.location.pathname.split('/');
        let contestId = "";
        let problemId = "";

        if (urlParts.includes('problemset')) {
            const problemIndex = urlParts.indexOf('problem');
            if (problemIndex > 0 && problemIndex + 2 < urlParts.length) {
                contestId = urlParts[problemIndex + 1];
                problemId = urlParts[problemIndex + 2];
            }
        } else if (urlParts.includes('contest')) {
            const contestIndex = urlParts.indexOf('contest');
            const problemIndex = urlParts.indexOf('problem');
            if (contestIndex > 0 && contestIndex + 1 < urlParts.length) {
                contestId = urlParts[contestIndex + 1];
            }
            if (problemIndex > 0 && problemIndex + 1 < urlParts.length) {
                problemId = urlParts[problemIndex + 1];
            }
        }

        sendResponse({
            title: title,
            rating: rating,
            contestId: contestId,
            problemId: problemId,
            url: window.location.href
        });
        return true;
    }

    return true;
});
