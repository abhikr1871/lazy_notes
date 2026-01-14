import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, ArrowLeft, Trash2
} from 'lucide-react';
import { exportToPDF } from '../../../utils/pdf';

function NoteEditor({ storageKey = 'lazyyNotesContent', onBack, simpleMode = false }) {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const editorRef = useRef(null);

    // Load saved notes
    useEffect(() => {
        chrome.storage.local.get([storageKey], (result) => {
            if (result[storageKey]) {
                setHtml(result[storageKey]);
            } else {
                if (simpleMode) setHtml(""); // Start empty for simplified view
                else setHtml("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
            }
        });
    }, [storageKey, simpleMode]);

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
        chrome.storage.local.set({ [storageKey]: html }, () => {
            if (!simpleMode) {
                setStatus("Saved!");
                setTimeout(() => setStatus(""), 2000);
            }
        });
    };

    const handleClear = () => {
        if (confirm("Are you sure you want to clear your logic?")) {
            setHtml("");
            setStatus("Cleared");
            setTimeout(() => setStatus(""), 2000);
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

    const handleContainerClick = (e) => {
        // If clicking the container background (not the content itself)
        // We check if the click target is the container div
        if (e.target === e.currentTarget || e.target.id === 'editor-wrapper') {
            if (editorRef.current) {
                const lastElement = editorRef.current.lastElementChild;
                // If the user deleted the trailing newline after an image, we add it back
                // We check for IMG tag specifically
                if (lastElement && lastElement.tagName === 'IMG') {
                    setHtml(prev => prev + "<p><br/></p>");
                    // Wait for state update and render
                    setTimeout(moveCursorToEnd, 0);
                } else {
                    moveCursorToEnd();
                }
            }
        }
    };

    const handleLogoClick = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000); // 1s animation
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
            <Icon size={16} strokeWidth={2} />
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-display selection:bg-indigo-100 text-slate-700 overflow-hidden relative">
            {/* Brand Header - HIDDEN IN SIMPLE MODE */}
            {!simpleMode && (
                <header className="bg-white/90 backdrop-blur-md px-4 py-2 border-b border-purple-50 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-50">
                    <div className="flex items-center space-x-3 group cursor-pointer" onClick={handleLogoClick}>
                        {onBack && (
                            <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-indigo-600 transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="relative">
                            <div className={`absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-2xl blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75 scale-110' : 'group-hover:opacity-50'}`}></div>
                            <img
                                src="../icons/icon48.png"
                                alt="Logo"
                                className={`relative w-8 h-8 rounded-lg shadow-sm transition-all duration-1000 ease-in-out ${isAnimating ? 'scale-125 rotate-[1080deg]' : 'group-hover:scale-105'}`}
                                onError={(e) => {
                                    e.target.src = "icons/icon48.png";
                                }}
                            />
                        </div>
                        <div>
                            <h1 className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-500 drop-shadow-sm">
                                Lazzy
                            </h1>
                            <div className="flex items-center space-x-1">
                                <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase pl-0.5">AI Companion</p>
                                <div className={`w-1 h-1 rounded-full bg-violet-500 ${isAnimating ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.6s' }}></div>
                                <div className={`w-1 h-1 rounded-full bg-pink-500 ${isAnimating ? 'animate-bounce' : ''}`} style={{ animationDuration: '0.7s', animationDelay: '0.1s' }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-0.5">
                        <span className="text-[10px] text-indigo-600 font-medium mr-1 animate-fade-in">{status}</span>

                        <button onClick={() => exportToPDF("note-editor-content")} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Export to PDF">
                            <FileText size={16} />
                        </button>

                        <button onClick={handleSave} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Save Notes">
                            <Save size={16} />
                        </button>

                        {!onBack && (
                            <button onClick={() => chrome.runtime.openOptionsPage()} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Settings">
                                <Settings size={16} />
                            </button>
                        )}
                    </div>
                </header>
            )}

            {simpleMode && (
                <div className="absolute top-4 right-6 z-50 flex items-center gap-3">
                    {status && (
                        <span className="text-[10px] text-indigo-600 font-bold bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm animate-fade-in select-none border border-indigo-50">
                            {status}
                        </span>
                    )}
                    <button
                        onClick={handleClear}
                        className="p-2 bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 active:scale-90 border border-slate-100"
                        title="Clear Note"
                    >
                        <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                </div>
            )}

            {/* Modern Toolbar - HIDDEN IN SIMPLE MODE */}
            {!simpleMode && (
                <div className={`bg-white/80 backdrop-blur-sm px-2 py-1 border-b border-slate-100 flex flex-col gap-1 shrink-0 z-10 ${simpleMode ? 'bg-slate-50' : ''}`}>
                    {/* Row 1: Extensive Formatting */}
                    <div className="flex items-center justify-between overflow-x-auto scrollbar-hide pb-0.5 gap-1">

                        {/* Show Status in Simple Mode - REMOVED duplicated status */}

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

                        {/* Simple Mode: Only show subscript/superscript if needed? Let's keep them */}
                        <button onClick={() => executeCommand('subscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Subscript">x₂</button>
                        <button onClick={() => executeCommand('superscript')} className="p-1 text-slate-500 hover:text-indigo-600 font-serif text-xs" title="Superscript">x²</button>
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
                        </div>
                    )}
                </div>
            )}

            {/* Editor Canvas */}
            <div className={`flex-1 overflow-y-auto p-5 ${simpleMode ? 'bg-slate-50/50' : ''}`} id="pdf-container">
                <div
                    id="editor-wrapper"
                    onClick={handleContainerClick}
                    className={simpleMode ? "w-full mx-auto bg-white rounded-[1.5rem] shadow-xl shadow-indigo-100/40 border-2 border-indigo-100 min-h-full p-8 relative transition-all duration-500 hover:border-indigo-200 cursor-text" : "h-full"}
                >

                    {/* Premium Placeholder for Simple Mode */}
                    {simpleMode && (!html || html === '<br>' || html === '') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none space-y-6 font-display text-center opacity-80">
                            <h2 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-200 to-slate-300">
                                Write your logic here...
                            </h2>
                            <div className="flex items-center gap-3 text-slate-400 font-medium bg-slate-50/50 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-100/50 shadow-sm">
                                <div className="p-1.5 bg-white rounded-full shadow-sm text-indigo-400">
                                    <ImageIcon size={18} strokeWidth={2.5} />
                                </div>
                                <span className="text-base tracking-wide text-slate-400">Drag & drop images or animations</span>
                            </div>
                        </div>
                    )}

                    <ContentEditable
                        id="note-editor-content"
                        innerRef={editorRef}
                        html={html}
                        disabled={false}
                        onChange={handleChange}
                        className={`outline-none min-h-full prose prose-sm prose-slate max-w-none 
                prose-headings:font-bold prose-headings:text-slate-800 
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-xl prose-img:shadow-sm ${simpleMode ? 'text-lg text-slate-600' : ''}`}
                    />
                </div>
            </div>

        </div>
    );
}



export default NoteEditor;
