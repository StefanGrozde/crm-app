import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const LoginSuccess = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [error, setError] = useState(null);

    useEffect(() => {
        const completeMicrosoftLogin = async (code) => {
            try {
                // Regular Microsoft login flow (invitations are handled separately)
                const response = await axios.post(`${API_URL}/api/auth/microsoft/complete`, 
                    { mscode: code },
                    { withCredentials: true }
                );
                
                const user = response.data;
                // Set user state from the response data
                setUser(user);

                // --- NEW: Redirection Logic ---
                // Check if the user object has a companyId.
                if (user && user.companyId) {
                    // If they have a company, navigate to the main dashboard.
                    navigate('/dashboard');
                } else {
                    // If not, they need to create one.
                    navigate('/create-company');
                }

            } catch (err) {
                const errorMessage = err.response?.data?.message || 'An error occurred during login.';
                setError(errorMessage);
                // Optional: redirect back to login after a delay
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        // Get the Microsoft code from the URL query parameters
        const params = new URLSearchParams(location.search);
        const code = params.get('mscode');

        if (code) {
            completeMicrosoftLogin(code);
        } else {
            // No code found, redirect to login
            setError('Invalid login attempt. Redirecting...');
            setTimeout(() => navigate('/login'), 2000);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on component mount

    if (error) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Login Failed</h2>
                <p style={{ color: 'red' }}>{error}</p>
            </div>
        );
    }
    
    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>Finalizing login...</h2>
        </div>
    );
};

export default LoginSuccess;
