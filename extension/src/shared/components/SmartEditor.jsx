import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, LogOut, Sparkles
} from 'lucide-react';
import { exportToPDF } from '../utils/pdf';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

function SmartEditor({ storageKey = 'lazyyNotesContent', onBack, placeholder, simpleMode = false, onSave, onLoad }) {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const editorRef = useRef(null);
    const navigate = useNavigate();

    // Load saved notes and check auth
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);

        // 1. Try Local Load
        chrome.storage.local.get([storageKey], (result) => {
            if (result[storageKey]) {
                setHtml(result[storageKey]);
            } else if (placeholder && !result[storageKey]) {
                if (simpleMode) setHtml("");
            }
        });

        // 2. Try Cloud Load
        const fetchCloud = async () => {
            if (!token) return;

            try {
                if (onLoad) {
                    const content = await onLoad();
                    if (content) {
                        setHtml(content);
                        chrome.storage.local.set({ [storageKey]: content });
                    }
                } else if (storageKey !== 'lazyyNotesContent') {
                    const data = await api.notes.get(storageKey);
                    if (data && data.content) {
                        setHtml(data.content);
                        chrome.storage.local.set({ [storageKey]: data.content });
                    }
                }
            } catch (err) {
                console.error("Cloud note fetch error:", err);
            }
        };
        fetchCloud();

    }, [storageKey, simpleMode, onLoad]);

    // Auto-Save Effect for Simple Mode
    useEffect(() => {
        if (!simpleMode) return;
        const timer = setTimeout(() => {
            handleSave();
        }, 1000);
        return () => clearTimeout(timer);
    }, [html, simpleMode]);

    const handleChange = (evt) => {
        setHtml(evt.target.value);
    };

    const executeCommand = (command, value = null) => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };


    const handleSave = async () => {
        if (!isAuthenticated) {
            setStatus("Please log in");
            const wantLogin = window.confirm("You need to be logged in to save your notes to the cloud. Would you like to log in now?");
            if (wantLogin) {
                navigate('/login');
            }
            return;
        }

        setStatus("Saving...");
        try {
            if (onSave) {
                await onSave(html);
            } else {
                await api.notes.save(storageKey, html);
            }

            localStorage.setItem(storageKey, html);
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ [storageKey]: html });
            }

            setStatus("Saved!");
            setTimeout(() => setStatus(""), 1500);
        } catch (error) {
            console.error('Cloud save failed:', error);
            setStatus("Save failed");
            const wantLogin = window.confirm("Your login session may have expired. Would you like to log in again now?");
            if (wantLogin) {
                navigate('/login');
            }
        }
    };
    const handleEditorCanvasClick = (e) => {
        const badge = e.target.closest('.yt-timestamp-badge') || (e.target.innerText && e.target.innerText.trim().startsWith('[') && e.target.innerText.trim().endsWith(']') ? e.target : null);
        if (badge) {
            e.stopPropagation();
            const secs = badge.getAttribute('data-seconds');
            const timeText = badge.innerText.trim();
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: "seekVideoTime",
                            seconds: secs ? parseInt(secs) : undefined,
                            timeStr: timeText
                        });
                    }
                });
            }
            return;
        }
        handleContainerClick(e);
    };

    const handleContainerClick = (e) => {
        if (e.target === e.currentTarget || e.target.id === 'editor-wrapper') {
            e.stopPropagation();
            if (editorRef.current) {
                const lastElement = editorRef.current.lastElementChild;
                if (lastElement && lastElement.tagName === 'IMG') {
                    setHtml(prev => prev + "<p><br/></p>");
                    setTimeout(moveCursorToEnd, 0);
                } else {
                    moveCursorToEnd();
                }
            }
        }
    };

    const moveCursorToEnd = () => {
        if (editorRef.current) {
            editorRef.current.focus();
            try {
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (err) {
                console.log("Cursor move failed:", err);
            }
        }
    };


    const handleLogoClick = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1500);
    };

    const handleLogout = () => {
        // Clear all local data to prevent leaks between users
        localStorage.clear();
        chrome.storage.local.clear(() => {
            console.log("Storage cleared");
        });

        setIsAuthenticated(false);
        setStatus("Logged out");
        // Force reload or navigate
        setTimeout(() => {
            setStatus("");
            navigate('/login');
        }, 1000);
    };

    const handleSnap = async () => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) return;
                chrome.tabs.sendMessage(tabs[0].id, { action: "captureVideoFrame" }, async (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log("Video capture failed, fallback to tab.");
                        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
                        const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" /><p><br/></p>`;
                        setHtml(prev => prev + imgTag);
                    } else {
                        const { imageData, time } = response;
                        const content = `<br/><div style="color: #6366f1; font-weight: bold;">⏱️ ${time}</div><img src="${imageData}" style="max-width: 100%; border-radius: 12px; margin: 5px 0 15px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" /><p><br/></p>`;
                        setHtml(prev => prev + content);
                    }
                });
            });
        } catch (err) {
            console.error(err);
        }
    };

    const [autoSnap, setAutoSnap] = useState(false);

    const handleLink = () => {
        const url = prompt("Enter URL:");
        if (url) executeCommand("createLink", url);
    };

    const handleMic = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setHtml(prev => prev + " " + transcript);
        };

        recognition.start();
    };

    const handleTimestamp = () => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "getVideoTime" }, (response) => {
                        if (response && response.time) {
                            const secs = response.seconds !== undefined ? response.seconds : 0;
                            const timeStr = `<span class="yt-timestamp-badge" data-seconds="${secs}" style="color: #4f46e5; font-weight: bold; background: #e0e7ff; padding: 2px 8px; border-radius: 6px; cursor: pointer; text-decoration: underline;">[${response.time}]</span>&nbsp;`;
                            setHtml(prev => prev + timeStr);
                        }
                    });
                }
            });
        }
    };

    const handleSummarizeNotes = async () => {
        const div = document.createElement("div");
        div.innerHTML = html;
        const plainText = div.innerText || div.textContent || "";
        if (!plainText.trim()) {
            alert("Please write some notes before summarizing!");
            return;
        }

        setIsSummarizing(true);
        setStatus("Summarizing...");
        try {
            const data = await api.ai.summarize(plainText);
            if (data && data.summary) {
                const summaryHtml = `<br/><hr/><h3>🤖 AI Notes Summary</h3><div>${data.summary.replace(/\n/g, '<br/>')}</div><p><br/></p>`;
                setHtml(prev => prev + summaryHtml);
                setStatus("Summarized!");
                setTimeout(() => setStatus(""), 2000);
            }
        } catch (err) {
            console.error(err);
            setStatus("Error summarizing");
            setTimeout(() => setStatus(""), 2000);
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return;

        try {
            const data = await api.upload.image(file);

            const imgHtml = `<img src="${data.url}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" /><br/>`;
            document.execCommand('insertHTML', false, imgHtml);
            if (!simpleMode) {
                setStatus("Image uploaded!");
                setTimeout(() => setStatus(""), 2000);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            if (!simpleMode) {
                setStatus("Upload failed");
                setTimeout(() => setStatus(""), 2000);
            }
        }
    };
    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = items[i].getAsFile();
                handleImageUpload(file);
                return;
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            handleImageUpload(files[0]);
        }
    };

    const ToolbarBtn = ({ onClick, icon: Icon, title, active }) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-1 rounded-lg transition-all duration-200 ${active ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-500'}`}
        >
            <Icon size={18} strokeWidth={2} />
        </button>
    );

    return (
        <div
            className="h-full flex flex-col bg-white font-display selection:bg-indigo-100 text-slate-700"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Compact Header - Replacing the Large Brand Header */}
            {!simpleMode && (
                <header className="bg-white px-3 py-2 border-b border-slate-100 flex justify-between items-center shrink-0 z-50 relative">
                    <div className="flex items-center gap-2 z-10">
                        {/* Open Note Button */}
                        <button
                            onClick={() => {/* TODO: Implement Open Notes Logic */ alert("Open Notes feature coming soon!") }}
                            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                            <FileText size={14} />
                            <span>Open Note</span>
                        </button>
                    </div>

                    {/* Centered Logo/Title */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 z-0">
                        <div className="relative group cursor-pointer" onClick={handleLogoClick}>
                            <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-pink-600 rounded-lg blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75' : 'group-hover:opacity-50'}`}></div>
                            <img
                                src="icons/icon48.png"
                                alt="Logo"
                                className={`relative w-6 h-6 rounded-md shadow-sm transition-all duration-[1500ms] ease-in-out ${isAnimating ? 'rotate-[1080deg]' : 'group-hover:scale-105'}`}
                            />
                        </div>
                        <h1 className="font-extrabold text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">
                            LAZZY
                        </h1>
                    </div>

                    <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-indigo-600 font-medium mr-2 animate-fade-in">{status}</span>

                        {/* Auth Buttons */}
                        {isAuthenticated ? (
                            <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                                <LogOut size={16} />
                            </button>
                        ) : (
                            <button onClick={() => navigate('/login')} className="px-2 py-1 bg-slate-900 text-white hover:bg-slate-700 rounded-md text-[10px] font-bold transition-colors">
                                Login
                            </button>
                        )}

                        <button onClick={handleSave} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Save size={16} />
                        </button>
                        <button onClick={() => chrome.runtime.openOptionsPage()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                            <Settings size={16} />
                        </button>
                    </div>
                </header >
            )}

            {/* Modern Toolbar - Made more compact */}
            <div className={`bg-white px-2 py-1.5 border-b border-slate-100 flex flex-col gap-1 shrink-0 z-10 ${simpleMode ? 'bg-slate-50' : ''}`}>
                {/* ... Toolbar content remains mostly same but we can adjust padding in CSS if needed ... */}
                {/* Re-using existing toolbar structure but assuming container styling handles compactness */}
                {/* Row 1: Extensive Formatting */}
                <div className="flex items-center justify-between overflow-x-auto scrollbar-hide pb-0.5 gap-1">

                    {simpleMode && (
                        <span className="text-xs text-indigo-600 font-medium mr-2 animate-fade-in">{status}</span>
                    )}

                    {/* Fonts Control */}
                    <div className="flex items-center space-x-0.5">
                        <select onChange={(e) => executeCommand('fontName', e.target.value)} className="w-20 text-[10px] bg-transparent border-none outline-none text-slate-600 font-medium cursor-pointer hover:text-indigo-600 truncate">
                            <option value="Poppins" style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</option>
                            <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                            <option value="Roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
                            <option value="Open Sans" style={{ fontFamily: '"Open Sans", sans-serif' }}>Open Sans</option>
                            <option value="Lato" style={{ fontFamily: 'Lato, sans-serif' }}>Lato</option>
                            <option value="Montserrat" style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</option>
                            <option value="Arial" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                            <option value="Times New Roman" style={{ fontFamily: '"Times New Roman", serif' }}>Serif</option>
                            <option value="Courier New" style={{ fontFamily: '"Courier New", monospace' }}>Mono</option>
                        </select>
                        <select onChange={(e) => executeCommand('fontSize', e.target.value)} className="w-10 text-[10px] bg-transparent border-none outline-none text-slate-600 font-medium cursor-pointer hover:text-indigo-600">
                            <option value="1">8</option>
                            <option value="2">10</option>
                            <option value="3">12</option>
                            <option value="4">14</option>
                            <option value="5">18</option>
                            <option value="6">24</option>
                            <option value="7">36</option>
                        </select>
                    </div>
                    <div className="w-px h-3 bg-slate-200 mx-1"></div>

                    <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H1')} icon={Heading1} title="H1" />
                    <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H2')} icon={Heading2} title="H2" />
                    <ToolbarBtn onClick={() => executeCommand('bold')} icon={Bold} title="Bold" />
                    <ToolbarBtn onClick={() => executeCommand('underline')} icon={Underline} title="Underline" />

                    {/* Colors */}
                    <div className="flex items-center space-x-0.5">
                        <button onClick={() => executeCommand('foreColor', '#ef4444')} className="p-1 hover:bg-slate-100 rounded text-red-500 font-bold text-xs" title="Text Color">A</button>
                        <button onClick={() => executeCommand('hiliteColor', '#fef08a')} className="p-1 hover:bg-slate-100 rounded bg-yellow-100 text-slate-800 font-bold text-xs" title="Highlight">A</button>
                    </div>

                    <div className="w-px h-3 bg-slate-200 mx-1"></div>

                    <ToolbarBtn onClick={() => executeCommand('insertOrderedList')} icon={List} title="Numbered List" />
                    <ToolbarBtn onClick={() => executeCommand('insertUnorderedList')} icon={List} title="Bullet List" />

                    <ToolbarBtn onClick={() => {
                        const url = prompt("Enter Image URL:");
                        if (url) executeCommand('insertImage', url);
                    }} icon={ImageIcon} title="Image" />

                    <ToolbarBtn onClick={handleLink} icon={LinkIcon} title="Link" />

                    <div className="w-px h-3 bg-slate-200 mx-1"></div>

                    {/* Row 2: Smart Tools - Inline for compactness */}
                    <button onClick={handleSnap} title="Snap Frame" className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Camera size={16} />
                    </button>
                    <button onClick={() => setAutoSnap(!autoSnap)} title="AutoSnap" className={`p-1 rounded-lg ${autoSnap ? 'bg-purple-100 text-purple-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Film size={16} />
                    </button>
                    <button onClick={handleMic} title="Dictate" className={`p-1 rounded-lg ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Mic size={16} />
                    </button>
                    <button onClick={handleTimestamp} title="Timestamp" className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <Clock size={16} />
                    </button>
                    <button onClick={handleSummarizeNotes} disabled={isSummarizing} title="Summarize Notes with AI" className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg">
                        <Sparkles size={16} className="text-purple-600" />
                    </button>
                    <button onClick={() => exportToPDF("note-editor-content")} title="Export PDF" className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <FileText size={16} />
                    </button>

                </div>
            </div>

            {/* Editor Canvas - Removed borders and padding as requested */}
            <div className="flex-1 overflow-y-auto" id="pdf-container" onClick={handleEditorCanvasClick}>
                <div
                    id="editor-wrapper"
                    onClick={handleEditorCanvasClick}
                    className="min-h-full bg-white p-4 md:p-6 cursor-text max-w-none mx-auto transition-all duration-200 outline-none"
                    style={{ border: 'none', boxShadow: 'none' }}
                >
                    <ContentEditable
                        id="note-editor-content"
                        innerRef={editorRef}
                        html={html}
                        disabled={false}
                        onChange={handleChange}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        className="outline-none w-full prose prose-sm prose-slate max-w-none 
            prose-headings:font-bold prose-headings:text-slate-800 
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
}

export default SmartEditor;
