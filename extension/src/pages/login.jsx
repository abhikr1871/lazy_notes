import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed');
            }

            // Save token
            localStorage.setItem('token', data.access_token);
            // Redirect or notify success - for extension, maybe just show success state or close
            navigate('/');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display text-slate-700">
            {/* Background Decoration */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px]" />
            </div>

            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                className="fixed top-6 left-6 z-50 p-2 bg-white/80 backdrop-blur-md border border-white/50 rounded-full text-slate-500 hover:text-indigo-600 hover:bg-white shadow-sm transition-all group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 z-10 relative">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-2xl shadow-lg flex items-center justify-center transform rotate-3">
                            <span className="text-3xl">✨</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 tracking-tight mb-2">Welcome Back</h2>
                    <p className="text-slate-400 font-medium text-sm">Sign in to continue to Lazzy</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2" htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            required
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder-slate-400"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider" htmlFor="password">Password</label>
                            <a href="#" className="text-xs font-semibold text-indigo-500 hover:text-indigo-600">Forgot?</a>
                        </div>

                        <input
                            type="password"
                            id="password"
                            required
                            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-100">
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transaction-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-slate-500 text-sm font-medium">
                        Don't have an account?{' '}
                        <button onClick={() => navigate('/signup')} className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
                            Sign Up
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;
