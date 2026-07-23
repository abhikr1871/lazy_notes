import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import AIExplainerView from '../../shared/components/AIExplainerView';
import { api } from '../../services/api';
import { ArrowLeft, Save, Code, FileText, CheckCircle, Sparkles } from 'lucide-react';

export default function GFGQuestionWorkspace({ question, onBack, initialTab = 'code' }) {
    const [code, setCode] = useState("");
    const [activeTab, setActiveTab] = useState(initialTab);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const qId = question.id || question.title.toLowerCase().replace(/\s+/g, '-');
    const codeKey = `gfg_code_${qId}`;
    const noteKey = `gfg_note_${qId}`;

    useEffect(() => {
        const loadData = async () => {
            const localCode = localStorage.getItem(codeKey);
            if (localCode) setCode(localCode);

            try {
                const slug = question.url ? question.url.split('/problems/')[1]?.split('/')[0] : qId;
                const data = await api.gfg.get(slug);

                if (data && data.found !== false) {
                    if (data.code_snippet) {
                        setCode(data.code_snippet);
                        localStorage.setItem(codeKey, data.code_snippet);
                    }
                }
            } catch (e) {
                console.log("No GFG cloud data found");
            }
        };
        loadData();
    }, [qId]);

    const handleSaveCode = async () => {
        setStatus("Saving...");
        try {
            localStorage.setItem(codeKey, code);
            const slug = question.url ? question.url.split('/problems/')[1]?.split('/')[0] : qId;
            const currentNote = localStorage.getItem(noteKey) || "";

            await api.gfg.save({
                problem_slug: slug,
                title: question.title,
                subtopics: question.subtopics || [],
                note_content: currentNote,
                code_snippet: code,
                language: "python"
            });

            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        } catch (e) {
            console.error("Save code failed:", e);
            setStatus("Save error");
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
            {/* Header */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="font-bold text-sm text-slate-800 line-clamp-1">{question.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                GFG • {question.difficulty || 'Medium'}
                            </span>
                            {status && (
                                <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
                                    <CheckCircle size={10} /> {status}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            activeTab === 'code' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Code size={14} /> Code
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            activeTab === 'notes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <FileText size={14} /> Notes
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            activeTab === 'ai' ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles size={14} /> AI
                    </button>
                </div>
            </header>

            {/* Content View */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'code' && (
                    <div className="h-full flex flex-col p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Solution Snippet (Python / C++)</span>
                            <button
                                onClick={handleSaveCode}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                            >
                                <Save size={14} /> Save Code
                            </button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Paste or write your GeeksforGeeks solution code here..."
                            className="flex-1 w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none resize-none shadow-inner"
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <SmartEditor questionId={qId} platform="gfg" />
                )}

                {activeTab === 'ai' && (
                    <AIExplainerView question={question} platform="gfg" />
                )}
            </div>
        </div>
    );
}
