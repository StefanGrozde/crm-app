// frontend/src/components/Dashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- Icon Components ---
const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const Dashboard = ({ handleLogout }) => {
    const navigate = useNavigate();

    const onLogoutClick = () => {
        handleLogout();
        navigate('/login'); // Navigate to login page after logout
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex-shrink-0">
                            <h1 className="text-2xl font-bold text-gray-800">MyCRM</h1>
                        </div>
                        <div className="flex-1 flex justify-center px-4 lg:ml-6">
                            <div className="w-full max-w-lg">
                                <label htmlFor="search" className="sr-only">Search</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <SearchIcon />
                                    </div>
                                    <input
                                        id="search"
                                        name="search"
                                        className="block w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:text-gray-900 focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        placeholder="Search for customers, deals, etc."
                                        type="search"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={onLogoutClick}
                                type="button"
                                className="flex items-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
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
};

export default Dashboard;