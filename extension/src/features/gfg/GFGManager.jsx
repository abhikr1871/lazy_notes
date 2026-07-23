import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';
import { Plus, ArrowRight, BookOpen, ArrowLeft, Trash2, FileText, Layout, ChevronRight, Brain, BarChart2, Download } from 'lucide-react';
import GFGQuestionWorkspace from './GFGQuestionWorkspace';

const INITIAL_TOPICS = ["Arrays", "Strings", "Dynamic Programming", "Trees", "Graphs", "Math", "Hash Table", "Two Pointers", "Binary Search", "Stack", "Heap", "Greedy"];

export default function GFGManager({ initialTab }) {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSubtopic, setActiveSubtopic] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [workspaceTab, setWorkspaceTab] = useState(initialTab || 'code');
    const [topicData, setTopicData] = useState({});

    // Load active GFG problem details automatically from active tab
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

    if (viewMode === 'workspace' && activeQuestion) {
        return (
            <GFGQuestionWorkspace
                question={activeQuestion}
                onBack={() => setViewMode('list')}
                initialTab={workspaceTab}
            />
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-base text-slate-800 leading-none">GFG Notes</h1>
                        <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mt-0.5">GeeksforGeeks</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-4 rounded-2xl shadow-md">
                    <h2 className="font-extrabold text-sm">GeeksforGeeks Integration</h2>
                    <p className="text-[11px] text-emerald-200 mt-1">Open any GFG problem page to capture solution code, AI explanations, and notes!</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {topics.map(t => (
                        <div
                            key={t}
                            onClick={() => { setActiveTopic(t); setViewMode('subtopics'); }}
                            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all flex flex-col justify-between"
                        >
                            <span className="font-bold text-xs text-slate-800">{t}</span>
                            <span className="text-[10px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                View Topic <ChevronRight size={12} />
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
