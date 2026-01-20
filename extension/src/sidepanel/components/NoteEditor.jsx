import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film, Moon, Sun, ArrowLeft, X
} from 'lucide-react';
import { exportToPDF } from '../../../utils/pdf';

function NoteEditor({ storageKey = 'lazyyNotesContent', onBack }) {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const editorRef = useRef(null);
    const recognitionRef = useRef(null);

    // Load saved notes
    useEffect(() => {
        chrome.storage.local.get([storageKey], (result) => {
            if (result[storageKey]) {
                setHtml(result[storageKey]);
            } else {
                // Reset to default if new key has no content, or keep existing state if switching keys?
                // Better to check if we switched keys. For now, simple load is fine.
                // But if we switch topics, we want to clear previous content if new one is empty?
                // Ideally, if result is empty, set default.
                setHtml("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
            }
        });
    }, [storageKey]);

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
            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        });
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
            alert("Speech recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            // Stop Listening
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                setIsListening(false);
            }
        } else {
            // Start Listening
            try {
                const recognition = new window.webkitSpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognitionRef.current = recognition;

                recognition.onstart = () => {
                    console.log("Voice recognition started");
                    setIsListening(true);
                };

                recognition.onend = () => {
                    console.log("Voice recognition ended");
                    setIsListening(false);
                };

                recognition.onresult = (event) => {
                    let transcript = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        transcript += event.results[i][0].transcript;
                    }
                    if (transcript) {
                        // Append text with a space
                        setHtml(prev => prev + " " + transcript);
                    }
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === 'not-allowed') {
                        alert("Microphone access denied. Please allow microphone access.");
                    } else {
                        console.log("Speech recognition error: " + event.error);
                    }
                    setIsListening(false);
                };

                recognition.start();
            } catch (err) {
                console.error("Error starting speech recognition:", err);
                alert("Error starting speech recognition.");
            }
        }
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

        <div className="h-full w-full bg-slate-50 relative flex flex-col">
            {/* Header */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0 shadow-sm z-50">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={handleLogoClick}>
                    {onBack && (
                        <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="mr-1 p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-indigo-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <div className="relative">
                        <img
                            src="../icons/icon48.png"
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
                    <span className="text-[10px] text-indigo-600 font-medium mr-2">{status}</span>

                    <button onClick={() => exportToPDF("note-editor-content")} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Export to PDF">
                        <FileText size={18} />
                    </button>

                    <button onClick={handleSave} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Save Notes">
                        <Save size={18} />
                    </button>

                    {!onBack && (
                        <button onClick={() => chrome.runtime.openOptionsPage()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Settings">
                            <Settings size={18} />
                        </button>
                    )}
                    {/* Close Button - Fixed & High Z-Index */}
                    <button
                        onClick={() => window.close()}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                        title="Close Panel"
                    >
                        <X size={20} />
                    </button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white px-2 py-2 border-b border-slate-200 flex flex-col gap-2 shrink-0 z-40">
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
        </div>

    );
}

export default NoteEditor;
