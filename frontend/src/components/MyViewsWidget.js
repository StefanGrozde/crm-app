import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const MyViewsWidget = () => {
    // Context
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    
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
    });
    
    // Separate search input state
    const [searchInput, setSearchInput] = useState('');
    
    // Modal states
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    // Form states
    const [filterFormData, setFilterFormData] = useState({});
    const [formData, setFormData] = useState({});
    const [renameData, setRenameData] = useState({});

    // Logic: Load data
    const loadData = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/dashboard/views?${params}`, {
                withCredentials: true
            });
            
            setData(response.data.items);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading views:', error);
            setError('Failed to load views');
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

    // Logic: Handle rename input changes
    const handleRenameInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setRenameData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Reset form
    const resetForm = useCallback(() => {
        setFormData({});
        setRenameData({});
    }, []);

    // Logic: Open add modal
    const openAddModal = useCallback(() => {
        resetForm();
        setShowAddModal(true);
    }, [resetForm]);

    // Logic: Open filter modal
    const openFilterModal = useCallback(() => {
        setFilterFormData(filters);
        setShowFilterModal(true);
    }, [filters]);

    // Logic: Open edit modal
    const openEditModal = useCallback((item) => {
        setEditingItem(item);
        setFormData(item);
        setShowEditModal(true);
    }, []);

    // Logic: Open rename modal
    const openRenameModal = useCallback((item) => {
        setEditingItem(item);
        setRenameData({ name: item.name });
        setShowRenameModal(true);
    }, []);

    // Logic: Handle form submission (create new view)
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.post(`${API_URL}/api/dashboard/views`, formData, {
                withCredentials: true
            });
            
            setShowAddModal(false);
            resetForm();
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error creating view:', error);
            alert(error.response?.data?.error || 'Failed to create view');
        }
    }, [formData, resetForm, loadData, pagination.currentPage]);

    // Logic: Handle rename submission
    const handleRenameSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/dashboard/views/${editingItem.id}`, renameData, {
                withCredentials: true
            });
            
            setShowRenameModal(false);
            resetForm();
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error renaming view:', error);
            alert(error.response?.data?.error || 'Failed to rename view');
        }
    }, [renameData, editingItem, resetForm, loadData, pagination.currentPage]);

    // Logic: Handle edit (navigate to EditLayout)
    const handleEdit = useCallback((item) => {
        navigate(`/edit-layout/${item.id}`);
    }, [navigate]);

    // Logic: Handle delete
    const handleDelete = useCallback(async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this view? This action cannot be undone.')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/dashboard/views/${itemId}`, {
                withCredentials: true
            });
            
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting view:', error);
            alert('Failed to delete view');
        }
    }, [loadData, pagination.currentPage]);

    // Logic: Handle set as default
    const handleSetDefault = useCallback(async (itemId) => {
        try {
            await axios.post(`${API_URL}/api/dashboard/views/${itemId}/set-default`, {}, {
                withCredentials: true
            });
            
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error setting default view:', error);
            alert('Failed to set default view');
        }
    }, [loadData, pagination.currentPage]);

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
                <h2 className="text-lg font-semibold text-gray-900">My Dashboard Views</h2>
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
                        onClick={openAddModal}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add View</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search views..."
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
                            {filters.search && (
                                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                                    Search: {filters.search}
                                </span>
                            )}
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Widgets</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Default</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {item.widgets ? item.widgets.length : 0} widgets
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {item.is_default ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Default
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="text-blue-600 hover:text-blue-900"
                                            title="Edit Layout"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => openRenameModal(item)}
                                            className="text-green-600 hover:text-green-900"
                                            title="Rename"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                        </button>
                                        {!item.is_default && (
                                            <button
                                                onClick={() => handleSetDefault(item.id)}
                                                className="text-purple-600 hover:text-purple-900"
                                                title="Set as Default"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
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
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Filter Views</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    name="search"
                                    value={filterFormData.search || ''}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Search views..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mt-6 space-x-2">
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Create New View</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">View Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Enter view name..."
                                    required
                                />
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="isDefault"
                                    checked={formData.isDefault || false}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 text-sm text-gray-700">Set as default view</label>
                            </div>
                        </form>
                        <div className="flex justify-end mt-6 space-x-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Create View
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {showRenameModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-4">Rename View</h3>
                        <form onSubmit={handleRenameSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">View Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={renameData.name || ''}
                                    onChange={handleRenameInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                                    placeholder="Enter new view name..."
                                    required
                                />
                            </div>
                        </form>
                        <div className="flex justify-end mt-6 space-x-2">
                            <button
                                onClick={() => setShowRenameModal(false)}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameSubmit}
                                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(MyViewsWidget); 