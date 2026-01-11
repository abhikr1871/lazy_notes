import React, { useState, useEffect } from 'react';
import NoteEditor from './NoteEditor';
import { Plus, ArrowRight, BookOpen, ArrowLeft, MoreVertical, Trash2, FileText, Layout, ChevronRight } from 'lucide-react';
import ContentEditable from 'react-contenteditable';

const INITIAL_TOPICS = ["Arrays", "Strings", "Dynamic Programming", "Trees", "Graphs", "Math", "Hash Table", "Two Pointers", "Binary Search", "Stack", "Heap", "Greedy"];

const DIFFICULTY_COLORS = {
    Easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-100 text-amber-700 border-amber-200",
    Hard: "bg-rose-100 text-rose-700 border-rose-200",
    Custom: "bg-slate-100 text-slate-700 border-slate-200"
};

function LeetCodeSidebar() {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSubtopic, setActiveSubtopic] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' (topics), 'subtopics', 'scenario', 'board'
    const [activeQuestion, setActiveQuestion] = useState(null); // { id, title, difficulty }

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
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);

    // Scenario State (Temp local state before save)
    const [scenarioHtml, setScenarioHtml] = useState("");
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial Load & Sync
    useEffect(() => {
        const token = localStorage.getItem('token');

        // 1. Load Local First (Fast)
        chrome.storage.local.get(['leetcode_topics', 'leetcode_data'], (res) => {
            if (res.leetcode_topics?.length) setTopics(res.leetcode_topics);
            if (res.leetcode_data) setTopicData(res.leetcode_data);
        });

        // 2. Fetch Cloud (Source of Truth) if Logged In
        if (token) {
            fetch('http://localhost:8000/leetcode/tree', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.topics && data.topics.length > 0) {
                        setTopics(data.topics);
                        setTopicData(data.data || {});
                        // Update local storage to match cloud
                        chrome.storage.local.set({
                            leetcode_topics: data.topics,
                            leetcode_data: data.data || {}
                        });
                    }
                })
                .catch(err => console.error("Cloud fetch error:", err));
        }
    }, []);

    const syncTreeToCloud = (currentTopics, currentData) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setIsSyncing(true);
        fetch('http://localhost:8000/leetcode/tree', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ topics: currentTopics, data: currentData })
        })
            .then(() => setIsSyncing(false))
            .catch(err => {
                console.error("Sync error:", err);
                setIsSyncing(false);
            });
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
        const updated = [...topics, topicName];
        setTopics(updated);
        chrome.storage.local.set({ leetcode_topics: updated });
        setNewTopic("");
        syncTreeToCloud(updated, topicData);
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
        // Load scenario content
        const content = topicData[activeTopic]?.subtopics?.[subtopic]?.scenario || "";
        setScenarioHtml(content);
        setViewMode('scenario');
    };

    // --- Views ---

    // 1. Question Editor (Deepest View)
    if (activeQuestion) {
        return (
            <NoteEditor
                storageKey={`leetcode_note_${activeTopic}_${activeSubtopic}_${activeQuestion.id}`}
                onBack={() => setActiveQuestion(null)}
            />
        );
    }

    // 2. Scenario View
    if (viewMode === 'scenario' && activeTopic && activeSubtopic) {
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setViewMode('subtopics')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeSubtopic}</h1>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Scenario & Logic</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setViewMode('board')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-indigo-100 shadow-md"
                    >
                        <span>Questions</span>
                        <ArrowRight size={14} />
                    </button>
                </header>

                <div className="flex-1 overflow-hidden relative">
                    <NoteEditor
                        storageKey={`leetcode_scenario_${activeTopic}_${activeSubtopic}`}
                        placeholder="Write your overall scenario and logic here (drag & drop images supported)..."
                        simpleMode={true}
                    />
                </div>
            </div>
        );
    }

    // 3. Questions Board View
    if (viewMode === 'board' && activeTopic && activeSubtopic) {
        const sections = getSections();
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
                    <button onClick={() => setViewMode('scenario')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeSubtopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Question Board</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {Object.entries(sections).map(([name, questions]) => {
                        let colorClass = DIFFICULTY_COLORS[name] || DIFFICULTY_COLORS.Custom;
                        if (name === "Easy") colorClass = DIFFICULTY_COLORS.Easy;
                        if (name === "Medium") colorClass = DIFFICULTY_COLORS.Medium;
                        if (name === "Hard") colorClass = DIFFICULTY_COLORS.Hard;

                        return (
                            <div key={name} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${colorClass}`}>
                                        {name}
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
                                    {questions.map(q => (
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
            </div>
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
            <header className="px-5 py-4 flex items-center gap-3 shrink-0">
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl text-white shadow-md shadow-indigo-200">
                    <BookOpen size={18} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">LeetCode Notes</h1>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">By Lazzy</p>
                </div>
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

export default LeetCodeSidebar;
