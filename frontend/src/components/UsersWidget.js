import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const UsersWidget = ({ onOpenUserProfile }) => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    });
    
    // Filter states
    const [filters, setFilters] = useState({
        search: '',
        role: ''
    });
    
    // Separate search input state
    const [searchInput, setSearchInput] = useState('');
    
    // Modal states
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    // Form states
    const [filterFormData, setFilterFormData] = useState({});
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'Sales Representative'
    });
    const [inviteFormData, setInviteFormData] = useState({
        email: '',
        role: 'Sales Representative'
    });
    const [generatedInvitation, setGeneratedInvitation] = useState(null);

    // Logic: Load data
    const loadData = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/users?${params}`, {
                withCredentials: true
            });
            
            setData(response.data.users);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading data:', error);
            if (error.response?.status === 403) {
                setError('Access denied. Admin role required.');
            } else {
                setError('Failed to load data');
            }
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await loadData();
            } catch (error) {
                console.error('Error initializing widget:', error);
                setError('Failed to initialize widget');
            }
        };

        initializeComponent();
        
        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [loadData]);

    // Logic: Handle search input changes
    const handleSearchInputChange = useCallback((value) => {
        if (searchInput === value) return;
        
        setSearchInput(value);
        
        if (window.searchTimeout) {
            clearTimeout(window.searchTimeout);
        }
        
        window.searchTimeout = setTimeout(() => {
            setFilters(prev => {
                const newFilters = { ...prev, search: value };
                if (!value.trim()) {
                    const { search, ...otherFilters } = newFilters;
                    return otherFilters;
                }
                return newFilters;
            });
            loadData(1);
        }, 300);
    }, [searchInput, loadData]);

    // Logic: Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadData(1);
    }, [filterFormData, loadData]);

    // Logic: Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = { search: searchInput };
        setFilters(clearedFilters);
        setFilterFormData({});
        loadData(1);
    }, [searchInput, loadData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Handle invite form input changes
    const handleInviteInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInviteFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Reset form
    const resetForm = useCallback(() => {
        setFormData({
            username: '',
            email: '',
            password: '',
            role: 'Sales Representative'
        });
    }, []);

    // Logic: Open add modal
    const openAddModal = useCallback(() => {
        resetForm();
        setShowAddModal(true);
    }, [resetForm]);

    // Logic: Open invite modal
    const openInviteModal = useCallback(() => {
        setInviteFormData({
            email: '',
            role: 'Sales Representative'
        });
        setGeneratedInvitation(null);
        setShowInviteModal(true);
    }, []);

    // Logic: Open filter modal
    const openFilterModal = useCallback(() => {
        setFilterFormData(filters);
        setShowFilterModal(true);
    }, [filters]);

    // Logic: Open edit modal
    const openEditModal = useCallback((item) => {
        setEditingItem(item);
        setFormData({
            username: item.username || '',
            email: item.email || '',
            password: '', // Don't populate password for edit
            role: item.role || 'Sales Representative'
        });
        setShowEditModal(true);
    }, []);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            if (showEditModal) {
                // For edit, don't send password if it's empty
                const updateData = { ...formData };
                if (!updateData.password) {
                    delete updateData.password;
                }
                
                await axios.put(`${API_URL}/api/users/${editingItem.id}`, updateData, {
                    withCredentials: true
                });
                setShowEditModal(false);
            } else {
                await axios.post(`${API_URL}/api/users`, formData, {
                    withCredentials: true
                });
                setShowAddModal(false);
            }
            
            resetForm();
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error saving item:', error);
            alert(error.response?.data?.message || 'Failed to save item');
        }
    }, [showEditModal, editingItem, formData, resetForm, loadData, pagination.currentPage]);

    // Logic: Handle invitation generation
    const handleGenerateInvitation = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post(`${API_URL}/api/invitations`, inviteFormData, {
                withCredentials: true
            });
            
            setGeneratedInvitation(response.data.invitation);
        } catch (error) {
            console.error('Error generating invitation:', error);
            alert(error.response?.data?.message || 'Failed to generate invitation');
        }
    }, [inviteFormData]);

    // Logic: Handle delete
    const handleDelete = useCallback(async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/users/${itemId}`, {
                withCredentials: true
            });
            
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting item:', error);
            alert(error.response?.data?.message || 'Failed to delete item');
        }
    }, [loadData, pagination.currentPage]);

    // Logic: Get role color
    const getRoleColor = useCallback((role) => {
        const colors = {
            'Administrator': 'bg-red-100 text-red-800',
            'Sales Manager': 'bg-blue-100 text-blue-800',
            'Sales Representative': 'bg-green-100 text-green-800',
            'Marketing Manager': 'bg-purple-100 text-purple-800',
            'Support Representative': 'bg-yellow-100 text-yellow-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
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
                    onClick={() => loadData()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Check if any filters are active
    const hasActiveFilters = Object.values(filters).some(value => value && value !== '');

    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={openFilterModal}
                        className={`px-3 py-1 text-sm rounded flex items-center space-x-1 ${
                            hasActiveFilters 
                                ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                                : 'bg-gray-100 text-gray-700 border border-gray-300'
                        } hover:bg-gray-200`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                        </svg>
                        <span>Filter</span>
                        {hasActiveFilters && (
                            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
                                {Object.values(filters).filter(v => v && v !== '').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={openInviteModal}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1 mr-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Invite</span>
                    </button>
                    <button
                        onClick={openAddModal}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(filters).map(([key, value]) => {
                                if (value && value !== '' && key !== 'search') {
                                    const getFilterLabel = (filterKey) => {
                                        const labels = {
                                            role: 'Role'
                                        };
                                        return labels[filterKey] || filterKey;
                                    };

                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {getFilterLabel(key)}: {value}
                                            <button
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, [key]: '' }));
                                                    setFilterFormData(prev => ({ ...prev, [key]: '' }));
                                                    loadData(1);
                                                }}
                                                className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>
                        <button
                            onClick={clearFilters}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                <span className="text-sm font-medium text-white">
                                                    {item.username.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {item.username}
                                            </div>
                                            <div className="text-xs text-gray-500">{item.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(item.role)}`}>
                                        {item.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {item.Company ? item.Company.name : 'No Company'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => onOpenUserProfile && onOpenUserProfile(item.id, item.username)}
                                            className="text-green-600 hover:text-green-900 text-xs font-medium"
                                        >
                                            View Profile
                                        </button>
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
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
                
                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center px-4">
                        <div className="text-xs text-gray-500">
                            Page {pagination.currentPage} of {pagination.totalPages}
                        </div>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => loadData(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => loadData(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {/* Filter Modal */}
            {showFilterModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Filter Users</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    name="role"
                                    value={filterFormData.role || ''}
                                    onChange={handleFilterInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">All Roles</option>
                                    <option value="Sales Representative">Sales Representative</option>
                                    <option value="Sales Manager">Sales Manager</option>
                                    <option value="Marketing Manager">Marketing Manager</option>
                                    <option value="Support Representative">Support Representative</option>
                                    <option value="Administrator">Administrator</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">
                            {showEditModal ? 'Edit User' : 'Add New User'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Username *</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {showEditModal ? 'Password (leave blank to keep current)' : 'Password *'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required={!showEditModal}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
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
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {showEditModal ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitation Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
                        
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

export default memo(UsersWidget); 