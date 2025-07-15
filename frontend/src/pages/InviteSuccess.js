import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const InviteSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { checkUserLoggedIn } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    useEffect(() => {
        const completeMicrosoftInvitation = async () => {
            try {
                const mscode = searchParams.get('mscode');
                const invitationToken = searchParams.get('invitation');
                
                if (!mscode || !invitationToken) {
                    setError('Missing required parameters');
                    setLoading(false);
                    return;
                }

                // Call the backend to complete the Microsoft invitation
                const response = await axios.post(`${API_URL}/api/auth/microsoft/complete-invitation`, {
                    mscode,
                    invitationToken
                }, {
                    withCredentials: true
                });

                if (response.status === 201) {
                    setSuccess(true);
                    
                    // Update the auth context with the new user
                    await checkUserLoggedIn();
                    
                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 2000);
                } else {
                    setError('Failed to complete registration');
                }
            } catch (error) {
                console.error('Error completing Microsoft invitation:', error);
                setError(error.response?.data?.message || 'Failed to complete registration');
            } finally {
                setLoading(false);
            }
        };

        completeMicrosoftInvitation();
    }, [searchParams, navigate, checkUserLoggedIn]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Completing Registration...</h2>
                    <p className="text-gray-600">Please wait while we set up your account.</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                    <div className="text-red-500 text-6xl mb-4">❌</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Failed</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 mr-2"
                    >
                        Go to Login
                    </button>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                    <div className="text-green-500 text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
                    <p className="text-gray-600 mb-6">
                        Your account has been created successfully using Microsoft SSO.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        You will be redirected to the dashboard in a moment...
                    </p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default InviteSuccess;