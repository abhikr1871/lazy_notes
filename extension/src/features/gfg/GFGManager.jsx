import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';
import { Plus, ArrowRight, BookOpen, ArrowLeft, MoreVertical, Trash2, FileText, Layout, ChevronRight, LogOut, Brain, BarChart2, Download } from 'lucide-react';
import GFGQuestionWorkspace from './GFGQuestionWorkspace';
import ReviewQueue from '../review/ReviewQueue';
import StatsDashboard from '../dashboard/StatsDashboard';
import { exportTopicToPDF, exportTopicToMarkdown } from '../../utils/exporter';

const INITIAL_TOPICS = ["Arrays", "Strings", "Dynamic Programming", "Trees", "Graphs", "Math", "Hash Table", "Two Pointers", "Binary Search", "Stack", "Heap", "Greedy"];

export default function GFGManager({ initialTab }) {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSubtopic, setActiveSubtopic] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list', 'subtopics', 'workspace', 'review', 'stats'
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [workspaceTab, setWorkspaceTab] = useState(initialTab || 'code');

    const [newTopic, setNewTopic] = useState("");
    const [newSubtopic, setNewSubtopic] = useState("");
    const [topicData, setTopicData] = useState({});
    const [isAnimating, setIsAnimating] = useState(false);

    const navigate = useNavigate();

    // Auto load active GFG problem details from tab
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url && tabs[0].url.includes('geeksforgeeks.org/problems/')) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "getGFGProblemDetails" }, (res) => {
                        if (res && res.title) {
                            setActiveQuestion({
                                id: res.title.toLowerCase().replace(/\s+/g, '-'),
                                title: res.title,
                                difficulty: res.difficulty || 'Medium',
                                url: res.url,
                                code: res.code || ""
                            });
                            setViewMode('workspace');
                        }
                    });
                }
            });
        }
    }, []);

    const handleLogoClick = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1500);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const addTopic = () => {
        if (newTopic.trim() && !topics.includes(newTopic.trim())) {
            setTopics([...topics, newTopic.trim()]);
            setNewTopic("");
        }
    };

    const addSubtopic = () => {
        if (!newSubtopic.trim() || !activeTopic) return;
        const sub = newSubtopic.trim();
        setTopicData(prev => {
            const topic = prev[activeTopic] || { subtopics: {} };
            return {
                ...prev,
                [activeTopic]: {
                    ...topic,
                    subtopics: {
                        ...(topic.subtopics || {}),
                        [sub]: { scenario: "", sections: {} }
                    }
                }
            };
        });
        setNewSubtopic("");
    };

    const handleSubtopicClick = (subtopic) => {
        setActiveSubtopic(subtopic);
        if (!activeQuestion) {
            setActiveQuestion({
                id: `${activeTopic}-${subtopic}`.toLowerCase().replace(/\s+/g, '-'),
                title: `${activeTopic} - ${subtopic}`,
                difficulty: 'Medium',
                url: window.location.href,
                code: ""
            });
        }
        setViewMode('workspace');
    };

    const handleExport = async (format) => {
        try {
            const res = await api.gfg.getTree();
            const questions = res && res.notes ? res.notes : [];
            if (format === 'pdf') {
                exportTopicToPDF(activeTopic || "GFG_Notes", questions);
            } else {
                exportTopicToMarkdown(activeTopic || "GFG_Notes", questions);
            }
        } catch (e) {
            console.error("Export failed:", e);
        }
    };

    // 1. Workspace View
    if (viewMode === 'workspace' && activeQuestion) {
        return (
            <GFGQuestionWorkspace
                question={activeQuestion}
                onBack={() => setViewMode(activeTopic ? 'subtopics' : 'list')}
                initialTab={workspaceTab}
            />
        );
    }

    // 2. Review View
    if (viewMode === 'review') {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <header className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center gap-1">
                        ← Back to Topics
                    </button>
                    <span className="text-xs font-bold text-emerald-900">Spaced Repetition Queue</span>
                </header>
                <div className="flex-1 overflow-hidden">
                    <ReviewQueue />
                </div>
            </div>
        );
    }

    // 3. Stats View
    if (viewMode === 'stats') {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <header className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <button onClick={() => setViewMode('list')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center gap-1">
                        ← Back to Topics
                    </button>
                    <span className="text-xs font-bold text-emerald-900">Learning Analytics</span>
                </header>
                <div className="flex-1 overflow-hidden">
                    <StatsDashboard />
                </div>
            </div>
        );
    }

    // 4. Subtopics List View
    if (viewMode === 'subtopics' && activeTopic) {
        const currentTopic = topicData[activeTopic] || {};
        const subtopicsList = currentTopic.subtopics ? Object.keys(currentTopic.subtopics) : ["General", "Patterns", "Advanced"];

        return (
            <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setActiveTopic(null); setViewMode('list'); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeTopic}</h1>
                            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mt-0.5">GFG Subtopics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleExport('pdf')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                            title="Export Topic Notes as PDF"
                        >
                            <Download size={12} />
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={() => handleExport('md')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                            title="Export Topic Notes as Markdown"
                        >
                            <Download size={12} />
                            <span>MD</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {subtopicsList.map(sub => (
                        <div
                            key={sub}
                            onClick={() => handleSubtopicClick(sub)}
                            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                                    <FileText size={18} />
                                </div>
                                <span className="font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">{sub}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                        </div>
                    ))}
                </div>

                <div className="p-4 shrink-0 bg-gradient-to-t from-slate-50 to-transparent">
                    <div className="bg-white p-1 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 flex gap-1">
                        <input
                            type="text"
                            value={newSubtopic}
                            onChange={(e) => setNewSubtopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addSubtopic()}
                            placeholder="New Subtopic (e.g. Tree Traversal)..."
                            className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                            onClick={addSubtopic}
                            disabled={!newSubtopic.trim()}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 5. Default Main Topic List View
    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
            <header className="px-5 py-4 flex items-center justify-between shrink-0 bg-white border-b border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer group" onClick={handleLogoClick}>
                        <div className={`absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75 scale-110' : 'group-hover:opacity-50'}`}></div>
                        <img
                            src="icons/icon48.png"
                            alt="Logo"
                            className={`relative w-10 h-10 rounded-xl shadow-sm transition-all duration-[1500ms] ease-in-out ${isAnimating ? 'scale-125 rotate-[1080deg]' : 'group-hover:scale-105'}`}
                        />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">GFG Notes</h1>
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest">GeeksforGeeks</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setViewMode('stats')}
                        className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
                        title="View Learning Stats & Heatmap"
                    >
                        <BarChart2 size={13} className="text-emerald-600" />
                        <span>Stats</span>
                    </button>
                    <button
                        onClick={() => setViewMode('review')}
                        className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm transition-all"
                        title="Spaced Repetition Review Queue"
                    >
                        <Brain size={13} className="text-purple-600" />
                        <span>Review</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Logout"
                    >
                        <LogOut size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-4 rounded-2xl shadow-md">
                    <h2 className="font-extrabold text-sm">GeeksforGeeks Notes Vault</h2>
                    <p className="text-[11px] text-emerald-200 mt-1">Select a topic below or open any GFG problem page to capture solution code & AI notes!</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {topics.map(t => (
                        <div
                            key={t}
                            onClick={() => { setActiveTopic(t); setViewMode('subtopics'); }}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between"
                        >
                            <span className="font-bold text-xs text-slate-800">{t}</span>
                            <span className="text-[10px] font-semibold text-emerald-600 mt-2 flex items-center justify-between">
                                <span>View Topic</span>
                                <ChevronRight size={12} />
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 shrink-0 bg-gradient-to-t from-slate-50 to-transparent">
                <div className="bg-white p-1 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 flex gap-1">
                    <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                        placeholder="Add New Topic (e.g. Segment Tree)..."
                        className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        onClick={addTopic}
                        disabled={!newTopic.trim()}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
}
