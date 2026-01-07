import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, LogOut, User, UserPlus
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

    const handleSnap = async () => {
        try {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) return;
                chrome.tabs.sendMessage(tabs[0].id, { action: "captureVideoFrame" }, async (response) => {
                    if (chrome.runtime.lastError || !response || !response.success) {
                        console.log("Video capture failed, fallback to tab.");
                        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
                        const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" /><br/>`;
                        setHtml(prev => prev + imgTag);
                    } else {
                        const { imageData, time } = response;
                        const content = `<br/><div style="color: #6366f1; font-weight: bold;">⏱️ ${time}</div><img src="${imageData}" style="max-width: 100%; border-radius: 12px; margin: 5px 0 15px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" /><br/>`;
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
            className={`p-2 rounded-lg transition-all duration-200 ${active ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-500'}`}
        >
            <Icon size={18} strokeWidth={2} />
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-display selection:bg-indigo-100 text-slate-700">
            {/* Brand Header */}
            <header className="bg-white/90 backdrop-blur-md px-5 py-3 border-b border-purple-50 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-50">
                <div className="flex items-center space-x-3.5 group cursor-pointer" onClick={handleLogoClick}>
                    <div className="relative">
                        <div className={`absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75 scale-110' : 'group-hover:opacity-50'}`}></div>
                        <img
                            src="icons/icon48.png"
                            alt="Logo"
                            className={`relative w-10 h-10 rounded-xl shadow-sm transition-all duration-[1500ms] ease-in-out ${isAnimating ? 'scale-125 rotate-[1080deg]' : 'group-hover:scale-105'}`}
                        />
                    </div>
                    <div>
                        <h1 className="font-black text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 drop-shadow-sm">
                            Lazzy AI
                        </h1>
                        <div className="flex items-center space-x-1">
                            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase pl-0.5">COMPANION</p>
                            <div className={`w-1.5 h-1.5 rounded-full bg-violet-500 ${isAnimating ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.6s' }}></div>
                            <div className={`w-1.5 h-1.5 rounded-full bg-pink-500 ${isAnimating ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.7s', animationDelay: '0.1s' }}></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <span className="text-xs text-indigo-600 font-medium mr-2 animate-fade-in">{status}</span>

                    {/* Auth Buttons */}
                    {isAuthenticated ? (
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    ) : (
                        <div className="flex items-center space-x-1">
                            <button onClick={() => navigate('/login')} className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-slate-200">
                                <User size={14} />
                                <span className="hidden sm:inline">Login</span>
                            </button>
                            <button onClick={() => navigate('/signup')} className="flex items-center space-x-1 px-2.5 py-1.5 bg-pink-500 text-white hover:bg-pink-600 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-pink-200">
                                <UserPlus size={14} />
                            </button>
                        </div>
                    )}

                    <div className="w-px h-5 bg-slate-200 mx-1"></div>

                    <button onClick={handleSave} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Save size={18} />
                    </button>
                    <button onClick={() => chrome.runtime.openOptionsPage()} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            {/* Modern Toolbar */}
            <div className="bg-white/80 backdrop-blur-sm px-3 py-2 border-b border-slate-100 flex flex-col gap-2 shrink-0 z-10">
                {/* Row 1: Main Formatting */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-0.5">
                        <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H1')} icon={Heading1} title="H1" />
                        <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H2')} icon={Heading2} title="H2" />
                        <div className="w-px h-5 bg-slate-200 mx-2"></div>
                        <ToolbarBtn onClick={() => executeCommand('bold')} icon={Bold} title="Bold" />
                        <ToolbarBtn onClick={() => executeCommand('italic')} icon={Italic} title="Italic" />
                        <ToolbarBtn onClick={() => executeCommand('underline')} icon={Underline} title="Underline" />
                        <div className="w-px h-5 bg-slate-200 mx-2"></div>
                        <ToolbarBtn onClick={() => executeCommand('insertUnorderedList')} icon={List} title="List" />
                        <ToolbarBtn onClick={handleLink} icon={LinkIcon} title="Link" />
                    </div>

                    <button onClick={() => exportToPDF("note-editor-content")} className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 border border-transparent hover:border-red-100 rounded-full text-xs font-semibold transition-all">
                        <FileText size={14} />
                        <span>PDF</span>
                    </button>
                </div>

                {/* Row 2: Smart Tools */}
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pt-1">
                    <button onClick={handleSnap} className="flex-none flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                        <Camera size={14} />
                        <span>Snap Frame</span>
                    </button>

                    <button onClick={() => setAutoSnap(!autoSnap)} className={`flex-none flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${autoSnap ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                        <Film size={14} />
                        <span>AutoSnap</span>
                    </button>

                    <div className="w-px h-5 bg-slate-200 mx-1"></div>

                    <button onClick={handleMic} className={`p-2 rounded-full transition-all ${isListening ? 'bg-red-50 text-red-500 ring-2 ring-red-100 animate-pulse' : 'bg-white border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200'}`} title="Dictate">
                        <Mic size={16} />
                    </button>

                    <button onClick={handleTimestamp} className="p-2 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 transition-all" title="Timestamp">
                        <Clock size={16} />
                    </button>
                </div>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-5" id="pdf-container">
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
            </div>

            {/* Floating Ask AI Button (Bottom) */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] z-20">
                <button className="w-full group relative flex items-center justify-center space-x-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-lg shadow-slate-200/50 transition-all hover:-translate-y-0.5 active:translate-y-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-30 blur-md transition-opacity"></div>
                    <span className="text-lg">✨</span>
                    <span className="font-bold text-sm tracking-wide">Ask AI about this page</span>
                </button>
            </div>
        </div>
    );
}

export default NoteEditor;
