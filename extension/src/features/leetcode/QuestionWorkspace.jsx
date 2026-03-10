import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';
import { ArrowLeft, Save, Code, FileText, CheckCircle } from 'lucide-react';

function QuestionWorkspace({ question, onBack }) {
    const [code, setCode] = useState("");
    const [activeTab, setActiveTab] = useState('code'); // 'code' or 'notes'
    const [status, setStatus] = useState("");

    // Storage keys
    const codeKey = `leetcode_code_${question.id}`;
    const noteKey = `leetcode_note_${question.id}`;

    // Load Code AND Note
    useEffect(() => {
        const loadData = async () => {
            // 1. Try Local Code
            const localCode = localStorage.getItem(codeKey);
            if (localCode) setCode(localCode);

            // 2. Try Cloud (Combined)
            try {
                // Use new LeetCode API to get both
                const slug = question.url ? question.url.split('/problems/')[1]?.split('/')[0] : question.title.toLowerCase().replace(/\s+/g, '-');
                const data = await api.leetcode.get(slug); // This returns the whole LeetCodeNote object

                if (data && data.found !== false) { // distinct from "found: false"
                    if (data.code_snippet) {
                        setCode(data.code_snippet);
                        localStorage.setItem(codeKey, data.code_snippet);
                    }
                    // Note content is loaded via SmartEditor's onLoad prop, 
                    // but we can also cache it here if needed? 
                    // Actually, we should just let SmartEditor call its onLoad if we provide it.
                    // BUT, we want to avoid double fetching. 
                    // Let's store the full data in a ref or state if we want to share?
                    // Simpler: Just let them fetch independently or rely on `api.leetcode.get` caching?
                    // No caching in api.js.
                    // Okay, let's implement handleLoadNote to use this same data if we fetched it, 
                    // or just fetch again. Fetching again is safer for now to avoid race conditions 
                    // with SmartEditor mounting.
                }
            } catch (e) {
                console.log("No cloud data found");
            }
        };
        loadData();
    }, [question.id]);

    const handleSaveCode = async () => {
        setStatus("Saving...");
        try {
            // Validate data
            if (!question.id || !question.title) {
                console.error("Missing question data");
                return;
            }

            const currentNote = localStorage.getItem(noteKey) || ""; // Fallback to local
            // Ideally we get the latest note content. 
            // If SmartEditor is active, it has the state. 
            // If not, localStorage is the best bet.

            const payload = {
                problem_slug: question.url ? question.url.split('/problems/')[1]?.split('/')[0] : question.title.toLowerCase().replace(/\s+/g, '-'),
                title: question.title,
                subtopics: [],
                note_content: currentNote,
                code_snippet: code,
                language: "python",
                images: []
            };

            await api.leetcode.save(payload);

            localStorage.setItem(codeKey, code);
            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        } catch (e) {
            console.error("Save failed", e);
            setStatus("Error saving");
        }
    };

    const handleSaveNote = async (noteContent) => {
        // When SmartEditor saves, we also want to preserve the current code.
        try {
            const payload = {
                problem_slug: question.url ? question.url.split('/problems/')[1]?.split('/')[0] : question.title.toLowerCase().replace(/\s+/g, '-'),
                title: question.title,
                subtopics: [],
                note_content: noteContent,
                code_snippet: code, // Use current state code
                language: "python",
                images: []
            };
            await api.leetcode.save(payload);
            return true;
        } catch (e) {
            console.error("Note save failed", e);
            throw e;
        }
    };

    const handleLoadNote = async () => {
        const slug = question.url ? question.url.split('/problems/')[1]?.split('/')[0] : question.title.toLowerCase().replace(/\s+/g, '-');
        try {
            const data = await api.leetcode.get(slug);
            return data.note_content;
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
            {/* Header */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-3 overflow-hidden">
                    <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="min-w-0">
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none truncate">{question.title}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5 truncate">{question.difficulty} • Question Workspace</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 animate-fade-in">{status}</span>
                    <button
                        onClick={handleSaveCode}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-indigo-100 shadow-md flex items-center gap-1.5"
                    >
                        <Save size={14} />
                        <span>Save Code</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex px-4 pt-4 gap-4 shrink-0 bg-slate-50">
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'code' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Code size={16} strokeWidth={2.5} />
                    Code Solution
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <FileText size={16} strokeWidth={2.5} />
                    Special Notes
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white border-t border-slate-200">
                {activeTab === 'code' ? (
                    <div className="h-full flex flex-col relative">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Write your solution here..."
                            className="flex-1 w-full p-6 font-mono text-sm text-slate-800 bg-white resize-none outline-none focus:bg-slate-50/50 transition-colors"
                            spellCheck="false"
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] text-slate-400 font-mono bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-100">
                            {code.length} chars
                        </div>
                    </div>
                ) : (
                    <SmartEditor
                        storageKey={noteKey}
                        simpleMode={true}
                        placeholder="Write your logic, complexity analysis, or special notes here..."
                        onSave={handleSaveNote}
                        onLoad={handleLoadNote}
                    />
                )}
            </div>
        </div>
    );
}

export default QuestionWorkspace;
