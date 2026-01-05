import React from 'react';

function App() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6">
                    IntelliAsk AI Settings
                </h1>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700">
                            API Key (Gemini or OpenAI)
                        </label>
                        <div className="mt-1">
                            <input
                                type="password"
                                name="apiKey"
                                id="apiKey"
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-slate-300 rounded-md p-2 border"
                                placeholder="sk-..."
                            />
                        </div>
                        <p className="mt-2 text-sm text-slate-500">
                            Your key is stored locally on your device.
                        </p>
                    </div>

                    <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
