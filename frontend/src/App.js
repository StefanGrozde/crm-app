// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import Login from './components/Login';

// --- Icon Components (from your original file) ---
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

function App() {
    const [token, setToken] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    if (!token) {
        // Render a full-page login view if not authenticated
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <Login setToken={setToken} />
            </div>
        );
    }
    
    // Render the main CRM dashboard if authenticated
    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex-shrink-0">
                            <h1 className="text-2xl font-bold text-gray-800">MyCRM</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                             <button
                                onClick={handleLogout}
                                type="button"
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <span className="sr-only">Logout</span>
                                <UserIcon />
                                <span className="ml-2 text-sm font-medium">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="py-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
                    <div className="mt-8 bg-white p-8 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-800">Welcome!</h2>
                        <p className="mt-2 text-gray-600">
                            You are logged in. This is where your main application content will be displayed.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;