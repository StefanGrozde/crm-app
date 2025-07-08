import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const InviteRegistration = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [invitation, setInvitation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Load invitation details
    useEffect(() => {
        const loadInvitation = async () => {
            try {
                const response = await axios.get(`${API_URL}/api/invitations/${token}`);
                setInvitation(response.data.invitation);
            } catch (error) {
                console.error('Error loading invitation:', error);
                setError(error.response?.data?.message || 'Failed to load invitation');
            } finally {
                setLoading(false);
            }
        };
        
        loadInvitation();
    }, [token]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validation
        if (!username.trim()) {
            setError('Username is required');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setSubmitting(true);
        
        try {
            await axios.post(`${API_URL}/api/invitations/${token}/complete`, {
                username,
                password
            });
            
            // Redirect to login with success message
            navigate('/login', { 
                state: { 
                    message: 'Registration successful! Please log in with your new account.' 
                } 
            });
        } catch (error) {
            console.error('Error completing registration:', error);
            setError(error.response?.data?.message || 'Failed to complete registration');
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading invitation...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                    <div className="text-red-500 text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Invitation Error</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Complete Your Registration</h2>
                    <p className="text-gray-600">
                        You've been invited to join <strong>{invitation.company.name}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Role: {invitation.role}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            value={invitation.email}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username *
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password *
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                            minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                    
                    {error && (
                        <div className="text-red-500 text-sm text-center">{error}</div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InviteRegistration; 