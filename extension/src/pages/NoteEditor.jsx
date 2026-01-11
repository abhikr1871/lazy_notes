import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, LogOut
} from 'lucide-react';
import { exportToPDF } from '../../utils/pdf';
import { useNavigate } from 'react-router-dom';

function NoteEditor({ storageKey = 'lazyyNotesContent', onBack, placeholder, simpleMode = false }) {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
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
                // If simpleMode/placeholder is present and no saved content, use placeholder or empty (for custom placeholder via css)
                // Actually sticking to default behavior but maybe clearing if simpleMode?
                if (simpleMode) setHtml("");
            }
        });

        // 2. Try Cloud Load (If authenticated and using a specific key)
        if (token && storageKey !== 'lazyyNotesContent') {
            fetch(`http://localhost:8000/notes/${storageKey}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.content) {
                        setHtml(data.content);
                        // Update local cache
                        chrome.storage.local.set({ [storageKey]: data.content });
                    }
                })
                .catch(err => console.error("Cloud note fetch error:", err));
        }

    }, [storageKey, simpleMode]); // Added simpleMode dep

    // Auto-Save Effect for Simple Mode
    useEffect(() => {
        if (!simpleMode) return;

        const timer = setTimeout(() => {
            handleSave();
        }, 1000); // 1-second debounce

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

    const handleSave = () => {
        // Save Local
        chrome.storage.local.set({ [storageKey]: html }, () => {
            if (!simpleMode) { // Only show status flash in normal mode (simple mode shows quiet state?)
                setStatus("Saved!");
                setTimeout(() => setStatus(""), 2000);
            }
        });

        // Save Cloud
        const token = localStorage.getItem('token');
        if (token && storageKey !== 'lazyyNotesContent') {
            fetch('http://localhost:8000/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ note_id: storageKey, content: html })
            })
                .then(res => {
                    // Silent success for cloud
                })
                .catch(err => console.error("Cloud save error:", err));
        }
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

    const handleImageUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            if (!simpleMode) setStatus("Uploading image...");
            const response = await fetch('http://localhost:8000/upload/image', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
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
            className="h-full flex flex-col bg-slate-50/50 font-display selection:bg-indigo-100 text-slate-700"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Brand Header - HIDDEN IN SIMPLE MODE */}
            {!simpleMode && (
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
                                <button onClick={() => navigate('/login')} className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-slate-200">
                                    Login
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
                </header >
            )}

            {/* Modern Toolbar */}
            <div className={`bg-white/80 backdrop-blur-sm px-2 py-1 border-b border-slate-100 flex flex-col gap-1 shrink-0 z-10 ${simpleMode ? 'bg-slate-50' : ''}`}>
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

                    {!simpleMode && (
                        <>
                            <button onClick={() => executeCommand('subscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Subscript">x₂</button>
                            <button onClick={() => executeCommand('superscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Superscript">x²</button>
                        </>
                    )}


                </div>


                {/* Row 2: Smart Tools - HIDDEN IN SIMPLE MODE */}
                {!simpleMode && (
                    <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pt-1">
                        <button onClick={handleSnap} className="flex-none flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full text-[10px] font-bold shadow-md shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                            <Camera size={12} />
                            <span>Snap Frame</span>
                        </button>

                        <button onClick={() => setAutoSnap(!autoSnap)} className={`flex-none flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-[10px] font-semibold border transition-all ${autoSnap ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                            <Film size={12} />
                            <span>AutoSnap</span>
                        </button>

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
                )}
            </div>

            {/* Editor Canvas */}
            < div className="flex-1 overflow-y-auto p-5" id="pdf-container" >
                <ContentEditable
                    id="note-editor-content"
                    innerRef={editorRef}
                    html={html}
                    disabled={false}
                    onChange={handleChange}
                    onPaste={handlePaste}
                    placeholder={placeholder}
                    className="outline-none min-h-full prose prose-sm prose-slate max-w-none 
            prose-headings:font-bold prose-headings:text-slate-800 
            prose-p:text-slate-600 prose-p:leading-relaxed
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
            prose-img:rounded-xl prose-img:shadow-sm"
                />
            </div >


        </div >
    );
}

export default NoteEditor;
