import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';
import { Plus, ArrowRight, BookOpen, ArrowLeft, MoreVertical, Trash2, FileText, Layout, ChevronRight, LogOut } from 'lucide-react';

import QuestionWorkspace from './QuestionWorkspace';

const INITIAL_TOPICS = ["Arrays", "Strings", "Dynamic Programming", "Trees", "Graphs", "Math", "Hash Table", "Two Pointers", "Binary Search", "Stack", "Heap", "Greedy"];

const DIFFICULTY_COLORS = {
    Easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Hard: "bg-rose-100 text-rose-700 border-rose-200",
    Custom: "bg-slate-100 text-slate-700 border-slate-200"
};

function LeetCodeManager() {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSubtopic, setActiveSubtopic] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' (topics), 'subtopics', 'scenario', 'board', 'section'
    const [activeQuestion, setActiveQuestion] = useState(null); // { id, title, difficulty }
    const [activeSection, setActiveSection] = useState(null); // "Easy", "Hard", etc.

    const [newTopic, setNewTopic] = useState("");
    const [newSubtopic, setNewSubtopic] = useState("");

    // Topic Data Structure:
    // {
    //   [topicName]: {
    //      subtopics: {
    //          [subtopicName]: {
    //              scenario: "html string",
    //              sections: { [sectionName]: [ {id, title, difficulty, url} ] }
    //          }
    //      }
    //   }
    // }
    const [topicData, setTopicData] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);

    // Scenario State (Temp local state before save)
    const [scenarioHtml, setScenarioHtml] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const navigate = useNavigate();

    const handleLogoClick = () => {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1500);
    };

    const handleLogout = () => {
        localStorage.clear();
        chrome.storage.local.clear(() => {
            console.log("Storage cleared");
            navigate('/login');
        });
    };

    // Helper to ensure 'General' subtopic exists
    const ensureGeneralSubtopic = (currentData, currentTopics) => {
        let needsUpdate = false;
        const newData = { ...currentData };

        currentTopics.forEach(topic => {
            if (!newData[topic]) {
                newData[topic] = { subtopics: { "General": { scenario: "", sections: {} } } };
                needsUpdate = true;
            } else if (!newData[topic].subtopics || !newData[topic].subtopics["General"]) {
                newData[topic] = {
                    ...newData[topic],
                    subtopics: {
                        ...(newData[topic].subtopics || {}),
                        "General": { scenario: "", sections: {} }
                    }
                };
                needsUpdate = true;
            }
        });
        return { needsUpdate, newData };
    };

    // Initial Load & Sync
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        // Load content
        const loadTree = async () => {
            // 1. Load Local, then ensure General subtopic
            const res = await chrome.storage.local.get(['leetcode_topics', 'leetcode_data']);
            let loadedTopics = res.leetcode_topics?.length ? res.leetcode_topics : INITIAL_TOPICS;
            let loadedData = res.leetcode_data || {};

            const { needsUpdate, newData } = ensureGeneralSubtopic(loadedData, loadedTopics);
            setTopics(loadedTopics);
            setTopicData(newData);

            if (needsUpdate) {
                chrome.storage.local.set({ leetcode_data: newData });
            }

            // 2. Sync with cloud
            try {
                const data = await api.leetcode.getTree();
                if (data.topics && data.topics.length > 0) {
                    const cloudTopics = data.topics;
                    const cloudData = data.data || {};
                    const { needsUpdate: cloudNeedsUpdate, newData: finalData } = ensureGeneralSubtopic(cloudData, cloudTopics);

                    setTopics(cloudTopics);
                    setTopicData(finalData);

                    chrome.storage.local.set({
                        leetcode_topics: cloudTopics,
                        leetcode_data: finalData
                    });

                    if (cloudNeedsUpdate) {
                        syncTreeToCloud(cloudTopics, finalData);
                    }
                }
            } catch (error) {
                console.error("Failed to sync with cloud:", error);
            }
        };
        loadTree();
    }, []);

    const syncTreeToCloud = async (currentTopics, currentData) => {
        setIsSyncing(true);
        try {
            await api.leetcode.syncTree(currentTopics, currentData);
        } catch (error) {
            console.error("Cloud sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const saveTopicData = (newData) => {
        setTopicData(newData);
        chrome.storage.local.set({ leetcode_data: newData });
        syncTreeToCloud(topics, newData);
    };

    const addTopic = () => {
        if (!newTopic.trim()) return;
        const topicName = newTopic.trim();
        if (topics.includes(topicName)) {
            alert("Topic already exists!");
            return;
        }
        const updatedTopics = [...topics, topicName];
        setTopics(updatedTopics);

        // Initialize with General subtopic
        const updatedData = {
            ...topicData,
            [topicName]: { subtopics: { "General": { scenario: "", sections: {} } } }
        };
        setTopicData(updatedData);

        chrome.storage.local.set({
            leetcode_topics: updatedTopics,
            leetcode_data: updatedData
        });
        setNewTopic("");
        syncTreeToCloud(updatedTopics, updatedData);
    };

    const addSubtopic = () => {
        if (!newSubtopic.trim() || !activeTopic) return;
        const subtopicName = newSubtopic.trim();

        const currentTopic = topicData[activeTopic] || { subtopics: {} };
        const currentSubtopics = currentTopic.subtopics || {};

        if (currentSubtopics[subtopicName]) {
            alert("Subtopic already exists!");
            return;
        }

        const updatedTopic = {
            ...currentTopic,
            subtopics: {
                ...currentSubtopics,
                [subtopicName]: { scenario: "<h3>Overview</h3><p>Write your scenario here...</p>", sections: {} }
            }
        };

        const updatedTopicData = { ...topicData, [activeTopic]: updatedTopic };
        saveTopicData(updatedTopicData);
        setNewSubtopic("");
    };

    const addSection = () => {
        if (!newSectionName.trim() || !activeTopic || !activeSubtopic) return;

        const currentTopic = topicData[activeTopic];
        const currentSubtopic = currentTopic.subtopics[activeSubtopic];

        const updatedSections = { ...currentSubtopic.sections, [newSectionName]: [] };

        const updatedTopicData = {
            ...topicData,
            [activeTopic]: {
                ...currentTopic,
                subtopics: {
                    ...currentTopic.subtopics,
                    [activeSubtopic]: {
                        ...currentSubtopic,
                        sections: updatedSections
                    }
                }
            }
        };

        saveTopicData(updatedTopicData);
        setNewSectionName("");
        setIsAddingSection(false);
    };

    const addCurrentQuestion = async (sectionName) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.tabs.sendMessage(tab.id, { action: "getLeetCodeProblemDetails" }, (response) => {
            if (chrome.runtime.lastError || !response) {
                alert("Could not get problem details. Refresh the LeetCode page.");
                return;
            }

            const { title, difficulty, url } = response;
            const question = { id: Date.now().toString(), title, difficulty, url };

            const currentTopic = topicData[activeTopic];
            const currentSubtopic = currentTopic.subtopics[activeSubtopic];
            const currentSectionQuestions = currentSubtopic.sections[sectionName] || [];

            if (currentSectionQuestions.some(q => q.title === title)) {
                alert("Question already in this section!");
                return;
            }

            const updatedSections = {
                ...currentSubtopic.sections,
                [sectionName]: [...currentSectionQuestions, question]
            };

            const updatedTopicData = {
                ...topicData,
                [activeTopic]: {
                    ...currentTopic,
                    subtopics: {
                        ...currentTopic.subtopics,
                        [activeSubtopic]: {
                            ...currentSubtopic,
                            sections: updatedSections
                        }
                    }
                }
            };

            saveTopicData(updatedTopicData);
        });
    };

    const saveScenario = (html) => {
        setScenarioHtml(html);
        const currentTopic = topicData[activeTopic];
        const currentSubtopic = currentTopic.subtopics[activeSubtopic];

        const updatedTopicData = {
            ...topicData,
            [activeTopic]: {
                ...currentTopic,
                subtopics: {
                    ...currentTopic.subtopics,
                    [activeSubtopic]: {
                        ...currentSubtopic,
                        scenario: html
                    }
                }
            }
        };
        saveTopicData(updatedTopicData);
    };

    const getSections = () => {
        if (!activeTopic || !activeSubtopic || !topicData[activeTopic]) return {};
        const subtopic = topicData[activeTopic].subtopics?.[activeSubtopic];
        if (!subtopic) return {};

        const storedSections = subtopic.sections || {};
        const defaults = ["Easy", "Medium", "Hard"];
        const merged = { ...storedSections };
        defaults.forEach(d => {
            if (!merged[d]) merged[d] = [];
        });
        return merged;
    };

    const handleTopicClick = (topic) => {
        setActiveTopic(topic);
        setViewMode('subtopics');
    };

    const handleSubtopicClick = (subtopic) => {
        setActiveSubtopic(subtopic);
        // Load scenario content - kept for potential future use or background loading
        const content = topicData[activeTopic]?.subtopics?.[subtopic]?.scenario || "";
        setScenarioHtml(content);
        setViewMode('board');
    };

    // --- Views ---

    // 1. Question Editor (Deepest View)
    if (activeQuestion) {
        return (
            <QuestionWorkspace
                question={activeQuestion}
                onBack={() => setActiveQuestion(null)}
            />
        );
    }

    // 2. Section Detail View (New Page for "See All")
    if (viewMode === 'section' && activeTopic && activeSubtopic && activeSection) {
        const sections = getSections();
        const questions = sections[activeSection] || [];
        // Show all questions in reverse order (newest first)
        const displayQuestions = [...questions].reverse();

        let colorClass = DIFFICULTY_COLORS[activeSection] || DIFFICULTY_COLORS.Custom;
        if (activeSection === "Easy") colorClass = DIFFICULTY_COLORS.Easy;
        if (activeSection === "Medium") colorClass = DIFFICULTY_COLORS.Medium;
        if (activeSection === "Hard") colorClass = DIFFICULTY_COLORS.Hard;

        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
                    <button
                        onClick={() => { setActiveSection(null); setViewMode('board'); }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeSection}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                            {activeSubtopic} • {questions.length} Questions
                        </p>
                    </div>
                    <div className="ml-auto">
                        <button
                            onClick={() => addCurrentQuestion(activeSection)}
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-indigo-200"
                        >
                            <Plus size={14} /> Add Current
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {displayQuestions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <FileText size={24} className="mb-2 opacity-50" />
                            <p className="text-sm font-medium">No questions in this section yet</p>
                        </div>
                    )}

                    {displayQuestions.map(q => (
                        <div
                            key={q.id}
                            onClick={() => setActiveQuestion(q)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group flex items-start justify-between gap-3"
                        >
                            <div>
                                <h3 className="font-medium text-sm text-slate-800 group-hover:text-indigo-600 line-clamp-2 leading-snug">{q.title}</h3>
                                {q.url && <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[250px]">{q.url}</p>}
                            </div>
                            <div className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 shrink-0">
                                {activeSection}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Questions Board View (Promoted to 2nd level)
    if (viewMode === 'board' && activeTopic && activeSubtopic) {
        const sections = getSections();
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
                    <button onClick={() => setViewMode('subtopics')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeSubtopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Question Board</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(sections)
                        .sort(([a], [b]) => {
                            const order = ["Easy", "Medium", "Hard"];
                            const idxA = order.indexOf(a);
                            const idxB = order.indexOf(b);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return 0; // Keep original order for custom sections
                        })
                        .map(([name, questions]) => {
                            let colorClass = DIFFICULTY_COLORS[name] || DIFFICULTY_COLORS.Custom;
                            if (name === "Easy") colorClass = DIFFICULTY_COLORS.Easy;
                            if (name === "Medium") colorClass = DIFFICULTY_COLORS.Medium;
                            if (name === "Hard") colorClass = DIFFICULTY_COLORS.Hard;

                            const isExpanded = false; // Deprecated inline expansion
                            // Show last 3 added questions by default
                            const displayQuestions = [...questions].reverse();
                            const showLimit = 3;
                            const visibleQuestions = displayQuestions.slice(0, showLimit);
                            const hasMore = questions.length > showLimit;

                            return (
                                <div key={name} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${colorClass}`}>
                                                {name}
                                            </div>

                                            {hasMore && (
                                                <button
                                                    onClick={() => {
                                                        setActiveSection(name);
                                                        setViewMode('section');
                                                    }}
                                                    className="text-[10px] font-medium text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-0.5"
                                                >
                                                    See All
                                                    <ChevronRight size={10} />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addCurrentQuestion(name)}
                                            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add Current
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {questions.length === 0 && (
                                            <div className="text-xs text-slate-400 italic px-2 py-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                                No questions yet
                                            </div>
                                        )}
                                        {visibleQuestions.map(q => (
                                            <div
                                                key={q.id}
                                                onClick={() => setActiveQuestion(q)}
                                                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all group"
                                            >
                                                <h3 className="font-medium text-sm text-slate-800 group-hover:text-indigo-600 line-clamp-2">{q.title}</h3>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                    <div className="pt-4 border-t border-slate-200">
                        {!isAddingSection ? (
                            <button onClick={() => setIsAddingSection(true)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors w-full justify-center py-2 border border-dashed border-slate-300 rounded-xl hover:border-indigo-300 hover:bg-slate-50/50">
                                <Plus size={14} /> Add Custom Section
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="Section Name"
                                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                                />
                                <button onClick={addSection} className="bg-indigo-600 text-white p-1.5 rounded-lg text-xs font-bold">Add</button>
                                <button onClick={() => setIsAddingSection(false)} className="bg-slate-200 text-slate-600 p-1.5 rounded-lg text-xs">✕</button>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        );
    }

    // 4. Subtopic List View
    if (viewMode === 'subtopics' && activeTopic) {
        const currentTopic = topicData[activeTopic] || {};
        const subtopicsList = currentTopic.subtopics ? Object.keys(currentTopic.subtopics) : [];

        return (
            <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm sticky top-0 z-10">
                    <button onClick={() => { setActiveTopic(null); setViewMode('list'); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeTopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Select Subtopic</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {subtopicsList.length === 0 && (
                        <div className="text-center py-10 opacity-60">
                            <Layout className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">No subtopics yet</p>
                            <p className="text-xs text-slate-400">Add one below to get started</p>
                        </div>
                    )}

                    {subtopicsList.map(sub => (
                        <div
                            key={sub}
                            onClick={() => handleSubtopicClick(sub)}
                            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                                    <FileText size={18} />
                                </div>
                                <span className="font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">{sub}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
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
                            placeholder="New Subtopic (e.g. BFS)..."
                            className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                            onClick={addSubtopic}
                            disabled={!newSubtopic.trim()}
                            className="bg-slate-900 hover:bg-indigo-600 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-200 group"
                        >
                            <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 5. Main Topic List (Default)
    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
            <header className="px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer group" onClick={handleLogoClick}>
                        <div className={`absolute -inset-1 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75 scale-110' : 'group-hover:opacity-50'}`}></div>
                        <img
                            src="icons/icon48.png"
                            alt="Logo"
                            className={`relative w-10 h-10 rounded-xl shadow-sm transition-all duration-[1500ms] ease-in-out ${isAnimating ? 'scale-125 rotate-[1080deg]' : 'group-hover:scale-105'}`}
                        />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">LeetCode Notes</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">By Lazzy</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                    <LogOut size={18} strokeWidth={2.5} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {topics.map(topic => (
                    <div
                        key={topic}
                        onClick={() => handleTopicClick(topic)}
                        className="group bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 cursor-pointer transition-all duration-300 flex justify-between items-center relative overflow-hidden"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="font-display font-semibold text-sm text-slate-700 group-hover:text-indigo-700 pl-1 transition-colors">{topic}</span>
                        <div className="bg-slate-50 p-1.5 rounded-lg text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300 transform group-hover:translate-x-0.5">
                            <ArrowRight size={14} strokeWidth={2.5} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 shrink-0 bg-gradient-to-t from-slate-50 to-transparent">
                <div className="bg-white p-1 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 flex gap-1">
                    <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                        placeholder="Add new topic..."
                        className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        onClick={addTopic}
                        disabled={!newTopic.trim()}
                        className="bg-slate-900 hover:bg-indigo-600 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-indigo-200 group"
                    >
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LeetCodeManager;
