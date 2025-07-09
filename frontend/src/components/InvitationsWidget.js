import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const InvitationsWidget = () => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [generatedInvitation, setGeneratedInvitation] = useState(null);
    
    // Form states
    const [inviteFormData, setInviteFormData] = useState({
        email: '',
        role: 'Sales Representative'
    });

    // Logic: Load invitations
    const loadInvitations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/invitations`, {
                withCredentials: true
            });
            
            setInvitations(response.data.invitations);
        } catch (error) {
            console.error('Error loading invitations:', error);
            if (error.response?.status === 403) {
                setError('Access denied. Admin role required.');
            } else {
                setError('Failed to load invitations');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await loadInvitations();
            } catch (error) {
                console.error('Error initializing widget:', error);
                setError('Failed to initialize widget');
            }
        };

        initializeComponent();
    }, [loadInvitations]);

    // Logic: Handle invite form input changes
    const handleInviteInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInviteFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Open invite modal
    const openInviteModal = useCallback(() => {
        setInviteFormData({
            email: '',
            role: 'Sales Representative'
        });
        setGeneratedInvitation(null);
        setShowInviteModal(true);
    }, []);

    // Logic: Handle invitation generation
    const handleGenerateInvitation = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post(`${API_URL}/api/invitations`, inviteFormData, {
                withCredentials: true
            });
            
            setGeneratedInvitation(response.data.invitation);
            loadInvitations(); // Refresh the list
        } catch (error) {
            console.error('Error generating invitation:', error);
            alert(error.response?.data?.message || 'Failed to generate invitation');
        }
    }, [inviteFormData, loadInvitations]);

    // Logic: Handle delete invitation
    const handleDeleteInvitation = useCallback(async (invitationId) => {
        if (!window.confirm('Are you sure you want to delete this invitation?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/invitations/${invitationId}`, {
                withCredentials: true
            });
            
            loadInvitations();
        } catch (error) {
            console.error('Error deleting invitation:', error);
            alert(error.response?.data?.message || 'Failed to delete invitation');
        }
    }, [loadInvitations]);

    // Logic: Get status color
    const getStatusColor = useCallback((invitation) => {
        if (invitation.isUsed) {
            return 'bg-gray-100 text-gray-800';
        }
        if (new Date() > new Date(invitation.expiresAt)) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-green-100 text-green-800';
    }, []);

    // Logic: Get status text
    const getStatusText = useCallback((invitation) => {
        if (invitation.isUsed) {
            return 'Used';
        }
        if (new Date() > new Date(invitation.expiresAt)) {
            return 'Expired';
        }
        return 'Active';
    }, []);

    // Check if user is admin - AFTER all hooks are declared
    if (user.role !== 'Administrator') {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">Access denied. Admin role required.</div>
            </div>
        );
    }

    // Rendering: Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Rendering: Error state
    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={() => loadInvitations()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">User Invitations</h2>
                <button
                    onClick={openInviteModal}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>New Invitation</span>
                </button>
            </div>

            {/* Invitations Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Expires
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {invitations.map((invitation) => (
                            <tr key={invitation.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {invitation.email}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {invitation.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation)}`}>
                                        {getStatusText(invitation)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(invitation.expiresAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        {!invitation.isUsed && new Date() <= new Date(invitation.expiresAt) && (
                                            <button
                                                onClick={() => {
                                                    const baseUrl = window.location.origin;
                                                    const invitationUrl = `${baseUrl}/invite/${invitation.token}`;
                                                    navigator.clipboard.writeText(invitationUrl);
                                                    alert('Invitation URL copied to clipboard!');
                                                }}
                                                className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                            >
                                                Copy URL
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteInvitation(invitation.id)}
                                            className="text-red-600 hover:text-red-900 text-xs font-medium"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {invitations.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No invitations found. Create your first invitation to get started.
                    </div>
                )}
            </div>

            {/* Invitation Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create New Invitation</h3>
                        
                        {!generatedInvitation ? (
                            <form onSubmit={handleGenerateInvitation} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={inviteFormData.email}
                                        onChange={handleInviteInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        name="role"
                                        value={inviteFormData.role}
                                        onChange={handleInviteInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="Sales Representative">Sales Representative</option>
                                        <option value="Sales Manager">Sales Manager</option>
                                        <option value="Marketing Manager">Marketing Manager</option>
                                        <option value="Support Representative">Support Representative</option>
                                        <option value="Administrator">Administrator</option>
                                    </select>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Generate Invitation
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                    <h4 className="text-sm font-medium text-green-800 mb-2">Invitation Generated Successfully!</h4>
                                    <p className="text-sm text-green-700 mb-3">
                                        Send this link to <strong>{generatedInvitation.email}</strong> to complete their registration.
                                    </p>
                                    <div className="bg-white p-3 border border-green-300 rounded">
                                        <p className="text-xs text-gray-600 mb-2">Invitation URL:</p>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={generatedInvitation.invitationUrl}
                                                readOnly
                                                className="flex-1 text-xs p-2 border border-gray-300 rounded bg-gray-50"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(generatedInvitation.invitationUrl);
                                                    alert('URL copied to clipboard!');
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-green-600 mt-2">
                                        Expires: {new Date(generatedInvitation.expiresAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowInviteModal(false);
                                            setGeneratedInvitation(null);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(InvitationsWidget); 