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
                const response = await axios.post(`${API_URL}/api/auth/microsoft/complete`, 
                    { mscode: code },
                    { withCredentials: true }
                );
                
                // Set user state from the response data
                setUser(response.data);
                // Navigate to the main dashboard
                navigate('/dashboard');

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