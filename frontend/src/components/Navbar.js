import React, { useState, useRef, useContext, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import SearchBar from './SearchBar';
import EditUserPopup from './EditUserPopup';
import { getColorClass } from '../utils/tabColors';

const API_URL = process.env.REACT_APP_API_URL;

const Navbar = ({ 
    views, 
    onLoadView, 
    onOpenSearchResult, 
    onOpenPageTab,
    onOpenUserProfile,
    onOpenMyViews,
    currentViewId,
    onEnterEditMode,
    isEditMode
}) => {
    // Debug logging
    console.log('Navbar render - currentViewId:', currentViewId, 'type:', typeof currentViewId);
    console.log('Navbar render - views:', views, 'type:', typeof views);
    const { user, logout } = useContext(AuthContext);
    
    // Company state
    const [company, setCompany] = useState(null);
    const [loadingCompany, setLoadingCompany] = useState(true);
    
    // Menu states
    const [menuOpen, setMenuOpen] = useState(false);
    const [pagesMenuOpen, setPagesMenuOpen] = useState(false);
    const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false);
    const menuRef = useRef(null);

    // Fetch company details
    useEffect(() => {
        const fetchCompany = async () => {
            if (!user?.companyId) {
                setLoadingCompany(false);
                return;
            }
            
            try {
                const response = await axios.get(`${API_URL}/api/companies/${user.companyId}`, {
                    withCredentials: true
                });
                setCompany(response.data);
            } catch (error) {
                console.error('Error fetching company:', error);
            } finally {
                setLoadingCompany(false);
            }
        };

        fetchCompany();
    }, [user?.companyId]);

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
            // Close views menu when clicking outside
            if (!event.target.closest('[data-views-menu]')) {
                setViewsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const toggleMenu = () => setMenuOpen(!menuOpen);

    const handleViewProfile = () => {
        setMenuOpen(false);
        if (onOpenUserProfile) {
            onOpenUserProfile(user.id, user.username);
        }
    };

    const handleOpenMyViews = () => {
        setMenuOpen(false);
        if (onOpenMyViews) {
            onOpenMyViews();
        }
    };

    // Convenience functions for specific pages
    const handleOpenContactsTab = () => onOpenPageTab('contacts', 'Contacts', 'contacts-widget');
    const handleOpenLeadsTab = () => onOpenPageTab('leads', 'Leads', 'leads-widget');
    const handleOpenOpportunitiesTab = () => onOpenPageTab('opportunities', 'Opportunities', 'opportunities-widget');
    const handleOpenSalesTab = () => onOpenPageTab('sales', 'Sales', 'sales-widget');
    const handleOpenTasksTab = () => onOpenPageTab('tasks', 'Tasks', 'tasks-widget');
    const handleOpenTicketsTab = () => onOpenPageTab('tickets', 'Tickets', 'tickets-widget');
    const handleOpenBusinessTab = () => onOpenPageTab('business', 'Business', 'business-widget');
    const handleOpenUsersTab = () => onOpenPageTab('users', 'Users', 'users-widget');

    return (
        <>
            {/* Modals */}
            {isEditPopupOpen && <EditUserPopup onClose={() => setEditPopupOpen(false)} />}

            <header className="bg-white shadow-md w-full">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-4">
                        <h1 className="text-2xl font-bold text-gray-900 flex-shrink-0">
                            {loadingCompany ? 'Loading...' : company ? `${company.name}'s Dashboard` : 'Dashboard'}
                        </h1>
                        
                        {/* Search Bar - Centered */}
                        <div className="flex-1 flex justify-center px-8">
                            <div className="w-full max-w-2xl">
                                <SearchBar 
                                    placeholder="Search contacts, leads, opportunities, sales, companies, users..."
                                    className="w-full"
                                    onOpenResult={onOpenSearchResult}
                                />
                            </div>
                        </div>
                        
                        {/* View selector and controls */}
                        <div className="flex items-center space-x-4 flex-shrink-0">
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
                                                handleOpenSalesTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            <span>Sales</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenTasksTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                            <span>Tasks</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleOpenTicketsTab();
                                                setPagesMenuOpen(false);
                                            }}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                            <span>Tickets</span>
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
                            <div className="relative" data-views-menu>
                                <button
                                    onClick={() => setViewsMenuOpen(!viewsMenuOpen)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                    <span>Views</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {viewsMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200 max-h-80 overflow-y-auto">
                                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                                            Open View
                                        </div>
                                        {Array.isArray(views) && views.length > 0 ? (
                                            views.map(view => (
                                                <button
                                                    key={view.id}
                                                    onClick={() => {
                                                        onLoadView(view.id);
                                                        setViewsMenuOpen(false);
                                                    }}
                                                    className="w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-50 last:border-b-0"
                                                >
                                                    <div className={`w-3 h-3 rounded-full border border-gray-300 ${view.color ? getColorClass(view.color) : 'bg-blue-500'}`}></div>
                                                    <div className="flex-1">
                                                        <div className="font-medium">{view.name}</div>
                                                        {view.is_default && (
                                                            <div className="text-xs text-gray-400">Default View</div>
                                                        )}
                                                    </div>
                                                    {view.is_default && (
                                                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                No views available
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Edit mode toggle - only enable for DashboardViews */}
                            <button
                                onClick={() => {
                                    if (currentViewId && !isNaN(currentViewId) && onEnterEditMode) {
                                        onEnterEditMode();
                                    }
                                }}
                                className={`px-4 py-2 rounded-md transition-colors ${
                                    isEditMode
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : currentViewId && !isNaN(currentViewId)
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                                disabled={!currentViewId || isNaN(currentViewId)}
                                title={
                                    isEditMode
                                        ? "Currently in Edit Mode"
                                        : !currentViewId 
                                            ? "No view selected - a default view should be created automatically" 
                                            : isNaN(currentViewId)
                                                ? "Edit Layout is only available on Dashboard Views"
                                                : "Enter Edit Mode"
                                }
                            >
                                {isEditMode ? 'In Edit Mode' : 'Edit Layout'}
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
                                            onClick={handleViewProfile}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            View Profile
                                        </button>
                                        <button 
                                            onClick={handleOpenMyViews}
                                            className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                            <span>My Views</span>
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
                                        <div className="border-t border-gray-200 my-1"></div>
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