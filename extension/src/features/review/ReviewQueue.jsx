import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Brain, CheckCircle2, RotateCcw, Eye, Sparkles, ChevronRight, RefreshCw, Flame, BookOpen } from 'lucide-react';

export default function ReviewQueue({ onSelectQuestion }) {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const data = await api.review.getQueue();
            if (data && data.queue) {
                setQueue(data.queue);
            }
        } catch (e) {
            console.error("Failed to load review queue:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
    }, []);

    const handleRating = async (rating) => {
        if (queue.length === 0 || isSubmitting) return;

        const currentItem = queue[currentIndex];
        setIsSubmitting(true);

        try {
            await api.review.submit({
                problem_id: currentItem.problem_id,
                platform: currentItem.platform,
                rating: rating
            });

            // Move to next in queue
            setShowAnswer(false);
            if (currentIndex + 1 < queue.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                // Done with current batch
                setQueue([]);
            }
        } catch (e) {
            console.error("Failed to submit rating:", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 p-6 space-y-3">
                <Brain className="w-10 h-10 text-indigo-600 animate-pulse" />
                <p className="font-bold text-sm">Loading Spaced Repetition Queue...</p>
            </div>
        );
    }

    if (queue.length === 0 || currentIndex >= queue.length) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-700 p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-100">
                    <CheckCircle2 size={36} />
                </div>
                <div>
                    <h2 className="font-extrabold text-lg text-slate-900">All Due Reviews Completed! 🎉</h2>
                    <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                        Great job keeping your DSA problem patterns fresh! Check back tomorrow for your next spaced repetition review queue.
                    </p>
                </div>
                <button
                    onClick={loadQueue}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-200"
                >
                    <RefreshCw size={14} />
                    <span>Check Queue Again</span>
                </button>
            </div>
        );
    }

    const currentItem = queue[currentIndex];

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-700">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 shrink-0 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/10 backdrop-blur rounded-xl border border-white/10">
                        <Brain className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                        <h1 className="font-bold text-sm text-white flex items-center gap-1.5">
                            Spaced Repetition Review
                        </h1>
                        <p className="text-[11px] text-indigo-200/80">
                            Item {currentIndex + 1} of {queue.length} Due Today
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full border border-white/10 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{queue.length - currentIndex} Left</span>
                </div>
            </header>

            {/* Flashcard Canvas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 relative">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            currentItem.platform === 'LeetCode' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                            {currentItem.platform}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {currentItem.difficulty}
                        </span>
                    </div>

                    {/* Question Title */}
                    <div>
                        <h2 className="font-extrabold text-base text-slate-900 leading-snug">
                            {currentItem.title}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <span>Reviewed {currentItem.review_count} times</span>
                            <span>•</span>
                            <span>Ease Factor: {currentItem.ease_factor || 2.5}</span>
                        </p>
                    </div>

                    {/* Reveal Answer Section */}
                    {!showAnswer ? (
                        <div className="py-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                            <BookOpen className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-70" />
                            <p className="text-xs font-semibold text-slate-600">Recall the core DSA pattern & optimal approach</p>
                            <button
                                onClick={() => setShowAnswer(true)}
                                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 mx-auto"
                            >
                                <Eye size={14} />
                                <span>Show Solution & Notes</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3 pt-3 border-t border-slate-100 animate-fade-in">
                            {/* Notes Content */}
                            {currentItem.notes ? (
                                <div className="space-y-1">
                                    <h4 className="font-bold text-xs text-indigo-900 uppercase tracking-wider">Your Saved Notes:</h4>
                                    <div
                                        className="prose prose-slate prose-xs max-w-none p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed max-h-48 overflow-y-auto"
                                        dangerouslySetInnerHTML={{ __html: currentItem.notes }}
                                    />
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No notes saved for this problem.</p>
                            )}

                            {/* Saved Code */}
                            {currentItem.code && (
                                <div className="space-y-1">
                                    <h4 className="font-bold text-xs text-emerald-900 uppercase tracking-wider">Saved Solution Code:</h4>
                                    <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-48">
                                        <code>{currentItem.code}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Rating Bar (Only visible when answer shown) */}
                {showAnswer && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2 animate-fade-in">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                            How well did you recall this problem?
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => handleRating(1)}
                                disabled={isSubmitting}
                                className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-95"
                            >
                                <span>Again</span>
                                <span className="text-[9px] font-normal opacity-75">1 Day</span>
                            </button>

                            <button
                                onClick={() => handleRating(2)}
                                disabled={isSubmitting}
                                className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-95"
                            >
                                <span>Hard</span>
                                <span className="text-[9px] font-normal opacity-75">3 Days</span>
                            </button>

                            <button
                                onClick={() => handleRating(3)}
                                disabled={isSubmitting}
                                className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-95"
                            >
                                <span>Good</span>
                                <span className="text-[9px] font-normal opacity-75">6 Days</span>
                            </button>

                            <button
                                onClick={() => handleRating(4)}
                                disabled={isSubmitting}
                                className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition-all active:scale-95"
                            >
                                <span>Easy</span>
                                <span className="text-[9px] font-normal opacity-75">12 Days</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
