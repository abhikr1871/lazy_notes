// Content Script
console.log("Lazzy Content Script Loaded");

// --- Platform Detection ---
const IS_YOUTUBE = window.location.hostname.includes("youtube.com");
const IS_LEETCODE = window.location.hostname.includes("leetcode.com");
const IS_CODEFORCES = window.location.hostname.includes("codeforces.com");

// --- YouTube Sidebar Logic ---
function toggleYouTubeSidebar() {
    const secondary = document.querySelector("ytd-watch-flexy #secondary");
    if (!secondary) {
        console.warn("Could not find YouTube sidebar (secondary column).");
        return;
    }

    let iframe = document.getElementById("lazyy-sidebar-yt");
    if (iframe) {
        if (iframe.parentElement !== secondary) {
            // Reattach to the active secondary container during SPA navigation
            secondary.insertBefore(iframe, secondary.firstChild);
            iframe.style.display = "block";
            return;
        }

        const currentDisplay = iframe.style.display || window.getComputedStyle(iframe).display;
        iframe.style.display = currentDisplay === "none" ? "block" : "none";
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
            display: block;
        `;
        secondary.insertBefore(iframe, secondary.firstChild);
    }
}

function injectYouTubeButton() {
    const target = document.querySelector("ytd-watch-metadata #owner");
    if (!target) return;

    let btn = document.getElementById("lazyy-notes-button");
    if (btn) {
        if (btn.parentElement !== target) {
            target.appendChild(btn);
        }
        return;
    }

    btn = document.createElement("button");
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

    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleYouTubeSidebar();
    };

    target.appendChild(btn);
}

// --- LeetCode Sidebar Logic ---
function toggleLeetCodeSidebar(tab) {
    let container = document.getElementById("lazyy-leetcode-container");
    if (container) {
        container.classList.toggle("lazyy-visible");
        if (container.classList.contains("lazyy-visible") && tab) {
            chrome.runtime.sendMessage({ action: "switchLeetCodeTab", tab: tab });
        }
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
        const iframeSrc = tab
            ? chrome.runtime.getURL('sidepanel.html?context=leetcode&tab=' + tab)
            : chrome.runtime.getURL('sidepanel.html?context=leetcode');
        iframe.src = iframeSrc;
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
            #lazyy-leetcode-container.lazyy-visible { right: 0 !important; }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            container.classList.add("lazyy-visible");
            if (tab) {
                chrome.runtime.sendMessage({ action: "switchLeetCodeTab", tab: tab });
            }
        }, 10);
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
    const path = window.location.pathname;
    if (!path.startsWith('/problems/') || path.includes('/problemset')) return;
    if (document.getElementById("lazyy-lc-plus-btn")) return;

    const titleSelectors = [
        'div[data-cy="question-title"]',
        '.text-title-large',
        'span.text-2xl',
        '.mr-2.text-xl',
        'div.flex.items-center div.text-title-large'
    ];

    let titleElement = null;
    for (const selector of titleSelectors) {
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
        const difficulty = getLeetCodeDifficulty();
        let difficultyColor = "#ffa116";

        if (difficulty === "Easy") difficultyColor = "#00b8a3";
        else if (difficulty === "Hard") difficultyColor = "#ff375f";

        // Notes Button
        const btn = document.createElement("button");
        btn.id = "lazyy-lc-plus-btn";
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
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLeetCodeSidebar('notes');
        };

        // AI Button
        const aiBtn = document.createElement("button");
        aiBtn.id = "lazyy-lc-ai-btn";
        aiBtn.innerHTML = "✨ AI";
        aiBtn.title = "Generate AI Problem Breakdown";
        aiBtn.style.cssText = `
            margin-left: 8px;
            padding: 6px 14px;
            border-radius: 20px;
            background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
            color: #ffffff;
            border: 1px solid rgba(255,255,255,0.2);
            font-size: 13px;
            font-weight: 700;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            line-height: 1;
            white-space: nowrap;
            transition: all 0.2s ease;
            vertical-align: middle;
            box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
        `;
        aiBtn.onmouseover = () => {
            aiBtn.style.transform = "translateY(-1px)";
            aiBtn.style.boxShadow = "0 4px 10px rgba(124, 58, 237, 0.6)";
        };
        aiBtn.onmouseout = () => {
            aiBtn.style.transform = "translateY(0)";
            aiBtn.style.boxShadow = "0 2px 6px rgba(124, 58, 237, 0.4)";
        };
        aiBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLeetCodeSidebar('ai');
        };

        const style = window.getComputedStyle(titleElement);
        if (style.display !== 'flex') {
            titleElement.style.display = 'inline-flex';
            titleElement.style.alignItems = 'center';
        } else {
            titleElement.style.alignItems = 'center';
        }

        titleElement.appendChild(btn);
        titleElement.appendChild(aiBtn);
    }
}

// --- Codeforces Sidebar Logic ---
function toggleCodeforcesSidebar(tab) {
    let container = document.getElementById("lazyy-codeforces-container");
    if (container) {
        container.classList.toggle("lazyy-visible");
    } else {
        container = document.createElement("div");
        container.id = "lazyy-codeforces-container";
        container.style.cssText = `
            position: fixed; top: 0; right: 0; width: 400px; height: 100vh;
            background: white; z-index: 10000; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -5px 0 25px rgba(0,0,0,0.15); border-left: 1px solid #eee;
            display: flex; flex-direction: column;
            border-top-left-radius: 12px;
            border-bottom-left-radius: 12px;
            transform: translateX(105%);
        `;

        chrome.storage.local.get(['lazyy_cf_width'], (result) => {
            if (result.lazyy_cf_width) {
                container.style.width = result.lazyy_cf_width;
            }
        });

        const iframe = document.createElement("iframe");
        // Only append tab param if explicitly provided (e.g. 'code')
        const iframeSrc = tab
            ? chrome.runtime.getURL('sidepanel.html?context=codeforces&tab=' + tab)
            : chrome.runtime.getURL('sidepanel.html?context=codeforces');
        iframe.src = iframeSrc;
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

        const resizer = document.createElement("div");
        resizer.className = "lazyy-resizer";
        resizer.style.cssText = `
            position: absolute; left: 0; top: 0; width: 6px; height: 100%;
            cursor: ew-resize; z-index: 10001; background: transparent;
            transition: background 0.2s; border-top-left-radius: 12px; border-bottom-left-radius: 12px;
        `;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = parseInt(document.defaultView.getComputedStyle(container).width, 10);

            container.style.transition = 'none';
            iframe.style.pointerEvents = 'none';
            resizer.style.background = 'rgba(99, 102, 241, 0.8)';

            const onMouseMove = (moveEvent) => {
                const newWidth = startWidth - (moveEvent.clientX - startX);
                if (newWidth > 350 && newWidth < window.innerWidth * 0.8) {
                    container.style.width = newWidth + 'px';
                }
            };

            const onMouseUp = () => {
                container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                iframe.style.pointerEvents = 'auto';
                resizer.style.background = 'transparent';

                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);

                chrome.storage.local.set({ 'lazyy_cf_width': container.style.width });
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        resizer.onmouseover = () => { if (iframe.style.pointerEvents !== 'none') resizer.style.background = 'rgba(99, 102, 241, 0.4)'; };
        resizer.onmouseout = () => { if (iframe.style.pointerEvents !== 'none') resizer.style.background = 'transparent'; };

        container.appendChild(resizer);
        container.appendChild(closeBtn);
        container.appendChild(iframe);
        document.body.appendChild(container);

        const style = document.createElement("style");
        style.textContent = `
            #lazyy-codeforces-container.lazyy-visible { transform: translateX(0) !important; }
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
            
            const existingContainer = document.getElementById("lazyy-codeforces-container");
            if (!existingContainer || !existingContainer.classList.contains("lazyy-visible")) {
                toggleCodeforcesSidebar();
            }
            
            // Always reset sidebar to the Topics list view
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: "resetToTopics" });
            }, 100);
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


function injectCodeforcesCompileButton() {
    if (document.getElementById("lazyy-cf-compile-btn")) return;

    const selectors = [
        ".problem-statement .header .title",
        ".problem-statement .header",
        "#pageContent .title",
        "div.title"
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
        const compileBtn = document.createElement("a");
        compileBtn.id = "lazyy-cf-compile-btn";
        compileBtn.innerHTML = "⚡ Code";
        compileBtn.style.cssText = `
            margin-left: 8px;
            padding: 5px 14px;
            border-radius: 20px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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

        compileBtn.onmouseover = () => {
            compileBtn.style.transform = "translateY(-1px)";
            compileBtn.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
            compileBtn.style.filter = "brightness(1.1)";
        };
        compileBtn.onmouseout = () => {
            compileBtn.style.transform = "translateY(0)";
            compileBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
            compileBtn.style.filter = "none";
        };

        compileBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const existingContainer = document.getElementById("lazyy-codeforces-container");
            if (!existingContainer || !existingContainer.classList.contains("lazyy-visible")) {
                toggleCodeforcesSidebar('code');
            }
            
            // Broadcast intent to React Sidebar (also handles case where sidebar already open)
            setTimeout(() => {
                chrome.runtime.sendMessage({ action: "switchCodeforcesTab", tab: "code" });
            }, 100);
        };

        targetEl.appendChild(compileBtn);
    }
}

function injectCodeforcesAIButton() {
    if (document.getElementById("lazyy-cf-ai-btn")) return;

    const selectors = [
        ".problem-statement .header .title",
        ".problem-statement .header",
        "#pageContent .title",
        "div.title"
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
        const aiBtn = document.createElement("a");
        aiBtn.id = "lazyy-cf-ai-btn";
        aiBtn.innerHTML = "✨ AI";
        aiBtn.title = "Generate AI Problem Breakdown";
        aiBtn.style.cssText = `
            margin-left: 8px;
            padding: 5px 14px;
            border-radius: 20px;
            background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
            color: #ffffff;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(124, 58, 237, 0.4);
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
            white-space: nowrap;
            transition: all 0.2s ease;
        `;

        aiBtn.onmouseover = () => {
            aiBtn.style.transform = "translateY(-1px)";
            aiBtn.style.boxShadow = "0 4px 10px rgba(124, 58, 237, 0.6)";
            aiBtn.style.filter = "brightness(1.1)";
        };
        aiBtn.onmouseout = () => {
            aiBtn.style.transform = "translateY(0)";
            aiBtn.style.boxShadow = "0 2px 6px rgba(124, 58, 237, 0.4)";
            aiBtn.style.filter = "none";
        };

        aiBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const existingContainer = document.getElementById("lazyy-codeforces-container");
            if (!existingContainer || !existingContainer.classList.contains("lazyy-visible")) {
                toggleCodeforcesSidebar('ai');
            }

            setTimeout(() => {
                chrome.runtime.sendMessage({ action: "switchCodeforcesTab", tab: "ai" });
            }, 100);
        };

        targetEl.appendChild(aiBtn);
    }
}

const IS_GFG = window.location.hostname.includes("geeksforgeeks.org");

function injectGFGButton() {
    const path = window.location.pathname;
    if (!path.includes("/problems/")) return;

    if (document.getElementById("lazyy-gfg-ai-btn")) return;

    const headerSelectors = [
        '.problems_header_content__title',
        'h3',
        '.header-title'
    ];

    let targetEl = null;
    for (const sel of headerSelectors) {
        const el = document.querySelector(sel);
        if (el) {
            targetEl = el.parentElement || el;
            break;
        }
    }

    if (!targetEl) targetEl = document.body;

    const btn = document.createElement("button");
    btn.id = "lazyy-gfg-ai-btn";
    btn.innerHTML = "✨ AI Explainer";
    btn.style.cssText = "margin-left: 10px; padding: 6px 12px; background: linear-gradient(135deg, #6366f1, #a855f7); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; z-index: 9999;";
    btn.onclick = () => toggleGFGSidebar('ai');

    targetEl.appendChild(btn);
}

function toggleGFGSidebar(tab) {
    let container = document.getElementById("lazyy-gfg-container");
    if (container) {
        container.classList.toggle("lazyy-visible");
    } else {
        container = document.createElement("div");
        container.id = "lazyy-gfg-container";
        container.style.cssText = `
            position: fixed; top: 0; right: -420px; width: 420px; height: 100vh;
            z-index: 999999; transition: right 0.3s ease; box-shadow: -5px 0 25px rgba(0,0,0,0.15);
        `;

        const iframe = document.createElement("iframe");
        const iframeSrc = tab
            ? chrome.runtime.getURL('sidepanel.html?context=gfg&tab=' + tab)
            : chrome.runtime.getURL('sidepanel.html?context=gfg');
        iframe.src = iframeSrc;
        iframe.style.cssText = "width: 100%; height: 100%; border: none;";

        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = "✕";
        closeBtn.style.cssText = "position: absolute; left: -30px; top: 20px; width: 30px; height: 30px; background: white; border: 1px solid #eee; border-radius: 5px 0 0 5px; cursor: pointer; font-weight: bold; color: #666;";
        closeBtn.onclick = () => container.classList.remove("lazyy-visible");

        container.appendChild(closeBtn);
        container.appendChild(iframe);
        document.body.appendChild(container);

        const style = document.createElement("style");
        style.textContent = "#lazyy-gfg-container.lazyy-visible { right: 0 !important; }";
        document.head.appendChild(style);

        setTimeout(() => container.classList.add("lazyy-visible"), 10);
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
        injectCodeforcesCompileButton();
        injectCodeforcesAIButton();
    }
    if (IS_GFG && window.location.href.includes("/problems/")) {
        injectGFGButton();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

if (IS_GFG) {
    setInterval(() => {
        if (window.location.href.includes("/problems/")) {
            injectGFGButton();
        }
    }, 1000);
}

function getLeetCodeCode() {
    try {
        const monacoLines = document.querySelectorAll('.monaco-editor .view-line');
        if (monacoLines && monacoLines.length > 0) {
            const lines = [];
            monacoLines.forEach(line => lines.push(line.innerText));
            const codeText = lines.join('\n');
            if (codeText.trim().length > 0) return codeText;
        }
    } catch (e) {}

    const textarea = document.querySelector('textarea.inputarea') || document.querySelector('textarea');
    if (textarea && textarea.value) return textarea.value;

    return "";
}

function getCodeforcesCode() {
    const sourceArea = document.querySelector('#source') || document.querySelector('textarea[name="source"]');
    if (sourceArea && sourceArea.value) return sourceArea.value;

    const aceLines = document.querySelectorAll('.ace_line');
    if (aceLines && aceLines.length > 0) {
        const lines = [];
        aceLines.forEach(line => lines.push(line.innerText));
        return lines.join('\n');
    }

    return "";
}

// Listen for messages from extension components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getYoutubeContext") {
        sendResponse({ url: window.location.href, title: document.title });
        return true;
    }

    if (request.action === "getPageText") {
        sendResponse({ text: document.body.innerText });
    }

    if (request.action === "getVideoTime") {
        const video = document.querySelector("video");
        sendResponse({
            time: video ? new Date(video.currentTime * 1000).toISOString().substring(14, 19) : null,
            seconds: video ? Math.floor(video.currentTime) : 0
        });
    }

    if (request.action === "seekVideoTime") {
        const video = document.querySelector("video");
        if (video) {
            let secs = request.seconds;
            if (secs === undefined && request.timeStr) {
                const parts = request.timeStr.replace('[', '').replace(']', '').split(':').map(Number);
                if (parts.length === 2) secs = parts[0] * 60 + parts[1];
                else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
            if (secs !== undefined) {
                video.currentTime = secs;
                video.play();
                sendResponse({ success: true, currentTime: video.currentTime });
            } else {
                sendResponse({ success: false, error: "Invalid seconds" });
            }
        } else {
            sendResponse({ success: false, error: "No video found" });
        }
        return true;
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
                title = el.innerText;
                break;
            }
        }

        const difficulty = getLeetCodeDifficulty();

        sendResponse({
            title: title,
            difficulty: difficulty,
            url: window.location.href,
            code: getLeetCodeCode()
        });
        return true;
    }


    if (request.action === "getCodeforcesProblemDetails") {
        const titleEl = document.querySelector(".problem-statement .header .title");
        let title = titleEl ? titleEl.innerText : "Unknown Problem";

        let difficulty = "Unrated";
        let rating = 0;
        let tags = [];

        const tagElements = document.querySelectorAll(".tag-box");
        for (const tag of tagElements) {
            if (tag.title === "Difficulty") {
                const text = tag.innerText.trim();
                const num = parseInt(text.replace('*', ''));
                if (!isNaN(num)) {
                    rating = num;
                    difficulty = num.toString();
                }
            } else {
                tags.push(tag.innerText.trim());
            }
        }

        sendResponse({
            title: title,
            difficulty: difficulty,
            url: window.location.href,
            rating: rating,
            tags: tags,
            code: getCodeforcesCode()
        });
        return true;
    }

    if (request.action === "getGFGProblemDetails") {
        let title = "Unknown Problem";
        const titleEl = document.querySelector('h3') || document.querySelector('.header-title') || document.querySelector('h1');
        if (titleEl && titleEl.innerText) {
            title = titleEl.innerText.trim();
        }

        sendResponse({
            title: title,
            difficulty: "Medium",
            url: window.location.href,
            code: getGFGCode()
        });
        return true;
    }

    return true;
});
