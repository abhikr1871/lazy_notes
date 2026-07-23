import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Sparkles, Brain, Copy, Check, PlusCircle, RefreshCw, AlertCircle, Zap, Code, Send, Bug, MessageSquare, BookOpen } from 'lucide-react';

export default function AIExplainerView({ title, platform = 'Coding Platform', currentCode = '', language = 'python', noteKey, onAppendToNotes }) {
    // Active View Mode: 'breakdown', 'debugger', 'chat', 'flashcard'
    const [activeTab, setActiveTab] = useState('breakdown');

    // Core Breakdown State
    const [explanation, setExplanation] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [includeCode, setIncludeCode] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);
    const [appended, setAppended] = useState(false);
    const [error, setError] = useState('');
    const [selectedLang, setSelectedLang] = useState(language || 'python');

    // Error Debugger State
    const [errorMsg, setErrorMsg] = useState('');
    const [inputData, setInputData] = useState('');
    const [expectedOutput, setExpectedOutput] = useState('');
    const [actualOutput, setActualOutput] = useState('');
    const [errorAnalysis, setErrorAnalysis] = useState('');
    const [isAnalyzingError, setIsAnalyzingError] = useState(false);

    // AI Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingChat, setIsSendingChat] = useState(false);
    const chatEndRef = useRef(null);

    // Flashcard State
    const [flashcards, setFlashcards] = useState('');
    const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

    const cacheKey = `ai_explain_${platform.toLowerCase()}_${title.replace(/\s+/g, '_')}_${selectedLang}`;

    // Load cached explanation if available for selected language
    useEffect(() => {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setExplanation(cached);
        } else {
            setExplanation('');
        }
    }, [cacheKey]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleGenerate = async (overrideLang) => {
        const langToUse = overrideLang || selectedLang;
        setIsGenerating(true);
        setError('');
        try {
            const data = await api.ai.explain({
                title,
                code: includeCode ? currentCode : '',
                language: langToUse,
                platform
            });

            if (data && data.explanation) {
                const cleaned = cleanMathNotation(data.explanation);
                setExplanation(cleaned);
                localStorage.setItem(`ai_explain_${platform.toLowerCase()}_${title.replace(/\s+/g, '_')}_${langToUse}`, cleaned);
            } else {
                setError('Failed to generate explanation. Check your backend server and Gemini API Key.');
            }
        } catch (e) {
            setError(e.message || 'Error communicating with AI Service.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLanguageChange = (newLang) => {
        setSelectedLang(newLang);
        handleGenerate(newLang);
    };

    const copyToClipboard = (textToCopy) => {
        if (!textToCopy) return false;
        let success = false;
        try {
            const textarea = document.createElement("textarea");
            textarea.value = textToCopy;
            textarea.style.position = "fixed";
            textarea.style.top = "0";
            textarea.style.left = "-9999px";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            success = document.execCommand("copy");
            document.body.removeChild(textarea);
        } catch (err) {
            console.error("execCommand copy failed:", err);
        }

        if (!success && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(textToCopy).catch(e => console.error("Clipboard API failed:", e));
            return true;
        }
        return success;
    };

    const handleCopy = () => {
        copyToClipboard(explanation);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyCodeSnippet = (codeText, idx) => {
        copyToClipboard(codeText);
        setCopiedCodeIdx(idx);
        setTimeout(() => setCopiedCodeIdx(null), 2000);
    };

    const handleAppend = (contentToSave = explanation, titlePrefix = "🤖 AI Breakdown") => {
        if (onAppendToNotes && contentToSave) {
            const htmlToAppend = `
                <br/>
                <hr/>
                <h3>${titlePrefix} (${selectedLang.toUpperCase()})</h3>
                <div>${contentToSave.replace(/\n/g, '<br/>')}</div>
            `;
            onAppendToNotes(htmlToAppend);
            setAppended(true);
            setTimeout(() => setAppended(false), 2000);
        }
    };

    // --- Error Debugger Handler ---
    const handleAnalyzeError = async () => {
        setIsAnalyzingError(true);
        try {
            const data = await api.ai.analyzeError({
                title,
                code: currentCode,
                error_msg: errorMsg,
                input_data: inputData,
                expected: expectedOutput,
                actual: actualOutput,
                platform,
                language: selectedLang
            });
            if (data && data.analysis) {
                setErrorAnalysis(cleanMathNotation(data.analysis));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzingError(false);
        }
    };

    // --- Chat Follow-up Handler ---
    const handleSendChat = async () => {
        if (!chatInput.trim() || isSendingChat) return;

        const userMsg = chatInput.trim();
        setChatInput('');
        const updatedHistory = [...chatMessages, { role: 'user', content: userMsg }];
        setChatMessages(updatedHistory);
        setIsSendingChat(true);

        try {
            const data = await api.ai.chat({
                title,
                history: updatedHistory,
                message: userMsg,
                code: currentCode,
                platform,
                language: selectedLang
            });

            if (data && data.reply) {
                setChatMessages([...updatedHistory, { role: 'ai', content: cleanMathNotation(data.reply) }]);
            }
        } catch (e) {
            setChatMessages([...updatedHistory, { role: 'ai', content: '❌ Error: Failed to fetch AI response.' }]);
        } finally {
            setIsSendingChat(false);
        }
    };

    // --- Flashcards Generator Handler ---
    const handleGenerateFlashcard = async () => {
        setIsGeneratingFlashcards(true);
        try {
            const data = await api.ai.generateFlashcard({
                title,
                platform,
                explanation: explanation || title
            });
            if (data && data.flashcards) {
                setFlashcards(cleanMathNotation(data.flashcards));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingFlashcards(false);
        }
    };

    // Clean up LaTeX and raw $ math formatting from output
    const cleanMathNotation = (text) => {
        if (!text) return '';
        return text
            .replace(/\\mathcal\{O\}/g, 'O')
            .replace(/\\mathcal\{([^}]+)\}/g, '$1')
            .replace(/\\mathrm\{([^}]+)\}/g, '$1')
            .replace(/\\cdot/g, ' * ')
            .replace(/\$([^$\n]+)\$/g, '$1')
            .replace(/\$\$/g, '');
    };

    // Render markdown with special code editor blocks
    const renderMarkdownContent = (rawText) => {
        if (!rawText) return null;
        const cleanedText = cleanMathNotation(rawText);
        const parts = cleanedText.split(/```/g);

        return parts.map((part, index) => {
            if (index % 2 === 1) {
                const lines = part.split('\n');
                const firstLine = lines[0].trim();
                let codeLang = selectedLang;
                let codeContent = part;

                if (firstLine && !firstLine.includes(' ') && firstLine.length < 15) {
                    codeLang = firstLine;
                    codeContent = lines.slice(1).join('\n').trim();
                } else {
                    codeContent = part.trim();
                }

                return (
                    <div key={index} className="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg">
                        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <Code className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300">
                                    {codeLang || selectedLang} Solution
                                </span>
                            </div>
                            <button
                                onClick={() => handleCopyCodeSnippet(codeContent, index)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                            >
                                {copiedCodeIdx === index ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedCodeIdx === index ? 'Copied' : 'Copy Code'}</span>
                            </button>
                        </div>
                        <pre className="p-4 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto bg-slate-950 selection:bg-indigo-900 selection:text-white">
                            <code>{codeContent}</code>
                        </pre>
                    </div>
                );
            }

            const lines = part.split('\n');
            return (
                <div key={index} className="space-y-2">
                    {lines.map((line, idx) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('### ')) {
                            return (
                                <h3 key={idx} className="font-bold text-sm text-indigo-950 mt-4 mb-2 flex items-center gap-2 border-b border-slate-100 pb-1">
                                    {trimmed.replace('### ', '')}
                                </h3>
                            );
                        }
                        if (trimmed.startsWith('## ')) {
                            return (
                                <h2 key={idx} className="font-bold text-base text-indigo-950 mt-5 mb-2 border-b border-slate-200 pb-1">
                                    {trimmed.replace('## ', '')}
                                </h2>
                            );
                        }
                        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            const content = trimmed.substring(2);
                            return (
                                <li key={idx} className="ml-4 mb-1 list-disc text-slate-700 text-xs leading-relaxed">
                                    <span dangerouslySetInnerHTML={{ __html: formatInlineBold(content) }} />
                                </li>
                            );
                        }
                        if (trimmed === '') {
                            return <div key={idx} className="h-1" />;
                        }
                        return (
                            <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-1.5">
                                <span dangerouslySetInnerHTML={{ __html: formatInlineBold(trimmed) }} />
                            </p>
                        );
                    })}
                </div>
            );
        });
    };

    const formatInlineBold = (str) => {
        return str
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>');
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
            {/* Main Header */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-4 shrink-0 shadow-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-white/10 backdrop-blur rounded-xl border border-white/10">
                            <Brain className="w-5 h-5 text-purple-300 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                                AI Problem Breakdown
                            </h2>
                            <p className="text-[11px] text-indigo-200/80 truncate max-w-[180px]">
                                {title} ({platform})
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => handleGenerate()}
                        disabled={isGenerating}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 shrink-0 ${
                            isGenerating
                                ? 'bg-indigo-700/50 text-indigo-200 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Analyzing...</span>
                            </>
                        ) : explanation ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Regenerate</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Explain Problem</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Sub-Tab Pill Bar */}
                <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1 overflow-x-auto scrollbar-none text-xs">
                    <button
                        onClick={() => setActiveTab('breakdown')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            activeTab === 'breakdown' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:bg-white/10'
                        }`}
                    >
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span>Breakdown</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('debugger')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            activeTab === 'debugger' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:bg-white/10'
                        }`}
                    >
                        <Bug className="w-3 h-3 text-rose-400" />
                        <span>Debug Error</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            activeTab === 'chat' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:bg-white/10'
                        }`}
                    >
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                        <span>AI Chat</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('flashcard')}
                        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                            activeTab === 'flashcard' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:bg-white/10'
                        }`}
                    >
                        <BookOpen className="w-3 h-3 text-purple-300" />
                        <span>Flashcard</span>
                    </button>
                </div>
            </div>

            {/* Content Display Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 1. Breakdown Tab */}
                {activeTab === 'breakdown' && (
                    <>
                        {/* Target Language & Context Options Bar */}
                        <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-semibold">Language:</span>
                                <select
                                    value={selectedLang}
                                    onChange={(e) => handleLanguageChange(e.target.value)}
                                    disabled={isGenerating}
                                    className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded border border-slate-200 outline-none uppercase cursor-pointer"
                                >
                                    <option value="python">Python 3</option>
                                    <option value="cpp">C++</option>
                                    <option value="java">Java</option>
                                    <option value="javascript">JavaScript</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded font-semibold flex items-center gap-1"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    <span>{copied ? 'Copied' : 'Copy'}</span>
                                </button>
                                {onAppendToNotes && (
                                    <button
                                        onClick={() => handleAppend(explanation, "🤖 AI Breakdown")}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-semibold flex items-center gap-1"
                                    >
                                        {appended ? <Check className="w-3 h-3 text-emerald-600" /> : <PlusCircle className="w-3 h-3" />}
                                        <span>{appended ? 'Appended!' : 'Save Notes'}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Execution Failed</p>
                                    <p className="mt-0.5 text-[11px]">{error}</p>
                                </div>
                            </div>
                        )}

                        {isGenerating ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                                <p className="font-bold text-sm text-slate-800">Generating AI Breakdown in {selectedLang.toUpperCase()}...</p>
                            </div>
                        ) : explanation ? (
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <div className="prose prose-slate prose-xs max-w-none">
                                    {renderMarkdownContent(explanation)}
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                                <Sparkles className="w-8 h-8 text-purple-600 mb-2" />
                                <h3 className="font-bold text-slate-800 text-sm">Need Help Understanding This Problem?</h3>
                                <p className="text-xs text-slate-500 max-w-xs mt-1">
                                    Click <strong>"Explain Problem"</strong> to get an AI breakdown of core intuition, step-by-step logic, complexity, and solution code in <strong>{selectedLang.toUpperCase()}</strong>.
                                </p>
                                <button
                                    onClick={() => handleGenerate()}
                                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4 text-purple-300" />
                                    <span>Generate AI Breakdown</span>
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* 2. Error Debugger Tab */}
                {activeTab === 'debugger' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3 text-xs">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Bug className="w-4 h-4 text-rose-500" />
                            <h3 className="font-bold text-slate-800">Analyze Submission Error or Failed Test Case</h3>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">Error / Exception Message (Optional)</label>
                            <input
                                type="text"
                                placeholder="e.g. Wrong Answer on Test 3, Time Limit Exceeded, SIGSEGV..."
                                value={errorMsg}
                                onChange={(e) => setErrorMsg(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block font-semibold text-slate-600 mb-1">Failing Input</label>
                                <textarea
                                    rows={2}
                                    placeholder="Input data..."
                                    value={inputData}
                                    onChange={(e) => setInputData(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-[11px]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-600 mb-1">Expected Output</label>
                                <textarea
                                    rows={2}
                                    placeholder="Expected output..."
                                    value={expectedOutput}
                                    onChange={(e) => setExpectedOutput(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-[11px]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-semibold text-slate-600 mb-1">Actual Output Produced</label>
                            <textarea
                                rows={2}
                                placeholder="Actual output produced by code..."
                                value={actualOutput}
                                onChange={(e) => setActualOutput(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono text-[11px]"
                            />
                        </div>

                        <button
                            onClick={handleAnalyzeError}
                            disabled={isAnalyzingError}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-200 transition-all"
                        >
                            {isAnalyzingError ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Analyzing Failure...</span>
                                </>
                            ) : (
                                <>
                                    <Bug className="w-3.5 h-3.5" />
                                    <span>Diagnose Failure</span>
                                </>
                            )}
                        </button>

                        {errorAnalysis && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                {renderMarkdownContent(errorAnalysis)}
                            </div>
                        )}
                    </div>
                )}

                {/* 3. AI Chat Tab */}
                {activeTab === 'chat' && (
                    <div className="flex flex-col h-[400px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
                                Ask AI Follow-up Questions
                            </span>
                            <span className="text-[10px] font-normal text-slate-400">Context: {title}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {chatMessages.length === 0 && (
                                <div className="py-8 text-center text-slate-400">
                                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-cyan-500 opacity-60" />
                                    <p className="font-semibold text-slate-600">Have questions about this problem?</p>
                                    <p className="text-[11px] mt-0.5">Ask about specific code lines, complexity, or alternative iterative/DP approaches!</p>
                                </div>
                            )}

                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] p-3 rounded-2xl ${
                                            msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                                                : 'bg-slate-100 text-slate-800 border border-slate-200/80 rounded-bl-none'
                                        }`}
                                    >
                                        {msg.role === 'ai' ? renderMarkdownContent(msg.content) : msg.content}
                                    </div>
                                </div>
                            ))}
                            {isSendingChat && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 text-slate-500 p-2.5 rounded-2xl text-[11px] flex items-center gap-1.5">
                                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                                        <span>AI is thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Bar */}
                        <div className="p-2 bg-slate-50 border-t border-slate-200 flex gap-2">
                            <input
                                type="text"
                                placeholder="Type your follow-up question..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700"
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || isSendingChat}
                                className="px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. Flashcards Tab */}
                {activeTab === 'flashcard' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-purple-600" />
                                <h3 className="font-bold text-slate-800">Interview Pattern Flashcard</h3>
                            </div>
                            <button
                                onClick={handleGenerateFlashcard}
                                disabled={isGeneratingFlashcards}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                                {isGeneratingFlashcards ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                <span>{flashcards ? 'Regenerate' : 'Generate'}</span>
                            </button>
                        </div>

                        {flashcards ? (
                            <div className="space-y-3">
                                <div className="prose prose-slate prose-xs max-w-none">
                                    {renderMarkdownContent(flashcards)}
                                </div>
                                {onAppendToNotes && (
                                    <button
                                        onClick={() => handleAppend(flashcards, "🎴 Key Interview Takeaway Flashcard")}
                                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        <span>Save Flashcard to Notes</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-400">
                                <BookOpen className="w-8 h-8 mx-auto mb-2 text-purple-400 opacity-60" />
                                <p className="font-semibold text-slate-600">Quick Interview Takeaway Cards</p>
                                <p className="text-[11px] mt-0.5 max-w-xs mx-auto">Extract core algorithm patterns, key tricks, and common pitfalls for fast pre-interview review.</p>
                                <button
                                    onClick={handleGenerateFlashcard}
                                    className="mt-3 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
                                >
                                    Generate Takeaways
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
