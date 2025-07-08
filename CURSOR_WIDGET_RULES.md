# Cursor IDE Rules for CRM Widget Development

## Widget Component Template
When creating a new widget component, use this structure:

```javascript
import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const [WIDGET_NAME]Widget = () => {
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
        // Add specific filter fields
    });
    
    // Separate search input state
    const [searchInput, setSearchInput] = useState('');
    
    // Modal states
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    
    // Form states
    const [filterFormData, setFilterFormData] = useState({});
    const [formData, setFormData] = useState({});
    
    // Dropdown data
    const [dropdownData, setDropdownData] = useState([]);

    // Logic: Load data
    const loadData = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/[ENDPOINT]?${params}`, {
                withCredentials: true
            });
            
            setData(response.data.items);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading data:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    // Logic: Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/[DROPDOWN_ENDPOINT]`, { 
                withCredentials: true 
            });
            setDropdownData(response.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([loadData(), loadDropdownData()]);
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
    }, [loadData, loadDropdownData]);

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

    // Logic: Reset form
    const resetForm = useCallback(() => {
        setFormData({});
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

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            if (showEditModal) {
                await axios.put(`${API_URL}/api/[ENDPOINT]/${editingItem.id}`, formData, {
                    withCredentials: true
                });
                setShowEditModal(false);
            } else {
                await axios.post(`${API_URL}/api/[ENDPOINT]`, formData, {
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

    // Logic: Handle delete
    const handleDelete = useCallback(async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/[ENDPOINT]/${itemId}`, {
                withCredentials: true
            });
            
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
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
                <h2 className="text-lg font-semibold text-gray-900">[WIDGET_TITLE]</h2>
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
                        <span>Add</span>
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search [ITEMS]..."
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
                            {/* Render active filters */}
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
                            {/* Define table headers */}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                {/* Define table cells */}
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
            {/* Add/Edit Modal */}
        </div>
    );
};

export default memo([WIDGET_NAME]Widget);
```

## Profile Widget Component Template
When creating a new profile widget component for displaying detailed entity information, use this structure:

```javascript
import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const [ENTITY_NAME]ProfileWidget = ({ [ENTITY_ID_PARAM] }) => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEntity, setEditingEntity] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns and relationships
    const [dropdownData, setDropdownData] = useState({});
    const [relatedData, setRelatedData] = useState({});

    // Logic: Load entity data
    const loadEntity = useCallback(async () => {
        if (![ENTITY_ID_PARAM]) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/[ENDPOINT]/${[ENTITY_ID_PARAM]}`, {
                withCredentials: true
            });
            
            setEntity(response.data);
        } catch (error) {
            console.error('Error loading [ENTITY_NAME]:', error);
            setError('Failed to load [ENTITY_NAME] details');
        } finally {
            setLoading(false);
        }
    }, [[ENTITY_ID_PARAM]]);

    // Logic: Load dropdown and related data
    const loadAdditionalData = useCallback(async () => {
        try {
            const responses = await Promise.all([
                // Add API calls for dropdown data (users, companies, etc.)
                // Example: axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                // Example: axios.get(`${API_URL}/api/companies`, { withCredentials: true }),
            ]);
            
            // Map responses to state
            // setDropdownData({ users: responses[0].data, companies: responses[1].data });
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
                console.error('Error initializing [ENTITY_NAME]ProfileWidget:', error);
                setError('Failed to initialize [ENTITY_NAME] profile widget');
            }
        };

        initializeComponent();
    }, [loadEntity, loadAdditionalData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Handle tag input (if applicable)
    const handleTagInput = useCallback((e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const newTag = e.target.value.trim();
            setFormData(prev => ({
                ...prev,
                tags: [...(prev.tags || []), newTag]
            }));
            e.target.value = '';
        }
    }, []);

    // Logic: Remove tag (if applicable)
    const removeTag = useCallback((tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        if (!entity) return;
        
        setEditingEntity(entity);
        setFormData({
            // Map entity fields to form data
            // Example: firstName: entity.firstName,
            // Example: lastName: entity.lastName,
            // Add all relevant fields
        });
        setShowEditModal(true);
    }, [entity]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/[ENDPOINT]/${[ENTITY_ID_PARAM]}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadEntity(); // Reload entity data
        } catch (error) {
            console.error('Error updating [ENTITY_NAME]:', error);
            alert(error.response?.data?.message || 'Failed to update [ENTITY_NAME]');
        }
    }, [[ENTITY_ID_PARAM], formData, loadEntity]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this [ENTITY_NAME]?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/[ENDPOINT]/${[ENTITY_ID_PARAM]}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('[ENTITY_NAME] deleted successfully');
        } catch (error) {
            console.error('Error deleting [ENTITY_NAME]:', error);
            alert('Failed to delete [ENTITY_NAME]');
        }
    }, [[ENTITY_ID_PARAM]]);

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
                <div className="text-gray-600 text-sm">[ENTITY_NAME] not found</div>
            </div>
        );
    }

    // Helper functions for rendering
    const getStatusBadge = (status) => {
        const statusColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            prospect: 'bg-yellow-100 text-yellow-800',
            // Add more status colors as needed
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const getDisplayName = () => {
        // Customize based on entity type
        // Example for contacts: return `${entity.firstName} ${entity.lastName}`;
        // Example for companies: return entity.name;
        // Example for leads: return `${entity.firstName} ${entity.lastName}`;
        return entity.name || entity.firstName || 'Unknown';
    };

    const getInitials = () => {
        // Customize based on entity type
        // Example for contacts: return `${entity.firstName.charAt(0)}${entity.lastName.charAt(0)}`;
        // Example for companies: return entity.name.charAt(0);
        return getDisplayName().charAt(0);
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
                        {/* Add subtitle based on entity type */}
                        {/* Example: <p className="text-gray-600">{entity.jobTitle || 'No job title'}</p> */}
                        {/* Example: <p className="text-sm text-gray-500">{entity.industry || 'No industry'}</p> */}
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

            {/* Entity Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        {/* Add status field if applicable */}
                        {entity.status && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Status</span>
                                {getStatusBadge(entity.status)}
                            </div>
                        )}
                        
                        {/* Add assigned user field if applicable */}
                        {entity.assignedUser && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Assigned To</span>
                                <span className="text-sm text-gray-900">
                                    {`${entity.assignedUser.firstName} ${entity.assignedUser.lastName}`}
                                </span>
                            </div>
                        )}
                        
                        {/* Add other basic fields based on entity type */}
                        {/* Example: Source, Department, Industry, etc. */}
                    </div>
                </div>

                {/* Contact Details (if applicable) */}
                {(entity.email || entity.phone || entity.mobile) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
                        <div className="space-y-4">
                            {entity.email && (
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Email</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                        <a href={`mailto:${entity.email}`} className="text-blue-600 hover:text-blue-800">
                                            {entity.email}
                                        </a>
                                    </p>
                                </div>
                            )}
                            {entity.phone && (
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Phone</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                        <a href={`tel:${entity.phone}`} className="text-blue-600 hover:text-blue-800">
                                            {entity.phone}
                                        </a>
                                    </p>
                                </div>
                            )}
                            {entity.mobile && (
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Mobile</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                        <a href={`tel:${entity.mobile}`} className="text-blue-600 hover:text-blue-800">
                                            {entity.mobile}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Address Information (if applicable) */}
                {(entity.address || entity.city || entity.state || entity.country) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                        <div className="space-y-2">
                            {entity.address && (
                                <p className="text-sm text-gray-900">{entity.address}</p>
                            )}
                            <p className="text-sm text-gray-900">
                                {[entity.city, entity.state, entity.zipCode].filter(Boolean).join(', ')}
                            </p>
                            {entity.country && (
                                <p className="text-sm text-gray-900">{entity.country}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags (if applicable) */}
                {entity.tags && entity.tags.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {entity.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Entity-specific sections */}
                {/* Add custom sections based on entity type */}
                {/* Example: Company Information, Lead Details, Opportunity Details, etc. */}
            </div>

            {/* Notes (if applicable) */}
            {entity.notes && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{entity.notes}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit [ENTITY_NAME]</h2>
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
                            {/* Add form fields based on entity type */}
                            {/* Example: Basic Information */}
                            {/* Example: Contact Information */}
                            {/* Example: Address Information */}
                            {/* Example: Additional Information */}
                            
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
                                    Update [ENTITY_NAME]
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo([ENTITY_NAME]ProfileWidget);
```

## Backend Route Template
```javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const [MODEL_NAME] = require('../models/[MODEL_NAME]');
const { Op } = require('sequelize');

// GET /api/[ENDPOINT] - Get all items with pagination and filtering
router.get('/', protect, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        const whereClause = {};

        // Search functionality
        if (search) {
            whereClause[Op.or] = [
                // Add search fields
            ];
        }

        // Filter by company
        whereClause.companyId = req.user.companyId;

        const { count, rows: items } = await [MODEL_NAME].findAndCountAll({
            where: whereClause,
            include: [
                // Add associations
            ],
            order: [[sortBy, sortOrder.toUpperCase()]],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            items,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

// GET /api/[ENDPOINT]/filter-options
router.get('/filter-options', protect, async (req, res) => {
    try {
        // Add filter options logic
        res.json({});
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ message: 'Failed to fetch filter options' });
    }
});

// GET /api/[ENDPOINT]/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const item = await [MODEL_NAME].findByPk(req.params.id, {
            include: [
                // Add associations
            ]
        });

        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json(item);
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ message: 'Failed to fetch item' });
    }
});

// POST /api/[ENDPOINT]
router.post('/', protect, async (req, res) => {
    try {
        const {
            // Add form fields
        } = req.body;

        const sanitizedData = {
            // Map form fields
            companyId: req.user.companyId,
            createdBy: req.user.id
        };

        const item = await [MODEL_NAME].create(sanitizedData);

        const createdItem = await [MODEL_NAME].findByPk(item.id, {
            include: [
                // Add associations
            ]
        });

        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Error creating item:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to create item' });
    }
});

// PUT /api/[ENDPOINT]/:id
router.put('/:id', protect, async (req, res) => {
    try {
        const item = await [MODEL_NAME].findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const {
            // Add form fields
        } = req.body;

        const sanitizedData = {
            // Map form fields
        };

        await item.update(sanitizedData);

        const updatedItem = await [MODEL_NAME].findByPk(item.id, {
            include: [
                // Add associations
            ]
        });

        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating item:', error);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: error.errors[0].message });
        }
        res.status(500).json({ message: 'Failed to update item' });
    }
});

// DELETE /api/[ENDPOINT]/:id
router.delete('/:id', protect, async (req, res) => {
    try {
        const item = await [MODEL_NAME].findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        await item.destroy();

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});

module.exports = router;
```

## Sequelize Model Template
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Company = require('./Company');
const User = require('./User');

const [MODEL_NAME] = sequelize.define('[MODEL_NAME]', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  // Add your model fields here
  
  companyId: {
    type: DataTypes.INTEGER,
    field: 'company_id',
    references: {
      model: Company,
      key: 'id',
    },
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    field: 'created_by',
    references: {
      model: User,
      key: 'id',
    },
    allowNull: false,
  }
}, {
  tableName: '[TABLE_NAME]',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['company_id']
    }
  ]
});

module.exports = [MODEL_NAME];
```

## Key Replacements:
- `[WIDGET_NAME]` → Component name (e.g., "Contacts", "Leads")
- `[WIDGET_TITLE]` → Display title
- `[ENDPOINT]` → API endpoint (e.g., "contacts", "leads")
- `[ITEMS]` → Plural item name
- `[MODEL_NAME]` → Sequelize model name
- `[TABLE_NAME]` → Database table name

## Essential Patterns:
1. Use `useCallback` for all functions to prevent re-renders
2. Separate search input state from filter state
3. Use debounced search with 300ms timeout
4. Always include loading and error states
5. Use `memo` for component export
6. Include proper cleanup in useEffect
7. Use Tailwind CSS classes consistently
8. Handle form validation and error messages
9. Include pagination controls
10. Use proper TypeScript-like prop validation 

## Key Replacements for Profile Widgets:
- `[ENTITY_NAME]` → Entity name (e.g., "Contact", "Lead", "User", "Opportunity", "Business")
- `[ENTITY_ID_PARAM]` → ID parameter name (e.g., "contactId", "leadId", "userId", "opportunityId", "businessId")
- `[ENDPOINT]` → API endpoint (e.g., "contacts", "leads", "users", "opportunities", "businesses")

## Profile Widget Essential Patterns:
1. Use `useCallback` for all functions to prevent re-renders
2. Always include loading and error states
3. Use `memo` for component export
4. Include proper cleanup in useEffect
5. Use Tailwind CSS classes consistently
6. Handle form validation and error messages
7. Include edit and delete functionality
8. Support for tags, notes, and relationships
9. Responsive grid layout for information display
10. Customizable helper functions for display names and status badges
11. Conditional rendering for optional fields
12. Proper modal handling for edit forms

## Entity-Specific Customizations:
- **Contacts**: firstName, lastName, email, phone, jobTitle, company
- **Leads**: firstName, lastName, email, phone, source, status, assignedTo
- **Users**: firstName, lastName, email, role, department, permissions
- **Opportunities**: name, amount, stage, probability, closeDate, assignedTo
- **Businesses**: name, industry, website, size, address, contacts
- **Companies**: name, industry, website, address, employees, revenue 