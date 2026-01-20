import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, LogOut, X
} from 'lucide-react';
import { exportToPDF } from '../../utils/pdf';
import { useNavigate } from 'react-router-dom';

function NoteEditor() {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const editorRef = useRef(null);
    const navigate = useNavigate();

    // Load saved notes and check auth
    useEffect(() => {
        chrome.storage.local.get(['lazyyNotesContent'], (result) => {
            if (result.lazyyNotesContent) {
                setHtml(result.lazyyNotesContent);
            }
        });

        const token = localStorage.getItem('token');
        setIsAuthenticated(!!token);
    }, []);

    const handleChange = (evt) => {
        setHtml(evt.target.value);
    };

    const executeCommand = (command, value = null) => {
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const handleSave = () => {
        chrome.storage.local.set({ lazyyNotesContent: html }, () => {
            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        });
    };

    const handleLogoClick = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1500);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setStatus("Logged out");
        setTimeout(() => setStatus(""), 2000);
    };

    const [autoSnapInterval, setAutoSnapInterval] = useState(null);
    const [showSnapOptions, setShowSnapOptions] = useState(false);

    useEffect(() => {
        let intervalId;
        if (autoSnapInterval) {
            intervalId = setInterval(() => {
                handleSnap();
            }, autoSnapInterval);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [autoSnapInterval]);

    const handleSnap = async () => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) return;
                chrome.tabs.sendMessage(tabs[0].id, { action: "captureVideoFrame" }, async (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log("Video capture failed, fallback to tab.");
                        // Only fallback if not auto-snapping (to avoid spamming screenshots of nothing)
                        if (!autoSnapInterval) {
                            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
                            const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" /><br/>`;
                            setHtml(prev => prev + imgTag);
                        }
                    } else {
                        const { imageData, time, ended } = response;

                        // Auto-Off Logic
                        if (ended && autoSnapInterval) {
                            setAutoSnapInterval(null);
                            setStatus("Video finished");
                            return;
                        }

                        const content = `<br/><div style="color: #6366f1; font-weight: bold;">⏱️ ${time}</div><img src="${imageData}" style="max-width: 100%; border-radius: 12px; margin: 5px 0 15px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" /><br/>`;
                        setHtml(prev => prev + content);
                    }
                });
            });
        } catch (err) {
            console.error(err);
        }
    };

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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getVideoTime" }, (response) => {
                    if (response && response.time) {
                        const timeStr = `<span style="color: #6366f1; font-weight: bold; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">[${response.time}]</span>&nbsp;`;
                        setHtml(prev => prev + timeStr);
                    }
                });
            }
        });
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
        <div className="h-full w-full bg-slate-50 relative flex flex-col">
            {/* Header */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-50">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={handleLogoClick}>
                    <div className="relative">
                        <img
                            src="icons/icon48.png"
                            alt="Logo"
                            className="w-10 h-10 rounded-lg shadow-sm"
                            onError={(e) => { e.target.src = "icons/icon48.png"; }}
                        />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800 leading-none">
                            Lazzy
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">AI Companion</p>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="text-xs text-indigo-600 font-medium mr-2">{status}</span>

                    {/* Auth Buttons */}
                    {isAuthenticated ? (
                        <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    ) : (
                        <div className="flex items-center space-x-1">
                            <button onClick={() => navigate('/login')} className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-slate-200">
                                Login
                            </button>
                        </div>
                    )}

                    <div className="w-px h-5 bg-slate-200 mx-1"></div>

                    <button onClick={handleSave} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Save size={18} />
                    </button>
                    <button onClick={() => chrome.runtime.openOptionsPage()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <Settings size={18} />
                    </button>
                    {/* Close Button */}
                    <button onClick={() => window.close()} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer pointer-events-auto" title="Close">
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white px-2 py-2 border-b border-slate-200 flex flex-col gap-2 shrink-0 z-40" onClick={() => showSnapOptions && setShowSnapOptions(false)}>
                {/* Row 1: Extensive Formatting */}
                <div className="flex items-center justify-between overflow-x-auto scrollbar-hide pb-0.5 gap-1">


                    {/* Fonts Control */}
                    <div className="flex items-center space-x-0.5">
                        <select onChange={(e) => executeCommand('fontName', e.target.value)} className="w-20 text-[10px] bg-transparent border-none outline-none text-slate-600 font-medium cursor-pointer hover:text-indigo-600 truncate">
                            {/* Handwritten / Notebook */}
                            <option value="Caveat" style={{ fontFamily: 'Caveat, cursive' }}>Caveat</option>
                            <option value="Patrick Hand" style={{ fontFamily: '"Patrick Hand", cursive' }}>Patrick Hand</option>
                            <option value="Kalam" style={{ fontFamily: 'Kalam, cursive' }}>Kalam</option>
                            <option value="Indie Flower" style={{ fontFamily: '"Indie Flower", cursive' }}>Indie Flower</option>
                            <option value="Architects Daughter" style={{ fontFamily: '"Architects Daughter", cursive' }}>Architects Daughter</option>

                            {/* Serif / Academic */}
                            <option value="Merriweather" style={{ fontFamily: 'Merriweather, serif' }}>Merriweather</option>
                            <option value="Libre Baskerville" style={{ fontFamily: '"Libre Baskerville", serif' }}>Libre Baskerville</option>
                            <option value="Crimson Text" style={{ fontFamily: '"Crimson Text", serif' }}>Crimson Text</option>
                            <option value="Playfair Display" style={{ fontFamily: '"Playfair Display", serif' }}>Playfair Display</option>
                            <option value="EB Garamond" style={{ fontFamily: '"EB Garamond", serif' }}>EB Garamond</option>

                            {/* Mono / Tech */}
                            <option value="JetBrains Mono" style={{ fontFamily: '"JetBrains Mono", monospace' }}>JetBrains Mono</option>
                            <option value="Fira Code" style={{ fontFamily: '"Fira Code", monospace' }}>Fira Code</option>
                            <option value="IBM Plex Mono" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>IBM Plex Mono</option>

                            {/* Aesthetic / Creative */}
                            <option value="DM Serif Display" style={{ fontFamily: '"DM Serif Display", serif' }}>DM Serif Display</option>
                            <option value="Space Grotesk" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>Space Grotesk</option>

                            {/* Existing Default Options */}
                            <option value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</option>
                            <option value="Roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</option>
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
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H1')} icon={Heading1} title="H1" />
                    <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H2')} icon={Heading2} title="H2" />
                    <ToolbarBtn onClick={() => executeCommand('bold')} icon={Bold} title="Bold" />
                    <ToolbarBtn onClick={() => executeCommand('underline')} icon={Underline} title="Underline" />

                    {/* Colors */}
                    <div className="flex items-center space-x-0.5">
                        <button onClick={() => executeCommand('foreColor', '#ef4444')} className="p-1 hover:bg-slate-100 rounded text-red-500 font-bold text-xs" title="Text Color">A</button>
                        <button onClick={() => executeCommand('hiliteColor', '#fef08a')} className="p-1 hover:bg-slate-100 rounded bg-yellow-100 text-slate-800 font-bold text-xs" title="Highlight">A</button>
                    </div>

                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    <ToolbarBtn onClick={() => executeCommand('insertOrderedList')} icon={List} title="Numbered List" />
                    <ToolbarBtn onClick={() => executeCommand('insertUnorderedList')} icon={List} title="Bullet List" />

                    <ToolbarBtn onClick={() => {
                        const url = prompt("Enter Image URL:");
                        if (url) executeCommand('insertImage', url);
                    }} icon={ImageIcon} title="Image" />

                    <ToolbarBtn onClick={handleLink} icon={LinkIcon} title="Link" />

                    <div className="w-px h-4 bg-slate-200 mx-1"></div>

                    <button onClick={() => executeCommand('subscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Subscript">x₂</button>
                    <button onClick={() => executeCommand('superscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Superscript">x²</button>


                </div>


                {/* Row 2: Smart Tools */}
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pt-1">
                    <button onClick={handleSnap} className="flex-none flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full text-[10px] font-bold shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                        <Camera size={12} />
                        <span>Snap Frame</span>
                    </button>

                    {/* AutoSnap Native Select (Fixes Overflow & Matches Font Selector) */}
                    <div className={`flex-none relative flex items-center rounded-full border transition-all group ${autoSnapInterval
                        ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}>
                        <Film size={12} className={`ml-2.5 absolute pointer-events-none ${autoSnapInterval ? 'text-white' : 'text-slate-500'}`} />
                        <select
                            value={autoSnapInterval || ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                setAutoSnapInterval(val ? parseInt(val) : null);
                            }}
                            className={`pl-7 pr-3 py-1.5 bg-transparent border-none outline-none appearance-none text-[10px] font-semibold cursor-pointer w-auto min-w-[90px] ${autoSnapInterval ? 'text-white' : 'text-slate-600'}`}
                            title="AutoSnap Interval"
                        >
                            {!autoSnapInterval && <option value="" className="text-slate-600 bg-white">AutoSnap</option>}
                            {autoSnapInterval && <option value="" className="text-slate-600 bg-white">Stop Snap</option>}
                            <option value="10000" className="text-slate-600 bg-white">10 Seconds</option>
                            <option value="30000" className="text-slate-600 bg-white">30 Seconds</option>
                            <option value="60000" className="text-slate-600 bg-white">1 Minute</option>
                            <option value="300000" className="text-slate-600 bg-white">5 Minutes</option>
                        </select>
                        {/* Custom Arrow to match design */}
                        <div className={`pointer-events-none absolute right-2 text-[8px] ${autoSnapInterval ? 'text-white/80' : 'text-slate-400'}`}>▼</div>
                    </div>

                    <div className="w-px h-4 bg-slate-200 mx-0.5"></div>

                    <button onClick={handleMic} className={`p-1.5 rounded-full transition-all ${isListening ? 'bg-red-50 text-red-500 ring-2 ring-red-100 animate-pulse' : 'bg-white border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200'}`} title="Dictate">
                        <Mic size={14} />
                    </button>

                    <button onClick={handleTimestamp} className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 transition-all" title="Timestamp">
                        <Clock size={14} />
                    </button>

                    <button onClick={() => exportToPDF("note-editor-content")} className="flex-none flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 border border-transparent hover:border-red-100 rounded-full text-[10px] font-semibold transition-all">
                        <FileText size={12} />
                        <span>PDF</span>
                    </button>
                </div>
            </div>

            {/* Editor Canvas */}
            < div className="flex-1 overflow-y-auto p-5" id="pdf-container" >
                <ContentEditable
                    id="note-editor-content"
                    innerRef={editorRef}
                    html={html}
                    disabled={false}
                    onChange={handleChange}
                    className="outline-none min-h-full prose prose-sm prose-slate max-w-none 
            prose-headings:font-bold prose-headings:text-slate-800 
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-sm"
                />
            </div >

        </div>



    );
}

export default NoteEditor;
