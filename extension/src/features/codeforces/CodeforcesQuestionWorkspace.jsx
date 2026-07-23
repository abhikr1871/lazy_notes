import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import AIExplainerView from '../../shared/components/AIExplainerView';
import { api } from '../../services/api';
import { ArrowLeft, Save, Code, FileText, CheckCircle, Play, ChevronDown, Terminal, Sparkles } from 'lucide-react';

function CodeforcesQuestionWorkspace({ question, onBack, initialTab = 'code', onRequireOrganization }) {
    const [code, setCode] = useState("");
    const [activeTab, setActiveTab] = useState(initialTab); // 'code', 'notes', or 'ai'
    const [status, setStatus] = useState("");
    const [language, setLanguage] = useState("cpp");
    const [stdinStr, setStdinStr] = useState("");
    const [compileOutput, setCompileOutput] = useState(null);
    const [isCompiling, setIsCompiling] = useState(false);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Storage keys
    const codeKey = `codeforces_code_${question.id}`;
    const noteKey = `codeforces_note_${question.id}`;

    const getProblemDetails = (url) => {
        try {
            const u = new URL(url);
            const path = u.pathname;
            const parts = path.split('/');
            let contestId = "";
            let index = "";

            if (path.includes('/contest/')) {
                const cIndex = parts.indexOf('contest');
                if (cIndex !== -1 && parts[cIndex + 1]) contestId = parts[cIndex + 1];
                const pIndex = parts.indexOf('problem');
                if (pIndex !== -1 && parts[pIndex + 1]) index = parts[pIndex + 1];
            } else if (path.includes('/problemset/problem/')) {
                const pIndex = parts.indexOf('problem');
                if (pIndex !== -1 && parts[pIndex + 1]) contestId = parts[pIndex + 1];
                if (pIndex !== -1 && parts[pIndex + 2]) index = parts[pIndex + 2];
            }

            const problemId = `${contestId}${index}`;
            return { contestId, index, problemId };
        } catch (e) {
            return { contestId: "", index: "", problemId: question.title.replace(/\s+/g, '') };
        }
    };

    const { contestId, index, problemId } = getProblemDetails(question.url);

    // Load Code AND Note
    useEffect(() => {
        const loadData = async () => {
            const localCode = localStorage.getItem(codeKey);
            if (localCode) setCode(localCode);

            try {
                if (problemId) {
                    const data = await api.codeforces.get(problemId);
                    if (data && data.found !== false) {
                        if (data.code_snippet) {
                            setCode(data.code_snippet);
                            localStorage.setItem(codeKey, data.code_snippet);
                        }
                        if (data.language) {
                            setLanguage(data.language);
                        }
                    }
                }
            } catch (e) {
                console.log("No cloud data found");
            }
        };
        loadData();
    }, [question.id, problemId]);

    const handleSaveCode = async () => {
        setStatus("Saving...");
        try {
            if (!question.id || !question.title) {
                console.error("Missing question data");
                return;
            }

            const currentNote = localStorage.getItem(noteKey) || "";

            const payload = {
                problem_id: problemId,
                contest_id: contestId,
                title: question.title,
                subtopics: [],
                note_content: currentNote,
                code_snippet: code,
                language: language,
                images: []
            };

            await api.codeforces.save(payload);

            localStorage.setItem(codeKey, code);
            setStatus("Saved!");
            setTimeout(() => {
                setStatus("");
                if (onRequireOrganization) {
                    onRequireOrganization();
                }
            }, 800);
        } catch (e) {
            console.error("Save failed", e);
            setStatus("Error saving");
        }
    };

    const handleSaveNote = async (noteContent) => {
        try {
            const payload = {
                problem_id: problemId,
                contest_id: contestId,
                title: question.title,
                subtopics: [],
                note_content: noteContent,
                code_snippet: code,
                language: language,
                images: []
            };
            await api.codeforces.save(payload);

            setStatus("Notes Saved!");
            setTimeout(() => {
                setStatus("");
            }, 800);

            return true;
        } catch (e) {
            console.error("Note save failed", e);
            throw e;
        }
    };

    const handleRunCode = async () => {
        setIsCompiling(true);
        setCompileOutput({ type: 'loading', message: 'Compiling and Running...' });
        try {
            const data = await api.compile.run(code, language, stdinStr);
            setCompileOutput({ type: 'success', data: data });
        } catch (e) {
            setCompileOutput({ type: 'error', message: e.message || "Failed to compile" });
        } finally {
            setIsCompiling(false);
        }
    };

    const handleLoadNote = async () => {
        try {
            const data = await api.codeforces.get(problemId);
            return data.note_content;
        } catch (e) {
            return null;
        }
    };

    const handleAppendAIToNotes = async (htmlContent) => {
        const existing = localStorage.getItem(noteKey) || "";
        const updated = existing + htmlContent;
        localStorage.setItem(noteKey, updated);
        await handleSaveNote(updated);
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
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5 truncate">{question.difficulty} • Codeforces</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-emerald-600 animate-fade-in">{status}</span>
                    {activeTab === 'code' && (
                        <div className="relative group/lang cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5">
                            <span className="uppercase">{language}</span>
                            <ChevronDown size={14} />
                            <div className="absolute right-0 top-full pt-1 hidden group-hover/lang:block z-50 w-32">
                                <div className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 overflow-hidden">
                                    {['cpp', 'python', 'java', 'js'].map(lang => (
                                        <div
                                            key={lang}
                                            onClick={(e) => { e.stopPropagation(); setLanguage(lang); }}
                                            className="px-4 py-2 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase cursor-pointer"
                                        >
                                            {lang}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'code' && (
                        <button
                            onClick={handleRunCode}
                            disabled={isCompiling}
                            className={`bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-emerald-100 shadow-md flex items-center gap-1.5 ${isCompiling ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isCompiling ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={14} className="fill-white" />}
                            <span>Run</span>
                        </button>
                    )}
                    <button
                        onClick={handleSaveCode}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-indigo-100 shadow-md flex items-center gap-1.5"
                    >
                        <Save size={14} />
                        <span>Save</span>
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex px-4 pt-4 gap-2 shrink-0 bg-slate-50 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-bold transition-all ${activeTab === 'code' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <Code size={15} strokeWidth={2.5} />
                    Code Solution
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-indigo-600 shadow-sm border-t border-x border-slate-200' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                    <FileText size={15} strokeWidth={2.5} />
                    Special Notes
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all ${activeTab === 'ai' ? 'bg-indigo-900 text-purple-200 shadow-sm border-t border-x border-indigo-800' : 'text-purple-600 hover:text-purple-700 bg-purple-50/50'}`}
                >
                    <Sparkles size={14} className="text-purple-400" />
                    AI Explainer
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative bg-white border-t border-slate-200">
                {activeTab === 'code' ? (
                    <div className="h-full flex flex-col relative">
                        {/* Editor Section */}
                        <div className="flex-[3] relative border-b border-slate-700 min-h-[30vh]">
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder={`// Write your ${language.toUpperCase()} solution here...`}
                                className="w-full h-full p-6 font-mono text-sm text-slate-200 bg-slate-950 resize-none outline-none focus:bg-slate-900 transition-colors"
                                spellCheck="false"
                            />
                            <div className="absolute bottom-2 right-4 text-[10px] text-slate-400 font-mono bg-slate-900/80 backdrop-blur px-2 py-1 rounded border border-slate-700 shadow-sm pointer-events-none">
                                {code.length} chars
                            </div>
                        </div>

                        {/* Split Run Window (Stdin + Stdout) */}
                        <div className="flex-[2] bg-slate-50 flex flex-col overflow-hidden min-h-[25vh]">
                            <div className="flex-1 flex overflow-hidden">
                                {/* Stdin */}
                                <div className="w-1/3 border-r border-slate-200 flex flex-col">
                                    <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase flex items-center gap-2 shrink-0">
                                        <FileText size={12} /> Custom Input
                                    </div>
                                    <textarea
                                        value={stdinStr}
                                        onChange={(e) => setStdinStr(e.target.value)}
                                        placeholder="Input for stdin..."
                                        className="flex-1 w-full bg-slate-50 p-3 text-xs font-mono text-slate-700 outline-none resize-none"
                                        spellCheck="false"
                                    />
                                </div>

                                {/* Stdout / Compile Result */}
                                <div className="w-2/3 flex flex-col bg-slate-900 text-slate-300">
                                    <div className="bg-slate-800 px-3 py-1.5 border-b border-slate-700 text-xs font-bold text-slate-400 uppercase flex items-center gap-2 shrink-0">
                                        <Terminal size={12} /> Output Console
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 text-xs font-mono whitespace-pre-wrap">
                                        {!compileOutput ? (
                                            <span className="text-slate-600 italic">Run your code to see output...</span>
                                        ) : compileOutput.type === 'loading' ? (
                                            <span className="text-yellow-400 animate-pulse">{compileOutput.message}</span>
                                        ) : compileOutput.type === 'error' ? (
                                            <span className="text-red-400">{compileOutput.message}</span>
                                        ) : compileOutput.type === 'success' ? (
                                            <>
                                                {compileOutput.data.compile && compileOutput.data.compile.output && (
                                                    <div className="mb-2 pb-2 border-b border-slate-700/50">
                                                        <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">Compiler Log</div>
                                                        <div className="text-amber-200/90">{compileOutput.data.compile.output}</div>
                                                    </div>
                                                )}
                                                {compileOutput.data.run && compileOutput.data.run.stderr && (
                                                    <div className="mb-2 pb-2 border-b border-slate-700/50">
                                                        <div className="text-[10px] text-red-500/70 mb-1 uppercase tracking-wider font-bold">Standard Error</div>
                                                        <div className="text-red-400">{compileOutput.data.run.stderr}</div>
                                                    </div>
                                                )}
                                                {compileOutput.data.run && compileOutput.data.run.stdout ? (
                                                    <div className="text-emerald-400">{compileOutput.data.run.stdout}</div>
                                                ) : (
                                                    <span className="text-slate-500 italic">Program finished successfully with no output.</span>
                                                )}
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'notes' ? (
                    <SmartEditor
                        storageKey={noteKey}
                        simpleMode={true}
                        placeholder="Write your logic, complexity analysis, or special notes here..."
                        onSave={handleSaveNote}
                        onLoad={handleLoadNote}
                    />
                ) : (
                    <AIExplainerView
                        title={question.title}
                        platform="Codeforces"
                        currentCode={code}
                        language={language}
                        noteKey={noteKey}
                        onAppendToNotes={handleAppendAIToNotes}
                    />
                )}
            </div>
        </div>
    );
}

export default CodeforcesQuestionWorkspace;
