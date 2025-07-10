import React, { useState, useEffect, useContext, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ListManager from './ListManager';
import WidgetSearchBar from './WidgetSearchBar';

const API_URL = process.env.REACT_APP_API_URL;

const SalesWidget = ({ onOpenSaleProfile }) => {
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    const [sales, setSales] = useState([]);
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
        status: '',
        paymentStatus: '',
        assignedTo: '',
        category: '',
        source: '',
        contact: '',
        lead: '',
        opportunity: ''
    });
    
    // List filtering state
    const [selectedListId, setSelectedListId] = useState(null);
    const [selectedSales, setSelectedSales] = useState(new Set());
    const [availableLists, setAvailableLists] = useState([]);
    
    // Separate search state to prevent re-renders
    const [searchTerm, setSearchTerm] = useState('');
    
    // Refs for uncontrolled inputs
    // eslint-disable-next-line no-unused-vars
    const searchInputRef = useRef(null);
    // eslint-disable-next-line no-unused-vars
    const formRefs = useRef({
        title: useRef(null),
        description: useRef(null),
        status: useRef(null),
        saleDate: useRef(null),
        amount: useRef(null),
        currency: useRef(null),
        discountAmount: useRef(null),
        taxAmount: useRef(null),
        totalAmount: useRef(null),
        paymentMethod: useRef(null),
        paymentStatus: useRef(null),
        paymentDate: useRef(null),
        commissionRate: useRef(null),
        commissionAmount: useRef(null),
        category: useRef(null),
        source: useRef(null),
        notes: useRef(null),
        contactId: useRef(null),
        leadId: useRef(null),
        opportunityId: useRef(null),
        assignedTo: useRef(null),
        tagInput: useRef(null)
    });
    
    // Filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterFormData, setFilterFormData] = useState({
        status: '',
        paymentStatus: '',
        assignedTo: '',
        category: '',
        source: '',
        contact: '',
        lead: '',
        opportunity: ''
    });
    // eslint-disable-next-line no-unused-vars
    const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'pending',
        saleDate: '',
        amount: '',
        currency: 'USD',
        discountAmount: '0',
        taxAmount: '0',
        totalAmount: '',
        paymentMethod: '',
        paymentStatus: 'pending',
        paymentDate: '',
        partialPaymentPercentage: 0,
        commissionRate: '0',
        commissionAmount: '0',
        category: '',
        source: '',
        notes: '',
        contactId: '',
        leadId: '',
        opportunityId: '',
        assignedTo: '',
        tags: []
    });
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Contact form data for adding new contacts
    const [contactFormData, setContactFormData] = useState({
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
        source: ''
    });
    
    // Dropdown data
    const [users, setUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [filterOptions, setFilterOptions] = useState({
        categories: [],
        sources: [],
        paymentMethods: [],
        statuses: [],
        paymentStatuses: []
    });

    // Load sales data
    const loadSales = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            
            if (selectedListId) {
                params.append('listId', selectedListId);
            }
            
            const response = await axios.get(`${API_URL}/api/sales?${params}`, {
                withCredentials: true
            });
            
            setSales(response.data.sales);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading sales:', error);
            setError('Failed to load sales');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage, searchTerm, selectedListId]);

    // Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersRes, contactsRes, leadsRes, opportunitiesRes, filterOptionsRes] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true }),
                axios.get(`${API_URL}/api/leads`, { withCredentials: true }),
                axios.get(`${API_URL}/api/opportunities`, { withCredentials: true }),
                axios.get(`${API_URL}/api/sales/filter-options`, { withCredentials: true })
            ]);
            
            setUsers(usersRes.data.users || []);
            setContacts(contactsRes.data.contacts || []);
            setLeads(leadsRes.data.leads || []);
            setOpportunities(opportunitiesRes.data.opportunities || []);
            setFilterOptions(filterOptionsRes.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Load lists
    const loadLists = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/lists?entityType=sale`, {
                withCredentials: true
            });
            setAvailableLists(response.data.lists || []);
        } catch (error) {
            console.error('Error loading lists:', error);
        }
    }, []);

    // Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([loadSales(), loadDropdownData(), loadLists()]);
            } catch (error) {
                console.error('Error initializing sales widget:', error);
                setError('Failed to initialize sales widget');
            }
        };

        initializeComponent();
        
        return () => {
            if (window.salesSearchTimeout) {
                clearTimeout(window.salesSearchTimeout);
            }
        };
    }, [loadSales, loadDropdownData, loadLists]);

    // Handle search input changes
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
        loadSales(1);
    }, [loadSales]);

    // Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadSales(1);
    }, [filterFormData, loadSales]);

    // Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = {};
        setFilters(clearedFilters);
        setFilterFormData({
            status: '',
            paymentStatus: '',
            assignedTo: '',
            category: '',
            source: '',
            contact: '',
            lead: '',
            opportunity: ''
        });
        loadSales(1);
    }, [loadSales]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Reset form
    const resetForm = useCallback(() => {
        setFormData({
            title: '',
            description: '',
            status: 'pending',
            saleDate: '',
            amount: '',
            currency: 'USD',
            discountAmount: '0',
            taxAmount: '0',
            totalAmount: '',
            paymentMethod: '',
            paymentStatus: 'pending',
            paymentDate: '',
            partialPaymentPercentage: 0,
            commissionRate: '0',
            commissionAmount: '0',
            category: '',
            source: '',
            notes: '',
            contactId: '',
            leadId: '',
            opportunityId: '',
            assignedTo: '',
            tags: []
        });
        setTags([]);
        setTagInput('');
    }, []);

    // Open add modal
    const openAddModal = useCallback(() => {
        resetForm();
        setShowAddModal(true);
    }, [resetForm]);

    // Open filter modal
    const openFilterModal = useCallback(() => {
        setFilterFormData(filters);
        setShowFilterModal(true);
    }, [filters]);

    // Open edit modal
    const openEditModal = useCallback((sale) => {
        setEditingSale(sale);
        setFormData({
            title: sale.title || '',
            description: sale.description || '',
            status: sale.status || 'pending',
            saleDate: sale.saleDate || '',
            amount: sale.amount || '',
            currency: sale.currency || 'USD',
            discountAmount: sale.discountAmount || '0',
            taxAmount: sale.taxAmount || '0',
            totalAmount: sale.totalAmount || '',
            paymentMethod: sale.paymentMethod || '',
            paymentStatus: sale.paymentStatus || 'pending',
            paymentDate: sale.paymentDate || '',
            partialPaymentPercentage: sale.partialPaymentPercentage || 0,
            commissionRate: sale.commissionRate || '0',
            commissionAmount: sale.commissionAmount || '0',
            category: sale.category || '',
            source: sale.source || '',
            notes: sale.notes || '',
            contactId: sale.contactId || '',
            leadId: sale.leadId || '',
            opportunityId: sale.opportunityId || '',
            assignedTo: sale.assignedTo || '',
            tags: sale.tags || []
        });
        setTags(sale.tags || []);
        setShowEditModal(true);
    }, []);

    // Handle contact form input changes
    const handleContactInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setContactFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle contact form submission
    const handleContactSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post(`${API_URL}/api/contacts`, contactFormData, {
                withCredentials: true
            });
            
            // Add the new contact to the contacts list
            setContacts(prev => [...prev, response.data]);
            
            // Select the new contact in the form
            setFormData(prev => ({ ...prev, contactId: response.data.id }));
            
            // Reset contact form and close modal
            setContactFormData({
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
                source: ''
            });
            setShowAddContactModal(false);
            
            alert('Contact created successfully!');
        } catch (error) {
            console.error('Error creating contact:', error);
            alert(error.response?.data?.message || 'Failed to create contact');
        }
    }, [contactFormData]);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const submitData = {
                ...formData,
                tags: tags
            };
            
            if (showEditModal) {
                await axios.put(`${API_URL}/api/sales/${editingSale.id}`, submitData, {
                    withCredentials: true
                });
                setShowEditModal(false);
            } else {
                await axios.post(`${API_URL}/api/sales`, submitData, {
                    withCredentials: true
                });
                setShowAddModal(false);
            }
            
            resetForm();
            loadSales(pagination.currentPage);
        } catch (error) {
            console.error('Error saving sale:', error);
            alert(error.response?.data?.message || 'Failed to save sale');
        }
    }, [showEditModal, editingSale, formData, tags, resetForm, loadSales, pagination.currentPage]);

    // Handle delete
    const handleDelete = useCallback(async (saleId) => {
        if (!window.confirm('Are you sure you want to delete this sale?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/sales/${saleId}`, {
                withCredentials: true
            });
            
            loadSales(pagination.currentPage);
        } catch (error) {
            console.error('Error deleting sale:', error);
            alert('Failed to delete sale');
        }
    }, [loadSales, pagination.currentPage]);

    // Handle pagination
    const handlePageChange = useCallback((page) => {
        loadSales(page);
    }, [loadSales]);

    // Handle list selection
    const handleListSelect = useCallback((listId) => {
        setSelectedListId(listId);
        setSelectedSales(new Set());
    }, []);

    // Handle bulk selection
    const handleSelectSale = useCallback((saleId) => {
        setSelectedSales(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(saleId)) {
                newSelected.delete(saleId);
            } else {
                newSelected.add(saleId);
            }
            return newSelected;
        });
    }, []);

    // Handle select all
    const handleSelectAll = useCallback(() => {
        if (selectedSales.size === sales.length) {
            setSelectedSales(new Set());
        } else {
            setSelectedSales(new Set(sales.map(sale => sale.id)));
        }
    }, [selectedSales.size, sales]);

    // Add tag
    const addTag = useCallback(() => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags(prev => [...prev, tagInput.trim()]);
            setTagInput('');
        }
    }, [tagInput, tags]);

    // Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Handle tag input key press
    const handleTagKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    }, [addTag]);

    // Auto-calculate total amount
    useEffect(() => {
        const amount = parseFloat(formData.amount) || 0;
        const discount = parseFloat(formData.discountAmount) || 0;
        const tax = parseFloat(formData.taxAmount) || 0;
        const total = amount - discount + tax;
        
        if (total !== parseFloat(formData.totalAmount)) {
            setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
        }
    }, [formData.amount, formData.discountAmount, formData.taxAmount, formData.totalAmount]);

    // Calculate partial payment amount
    const getPartialPaymentAmount = useCallback(() => {
        const total = parseFloat(formData.totalAmount) || 0;
        const percentage = parseFloat(formData.partialPaymentPercentage) || 0;
        return (total * percentage / 100).toFixed(2);
    }, [formData.totalAmount, formData.partialPaymentPercentage]);

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={() => loadSales()}
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
                <h2 className="text-lg font-semibold text-gray-900">Sales</h2>
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
                <WidgetSearchBar
                    placeholder="Search sales..."
                    onSearch={handleSearchChange}
                    searchTerm={searchTerm}
                    className="w-full"
                />
            </div>

            {/* Lists Integration */}
            <ListManager
                entityType="sale"
                availableLists={availableLists}
                selectedListId={selectedListId}
                selectedItems={selectedSales}
                onListSelect={handleListSelect}
                onRefreshLists={loadLists}
                onItemsUpdated={loadSales}
            />

            {/* Bulk Actions */}
            {selectedSales.size > 0 && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                            {selectedSales.size} sale{selectedSales.size > 1 ? 's' : ''} selected
                        </span>
                        <button
                            onClick={() => setSelectedSales(new Set())}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear selection
                        </button>
                    </div>
                </div>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(filters).map(([key, value]) => 
                                value && (
                                    <span key={key} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                        {key}: {value}
                                    </span>
                                )
                            )}
                        </div>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear filters
                        </button>
                    </div>
                </div>
            )}

            {/* Sales Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-3 py-2 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedSales.size === sales.length && sales.length > 0}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Sale #</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Title</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Amount</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Payment</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Date</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Assigned To</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-900">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map((sale) => (
                            <tr key={sale.id} className="border-b hover:bg-gray-50">
                                <td className="px-3 py-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedSales.has(sale.id)}
                                        onChange={() => handleSelectSale(sale.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-3 py-2 text-blue-600 hover:text-blue-800 cursor-pointer"
                                    onClick={() => onOpenSaleProfile && onOpenSaleProfile(sale.id)}>
                                    {sale.saleNumber}
                                </td>
                                <td className="px-3 py-2">{sale.title}</td>
                                <td className="px-3 py-2">${parseFloat(sale.totalAmount).toFixed(2)}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        sale.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                        sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {sale.status}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                        sale.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        sale.paymentStatus === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                                        sale.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {sale.paymentStatus}
                                    </span>
                                </td>
                                <td className="px-3 py-2">{sale.saleDate}</td>
                                <td className="px-3 py-2">{sale.assignedUser?.username || 'Unassigned'}</td>
                                <td className="px-3 py-2">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openEditModal(sale)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sale.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                        {pagination.totalItems} entries
                    </span>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="px-3 py-1 bg-gray-200 text-gray-600 rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-3 py-1 rounded ${
                                    pagination.currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-3 py-1 bg-gray-200 text-gray-600 rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Modal */}
            {showFilterModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Filter Sales</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={filterFormData.status}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Statuses</option>
                                    {filterOptions.statuses.map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                                <select
                                    name="paymentStatus"
                                    value={filterFormData.paymentStatus}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Payment Statuses</option>
                                    {filterOptions.paymentStatuses.map(status => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                    ))}
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
                                        <option key={user.id} value={user.id}>{user.username}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    name="category"
                                    value={filterFormData.category}
                                    onChange={handleFilterInputChange}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">All Categories</option>
                                    {filterOptions.categories.map(category => (
                                        <option key={category.value} value={category.value}>{category.value}</option>
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
                                    {filterOptions.sources.map(source => (
                                        <option key={source.value} value={source.value}>{source.value}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                            >
                                Clear
                            </button>
                            <button
                                onClick={applyFilters}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add/Edit Sale Modal */}
            {(showAddModal || showEditModal) && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">
                            {showEditModal ? 'Edit Sale' : 'Add New Sale'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="processing">Processing</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date *</label>
                                    <input
                                        type="date"
                                        name="saleDate"
                                        value={formData.saleDate}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                                    <input
                                        type="number"
                                        name="discountAmount"
                                        value={formData.discountAmount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Amount</label>
                                    <input
                                        type="number"
                                        name="taxAmount"
                                        value={formData.taxAmount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                                    <input
                                        type="number"
                                        name="totalAmount"
                                        value={formData.totalAmount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        readOnly
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                    <input
                                        type="text"
                                        name="paymentMethod"
                                        value={formData.paymentMethod}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                                    <select
                                        name="paymentStatus"
                                        value={formData.paymentStatus}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="partially_paid">Partially Paid</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>
                                {formData.paymentStatus === 'partially_paid' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Partial Payment Percentage (${getPartialPaymentAmount()})
                                        </label>
                                        <input
                                            type="number"
                                            name="partialPaymentPercentage"
                                            value={formData.partialPaymentPercentage}
                                            onChange={handleInputChange}
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter percentage paid"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                    <input
                                        type="date"
                                        name="paymentDate"
                                        value={formData.paymentDate}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        name="commissionRate"
                                        value={formData.commissionRate}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Amount</label>
                                    <input
                                        type="number"
                                        name="commissionAmount"
                                        value={formData.commissionAmount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                                    <input
                                        type="text"
                                        name="source"
                                        value={formData.source}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Contact</label>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddContactModal(true)}
                                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Add Contact</span>
                                        </button>
                                    </div>
                                    <select
                                        name="contactId"
                                        value={formData.contactId}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Contact</option>
                                        {contacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>
                                                {contact.firstName} {contact.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lead</label>
                                    <select
                                        name="leadId"
                                        value={formData.leadId}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Lead</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>{lead.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity</label>
                                    <select
                                        name="opportunityId"
                                        value={formData.opportunityId}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Opportunity</option>
                                        {opportunities.map(opportunity => (
                                            <option key={opportunity.id} value={opportunity.id}>{opportunity.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                                    <select
                                        name="assignedTo"
                                        value={formData.assignedTo}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select User</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>{user.username}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map((tag, index) => (
                                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 text-blue-600 hover:text-blue-800"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex">
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyPress={handleTagKeyPress}
                                        placeholder="Add a tag..."
                                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={addTag}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    {showEditModal ? 'Update' : 'Create'} Sale
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Contact Modal */}
            {showAddContactModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Add New Contact</h3>
                        <form onSubmit={handleContactSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={contactFormData.firstName}
                                        onChange={handleContactInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={contactFormData.lastName}
                                        onChange={handleContactInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={contactFormData.email}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={contactFormData.phone}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={contactFormData.mobile}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                    <input
                                        type="text"
                                        name="jobTitle"
                                        value={contactFormData.jobTitle}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={contactFormData.department}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={contactFormData.city}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={contactFormData.state}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={contactFormData.country}
                                        onChange={handleContactInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    name="address"
                                    value={contactFormData.address}
                                    onChange={handleContactInputChange}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={contactFormData.notes}
                                    onChange={handleContactInputChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddContactModal(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Create Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default memo(SalesWidget);