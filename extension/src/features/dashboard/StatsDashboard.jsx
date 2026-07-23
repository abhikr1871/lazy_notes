import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Flame, BookOpen, Code, Youtube, RefreshCw, BarChart2, Calendar, Trophy } from 'lucide-react';

export default function StatsDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await api.stats.get();
            if (data) {
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to load stats:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 space-y-3">
                <BarChart2 className="w-10 h-10 text-indigo-600 animate-pulse" />
                <p className="font-bold text-sm">Loading Learning Analytics...</p>
            </div>
        );
    }

    const {
        total_notes = 0,
        leetcode_count = 0,
        codeforces_count = 0,
        youtube_count = 0,
        streak_days = 0,
        daily_activity = {},
        topic_counts = {}
    } = stats || {};

    // Generate last 84 days (12 weeks) for Contribution Heatmap Grid
    const generateHeatmapDays = () => {
        const days = [];
        const today = new Date();
        for (let i = 83; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const count = daily_activity[dateStr] || 0;
            days.push({ date: dateStr, count });
        }
        return days;
    };

    const heatmapDays = generateHeatmapDays();

    const getHeatmapColor = (count) => {
        if (count === 0) return 'bg-slate-100 border-slate-200/60';
        if (count === 1) return 'bg-emerald-200 border-emerald-300';
        if (count === 2) return 'bg-emerald-400 border-emerald-500';
        return 'bg-emerald-600 border-emerald-700';
    };

    const sortedTopics = Object.entries(topic_counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const maxTopicCount = sortedTopics.length > 0 ? sortedTopics[0][1] : 1;

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-y-auto font-sans text-slate-700 p-4 space-y-4">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 backdrop-blur rounded-xl border border-white/10">
                        <BarChart2 className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                        <h2 className="font-extrabold text-base text-white">Learning Analytics</h2>
                        <p className="text-[11px] text-indigo-200/80">Track your problem solving consistency</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/30 text-amber-300 font-bold text-xs">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>{streak_days} Day Streak!</span>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <BookOpen className="w-4 h-4 text-amber-600 mb-1" />
                    <span className="font-extrabold text-base text-slate-900">{leetcode_count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">LeetCode</span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Code className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="font-extrabold text-base text-slate-900">{codeforces_count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Codeforces</span>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <Youtube className="w-4 h-4 text-rose-600 mb-1" />
                    <span className="font-extrabold text-base text-slate-900">{youtube_count}</span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">YouTube</span>
                </div>
            </div>

            {/* 12-Week GitHub Contribution Heatmap */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Daily Activity Heatmap (Last 12 Weeks)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Total: {total_notes} Notes</span>
                </div>

                <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
                    {heatmapDays.map((d, i) => (
                        <div
                            key={i}
                            title={`${d.date}: ${d.count} note(s)`}
                            className={`w-3 h-3 rounded-sm border transition-all ${getHeatmapColor(d.count)}`}
                        />
                    ))}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Less</span>
                    <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-200/60" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-200 border border-emerald-300" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400 border border-emerald-500" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600 border border-emerald-700" />
                    </div>
                    <span>More</span>
                </div>
            </div>

            {/* Topic Mastery Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-100 pb-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Topic Mastery Breakdown</span>
                </div>

                {sortedTopics.length === 0 ? (
                    <p className="text-slate-400 text-[11px] text-center py-4 italic">
                        No topic breakdown available yet. Save notes to populate topic mastery!
                    </p>
                ) : (
                    <div className="space-y-2.5">
                        {sortedTopics.map(([topic, count]) => {
                            const pct = Math.round((count / maxTopicCount) * 100);
                            return (
                                <div key={topic} className="space-y-1">
                                    <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                                        <span>{topic}</span>
                                        <span className="text-slate-400">{count} notes</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
