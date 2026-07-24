import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';
import { Youtube, BarChart2, Brain, Download } from 'lucide-react';
import ReviewQueue from '../review/ReviewQueue';
import StatsDashboard from '../dashboard/StatsDashboard';
import { exportTopicToPDF, exportTopicToMarkdown } from '../../utils/exporter';

export default function YoutubeNotes() {
    const [videoId, setVideoId] = useState(null);
    const [videoTitle, setVideoTitle] = useState("");
    const [viewMode, setViewMode] = useState('editor'); // 'editor', 'review', 'stats'

    const defaultContent = `
        <h3>Enter Title</h3>
        <p><i>Start typing your notes here...</i></p>
        <br/>
        <h4># Shortcuts</h4>
        <ul>
            <li><b>Snap Frame</b>: Capture video frame</li>
            <li><b>AutoSnap</b>: Auto-capture on slide change</li>
            <li><b>Timestamp</b>: Insert video time</li>
        </ul>
    `;

    useEffect(() => {
        const updateVideoId = () => {
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: "getYoutubeContext" }, (response) => {
                            if (chrome.runtime.lastError) return;
                            if (response && response.url) {
                                try {
                                    const url = new URL(response.url);
                                    if (url.hostname.includes("youtube.com")) {
                                        const id = url.searchParams.get("v");
                                        setVideoId(id || null);
                                        setVideoTitle(response.title ? response.title.replace(" - YouTube", "") : "");
                                    }
                                } catch (e) {}
                            }
                        });
                    }
                });
            }
        };

        updateVideoId();
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            const tabListener = (tabId, changeInfo) => {
                if (changeInfo.url || changeInfo.status === 'complete') {
                    updateVideoId();
                }
            };
            chrome.tabs.onUpdated.addListener(tabListener);
            return () => chrome.tabs.onUpdated.removeListener(tabListener);
        }
    }, []);

    const handleLoad = async () => {
        if (!videoId) return null;
        try {
            const data = await api.youtube.get(videoId);
            return data.note_content;
        } catch (e) {
            return null;
        }
    };

    const handleSave = async (content) => {
        if (!videoId) return;
        await api.youtube.save({
            video_id: videoId,
            video_title: videoTitle,
            note_content: content,
            timestamp: 0,
            images: []
        });
    };

    const handleExport = (format) => {
        const noteText = localStorage.getItem(`youtube_${videoId}`) || "";
        const mockQuestions = [{
            title: videoTitle || "YouTube Video Notes",
            notes: noteText,
            code: ""
        }];
        if (format === 'pdf') {
            exportTopicToPDF("YouTube_Notes", mockQuestions);
        } else {
            exportTopicToMarkdown("YouTube_Notes", mockQuestions);
        }
    };

    if (viewMode === 'review') {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <header className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <button onClick={() => setViewMode('editor')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center gap-1">
                        ← Back to Video Notes
                    </button>
                    <span className="text-xs font-bold text-rose-900">Spaced Repetition Queue</span>
                </header>
                <div className="flex-1 overflow-hidden">
                    <ReviewQueue />
                </div>
            </div>
        );
    }

    if (viewMode === 'stats') {
        return (
            <div className="h-full flex flex-col bg-slate-50">
                <header className="bg-white px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
                    <button onClick={() => setViewMode('editor')} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center gap-1">
                        ← Back to Video Notes
                    </button>
                    <span className="text-xs font-bold text-rose-900">Learning Analytics</span>
                </header>
                <div className="flex-1 overflow-hidden">
                    <StatsDashboard />
                </div>
            </div>
        );
    }

    if (!videoId) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-6 text-center space-y-3">
                <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                    <Youtube size={32} />
                </div>
                <h3 className="font-bold text-slate-800 text-base">YouTube Video Workspace</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                    Open any YouTube video tutorial (e.g. Striver DSA, NeetCode) to capture timestamps, slides, and smart notes!
                </p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header Bar */}
            <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                        <Youtube size={18} />
                    </div>
                    <div className="truncate">
                        <h1 className="font-bold text-xs text-slate-800 truncate" title={videoTitle}>{videoTitle || "YouTube Video"}</h1>
                        <p className="text-[9px] uppercase font-bold text-rose-600 tracking-wider">Video Workspace</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleExport('pdf')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                        title="Export Notes as PDF"
                    >
                        <Download size={11} /> PDF
                    </button>
                    <button
                        onClick={() => handleExport('md')}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                        title="Export Notes as Markdown"
                    >
                        <Download size={11} /> MD
                    </button>
                    <button
                        onClick={() => setViewMode('stats')}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg"
                        title="Analytics"
                    >
                        <BarChart2 size={14} />
                    </button>
                    <button
                        onClick={() => setViewMode('review')}
                        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg"
                        title="Review Queue"
                    >
                        <Brain size={14} />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden">
                <SmartEditor
                    storageKey={`youtube_${videoId}`}
                    placeholder={defaultContent}
                    onLoad={handleLoad}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
