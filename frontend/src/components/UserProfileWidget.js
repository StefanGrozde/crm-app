import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const UserProfileWidget = ({ userId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingEntity, setEditingEntity] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns and relationships
    // eslint-disable-next-line no-unused-vars
    const [dropdownData, setDropdownData] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [relatedData, setRelatedData] = useState({});

    // Logic: Load entity data
    const loadEntity = useCallback(async () => {
        if (!userId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/users/${userId}`, {
                withCredentials: true
            });
            
            setEntity(response.data);
        } catch (error) {
            console.error('Error loading user:', error);
            if (error.response?.status === 403) {
                setError('Access denied. Admin role required.');
            } else if (error.response?.status === 404) {
                setError('User not found');
            } else {
                setError('Failed to load user details');
            }
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Logic: Load dropdown and related data
    const loadAdditionalData = useCallback(async () => {
        try {
            const responses = await Promise.all([
                // Add API calls for dropdown data if needed
                // Example: axios.get(`${API_URL}/api/companies`, { withCredentials: true }),
            ]);
            
            // Map responses to state
            // setDropdownData({ companies: responses[0].data });
        } catch (error) {
            console.error('Error loading additional data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadEntity(),
                    loadAdditionalData()
                ]);
            } catch (error) {
                console.error('Error initializing UserProfileWidget:', error);
                setError('Failed to initialize user profile widget');
            }
        };

        initializeComponent();
    }, [loadEntity, loadAdditionalData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        if (!entity) return;
        
        setEditingEntity(entity);
        setFormData({
            username: entity.username || '',
            email: entity.email || '',
            role: entity.role || 'Sales Representative'
        });
        setShowEditModal(true);
    }, [entity]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/users/${userId}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadEntity(); // Reload entity data
        } catch (error) {
            console.error('Error updating user:', error);
            alert(error.response?.data?.message || 'Failed to update user');
        }
    }, [userId, formData, loadEntity]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/users/${userId}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('User deleted successfully');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    }, [userId]);

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
                    onClick={() => loadEntity()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No entity found
    if (!entity) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">User not found</div>
            </div>
        );
    }

    // Helper functions for rendering
    const getRoleColor = (role) => {
        const colors = {
            'Administrator': 'bg-red-100 text-red-800',
            'Sales Manager': 'bg-blue-100 text-blue-800',
            'Sales Representative': 'bg-green-100 text-green-800',
            'Marketing Manager': 'bg-purple-100 text-purple-800',
            'Support Representative': 'bg-yellow-100 text-yellow-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const getDisplayName = () => {
        return entity.username || entity.email || 'Unknown User';
    };

    const getInitials = () => {
        const displayName = getDisplayName();
        return displayName.charAt(0).toUpperCase();
    };

    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">
                            {getInitials()}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {getDisplayName()}
                        </h1>
                        <p className="text-gray-600">{entity.email}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={openEditModal}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            {/* User Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Username</span>
                            <span className="text-sm text-gray-900">{entity.username}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Email</span>
                            <span className="text-sm text-gray-900">
                                <a href={`mailto:${entity.email}`} className="text-blue-600 hover:text-blue-800">
                                    {entity.email}
                                </a>
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Role</span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(entity.role)}`}>
                                {entity.role}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Company</span>
                            <span className="text-sm text-gray-900">
                                {entity.Company ? entity.Company.name : 'No Company'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Account Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">User ID</span>
                            <span className="text-sm text-gray-900">{entity.id}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Created</span>
                            <span className="text-sm text-gray-900">
                                {new Date(entity.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Last Updated</span>
                            <span className="text-sm text-gray-900">
                                {new Date(entity.updated_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit User</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="Sales Representative">Sales Representative</option>
                                    <option value="Sales Manager">Sales Manager</option>
                                    <option value="Marketing Manager">Marketing Manager</option>
                                    <option value="Support Representative">Support Representative</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Update User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(UserProfileWidget); 