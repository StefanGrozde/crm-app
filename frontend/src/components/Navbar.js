import React, { useState, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import SearchBar from './SearchBar';
import EditUserPopup from './EditUserPopup';

const Navbar = ({ 
    views, 
    onLoadView, 
    onOpenSearchResult, 
    onOpenPageTab,
    currentViewId
}) => {
    // Debug logging
    console.log('Navbar render - currentViewId:', currentViewId, 'type:', typeof currentViewId);
    console.log('Navbar render - views:', views, 'type:', typeof views);
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Menu states
    const [menuOpen, setMenuOpen] = useState(false);
    const [pagesMenuOpen, setPagesMenuOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false);
    const menuRef = useRef(null);

    // Handle clicks outside menu
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
            // Close pages menu when clicking outside
            if (!event.target.closest('[data-pages-menu]')) {
                setPagesMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);
    
    const handleOpenEditPopup = () => {
        setMenuOpen(false);
        setEditPopupOpen(true);
    };

    // Convenience functions for specific pages
    const handleOpenContactsTab = () => onOpenPageTab('contacts', 'Contacts', 'contacts-widget');
    const handleOpenLeadsTab = () => onOpenPageTab('leads', 'Leads', 'leads-widget');
    const handleOpenOpportunitiesTab = () => onOpenPageTab('opportunities', 'Opportunities', 'opportunities-widget');
    const handleOpenBusinessTab = () => onOpenPageTab('business', 'Business', 'business-widget');
    const handleOpenUsersTab = () => onOpenPageTab('users', 'Users', 'users-widget');

    return (
        <>
            {/* Modals */}
            {isEditPopupOpen && <EditUserPopup onClose={() => setEditPopupOpen(false)} />}

            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        
                        {/* Search Bar - Centered */}
                        <div className="flex-1 max-w-2xl mx-8">
                            <SearchBar 
                                placeholder="Search contacts, leads, opportunities, companies..."
                                className="w-full"
                                onOpenResult={onOpenSearchResult}
                            />
                        </div>
                        
                        {/* View selector and controls */}
                        <div className="flex items-center space-x-4">
                            {/* Pages dropdown */}
                            <div className="relative" data-pages-menu>
                                <button
                                    onClick={() => setPagesMenuOpen(!pagesMenuOpen)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span>Pages</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {pagesMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                                        <button
                                            onClick={() => {
                                                handleOpenContactsTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span>Contacts</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenLeadsTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                            <span>Leads</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenOpportunitiesTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                            <span>Opportunities</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenBusinessTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span>Business</span>
                                        </button>
                                        {user.role === 'Administrator' && (
                                            <>
                                                <div className="border-t border-gray-200 my-1"></div>
                                                <button
                                                    onClick={() => {
                                                        handleOpenUsersTab();
                                                        setPagesMenuOpen(false);
                                                    }}
                                                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                                >
                                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                    </svg>
                                                    <span>Users</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* View selector dropdown */}
                            <select 
                                value="" 
                                onChange={(e) => {
                                    if (e.target.value) {
                                        onLoadView(e.target.value);
                                    }
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="">Open View...</option>
                                {Array.isArray(views) && views.map(view => (
                                    <option key={view.id} value={view.id}>{view.name}</option>
                                ))}
                            </select>

                            {/* Edit mode toggle - always show, but disable on main pages */}
                            <button
                                onClick={() => {
                                    if (currentViewId && !String(currentViewId).includes('-page')) {
                                        window.location.href = `/edit-layout/${currentViewId}`;
                                    }
                                }}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    currentViewId && !String(currentViewId).includes('-page')
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                                disabled={!currentViewId || String(currentViewId).includes('-page')}
                                title={
                                    !currentViewId 
                                        ? "No view selected - a default view should be created automatically" 
                                        : String(currentViewId).includes('-page')
                                            ? "Edit Layout is not available on main pages"
                                            : "Open Edit Layout"
                                }
                            >
                                Edit Layout
                            </button>

                            {/* User menu */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={toggleMenu}
                                    className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                                >
                                    <span>{user.username}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                        <button 
                                            onClick={handleOpenEditPopup}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Edit Profile
                                        </button>
                                        {user.role === 'Administrator' && (
                                            <Link 
                                                to="/edit-company" 
                                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                Edit Company
                                            </Link>
                                        )}
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Navbar; 