import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Plus, ArrowRight, ArrowLeft, ChevronRight, LogOut, Layout, FileText, Tag, Hash } from 'lucide-react';

import QuestionWorkspace from './CodeforcesQuestionWorkspace';

// Comprehensive list of Codeforces Tags
const INITIAL_TOPICS = [
    "implementation", "math", "greedy", "dp", "data structures",
    "brute force", "constructive algorithms", "graphs", "sortings",
    "binary search", "dfs and similar", "trees", "strings",
    "number theory", "geometry", "combinatorics", "two pointers",
    "bitmasks", "probabilities", "dsu", "flows", "games",
    "hashing", "interactive", "matrices", "meet-in-the-middle",
    "shortest paths", "ternary search", "divide and conquer"
];

// Codeforces Rank Colors for Ratings
const DIFFICULTY_COLORS = {
    "Unrated": "bg-slate-100 text-slate-700 border-slate-200",
    "< 1000": "bg-gray-100 text-gray-600 border-gray-200", // Newbie
    "1000-1200": "bg-green-100 text-green-700 border-green-200", // Pupil
    "1200-1400": "bg-cyan-100 text-cyan-700 border-cyan-200", // Specialist
    "1400-1600": "bg-cyan-100 text-blue-600 border-blue-200", // Expert (Cyan/Blueish)
    "1600-1900": "bg-indigo-100 text-indigo-700 border-indigo-200", // Candidate Master
    "1900-2100": "bg-violet-100 text-violet-700 border-violet-200", // Master
    "2100-2400": "bg-amber-100 text-amber-600 border-amber-200", // IM / GM
    "2400+": "bg-rose-100 text-rose-700 border-rose-200", // Red
    "Custom": "bg-slate-100 text-slate-700 border-slate-200"
};

function CodeforcesManager() {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSubtopic, setActiveSubtopic] = useState(null); // Used as "Sub-category" or just "General"
    const [viewMode, setViewMode] = useState('list'); // 'list', 'subtopics', 'board'
    const [activeQuestion, setActiveQuestion] = useState(null);

    const [newTopic, setNewTopic] = useState("");
    const [newSubtopic, setNewSubtopic] = useState("");

    const [topicData, setTopicData] = useState({});
    const [expandedSections, setExpandedSections] = useState({});
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);

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

    // Ensure 'General' subtopic exists for every topic
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
        const loadTree = async () => {
            let token = localStorage.getItem('token');
            if (!token && typeof chrome !== 'undefined' && chrome.storage) {
                const tokenRes = await chrome.storage.local.get(['token']);
                token = tokenRes.token;
            }
            if (!token) {
                navigate('/login');
                return;
            }

            const res = await chrome.storage.local.get(['codeforces_topics', 'codeforces_data']);
            let loadedTopics = res.codeforces_topics?.length ? res.codeforces_topics : INITIAL_TOPICS;
            let loadedData = res.codeforces_data || {};

            const { needsUpdate, newData } = ensureGeneralSubtopic(loadedData, loadedTopics);
            setTopics(loadedTopics);
            setTopicData(newData);

            if (needsUpdate) {
                chrome.storage.local.set({ codeforces_data: newData });
            }

            try {
                const data = await api.codeforces.getTree();
                if (data.topics && data.topics.length > 0) {
                    const cloudTopics = data.topics;
                    const cloudData = data.data || {};
                    const { needsUpdate: cloudNeedsUpdate, newData: finalData } = ensureGeneralSubtopic(cloudData, cloudTopics);

                    setTopics(cloudTopics);
                    setTopicData(finalData);

                    chrome.storage.local.set({
                        codeforces_topics: cloudTopics,
                        codeforces_data: finalData
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
            await api.codeforces.syncTree(currentTopics, currentData);
        } catch (error) {
            console.error("Cloud sync failed:", error);
        } finally {
            setIsSyncing(false);
        }
    };

    const saveTopicData = (newData) => {
        setTopicData(newData);
        chrome.storage.local.set({ codeforces_data: newData });
        syncTreeToCloud(topics, newData);
    };

    const addTopic = () => {
        if (!newTopic.trim()) return;
        const topicName = newTopic.trim().toLowerCase(); // Codeforces tags are usually lowercase
        if (topics.includes(topicName)) {
            alert("Topic already exists!");
            return;
        }
        const updatedTopics = [...topics, topicName];
        setTopics(updatedTopics);

        const updatedData = {
            ...topicData,
            [topicName]: { subtopics: { "General": { scenario: "", sections: {} } } }
        };
        setTopicData(updatedData);

        chrome.storage.local.set({
            codeforces_topics: updatedTopics,
            codeforces_data: updatedData
        });
        setNewTopic("");
        syncTreeToCloud(updatedTopics, updatedData);
    };

    // Subtopic logic (mostly unused if we strictly stick to tags, but kept for extensibility)
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
                [subtopicName]: { scenario: "", sections: {} }
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

        chrome.tabs.sendMessage(tab.id, { action: "getCodeforcesProblemDetails" }, (response) => {
            if (chrome.runtime.lastError || !response) {
                alert("Could not get problem details. Refresh the Codeforces page.");
                return;
            }

            const { title, difficulty, url, rating, tags } = response;

            // Allow duplicate titles if user really wants, or check simple dupes
            // We use the 'difficulty' field to store the actual rating string for display

            const question = {
                id: Date.now().toString(),
                title,
                difficulty: String(rating || difficulty || "Unrated"), // Store actual rating here
                url,
                tags: tags || [] // Store scraped tags
            };

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

    // Helper to get sections with defaults based on Rating Ranges
    const getSections = () => {
        if (!activeTopic || !activeSubtopic || !topicData[activeTopic]) return {};
        const subtopic = topicData[activeTopic].subtopics?.[activeSubtopic];
        if (!subtopic) return {};

        const storedSections = subtopic.sections || {};

        // Codeforces Rating Ranges
        const defaults = [
            "< 1000",
            "1000-1200",
            "1200-1400",
            "1400-1600",
            "1600-1900",
            "1900-2100",
            "2100-2400",
            "2400+"
        ];

        const merged = { ...storedSections };
        defaults.forEach(d => {
            if (!merged[d]) merged[d] = [];
        });
        return merged;
    };

    const handleTopicClick = (topic) => {
        setActiveTopic(topic);
        // Automatically select 'General' subtopic if we want to skip the subtopic view for tags
        // But user might want custom subtopics. Let's keep subtopic view for now, 
        // or auto-navigate if only 'General' exists to streamline.
        // For now: Stick to flow.
        setViewMode('subtopics');
    };

    const handleSubtopicClick = (subtopic) => {
        setActiveSubtopic(subtopic);
        setViewMode('board');
    };

    // --- Views ---

    if (activeQuestion) {
        return (
            <QuestionWorkspace
                question={activeQuestion}
                onBack={() => setActiveQuestion(null)}
                context="codeforces"
            />
        );
    }

    if (viewMode === 'board' && activeTopic && activeSubtopic) {
        const sections = getSections();
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
                    <button onClick={() => setViewMode('subtopics')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none capitalize">{activeTopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                            {activeSubtopic !== "General" ? activeSubtopic : "Problem Set"}
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(sections)
                        .sort(([a], [b]) => {
                            const order = [
                                "< 1000",
                                "1000-1200",
                                "1200-1400",
                                "1400-1600",
                                "1600-1900",
                                "1900-2100",
                                "2100-2400",
                                "2400+"
                            ];
                            const idxA = order.indexOf(a);
                            const idxB = order.indexOf(b);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return 0;
                        })
                        .map(([name, questions]) => {
                            let colorClass = DIFFICULTY_COLORS[name] || DIFFICULTY_COLORS.Custom;

                            const isExpanded = expandedSections[name];
                            const displayQuestions = [...questions].reverse();
                            const showLimit = 5;
                            const visibleQuestions = isExpanded ? displayQuestions : displayQuestions.slice(0, showLimit);
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
                                                    onClick={() => setExpandedSections(prev => ({ ...prev, [name]: !prev[name] }))}
                                                    className="text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-0.5"
                                                >
                                                    {isExpanded ? "Show Less" : "See All"}
                                                    <ChevronRight size={10} className={`transform transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => addCurrentQuestion(name)}
                                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add Current
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {questions.length === 0 && (
                                            <div className="text-xs text-slate-400 italic px-2 py-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                                                No notes yet
                                            </div>
                                        )}
                                        {visibleQuestions.map(q => (
                                            <div
                                                key={q.id}
                                                onClick={() => setActiveQuestion(q)}
                                                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600 line-clamp-2 leading-snug">{q.title}</h3>
                                                    {q.difficulty && q.difficulty !== "Unrated" && (
                                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded ml-2 shrink-0 border border-slate-100">
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Tags Display - Light Grey Pills */}
                                                {q.tags && q.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {q.tags.slice(0, 3).map(tag => (
                                                            <span key={tag} className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {q.tags.length > 3 && (
                                                            <span className="text-[9px] text-slate-400">+{q.tags.length - 3}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                    <div className="pt-4 border-t border-slate-200">
                        {!isAddingSection ? (
                            <button onClick={() => setIsAddingSection(true)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors w-full justify-center py-2 border border-dashed border-slate-300 rounded-xl hover:border-blue-300 hover:bg-slate-50/50">
                                <Plus size={14} /> Add Custom Range
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newSectionName}
                                    onChange={(e) => setNewSectionName(e.target.value)}
                                    placeholder="Range Name"
                                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                                />
                                <button onClick={addSection} className="bg-blue-600 text-white p-1.5 rounded-lg text-xs font-bold">Add</button>
                                <button onClick={() => setIsAddingSection(false)} className="bg-slate-200 text-slate-600 p-1.5 rounded-lg text-xs">✕</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'subtopics' && activeTopic) {
        const currentTopic = topicData[activeTopic] || {};
        const subtopicsList = currentTopic.subtopics ? Object.keys(currentTopic.subtopics) : [];

        // If only "General" exists, maybe we can auto-redirect? 
        // For now let's keep it explicit so users can add custom sub-groupings if they want.

        return (
            <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm sticky top-0 z-10">
                    <button onClick={() => { setActiveTopic(null); setViewMode('list'); }} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none capitalize">{activeTopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Sub-categories</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {subtopicsList.length === 0 && (
                        <div className="text-center py-10 opacity-60">
                            <Layout className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">No content yet</p>
                        </div>
                    )}

                    {subtopicsList.map(sub => (
                        <div
                            key={sub}
                            onClick={() => handleSubtopicClick(sub)}
                            className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                    <Hash size={18} />
                                </div>
                                <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">{sub}</span>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
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
                            placeholder="New Sub-category..."
                            className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                            onClick={addSubtopic}
                            disabled={!newSubtopic.trim()}
                            className="bg-slate-900 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-200 group"
                        >
                            <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main Topic List (Default - Tags)
    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
            <header className="px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="relative cursor-pointer group" onClick={handleLogoClick}>
                        <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-25 transition duration-200 ${isAnimating ? 'opacity-75 scale-110' : 'group-hover:opacity-50'}`}></div>
                        <img
                            src="icons/icon48.png"
                            alt="Logo"
                            className={`relative w-10 h-10 rounded-xl shadow-sm transition-all duration-[1500ms] ease-in-out ${isAnimating ? 'scale-125 rotate-[1080deg]' : 'group-hover:scale-105'}`}
                        />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">Codeforces</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Problem Tags</p>
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
                        className="group bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 cursor-pointer transition-all duration-300 flex justify-between items-center relative overflow-hidden"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="font-display font-semibold text-sm text-slate-700 group-hover:text-blue-700 pl-1 transition-colors capitalize flex items-center gap-2">
                            <Tag size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            {topic}
                        </span>
                        <div className="bg-slate-50 p-1.5 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300 transform group-hover:translate-x-0.5">
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
                        placeholder="Add new tag..."
                        className="flex-1 bg-transparent px-3 py-2 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        onClick={addTopic}
                        disabled={!newTopic.trim()}
                        className="bg-slate-900 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-200 group"
                    >
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CodeforcesManager;
