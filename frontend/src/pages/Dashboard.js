import React, { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import EditUserPopup from '../components/EditUserPopup'; // <-- IMPORT THE POPUP

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [menuOpen, setMenuOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false); // <-- ADD STATE FOR POPUP
    const navigate = useNavigate();
    const menuRef = useRef(null);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };
    
    // Function to open the popup
    const handleOpenEditPopup = () => {
        setMenuOpen(false); // Close the dropdown
        setEditPopupOpen(true);
    };


    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <> {/* <-- Use a Fragment to wrap everything */}
            <div className="min-h-screen bg-gray-100">
                <header className="bg-white shadow-md">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                            <div className="relative" ref={menuRef}>
                                <img
                                    src={`https://i.pravatar.cc/40?u=${user.email}`}
                                    alt="User Avatar"
                                    className="w-10 h-10 rounded-full cursor-pointer"
                                    onClick={toggleMenu}
                                />
                                {menuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                        {/* --- EDIT PROFILE BUTTON --- */}
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
                </header>
                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-800">Welcome, {user.email}</h2>
                        <p className="text-gray-600 mt-2">Your Role: <span className="font-medium text-indigo-600">{user.role}</span></p>
                    </div>
                </main>
            </div>

            {/* --- RENDER THE POPUP --- */}
            {isEditPopupOpen && <EditUserPopup onClose={() => setEditPopupOpen(false)} />}
        </>
    );
};

export default Dashboard;