const BASE_URL = 'http://localhost:8000';

const getHeaders = async (isMultipart = false) => {
    const headers = {};
    let token = localStorage.getItem('token');
    if (!token && typeof chrome !== 'undefined' && chrome.storage) {
        const res = await chrome.storage.local.get(['token']);
        if (res.token) token = res.token;
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || 'API request failed');
    }
    return data;
};

export const api = {
    // Auth
    auth: {
        login: async (email, password) => {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            return handleResponse(response);
        },
        register: async (username, email, password) => {
            const response = await fetch(`${BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });
            return handleResponse(response);
        }
    },

    // Notes
    notes: {
        get: async (noteId) => {
            const response = await fetch(`${BASE_URL}/notes/${noteId}`, {
                headers: await getHeaders()
            });
            return handleResponse(response);
        },
        save: async (noteId, content) => {
            const response = await fetch(`${BASE_URL}/notes`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify({ note_id: noteId, content })
            });
            // We return the parsed JSON if possible, else true if ok
            // But usually save returns something or nothing.
            // Let's rely on handleResponse throwing if !ok.
            // If response is ok but empty body, handleResponse might fail.
            // Backend seems to return just 200/201 maybe?
            // Safer:
            if (response.ok) {
                // clone to check body?
                // Just assuming it works for now or returns JSON
                try {
                    return await response.json();
                } catch (e) {
                    return true;
                }
            }
            return handleResponse(response);
        }
    },

    // Upload
    upload: {
        image: async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BASE_URL}/upload/image`, {
                method: 'POST',
                headers: await getHeaders(true), // true for multipart (no Content-Type header, browser sets it)
                body: formData
            });
            return handleResponse(response);
        }
    },

    // LeetCode
    leetcode: {
        getTree: async () => {
            const response = await fetch(`${BASE_URL}/leetcode/tree`, {
                headers: await getHeaders()
            });
            return handleResponse(response);
        },
        syncTree: async (topics, data) => {
            const response = await fetch(`${BASE_URL}/leetcode/tree`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify({ topics, data })
            });
            if (response.ok) return true;
            return handleResponse(response);
        },
        save: async (noteData) => {
            const response = await fetch(`${BASE_URL}/leetcode/save`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify(noteData)
            });
            return handleResponse(response);
        },
        get: async (slug) => {
            const response = await fetch(`${BASE_URL}/leetcode/${slug}`, {
                headers: await getHeaders()
            });
            // Handle 404 gracefully inside component or here?
            // backend returns {found: false} if not found, or the doc
            return handleResponse(response);
        }
    },

    // YouTube
    youtube: {
        save: async (noteData) => {
            const response = await fetch(`${BASE_URL}/youtube/save`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify(noteData)
            });
            return handleResponse(response);
        },
        get: async (videoId) => {
            const response = await fetch(`${BASE_URL}/youtube/${videoId}`, {
                headers: await getHeaders()
            });
            return handleResponse(response);
        }
    },

    // Codeforces
    codeforces: {
        getTree: async () => {
            const response = await fetch(`${BASE_URL}/codeforces/tree`, {
                headers: await getHeaders()
            });
            return handleResponse(response);
        },
        syncTree: async (topics, data) => {
            const response = await fetch(`${BASE_URL}/codeforces/tree`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify({ topics, data })
            });
            if (response.ok) return true;
            return handleResponse(response);
        },
        save: async (noteData) => {
            const response = await fetch(`${BASE_URL}/codeforces/save`, {
                method: 'POST',
                headers: await getHeaders(),
                body: JSON.stringify(noteData)
            });
            return handleResponse(response);
        },
        get: async (problemId) => {
            const response = await fetch(`${BASE_URL}/codeforces/${problemId}`, {
                headers: await getHeaders()
            });
            return handleResponse(response);
        }
    }
};
