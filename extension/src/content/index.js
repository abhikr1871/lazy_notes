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
        // More robust toggle: check computed style if inline style is empty
        const currentDisplay = iframe.style.display || window.getComputedStyle(iframe).display;
        iframe.style.display = currentDisplay === "none" ? "block" : "none";
    } else {
        iframe = document.createElement("iframe");
        iframe.id = "lazyy-sidebar-yt";
        iframe.src = chrome.runtime.getURL("sidepanel.html");

        // Explicitly set display: block to ensure toggle logic works consistently
        iframe.style.cssText = `
            width: 100%; 
            height: 600px; 
            border: none; 
            border-radius: 12px; 
            margin-bottom: 16px; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 999;
            display: block;
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

        // Fix: Use a proper event handler with stopPropagation to prevent YouTube interference
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleYouTubeSidebar();
        };

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
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        `;

        const iframe = document.createElement("iframe");
        iframe.src = chrome.runtime.getURL("sidepanel.html?context=leetcode");
        iframe.style.cssText = `
            width: 100%; height: 100%; border: none;
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        `;

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

// Helper to get LeetCode difficulty robustly
function getLeetCodeDifficulty() {
    // 1. Try specific classes (Old & New UI)
    if (document.querySelector('.text-difficulty-easy')) return "Easy";
    if (document.querySelector('.text-difficulty-medium')) return "Medium";
    if (document.querySelector('.text-difficulty-hard')) return "Hard";

    // 2. Try Tailwind-like color classes (Common in New UI)
    // Olive/Green = Easy, Yellow/Amber = Medium, Pink/Red = Hard
    if (document.querySelector('.text-green-500') || document.querySelector('.text-olive') || document.querySelector('.text-teal-500')) return "Easy";
    if (document.querySelector('.text-yellow-500') || document.querySelector('.text-amber-500') || document.querySelector('.text-yellow')) return "Medium";
    if (document.querySelector('.text-red-500') || document.querySelector('.text-pink-500') || document.querySelector('.text-pink')) return "Hard";

    // 3. Robust Text Check (Look for exact text match in small elements)
    const candidates = document.querySelectorAll('div, span, p');
    for (const el of candidates) {
        if (el.innerText === 'Easy' && (el.className.includes('text-') || el.className.includes('color-'))) return "Easy";
        if (el.innerText === 'Medium' && (el.className.includes('text-') || el.className.includes('color-'))) return "Medium";
        if (el.innerText === 'Hard' && (el.className.includes('text-') || el.className.includes('color-'))) return "Hard";
    }

    // 4. Fallback: Check for specific "Hard" badge if above fails
    for (const el of candidates) {
        // Check for specific badge styles or just exact text "Hard"
        // Avoid body text checks
        if (el.innerText === 'Hard') return "Hard";
        if (el.innerText === 'Medium') return "Medium";
        if (el.innerText === 'Easy') return "Easy";
    }

    return "Medium"; // Ultimate fallback
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
        const difficulty = getLeetCodeDifficulty();
        let difficultyColor = "#ffa116"; // Default Yellow (Medium)

        if (difficulty === "Easy") difficultyColor = "#00b8a3"; // Green
        else if (difficulty === "Hard") difficultyColor = "#ff375f"; // Red

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
        // Dark theme for Codeforces? Or just white. Codeforces is mostly white/light gray.
        container.style.cssText = `
            position: fixed; top: 0; right: -420px; width: 400px; height: 100vh;
            background: white; z-index: 10000; transition: right 0.3s ease;
            box-shadow: -5px 0 15px rgba(0,0,0,0.1); border-left: 1px solid #eee;
            display: flex; flex-direction: column;
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        `;

        const iframe = document.createElement("iframe");
        iframe.src = chrome.runtime.getURL("sidepanel.html?context=codeforces");
        iframe.style.cssText = `
            width: 100%; height: 100%; border: none;
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        `;

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

        const style = document.createElement("style");
        style.textContent = `
            #lazyy-codeforces-container.lazyy-visible { right: 0 !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => container.classList.add("lazyy-visible"), 10);
    }
}

function injectCodeforcesButton() {
    if (document.getElementById("lazyy-cf-btn")) return;

    // Try multiple selectors for the title or header
    // Codeforces structure: .problem-statement .header .title
    const selectors = [
        ".problem-statement .header .title",
        ".problem-statement .header",
        "#pageContent .title",
        "div.title" // Very generic fallback
    ];

    let targetEl = null;
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
            targetEl = el;
            break;
        }
    }

    if (targetEl) {
        const btn = document.createElement("a"); // Use 'a' or 'span' designed like a button
        btn.id = "lazyy-cf-btn";
        btn.innerHTML = "🦉 Notes";
        btn.style.cssText = `
            margin-left: 12px;
            padding: 5px 14px;
            border-radius: 20px;
            background: linear-gradient(135deg, #3b8ea5 0%, #2b6e85 100%);
            color: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.15);
            vertical-align: middle;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            position: relative; 
            z-index: 100;
            border: 1px solid rgba(255,255,255,0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-decoration: none;
            line-height: 1.2;
            transition: all 0.2s ease;
        `;

        btn.onmouseover = () => {
            btn.style.transform = "translateY(-1px)";
            btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            btn.style.filter = "brightness(1.1)";
        };
        btn.onmouseout = () => {
            btn.style.transform = "translateY(0)";
            btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
            btn.style.filter = "none";
        };

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Lazzy: Toggling Codeforces sidebar");
            toggleCodeforcesSidebar();
        };

        // If target is the .title div, check if we should append inside or after
        // Usually inside is safer for layout, but let's check content
        targetEl.appendChild(btn);

        console.log("Lazzy: Codeforces button injected successfully");
    } else {
        // Fallback to sidebar if title not found
        const sidebar = document.querySelector("#sidebar");
        if (sidebar) {
            const btn = document.createElement("div");
            btn.id = "lazyy-cf-btn";
            btn.innerHTML = "🦉 Lazzy Notes";
            btn.style.cssText = `
                margin: 15px 0;
                padding: 12px;
                background: white;
                border-radius: 8px;
                border: 1px solid #e1e1e1;
                text-align: center;
                cursor: pointer;
                color: #3b8ea5;
                font-weight: bold;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            `;
            btn.onmouseover = () => {
                btn.style.transform = "translateY(-1px)";
                btn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";
            };
            btn.onmouseout = () => {
                btn.style.transform = "translateY(0)";
                btn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";
            };
            btn.onclick = toggleCodeforcesSidebar;

            // Insert at top of sidebar
            sidebar.insertBefore(btn, sidebar.firstChild);
            console.log("Lazzy: Codeforces button injected into sidebar");
        } else {
            // ULTIMATE FALLBACK: Fixed Floating Button
            // If neither title nor sidebar is found (e.g. some custom contest pages), show a floating button
            const floatingBtn = document.createElement("button");
            floatingBtn.id = "lazyy-cf-btn";
            floatingBtn.innerHTML = "🦉 Notes";
            floatingBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #3b8ea5 0%, #2b6e85 100%);
                color: white;
                border: none;
                border-radius: 30px;
                padding: 12px 24px;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10001;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
            `;
            floatingBtn.onmouseover = () => {
                floatingBtn.style.transform = "scale(1.05)";
                floatingBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)";
            };
            floatingBtn.onmouseout = () => {
                floatingBtn.style.transform = "scale(1)";
                floatingBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            };
            floatingBtn.onclick = toggleCodeforcesSidebar;
            document.body.appendChild(floatingBtn);
            console.log("Lazzy: Codeforces floating button injected");
        }
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
    if (IS_CODEFORCES && (window.location.href.includes("/problem/") || window.location.href.includes("/problemset/"))) {
        injectCodeforcesButton();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// DEBUG: Confirm script execution
if (IS_CODEFORCES) {
    console.log("Lazzy: Codeforces detected. Initializing...");
    // document.body.style.border = "5px solid red"; // Temporary visual debug
}

// Robust polling for Codeforces to ensure button injection
if (IS_CODEFORCES) {
    const cfInterval = setInterval(() => {
        if (window.location.href.includes("/problem/") || window.location.href.includes("/problemset/")) {
            injectCodeforcesButton();
        }
    }, 1000); // Check every second

    // Stop polling after 30 seconds to save resources
    setTimeout(() => clearInterval(cfInterval), 30000);
}

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

        const difficulty = getLeetCodeDifficulty();

        sendResponse({
            title: title,
            difficulty: difficulty,
            url: window.location.href
        });
        return true;
    }


    if (request.action === "getCodeforcesProblemDetails") {
        const titleEl = document.querySelector(".problem-statement .header .title");
        let title = titleEl ? titleEl.innerText : "Unknown Problem";

        let difficulty = "Unrated"; // Default if no rating found
        let rating = 0;
        let tags = [];

        // Difficulty in Codeforces is rating, present in sidebar .tag-box
        // Tags are also in .tag-box
        const tagElements = document.querySelectorAll(".tag-box");
        for (const tag of tagElements) {
            if (tag.title === "Difficulty") {
                const text = tag.innerText.trim();
                // text like "*800", "*1200"
                const num = parseInt(text.replace('*', ''));
                if (!isNaN(num)) {
                    rating = num;
                    difficulty = num.toString();
                }
            } else {
                // Collect other tags
                tags.push(tag.innerText.trim());
            }
        }

        sendResponse({
            title: title,
            difficulty: difficulty, // Now returns the actual rating string e.g. "1200" or "Unrated"
            url: window.location.href,
            rating: rating,
            tags: tags
        });
        return true;
    }

    return true;
});
