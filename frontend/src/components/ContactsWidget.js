import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const ContactsWidget = () => {
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    const [contacts, setContacts] = useState([]);
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
        status: '',
        assignedTo: '',
        source: '',
        department: '',
        city: '',
        state: '',
        country: ''
    });
    
    // Separate state for search input to prevent re-rendering
    const [searchInput, setSearchInput] = useState('');
    
    // Filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterFormData, setFilterFormData] = useState({
        status: '',
        assignedTo: '',
        source: '',
        department: '',
        city: '',
        state: '',
        country: ''
    });
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobile: '',
        jobTitle: '',
        department: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        notes: '',
        status: 'active',
        source: '',
        tags: [],
        assignedTo: ''
    });
    
    // Undo states
    const [deletedContact, setDeletedContact] = useState(null);
    const [showUndoNotification, setShowUndoNotification] = useState(false);
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        sources: [],
        departments: [],
        cities: [],
        states: [],
        countries: []
    });

    // Load contacts - memoized to prevent unnecessary re-renders
    const loadContacts = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/contacts?${params}`, {
                withCredentials: true
            });
            
            setContacts(response.data.contacts);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading contacts:', error);
            setError('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    // Load users and filter options for dropdowns - memoized
    const loadDropdownData = useCallback(async () => {
        try {
            setFilterOptionsLoading(true);
            const [usersResponse, filterOptionsResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts/filter-options`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data);
            setFilterOptions(filterOptionsResponse.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        } finally {
            setFilterOptionsLoading(false);
        }
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadContacts(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing ContactsWidget:', error);
                setError('Failed to initialize contacts widget');
            }
        };

        initializeComponent();
        
        // Cleanup function to clear timeout when component unmounts
        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [loadContacts, loadDropdownData]);

    // Handle search input changes - optimized to prevent re-rendering
    const handleSearchInputChange = useCallback((value) => {
        // Only update if the value actually changed
        if (searchInput === value) return;
        
        setSearchInput(value);
        
        // Clear existing timeout
        if (window.searchTimeout) {
            clearTimeout(window.searchTimeout);
        }
        
        // Set new timeout for search
        window.searchTimeout = setTimeout(() => {
            // Only update filters if the value has actually changed
            setFilters(prev => {
                const newFilters = { ...prev, search: value };
                // If search is empty, ensure we still load contacts
                if (!value.trim()) {
                    // Remove search filter but keep other filters
                    const { search, ...otherFilters } = newFilters;
                    return otherFilters;
                }
                return newFilters;
            });
            loadContacts(1);
        }, 300); // Shorter delay for more responsive feel
    }, [searchInput, loadContacts]);

    // Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadContacts(1);
    }, [filterFormData, loadContacts]);

    // Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = {
            search: searchInput, // Keep current search input
            status: '',
            assignedTo: '',
            source: '',
            department: '',
            city: '',
            state: '',
            country: ''
        };
        setFilters(clearedFilters);
        setFilterFormData({
            status: '',
            assignedTo: '',
            source: '',
            department: '',
            city: '',
            state: '',
            country: ''
        });
        loadContacts(1);
    }, [searchInput, loadContacts]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle tag input
    const handleTagInput = useCallback((e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const newTag = e.target.value.trim();
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, newTag]
            }));
            e.target.value = '';
        }
    }, []);

    // Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove)
        }));
    }, []);

    // Reset form
    const resetForm = useCallback(() => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            mobile: '',
            jobTitle: '',
            department: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            country: '',
            notes: '',
            status: 'active',
            source: '',
            tags: [],
            companyId: '',
            assignedTo: ''
        });
    }, []);

    // Open add modal
    const openAddModal = useCallback(() => {
        resetForm();
        setShowAddModal(true);
    }, [resetForm]);

    // Open filter modal
    const openFilterModal = useCallback(() => {
        // Initialize filter form data with current filters
        setFilterFormData({
            status: filters.status || '',
            assignedTo: filters.assignedTo || '',
            source: filters.source || '',
            department: filters.department || '',
            city: filters.city || '',
            state: filters.state || '',
            country: filters.country || ''
        });
        setShowFilterModal(true);
    }, [filters]);

    // Open edit modal
    const openEditModal = useCallback((contact) => {
        setEditingContact(contact);
        setFormData({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || '',
            phone: contact.phone || '',
            mobile: contact.mobile || '',
            jobTitle: contact.jobTitle || '',
            department: contact.department || '',
            address: contact.address || '',
            city: contact.city || '',
            state: contact.state || '',
            zipCode: contact.zipCode || '',
            country: contact.country || '',
            notes: contact.notes || '',
            status: contact.status || 'active',
            source: contact.source || '',
            tags: contact.tags || [],
            assignedTo: contact.assignedTo || ''
        });
        setShowEditModal(true);
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            if (showEditModal) {
                // Update contact
                await axios.put(`${API_URL}/api/contacts/${editingContact.id}`, formData, {
                    withCredentials: true
                });
                setShowEditModal(false);
            } else {
                // Create contact
                await axios.post(`${API_URL}/api/contacts`, formData, {
                    withCredentials: true
                });
                setShowAddModal(false);
            }
            
            resetForm();
            loadContacts(pagination.currentPage);
        } catch (error) {
            console.error('Error saving contact:', error);
            alert(error.response?.data?.message || 'Failed to save contact');
        }
    }, [showEditModal, editingContact, formData, resetForm, loadContacts, pagination.currentPage]);

    // Handle delete
    const handleDelete = useCallback(async (contactId) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) {
            return;
        }
        
        try {
            const response = await axios.delete(`${API_URL}/api/contacts/${contactId}`, {
                withCredentials: true
            });
            
            setDeletedContact(response.data.deletedContact);
            setShowUndoNotification(true);
            
            // Auto-hide undo notification after 10 seconds
            setTimeout(() => {
                setShowUndoNotification(false);
                setDeletedContact(null);
            }, 10000);
            
            loadContacts(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Failed to delete contact');
        }
    }, [loadContacts, pagination.currentPage]);

    // Handle undo
    const handleUndo = useCallback(async () => {
        try {
            await axios.post(`${API_URL}/api/contacts/${deletedContact.id}/undo`, {
                deletedContact
            }, {
                withCredentials: true
            });
            
            setShowUndoNotification(false);
            setDeletedContact(null);
            loadContacts(pagination.currentPage);
        } catch (error) {
            console.error('Error undoing deletion:', error);
            alert('Failed to restore contact');
        }
    }, [deletedContact, loadContacts, pagination.currentPage]);

    // Action button handlers
    const handleStartLead = useCallback((contactId) => {
        // TODO: Implement Start Lead functionality
        console.log('Start Lead for:', contactId);
    }, []);

    const handleStartOpportunity = useCallback((contactId) => {
        // TODO: Implement Start Opportunity functionality
        console.log('Start Opportunity for:', contactId);
    }, []);

    const handleStartSale = useCallback((contactId) => {
        // TODO: Implement Start Sale functionality
        console.log('Start Sale for:', contactId);
    }, []);

    // Filter Modal component
    const FilterModal = ({ isOpen, onClose }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Filter Contacts</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {filterOptionsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading filter options...</span>
                        </div>
                    ) : (
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={filterFormData.status}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="prospect">Prospect</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                <select
                                    name="assignedTo"
                                    value={filterFormData.assignedTo}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Users</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                <select
                                    name="source"
                                    value={filterFormData.source}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Sources</option>
                                    {filterOptions.sources.map((source, index) => (
                                        <option key={index} value={source.value}>
                                            {source.value} ({source.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    name="department"
                                    value={filterFormData.department}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Departments</option>
                                    {filterOptions.departments.map((dept, index) => (
                                        <option key={index} value={dept.value}>
                                            {dept.value} ({dept.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <select
                                    name="city"
                                    value={filterFormData.city}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Cities</option>
                                    {filterOptions.cities.map((city, index) => (
                                        <option key={index} value={city.value}>
                                            {city.value} ({city.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <select
                                    name="state"
                                    value={filterFormData.state}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All States</option>
                                    {filterOptions.states.map((state, index) => (
                                        <option key={index} value={state.value}>
                                            {state.value} ({state.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                <select
                                    name="country"
                                    value={filterFormData.country}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Countries</option>
                                    {filterOptions.countries.map((country, index) => (
                                        <option key={index} value={country.value}>
                                            {country.value} ({country.count})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Clear All
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={applyFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            </div>
        );
    };

    // Modal component
    const ContactModal = ({ isOpen, onClose, title, onSubmit }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    <form onSubmit={onSubmit} className="space-y-4">
                        {/* Basic Information - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                />
                            </div>
                        </div>
                        
                        {/* Contact Information - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mobile</label>
                                <input
                                    type="tel"
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* Professional Information - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Department</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="prospect">Prospect</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Source</label>
                                <input
                                    type="text"
                                    name="source"
                                    value={formData.source}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Website, Referral, Trade Show"
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* Address Information - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    rows="2"
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">City</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">State</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        {/* Location Information - 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                                <input
                                    type="text"
                                    name="zipCode"
                                    value={formData.zipCode}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Country</label>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                                <select
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        {/* Tags and Notes - 2 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tags</label>
                                <input
                                    type="text"
                                    placeholder="Press Enter to add a tag"
                                    onKeyPress={handleTagInput}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                                {formData.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {formData.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                                {tag}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {showEditModal ? 'Update Contact' : 'Create Contact'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={() => loadContacts()}
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
                <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>
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
                    placeholder="Search contacts..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => {
                        // Prevent any key events from bubbling up to parent components
                        e.stopPropagation();
                    }}
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
                                    // Get user-friendly label for filter key
                                    const getFilterLabel = (filterKey) => {
                                        const labels = {
                                            status: 'Status',
                                            assignedTo: 'Assigned To',
                                            source: 'Source',
                                            department: 'Department',
                                            city: 'City',
                                            state: 'State',
                                            country: 'Country'
                                        };
                                        return labels[filterKey] || filterKey;
                                    };

                                    // Get display value for filter
                                    const getDisplayValue = (filterKey, filterValue) => {
                                        if (filterKey === 'assignedTo') {
                                            const user = users.find(u => u.id.toString() === filterValue);
                                            return user ? `${user.firstName} ${user.lastName}` : filterValue;
                                        }
                                        
                                        // Get count for filter options
                                        const getCount = (filterKey, filterValue) => {
                                            const options = filterOptions[filterKey + 's']; // Add 's' to match state key
                                            if (options) {
                                                const option = options.find(opt => opt.value === filterValue);
                                                return option ? option.count : null;
                                            }
                                            return null;
                                        };
                                        
                                        const count = getCount(filterKey, filterValue);
                                        return count ? `${filterValue} (${count})` : filterValue;
                                    };

                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {getFilterLabel(key)}: {getDisplayValue(key, value)}
                                            <button
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, [key]: '' }));
                                                    setFilterFormData(prev => ({ ...prev, [key]: '' }));
                                                    loadContacts(1);
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

            {/* Contacts Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Contact
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Email
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Phone
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Job Title
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Department
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Manage
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {contacts.map((contact) => (
                            <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                            <span className="text-xs font-medium text-blue-600">
                                                {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {contact.firstName} {contact.lastName}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {contact.companyName || 'No Company'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {contact.email || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {contact.phone || contact.mobile || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {contact.jobTitle || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {contact.department || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        contact.status === 'active' ? 'bg-green-100 text-green-800' :
                                        contact.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {contact.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex space-x-1">
                                        <button
                                            onClick={() => handleStartLead(contact.id)}
                                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                            title="Start Lead"
                                        >
                                            Lead
                                        </button>
                                        <button
                                            onClick={() => handleStartOpportunity(contact.id)}
                                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            title="Start Opportunity"
                                        >
                                            Opp
                                        </button>
                                        <button
                                            onClick={() => handleStartSale(contact.id)}
                                            className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                            title="Start Sale"
                                        >
                                            Sale
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openEditModal(contact)}
                                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(contact.id)}
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
                                onClick={() => loadContacts(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => loadContacts(pagination.currentPage + 1)}
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
            <FilterModal
                key="filter-modal"
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
            />
            
            <ContactModal
                key="add-modal"
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add New Contact"
                onSubmit={handleSubmit}
            />
            
            <ContactModal
                key="edit-modal"
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                title="Edit Contact"
                onSubmit={handleSubmit}
            />

            {/* Undo Notification */}
            {showUndoNotification && deletedContact && (
                <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
                    <span className="text-sm">Contact deleted</span>
                    <button
                        onClick={handleUndo}
                        className="bg-white text-red-600 px-2 py-1 rounded text-xs font-medium hover:bg-gray-100"
                    >
                        Undo
                    </button>
                    <button
                        onClick={() => setShowUndoNotification(false)}
                        className="text-white hover:text-gray-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(ContactsWidget); 