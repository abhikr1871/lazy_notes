import re
import os

filepath = r"c:\Users\abhij\OneDrive\Desktop\IntelliAsk AI\extension\src\content\index.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace toggleCodeforcesSidebar
cf_sidebar_pattern = re.compile(r"function toggleCodeforcesSidebar\(\) \{.*?(?=function injectCodeforcesButton\(\) \{)", re.DOTALL)

new_cf_sidebar = """function toggleCodeforcesSidebar() {
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
        const currentUrl = new URL(window.location.href);
        const tab = currentUrl.searchParams.get('lazzy_tab') || 'notes';
        iframe.src = chrome.runtime.getURL('sidepanel.html?context=codeforces&tab=' + tab);
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

"""
content = cf_sidebar_pattern.sub(new_cf_sidebar, content)

# 2. Add injectCodeforcesCompileButton
compile_button_code = """
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
            if (existingContainer && existingContainer.classList.contains("lazyy-visible")) {
                chrome.runtime.sendMessage({ action: "switchCodeforcesTab", tab: "code" });
            } else {
                const url = new URL(window.location);
                url.searchParams.set('lazzy_tab', 'code');
                window.history.replaceState({}, '', url);
                toggleCodeforcesSidebar();
                
                setTimeout(() => {
                    url.searchParams.delete('lazzy_tab');
                    window.history.replaceState({}, '', url);
                }, 1000);
            }
        };

        targetEl.appendChild(compileBtn);
    }
}

"""

init_pattern = re.compile(r"// --- Initialization ---")
content = init_pattern.sub(compile_button_code + "// --- Initialization ---", content)

# 3. Add to observer and polling
# Replace the block:
#     if (IS_CODEFORCES && (window.location.href.includes("/problem/") || window.location.href.includes("/problemset/"))) {
#         injectCodeforcesButton();
#     }
ob_pattern = re.compile(r"injectCodeforcesButton\(\);\s+\}")
content = ob_pattern.sub("injectCodeforcesButton();\n        injectCodeforcesCompileButton();\n    }", content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.js successfully!")
