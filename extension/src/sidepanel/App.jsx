import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import NoteEditor from '../pages/NoteEditor';
import Login from '../pages/Login';
import Signup from '../pages/Signup';

function App() {
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
