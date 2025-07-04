// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// --- Icon Components (no changes here) ---
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

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, setUser } = useAuth();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompanyData = async () => {
            if (user && user.companyId) {
                try {
                    // We MUST include `withCredentials: true` for the browser to send the cookie.
                    const response = await axios.get(`${API_URL}/api/companies/${user.companyId}`, {
                        withCredentials: true, // <--- FIX: Added withCredentials
                    });
                    setCompany(response.data);
                } catch (error) {
                    console.error("Failed to fetch company details:", error);
                }
            }
            setLoading(false);
        };

        fetchCompanyData();
    }, [user]);

    const handleLogout = async () => {
        setUser(null);
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex-shrink-0">
                            <h1 className="text-2xl font-bold text-gray-800">
                                {company ? company.name : 'MyCRM'}
                            </h1>
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
                                onClick={handleLogout}
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
                    <h2 className="text-3xl font-bold leading-tight text-gray-900">
                        Welcome, {user?.email || 'User'}!
                    </h2>
                    <p className="mt-2 text-lg text-gray-600">
                        Your role: <span className="font-semibold text-gray-800">{user?.role}</span>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
