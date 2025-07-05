import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Changed to a named export
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Set the auth token for all subsequent requests
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const res = await axios.get('[https://backend.svnikolaturs.mk/api/auth/me](https://backend.svnikolaturs.mk/api/auth/me)');
                    setUser(res.data);
                } catch (err) {
                    localStorage.removeItem('token');
                    setUser(null);
                    delete axios.defaults.headers.common['Authorization'];
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const login = async (email, password) => {
        const res = await axios.post('[https://backend.svnikolaturs.mk/api/auth/login](https://backend.svnikolaturs.mk/api/auth/login)', { email, password });
        localStorage.setItem('token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        // The backend sends the user object in the response body on login
        setUser(res.data); 
    };
    
    const completeMicrosoftLogin = async (mscode) => {
        try {
            const res = await axios.post('[https://backend.svnikolaturs.mk/api/auth/microsoft/complete](https://backend.svnikolaturs.mk/api/auth/microsoft/complete)', { mscode });
            // The backend sets a cookie, and we get user info back.
            // We'll also set a local token to keep the session aligned.
            localStorage.setItem('token', 'true'); // Using a simple flag as the real token is in an httpOnly cookie
            axios.defaults.headers.common['Authorization'] = `Bearer true`; // Mimic session
            setUser(res.data);
            return res.data;
        } catch (error) {
            console.error('Error completing Microsoft login:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, completeMicrosoftLogin }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};