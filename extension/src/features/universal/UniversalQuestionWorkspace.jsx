import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import AIExplainerView from '../../shared/components/AIExplainerView';
import { api } from '../../services/api';
import { ArrowLeft, Save, Code, FileText, CheckCircle, Sparkles } from 'lucide-react';

const PLATFORM_THEMES = {
    LeetCode: "bg-amber-100 text-amber-800 border-amber-200",
    Codeforces: "bg-blue-100 text-blue-800 border-blue-200",
    GeeksforGeeks: "bg-emerald-100 text-emerald-800 border-emerald-200",
    HackerRank: "bg-green-100 text-green-800 border-green-200",
    YouTube: "bg-rose-100 text-rose-800 border-rose-200",
    Default: "bg-indigo-100 text-indigo-800 border-indigo-200"
};

export default function UniversalQuestionWorkspace({ question, onBack, initialTab = 'code' }) {
    const [code, setCode] = useState("");
    const [activeTab, setActiveTab] = useState(initialTab);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const qId = question.id || question.title.toLowerCase().replace(/\s+/g, '-');
    const platform = question.platform || "LeetCode";
    const codeKey = `uni_code_${qId}`;
    const noteKey = `uni_note_${qId}`;

    useEffect(() => {
        const loadData = async () => {
            const localCode = localStorage.getItem(codeKey) || question.code || "";
            if (localCode) setCode(localCode);

            try {
                const data = await api.notes.get(qId);
                if (data && data.found !== false) {
                    if (data.code_snippet) {
                        setCode(data.code_snippet);
                        localStorage.setItem(codeKey, data.code_snippet);
                    }
                }
            } catch (e) {
                console.log("No cloud data found for universal note");
            }
        };
        loadData();
    }, [qId]);

    const handleSaveCode = async () => {
        setStatus("Saving...");
        try {
            localStorage.setItem(codeKey, code);
            const currentNote = localStorage.getItem(noteKey) || "";

            await api.notes.save({
                problem_id: qId,
                platform: platform,
                title: question.title,
                difficulty: question.difficulty || "Medium",
                url: question.url || "",
                subtopics: question.subtopics || [],
                note_content: currentNote,
                code_snippet: code,
                language: "python"
            });

            setStatus("Saved!");
            setTimeout(() => setStatus(""), 2000);
        } catch (e) {
            console.error("Save failed:", e);
            setStatus("Saved locally");
        }
    };

    useEffect(() => {
        if (!code) return;
        const timer = setTimeout(() => {
            handleSaveCode();
        }, 1000);
        return () => clearTimeout(timer);
    }, [code]);

    const badgeClass = PLATFORM_THEMES[platform] || PLATFORM_THEMES.Default;

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
            {/* Header */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="font-bold text-sm text-slate-800 line-clamp-1">{question.title}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                {platform} • {question.difficulty || 'Medium'}
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
                            activeTab === 'ai' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Sparkles size={14} /> AI
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'code' && (
                    <div className="h-full flex flex-col p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-600">Solution Snippet ({platform})</span>
                            <button
                                onClick={handleSaveCode}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
                            >
                                <Save size={14} /> Save Code
                            </button>
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={`// Paste or write your ${platform} solution code here...`}
                            className="flex-1 w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-none resize-none shadow-inner"
                        />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <SmartEditor questionId={qId} platform={platform.toLowerCase()} />
                )}

                {activeTab === 'ai' && (
                    <AIExplainerView
                        title={question.title}
                        platform={platform}
                        currentCode={code}
                        language="cpp"
                        noteKey={noteKey}
                    />
                )}
            </div>
        </div>
    );
}
