import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

// Exporting AuthContext directly to resolve the import error.
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // This function checks if a user session exists on the backend
    const checkUserLoggedIn = useCallback(async () => {
        setLoading(true);
        try {
            // We use axios here but ensure cookies are sent
            const response = await axios.get('https://backend.svnikolaturs.mk/api/auth/me', {
                withCredentials: true, 
            });
            
            if (response.status === 200) {
                setUser(response.data);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("User not logged in:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check for a logged-in user when the app first loads
    useEffect(() => {
        checkUserLoggedIn();
    }, [checkUserLoggedIn]);

    // Standard login
    const login = async (email, password) => {
        const response = await axios.post('https://backend.svnikolaturs.mk/api/auth/login', { email, password }, {
            withCredentials: true,
        });
        await checkUserLoggedIn(); // Re-check user status to get full user object
        return response;
    };

    // Microsoft Login
    const completeMicrosoftLogin = async (mscode) => {
        const response = await axios.post('https://backend.svnikolaturs.mk/api/auth/microsoft/complete', { mscode }, {
            withCredentials: true,
        });
        await checkUserLoggedIn(); // Re-check user status
        return response;
    };

    // Logout
    const logout = async () => {
        // It's good practice to have a backend route for logout to invalidate the cookie/session
        // but for now, we'll just clear the state on the client-side.
        setUser(null);
        // If you had a /api/auth/logout endpoint, you would call it here.
    };

    const value = { user, setUser, loading, login, logout, completeMicrosoftLogin, checkUserLoggedIn };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
