import React, { useState, useRef, useEffect } from 'react';
import ContentEditable from 'react-contenteditable';
import {
    Settings, Save, Bold, Italic, Underline, List,
    Heading1, Heading2, Link as LinkIcon, Image as ImageIcon,
    Type, AlignLeft, Camera, FileText, Mic, Clock, Film
} from 'lucide-react';
import { exportToPDF } from '../../utils/pdf';

function App() {
    const [html, setHtml] = useState("<h1>Enter Title</h1><p>Start typing your notes here...</p>");
    const [status, setStatus] = useState("");
    const [isListening, setIsListening] = useState(false);
    const editorRef = useRef(null);

    // Load saved notes
    useEffect(() => {
        chrome.storage.local.get(['intelliAskNote'], (result) => {
            if (result.intelliAskNote) {
                setHtml(result.intelliAskNote);
            }
        });
    }, []);

    const handleChange = (evt) => {
        setHtml(evt.target.value);
    };

    const executeCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) editorRef.current.focus();
    };

    const handleSave = () => {
        chrome.storage.local.set({ intelliAskNote: html }, () => {
            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        });
    };

    const handleSnap = async () => {
        try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
            const imgTag = `<br/><img src="${dataUrl}" style="max-width: 100%; border-radius: 8px; margin: 10px 0;" /><br/>`;
            setHtml(prev => prev + imgTag);
        } catch (err) {
            console.error("Snapshot failed usage:", err);
            // Fallback: Ask content script to capture if we are in iframe
            chrome.runtime.sendMessage({ action: "requestSnapshot" });
        }
    };

    // Mock AutoSnap (just a toggle for now)
    const [autoSnap, setAutoSnap] = useState(false);

    const handleLink = () => {
        const url = prompt("Enter URL:");
        if (url) executeCommand("createLink", url);
    };

    const handleMic = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this environment.");
            return;
        }

        if (isListening) {
            // Stop logic handled by "end" event usually, but here we toggle
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
        // Send message to content script to get video time
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "getVideoTime" }, (response) => {
                    if (response && response.time) {
                        const timeStr = `<b>[${response.time}]</b> `;
                        setHtml(prev => prev + timeStr);
                    }
                });
            }
        });
    };

    // Setup toolbar groups
    const ToolbarBtn = ({ onClick, icon: Icon, title, active }) => (
        <button
            onClick={onClick}
            title={title}
            className={`p-1.5 rounded transition-colors ${active ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}
        >
            <Icon size={16} />
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-white p-2 border-b border-slate-200 flex justify-between items-center shadow-sm shrink-0">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-yellow-400 rounded-md flex items-center justify-center font-bold text-white text-xs">IA</div>
                    <span className="font-bold text-slate-800">IntelliAsk AI</span>
                </div>
                <div className="flex space-x-1 items-center">
                    <span className="text-xs text-green-600 font-medium mr-2">{status}</span>
                    <ToolbarBtn onClick={handleSave} icon={Save} title="Save" />
                    <ToolbarBtn onClick={() => chrome.runtime.openOptionsPage()} icon={Settings} title="Settings" />
                </div>
            </header>

            {/* Toolbar Row 1: Formatting */}
            <div className="bg-white px-2 py-1 border-b border-slate-100 flex items-center space-x-1 overflow-x-auto scrollbar-hide shrink-0">
                <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H1')} icon={Heading1} title="Heading 1" />
                <ToolbarBtn onClick={() => executeCommand('formatBlock', 'H2')} icon={Heading2} title="Heading 2" />
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <ToolbarBtn onClick={() => executeCommand('bold')} icon={Bold} title="Bold" />
                <ToolbarBtn onClick={() => executeCommand('underline')} icon={Underline} title="Underline" />
                <ToolbarBtn onClick={() => executeCommand('italic')} icon={Italic} title="Italic" />
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <ToolbarBtn onClick={() => executeCommand('insertUnorderedList')} icon={List} title="Bullet List" />
                <ToolbarBtn onClick={() => executeCommand('insertOrderedList')} icon={AlignLeft} title="Numbered List" />
                <div className="w-px h-4 bg-slate-200 mx-1"></div>
                <ToolbarBtn onClick={handleLink} icon={LinkIcon} title="Link" />
                <div className="flex-1"></div>
                <button onClick={() => exportToPDF("note-editor-content")} className="flex items-center space-x-1 px-2 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-full text-xs font-medium transition-colors">
                    <FileText size={12} className="text-red-500" />
                    <span>PDF</span>
                </button>
                <button onClick={handleSave} className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium transition-colors">
                    <span>Save</span>
                </button>
            </div>

            {/* Toolbar Row 2: Tools */}
            <div className="bg-slate-50 px-2 py-2 border-b border-slate-200 flex items-center space-x-2 overflow-x-auto scrollbar-hide shrink-0">
                <button onClick={handleSnap} className="flex items-center space-x-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-medium transition-colors shadow-sm">
                    <Camera size={14} />
                    <span>Snap</span>
                </button>

                <button onClick={() => setAutoSnap(!autoSnap)} className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${autoSnap ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}>
                    <Film size={14} />
                    <span>AutoSnap</span>
                </button>

                <button className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-full text-xs font-medium shadow-sm">
                    <FileText size={14} />
                    <span>Note</span>
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1"></div>

                <button onClick={handleMic} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-white hover:bg-slate-100 text-slate-600 shadow-sm'}`} title="Dictate">
                    <Mic size={16} />
                </button>

                <button onClick={handleTimestamp} className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-full shadow-sm transition-colors" title="Insert Timestamp">
                    <Clock size={16} />
                </button>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-y-auto p-4 bg-white" id="pdf-container">
                <ContentEditable
                    id="note-editor-content"
                    innerRef={editorRef}
                    html={html}
                    disabled={false}
                    onChange={handleChange}
                    className="outline-none min-h-full prose prose-sm max-w-none text-slate-700 placeholder-slate-400"
                />
            </div>

            {/* Ask AI Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <button className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl shadow-md hover:shadow-lg hover:opacity-95 transition-all font-bold text-sm">
                    <span>✨ Ask AI about this page</span>
                </button>
            </div>
        </div>
    );
}

export default App;
