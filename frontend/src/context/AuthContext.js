// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkUserLoggedIn = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`, {
                credentials: 'include',
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
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

    const value = { user, setUser, loading, checkUserLoggedIn };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};