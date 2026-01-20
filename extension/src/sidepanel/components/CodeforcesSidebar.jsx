import React, { useState, useEffect } from 'react';
import NoteEditor from './NoteEditor';
import { Plus, ArrowRight, Code2, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';

const INITIAL_TOPICS = ["Dynamic Programming", "Graphs", "Data Structures", "Math", "Greedy", "Implementation", "Strings", "Binary Search", "Two Pointers", "DFS & BFS"];

const RATING_COLORS = {
    "800-1000": "bg-green-100 text-green-700 border-green-200",
    "1100-1300": "bg-cyan-100 text-cyan-700 border-cyan-200",
    "1400-1600": "bg-blue-100 text-blue-700 border-blue-200",
    "1700-1900": "bg-purple-100 text-purple-700 border-purple-200",
    "2000+": "bg-pink-100 text-pink-700 border-pink-200",
    "Unrated": "bg-slate-100 text-slate-700 border-slate-200",
    "Custom": "bg-amber-100 text-amber-700 border-amber-200"
};

function CodeforcesSidebar() {
    const [topics, setTopics] = useState(INITIAL_TOPICS);
    const [activeTopic, setActiveTopic] = useState(null);
    const [activeSection, setActiveSection] = useState(null); // New: track active section
    const [activeQuestion, setActiveQuestion] = useState(null); // { id, title, rating, contestId, problemId, url }
    const [newTopic, setNewTopic] = useState("");

    // Topic Data: { [topicName]: { sections: { [sectionName]: [ {id, title, rating, contestId, problemId, url} ] } } }
    const [topicData, setTopicData] = useState({});
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [showTopicSelector, setShowTopicSelector] = useState(false);
    const [selectedTopicForAdd, setSelectedTopicForAdd] = useState(null);

    useEffect(() => {
        chrome.storage.local.get(['codeforces_topics', 'codeforces_data'], (res) => {
            if (res.codeforces_topics && Array.isArray(res.codeforces_topics) && res.codeforces_topics.length > 0) {
                setTopics(res.codeforces_topics);
            }
            if (res.codeforces_data) {
                setTopicData(res.codeforces_data);
            }
        });
    }, []);

    const saveTopicData = (newData) => {
        setTopicData(newData);
        chrome.storage.local.set({ codeforces_data: newData });
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
        chrome.storage.local.set({ codeforces_topics: updated });
        setNewTopic("");
    };

    const addSection = () => {
        if (!newSectionName.trim() || !activeTopic) return;
        const currentTopicData = topicData[activeTopic] || { sections: {} };
        const updatedSections = { ...currentTopicData.sections, [newSectionName]: [] };
        const updatedTopicData = { ...topicData, [activeTopic]: { ...currentTopicData, sections: updatedSections } };
        saveTopicData(updatedTopicData);
        setNewSectionName("");
        setIsAddingSection(false);
    };

    const deleteTopic = (topicName) => {
        if (!confirm(`Delete topic "${topicName}"? This will remove all sections and questions in this topic.`)) return;

        const updatedTopics = topics.filter(t => t !== topicName);
        setTopics(updatedTopics);
        chrome.storage.local.set({ codeforces_topics: updatedTopics });

        // Also remove from topicData
        const updatedData = { ...topicData };
        delete updatedData[topicName];
        saveTopicData(updatedData);
    };

    const deleteSection = (sectionName) => {
        if (!confirm(`Delete section "${sectionName}"? This will remove all questions in this section.`)) return;

        const currentTopicData = topicData[activeTopic] || { sections: {} };
        const updatedSections = { ...currentTopicData.sections };
        delete updatedSections[sectionName];

        saveTopicData({ ...topicData, [activeTopic]: { ...currentTopicData, sections: updatedSections } });
    };

    const deleteQuestion = (sectionName, questionId) => {
        if (!confirm("Delete this question?")) return;

        const currentTopicData = topicData[activeTopic] || { sections: {} };
        const currentSectionQuestions = currentTopicData.sections[sectionName] || [];
        const updatedQuestions = currentSectionQuestions.filter(q => q.id !== questionId);

        const updatedSections = {
            ...currentTopicData.sections,
            [sectionName]: updatedQuestions
        };

        saveTopicData({ ...topicData, [activeTopic]: { ...currentTopicData, sections: updatedSections } });
    };

    // Helper function to determine section based on rating
    const getRatingSection = (rating) => {
        if (!rating || rating === "Unrated") return "Unrated";

        const ratingNum = parseInt(rating);
        if (isNaN(ratingNum)) return "Unrated";

        if (ratingNum >= 800 && ratingNum <= 1000) return "800-1000";
        if (ratingNum >= 1100 && ratingNum <= 1300) return "1100-1300";
        if (ratingNum >= 1400 && ratingNum <= 1600) return "1400-1600";
        if (ratingNum >= 1700 && ratingNum <= 1900) return "1700-1900";
        if (ratingNum >= 2000) return "2000+";

        return "Unrated"; // For ratings outside defined ranges
    };

    const addCurrentQuestion = async (targetTopic) => {
        // Get details from content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.tabs.sendMessage(tab.id, { action: "getCodeforcesProblemDetails" }, (response) => {
            if (chrome.runtime.lastError || !response) {
                alert("Could not get problem details. Refresh the Codeforces page.");
                return;
            }

            const { title, rating, contestId, problemId, url } = response;
            const question = { id: Date.now().toString(), title, rating, contestId, problemId, url };

            // Auto-detect section based on rating
            const sectionName = getRatingSection(rating);

            const currentTopicData = topicData[targetTopic] || { sections: {} };
            const currentSectionQuestions = currentTopicData.sections[sectionName] || [];

            // Check duplicates
            if (currentSectionQuestions.some(q => q.title === title)) {
                alert("Question already in this topic!");
                return;
            }

            const updatedSections = {
                ...currentTopicData.sections,
                [sectionName]: [...currentSectionQuestions, question]
            };

            saveTopicData({ ...topicData, [targetTopic]: { ...currentTopicData, sections: updatedSections } });
            setShowTopicSelector(false);
            setSelectedTopicForAdd(null);

            // Show success message
            alert(`Added "${title}" to ${targetTopic} > ${sectionName}`);
        });
    };

    const getSections = (topic) => {
        const data = topicData[topic] || {};
        const storedSections = data.sections || {};
        // Ensure defaults always exist
        const defaults = ["800-1000", "1100-1300", "1400-1600", "1700-1900", "2000+", "Unrated"];
        const merged = { ...storedSections };
        defaults.forEach(d => {
            if (!merged[d]) merged[d] = [];
        });
        return merged;
    };

    // --- Views ---

    // 1. Question Editor
    if (activeQuestion) {
        return (
            <NoteEditor
                storageKey={`codeforces_note_${activeTopic}_${activeQuestion.id}`}
                onBack={() => setActiveQuestion(null)}
            />
        );
    }

    // 2. Question List (when section is selected)
    if (activeSection) {
        const sections = getSections(activeTopic);
        const questions = sections[activeSection] || [];
        const colorClass = RATING_COLORS[activeSection] || RATING_COLORS.Custom;

        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveSection(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeSection}</h1>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">{activeTopic}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => addCurrentQuestion(activeTopic)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                        <Plus size={14} /> Add Current
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {questions.length === 0 && (
                        <div className="text-xs text-slate-400 italic px-2 py-4 border-2 border-dashed border-slate-100 rounded-xl text-center">
                            No questions yet
                        </div>
                    )}
                    {questions.map(q => (
                        <div
                            key={q.id}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group relative"
                        >
                            <div onClick={() => setActiveQuestion(q)} className="flex-1">
                                <h3 className="font-medium text-sm text-slate-800 group-hover:text-blue-600 line-clamp-2 pr-16">{q.title}</h3>
                                {q.rating && q.rating !== "Unrated" && (
                                    <p className="text-[10px] text-slate-500 mt-1">Rating: {q.rating}</p>
                                )}
                                {q.contestId && q.problemId && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{q.contestId}{q.problemId}</p>
                                )}
                            </div>
                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                {q.url && (
                                    <a
                                        href={q.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 transition-all p-1 bg-white rounded"
                                        title="Open problem"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteQuestion(activeSection, q.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1 bg-white rounded"
                                    title="Delete question"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 3. Section List (Rating Folders - when topic is selected)
    if (activeTopic) {
        const sections = getSections(activeTopic);
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTopic(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeTopic}</h1>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Rating Sections</p>
                        </div>
                    </div>
                    <button
                        onClick={() => addCurrentQuestion(activeTopic)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                        <Plus size={14} /> Add Current
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-2.5">
                    {Object.entries(sections).map(([name, questions]) => {
                        let colorClass = RATING_COLORS[name] || RATING_COLORS.Custom;
                        const questionCount = questions.length;

                        return (
                            <div
                                key={name}
                                onClick={() => setActiveSection(name)}
                                className="group bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 cursor-pointer transition-all duration-300 flex justify-between items-center relative overflow-hidden"
                            >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${colorClass}`}>
                                        {name}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-semibold">
                                        {questionCount} {questionCount === 1 ? 'problem' : 'problems'}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300 transform group-hover:translate-x-0.5">
                                    <ArrowRight size={14} strokeWidth={2.5} />
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Custom Section UI */}
                    <div className="pt-4">
                        {!isAddingSection ? (
                            <button onClick={() => setIsAddingSection(true)} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors w-full justify-center py-2 border border-dashed border-slate-300 rounded-xl hover:border-blue-300 hover:bg-slate-50/50">
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

    // 3. Main Topic List
    return (
        <div className="h-full flex flex-col bg-slate-50/50 font-sans text-slate-700">
            <header className="px-5 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-xl text-white shadow-md shadow-blue-200">
                        <Code2 size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-tight">Codeforces Notes</h1>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">By Lazzy</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowTopicSelector(true)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                    <Plus size={14} /> Add Current
                </button>
            </header>

            {/* Topic Selector Modal */}
            {showTopicSelector && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowTopicSelector(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-4 w-80 max-h-96 flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-sm text-slate-800">Select Topic</h2>
                            <button onClick={() => setShowTopicSelector(false)} className="text-slate-400 hover:text-slate-600">
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2">
                            {topics.map(topic => (
                                <button
                                    key={topic}
                                    onClick={() => addCurrentQuestion(topic)}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-sm font-medium text-slate-700 transition-colors"
                                >
                                    {topic}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {topics.map(topic => (
                    <div
                        key={topic}
                        className="group bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 cursor-pointer transition-all duration-300 flex justify-between items-center relative overflow-hidden"
                    >
                        <div
                            onClick={() => setActiveTopic(topic)}
                            className="flex-1 flex justify-between items-center"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <span className="font-display font-semibold text-sm text-slate-700 group-hover:text-blue-700 pl-1 transition-colors">{topic}</span>
                            <div className="bg-slate-50 p-1.5 rounded-lg text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-300 transform group-hover:translate-x-0.5">
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteTopic(topic);
                            }}
                            className="ml-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-all p-1.5"
                            title="Delete topic"
                        >
                            <Trash2 size={14} />
                        </button>
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
                        className="bg-slate-900 hover:bg-blue-600 text-white p-2 rounded-lg transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-blue-200 group"
                        title="Add topic"
                    >
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CodeforcesSidebar;
