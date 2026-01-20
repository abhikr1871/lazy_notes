import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import NoteEditor from '../pages/NoteEditor';
import Login from '../pages/Login';
import Signup from '../pages/Signup';
import LeetCodeSidebar from './components/LeetCodeSidebar';
import CodeforcesSidebar from './components/CodeforcesSidebar';

function App() {
    const [context, setContext] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setContext(params.get('context'));
    }, []);

    if (context === 'leetcode') {
        return <LeetCodeSidebar />;
    }

    if (context === 'codeforces') {
        return <CodeforcesSidebar />;
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<NoteEditor />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
            </Routes>
        </Router>
    );
}

export default App;
