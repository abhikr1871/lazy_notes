import React, { useState, useEffect } from 'react';
import NoteEditor from './NoteEditor';
import { Plus, ArrowRight, BookOpen, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react';

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
    const [activeQuestion, setActiveQuestion] = useState(null); // { id, title, difficulty }
    const [newTopic, setNewTopic] = useState("");

    // Topic Data: { [topicName]: { sections: { [sectionName]: [ {id, title, difficulty, url} ] } } }
    const [topicData, setTopicData] = useState({});
    const [newSectionName, setNewSectionName] = useState("");
    const [isAddingSection, setIsAddingSection] = useState(false);

    useEffect(() => {
        chrome.storage.local.get(['leetcode_topics', 'leetcode_data'], (res) => {
            if (res.leetcode_topics && Array.isArray(res.leetcode_topics) && res.leetcode_topics.length > 0) {
                setTopics(res.leetcode_topics);
            }
            if (res.leetcode_data) {
                setTopicData(res.leetcode_data);
            }
        });
    }, []);

    const saveTopicData = (newData) => {
        setTopicData(newData);
        chrome.storage.local.set({ leetcode_data: newData });
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
    };

    const addSection = () => {
        if (!newSectionName.trim() || !activeTopic) return;
        const currentTopicData = topicData[activeTopic] || { sections: {} };
        // We initialize with default sections if empty, but here we just add new one
        const updatedSections = { ...currentTopicData.sections, [newSectionName]: [] };
        const updatedTopicData = { ...topicData, [activeTopic]: { ...currentTopicData, sections: updatedSections } };
        saveTopicData(updatedTopicData);
        setNewSectionName("");
        setIsAddingSection(false);
    };

    const addCurrentQuestion = async (sectionName) => {
        // Get details from content script
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        chrome.tabs.sendMessage(tab.id, { action: "getLeetCodeProblemDetails" }, (response) => {
            if (chrome.runtime.lastError || !response) {
                alert("Could not get problem details. Refresh the LeetCode page.");
                return;
            }

            const { title, difficulty, url } = response;
            const question = { id: Date.now().toString(), title, difficulty, url };

            const currentTopicData = topicData[activeTopic] || { sections: {} };
            // Ensure section exists (though it should if we clicked add on it)
            const currentSectionQuestions = currentTopicData.sections[sectionName] || [];

            // Check duplicates
            if (currentSectionQuestions.some(q => q.title === title)) {
                alert("Question already in this section!");
                return;
            }

            const updatedSections = {
                ...currentTopicData.sections,
                [sectionName]: [...currentSectionQuestions, question]
            };

            saveTopicData({ ...topicData, [activeTopic]: { ...currentTopicData, sections: updatedSections } });
        });
    };

    const getSections = (topic) => {
        const data = topicData[topic] || {};
        const storedSections = data.sections || {};
        // Ensure defaults always exist
        const defaults = ["Easy", "Medium", "Hard"];
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
                storageKey={`leetcode_note_${activeTopic}_${activeQuestion.id}`}
                onBack={() => setActiveQuestion(null)}
            />
        );
    }

    // 2. Topic Detail Board
    if (activeTopic) {
        const sections = getSections(activeTopic);
        return (
            <div className="h-full flex flex-col bg-slate-50 font-sans text-slate-700">
                <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-3 shrink-0 shadow-sm">
                    <button onClick={() => setActiveTopic(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-display font-bold text-lg text-slate-800 leading-none">{activeTopic}</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">Board</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Add Section Button (only visible if we want custom sections, maybe toggle?) */}
                    {/* For now let's just list sections */}

                    {Object.entries(sections).map(([name, questions]) => {
                        let colorClass = DIFFICULTY_COLORS[name] || DIFFICULTY_COLORS.Custom;
                        // Override color based on name if it matches standard difficulties
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

                    {/* Add Custom Section UI */}
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

    // 3. Main Topic List (Same aesthetic as before)
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
                        onClick={() => setActiveTopic(topic)}
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
