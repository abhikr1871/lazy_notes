import React, { useState, useEffect } from 'react';
import SmartEditor from '../../shared/components/SmartEditor';
import { api } from '../../services/api';

export default function YoutubeNotes() {
    const [videoId, setVideoId] = useState(null);
    const [videoTitle, setVideoTitle] = useState("");

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
            // Ask the active tab's content script for the current URL to bypass iframe tab query limitations
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "getYoutubeContext" }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log("Could not contact content script");
                            return;
                        }
                        if (response && response.url) {
                            const url = new URL(response.url);
                            if (url.hostname.includes("youtube.com")) {
                                const id = url.searchParams.get("v");
                                setVideoId(id || null);
                                setVideoTitle(response.title ? response.title.replace(" - YouTube", "") : "");
                            }
                        }
                    });
                }
            });
        };

        // Initial fetch
        updateVideoId();

        // Listen for URL changes via Chrome's message system or tab update
        const tabListener = (tabId, changeInfo, tab) => {
            if (changeInfo.url || changeInfo.status === 'complete') {
                updateVideoId();
            }
        };

        chrome.tabs.onUpdated.addListener(tabListener);

        return () => {
            chrome.tabs.onUpdated.removeListener(tabListener);
        };
    }, []);

    const handleLoad = async () => {
        if (!videoId) return null;
        try {
            const data = await api.youtube.get(videoId);
            return data.note_content;
        } catch (e) {
            console.log("No YouTube note found");
            return null;
        }
    };

    const handleSave = async (content) => {
        if (!videoId) return;
        await api.youtube.save({
            video_id: videoId,
            video_title: videoTitle,
            note_content: content,
            timestamp: 0, // We could grab current time if we wanted
            images: []
        });
    };

    if (!videoId) {
        return <div className="p-4 text-center text-slate-500">Please open a YouTube video to take notes.</div>;
    }

    return (
        <SmartEditor
            storageKey={`youtube_${videoId}`}
            placeholder={defaultContent}
            onLoad={handleLoad}
            onSave={handleSave}
        />
    );
}
