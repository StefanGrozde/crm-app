// frontend/src/pages/Login.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import MicrosoftLogo from '../components/MicrosoftLogo';

const API_URL = process.env.REACT_APP_API_URL;

const Login = () => {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    // --- UPDATED STATE ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState(''); // Added for registration

    // Check for success message from invitation registration
    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            // Clear the state to prevent showing the message again on refresh
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate, location.pathname]);

    const handleMicrosoftLogin = () => {
        window.location.href = `${API_URL}/api/auth/microsoft/login`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // --- UPDATED PAYLOAD LOGIC ---
        const url = isRegistering ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
        const payload = isRegistering ? { companyName, email, password } : { email, password };

        try {
            const response = await axios.post(url, payload, { withCredentials: true });
            
            if (!isRegistering) {
                // On successful login, use the data from the response directly
                setUser(response.data); 
                navigate('/dashboard');
            } else {
                alert('Registration successful! Please log in.');
                setIsRegistering(false);
                // Clear all fields
                setEmail('');
                setPassword('');
                setCompanyName('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An unexpected error occurred.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h2>
                <button
                    onClick={handleMicrosoftLogin}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <MicrosoftLogo />
                    <span className="ml-3">Sign in with Microsoft</span>
                </button>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with</span>
                    </div>
                </div>
                <form onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                    {successMessage && <p className="text-green-500 text-sm mb-4 text-center">{successMessage}</p>}

                    {/* --- UPDATED REGISTRATION FIELD --- */}
                    {isRegistering && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
                                Company Name
                            </label>
                            <input
                                id="companyName"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    
                    {/* --- UPDATED EMAIL FIELD --- */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                        type="submit"
                    >
                        {isRegistering ? 'Register' : 'Sign In'}
                    </button>
                </form>
                <p className="text-center text-gray-500 text-xs mt-4">
                    <button onClick={() => setIsRegistering(!isRegistering)} className="font-semibold text-blue-500 hover:text-blue-800 bg-transparent p-0">
                        {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;