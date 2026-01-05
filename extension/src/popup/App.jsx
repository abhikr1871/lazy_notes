import React, { useState } from 'react';
import { Settings, MessageSquare, FileText, PenTool } from 'lucide-react';

function App() {
    const [activeTab, setActiveTab] = useState('chat');

    return (
        <div className="w-[350px] h-[500px] bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white p-4 shadow-sm flex justify-between items-center z-10">
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    IntelliAsk AI
                </h1>
                <button onClick={() => chrome.runtime.openOptionsPage()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Settings size={20} className="text-slate-600" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4">
                {activeTab === 'chat' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                            <p className="text-slate-600 text-sm">
                                Hi! I'm your AI assistant. Ask me questions about this page or anything else.
                            </p>
                        </div>
                    </div>
                )}
                {activeTab === 'summary' && (
                    <div className="space-y-4">
                        <button className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            Summarize This Page
                        </button>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="bg-white border-t border-slate-200 grid grid-cols-3 p-2">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'chat' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <MessageSquare size={20} />
                    <span className="text-xs mt-1 font-medium">Chat</span>
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'summary' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <FileText size={20} />
                    <span className="text-xs mt-1 font-medium">Summary</span>
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${activeTab === 'notes' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <PenTool size={20} />
                    <span className="text-xs mt-1 font-medium">Notes</span>
                </button>
            </nav>
        </div>
    );
}

export default App;
