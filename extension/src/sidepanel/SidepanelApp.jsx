import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import YoutubeNotes from '../features/youtube/YoutubeNotes';
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import LeetCodeManager from '../features/leetcode/LeetCodeManager';
import CodeforcesManager from '../features/codeforces/CodeforcesManager';
import GFGManager from '../features/gfg/GFGManager';

import UniversalManager from '../features/universal/UniversalManager';

function AuthGuard({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            let token = localStorage.getItem('token');
            if (!token && typeof chrome !== 'undefined' && chrome.storage) {
                const res = await chrome.storage.local.get(['token']);
                token = res.token;
            }
            if (token) {
                localStorage.setItem('token', token);
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
            }
        };
        checkAuth();
    }, []);

    if (isAuthenticated === null) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="*" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        );
    }

    return children;
}

function App() {
    const [context, setContext] = useState(null);
    const [tab, setTab] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setContext(params.get('context'));
        setTab(params.get('tab'));
    }, []);

    const renderMainContent = () => {
        if (context === 'leetcode') return <LeetCodeManager initialTab={tab} />;
        if (context === 'codeforces') return <CodeforcesManager initialTab={tab} />;
        if (context === 'gfg') return <GFGManager initialTab={tab} />;
        if (context === 'universal') return <UniversalManager initialTab={tab} />;
        return <YoutubeNotes />;
    };

    return (
        <Router>
            <AuthGuard>
                <Routes>
                    <Route path="/" element={renderMainContent()} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </AuthGuard>
        </Router>
    );
}

export default App;
