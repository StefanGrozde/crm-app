import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const LeadsWidget = () => {
    const { user } = useContext(AuthContext);
    const [leads, setLeads] = useState([]);
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
        priority: '',
        assignedTo: '',
        source: '',
        company: ''
    });
    
    // Separate state for search input
    const [searchInput, setSearchInput] = useState('');
    
    // Filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterFormData, setFilterFormData] = useState({
        status: '',
        priority: '',
        assignedTo: '',
        source: '',
        company: ''
    });
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'new',
        priority: 'medium',
        estimatedValue: '',
        currency: 'USD',
        source: '',
        expectedCloseDate: '',
        notes: '',
        assignedTo: '',
        companyId: '',
        contactId: ''
    });
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [contacts, setContacts] = useState([]);


    // Load leads
    const loadLeads = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/leads?${params}`, {
                withCredentials: true
            });
            
            setLeads(response.data.leads);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading leads:', error);
            setError('Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    // Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersResponse, companiesResponse, contactsResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/companies`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data);
            setCompanies(companiesResponse.data);
            setContacts(contactsResponse.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadLeads(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing LeadsWidget:', error);
                setError('Failed to initialize leads widget');
            }
        };

        initializeComponent();
        
        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [loadLeads, loadDropdownData]);

    // Handle search input changes
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
            loadLeads(1);
        }, 300);
    }, [searchInput, loadLeads]);

    // Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadLeads(1);
    }, [filterFormData, loadLeads]);

    // Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = {
            search: searchInput,
            status: '',
            priority: '',
            assignedTo: '',
            source: '',
            company: ''
        };
        setFilters(clearedFilters);
        setFilterFormData({
            status: '',
            priority: '',
            assignedTo: '',
            source: '',
            company: ''
        });
        loadLeads(1);
    }, [searchInput, loadLeads]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            if (editingLead) {
                await axios.put(`${API_URL}/api/leads/${editingLead.id}`, formData, {
                    withCredentials: true
                });
            } else {
                await axios.post(`${API_URL}/api/leads`, formData, {
                    withCredentials: true
                });
            }
            
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingLead(null);
            setFormData({
                title: '',
                description: '',
                status: 'new',
                priority: 'medium',
                estimatedValue: '',
                currency: 'USD',
                source: '',
                expectedCloseDate: '',
                notes: '',
                assignedTo: '',
                companyId: '',
                contactId: ''
            });
            loadLeads();
        } catch (error) {
            console.error('Error saving lead:', error);
            alert('Failed to save lead');
        }
    }, [editingLead, formData, loadLeads]);

    // Handle edit
    const handleEdit = useCallback((lead) => {
        setEditingLead(lead);
        setFormData({
            title: lead.title || '',
            description: lead.description || '',
            status: lead.status || 'new',
            priority: lead.priority || 'medium',
            estimatedValue: lead.estimatedValue || '',
            currency: lead.currency || 'USD',
            source: lead.source || '',
            expectedCloseDate: lead.expectedCloseDate ? lead.expectedCloseDate.split('T')[0] : '',
            notes: lead.notes || '',
            assignedTo: lead.assignedTo || '',
            companyId: lead.companyId || '',
            contactId: lead.contactId || ''
        });
        setShowEditModal(true);
    }, []);

    // Handle delete
    const handleDelete = useCallback(async (leadId) => {
        if (!window.confirm('Are you sure you want to delete this lead?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/leads/${leadId}`, {
                withCredentials: true
            });
            loadLeads();
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead');
        }
    }, [loadLeads]);

    // Get status color
    const getStatusColor = useCallback((status) => {
        const colors = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            qualified: 'bg-green-100 text-green-800',
            proposal: 'bg-purple-100 text-purple-800',
            negotiation: 'bg-orange-100 text-orange-800',
            closed_won: 'bg-green-100 text-green-800',
            closed_lost: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }, []);

    // Get priority color
    const getPriorityColor = useCallback((priority) => {
        const colors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        return colors[priority] || 'bg-gray-100 text-gray-800';
    }, []);

    // Filter Modal Component
    const FilterModal = ({ isOpen, onClose }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Filter Leads</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                name="status"
                                value={filterFormData.status}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Statuses</option>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="proposal">Proposal</option>
                                <option value="negotiation">Negotiation</option>
                                <option value="closed_won">Closed Won</option>
                                <option value="closed_lost">Closed Lost</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Priority</label>
                            <select
                                name="priority"
                                value={filterFormData.priority}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                            <select
                                name="assignedTo"
                                value={filterFormData.assignedTo}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                            <label className="block text-sm font-medium text-gray-700">Source</label>
                            <input
                                type="text"
                                name="source"
                                value={filterFormData.source}
                                onChange={handleFilterInputChange}
                                placeholder="Enter source to filter"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company</label>
                            <select
                                name="company"
                                value={filterFormData.company}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Companies</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button
                            onClick={onClose}
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
        );
    };

    // Lead Modal Component
    const LeadModal = ({ isOpen, onClose, title, onSubmit }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">{title}</h3>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Title *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="proposal">Proposal</option>
                                    <option value="negotiation">Negotiation</option>
                                    <option value="closed_won">Closed Won</option>
                                    <option value="closed_lost">Closed Lost</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Priority</label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Estimated Value</label>
                                <input
                                    type="number"
                                    name="estimatedValue"
                                    value={formData.estimatedValue}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Currency</label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Expected Close Date</label>
                                <input
                                    type="date"
                                    name="expectedCloseDate"
                                    value={formData.expectedCloseDate}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Source</label>
                                <input
                                    type="text"
                                    name="source"
                                    value={formData.source}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                                <select
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.firstName} {user.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company</label>
                                <select
                                    name="companyId"
                                    value={formData.companyId}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">No Company</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact</label>
                                <select
                                    name="contactId"
                                    value={formData.contactId}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="">No Contact</option>
                                    {contacts.map(contact => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.firstName} {contact.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="3"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                rows="3"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingLead ? 'Update Lead' : 'Create Lead'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (error) {
        return (
            <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                <div className="font-medium">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Filter
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Add Lead
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-4">
                <div className="flex space-x-2 mb-2">
                    <input
                        type="text"
                        placeholder="Search leads..."
                        value={searchInput}
                        onChange={(e) => handleSearchInputChange(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                </div>
                
                {/* Active Filters */}
                {Object.entries(filters).some(([key, value]) => value && key !== 'search') && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {Object.entries(filters).map(([key, value]) => {
                            if (!value || key === 'search') return null;
                            return (
                                <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                >
                                    {key}: {value}
                                    <button
                                        onClick={() => {
                                            setFilters(prev => ({ ...prev, [key]: '' }));
                                            loadLeads(1);
                                        }}
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-gray-500 hover:text-gray-700"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* Leads Table */}
            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Title
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Priority
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Value
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Assigned To
                                </th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{lead.title}</div>
                                        <div className="text-sm text-gray-500">{lead.source}</div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                                            {lead.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                                            {lead.priority}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                        {lead.estimatedValue ? `${lead.currency} ${parseFloat(lead.estimatedValue).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                        {lead.assignedUser ? `${lead.assignedUser.firstName} ${lead.assignedUser.lastName}` : 'Unassigned'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(lead)}
                                            className="text-blue-600 hover:text-blue-900 mr-2"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lead.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-700">
                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                        {pagination.totalItems} results
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => loadLeads(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => loadLeads(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Modals */}
            <FilterModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} />
            <LeadModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                title="Add New Lead"
                onSubmit={handleSubmit}
            />
            <LeadModal 
                isOpen={showEditModal} 
                onClose={() => setShowEditModal(false)} 
                title="Edit Lead"
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default memo(LeadsWidget); 