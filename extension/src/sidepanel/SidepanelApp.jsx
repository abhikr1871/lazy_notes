import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import YoutubeNotes from '../features/youtube/YoutubeNotes';
import Login from '../features/auth/Login';
import Signup from '../features/auth/Signup';
import LeetCodeManager from '../features/leetcode/LeetCodeManager';
import CodeforcesManager from '../features/codeforces/CodeforcesManager';

function App() {
    const [context, setContext] = useState(null);
    const [tab, setTab] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setContext(params.get('context'));
        setTab(params.get('tab'));
    }, []);

    if (context === 'leetcode') {
        return (
            <Router>
                <Routes>
                    <Route path="/" element={<LeetCodeManager initialTab={tab} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </Router>
        );
    }

    if (context === 'codeforces') {
        return (
            <Router>
                <Routes>
                    <Route path="/" element={<CodeforcesManager initialTab={tab} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </Router>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<YoutubeNotes />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </Router>
    );
}

export default App;
