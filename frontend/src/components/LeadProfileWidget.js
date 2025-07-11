import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const LeadProfileWidget = ({ leadId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingLead, setEditingLead] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns and relationships
    const [dropdownData, setDropdownData] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [relatedData, setRelatedData] = useState({});

    // Logic: Load lead data
    const loadLead = useCallback(async () => {
        if (!leadId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/leads/${leadId}`, {
                withCredentials: true
            });
            
            setLead(response.data);
        } catch (error) {
            console.error('Error loading lead:', error);
            setError('Failed to load lead details');
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    // Logic: Load dropdown and related data
    const loadAdditionalData = useCallback(async () => {
        try {
            const responses = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/companies`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true })
            ]);
            
            setDropdownData({ 
                users: responses[0].data, 
                companies: responses[1].data, 
                contacts: responses[2].data 
            });
        } catch (error) {
            console.error('Error loading additional data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadLead(),
                    loadAdditionalData()
                ]);
            } catch (error) {
                console.error('Error initializing LeadProfileWidget:', error);
                setError('Failed to initialize lead profile widget');
            }
        };

        initializeComponent();
    }, [loadLead, loadAdditionalData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Handle tag input
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

    // Logic: Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        if (!lead) return;
        
        setEditingLead(lead);
        setFormData({
            title: lead.title,
            description: lead.description || '',
            status: lead.status || 'new',
            priority: lead.priority || 'medium',
            estimatedValue: lead.estimatedValue || '',
            currency: lead.currency || 'USD',
            source: lead.source || '',
            expectedCloseDate: lead.expectedCloseDate ? lead.expectedCloseDate.split('T')[0] : '',
            actualCloseDate: lead.actualCloseDate ? lead.actualCloseDate.split('T')[0] : '',
            notes: lead.notes || '',
            tags: lead.tags || [],
            companyId: lead.companyId || '',
            contactId: lead.contactId || '',
            assignedTo: lead.assignedTo || ''
        });
        setShowEditModal(true);
    }, [lead]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/leads/${leadId}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadLead(); // Reload lead data
        } catch (error) {
            console.error('Error updating lead:', error);
            alert(error.response?.data?.message || 'Failed to update lead');
        }
    }, [leadId, formData, loadLead]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this lead?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/leads/${leadId}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('Lead deleted successfully');
        } catch (error) {
            console.error('Error deleting lead:', error);
            alert('Failed to delete lead');
        }
    }, [leadId]);

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
                    onClick={() => loadLead()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No lead found
    if (!lead) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Lead not found</div>
            </div>
        );
    }

    // Helper functions for rendering
    const getStatusBadge = (status) => {
        const statusColors = {
            new: 'bg-blue-100 text-blue-800',
            contacted: 'bg-yellow-100 text-yellow-800',
            qualified: 'bg-green-100 text-green-800',
            proposal: 'bg-purple-100 text-purple-800',
            negotiation: 'bg-orange-100 text-orange-800',
            closed_won: 'bg-green-100 text-green-800',
            closed_lost: 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityColors = {
            low: 'bg-gray-100 text-gray-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[priority] || 'bg-gray-100 text-gray-800'}`}>
                {priority}
            </span>
        );
    };

    const getDisplayName = () => {
        return lead.title || 'Untitled Lead';
    };

    const getInitials = () => {
        return getDisplayName().charAt(0);
    };

    const getAssignedUserName = () => {
        if (!lead.assignedUser) return 'Not assigned';
        return `${lead.assignedUser.firstName || lead.assignedUser.username} ${lead.assignedUser.lastName || ''}`;
    };

    const getContactName = () => {
        if (!lead.contact) return 'No contact';
        return `${lead.contact.firstName} ${lead.contact.lastName}`;
    };

    const getCompanyName = () => {
        if (!lead.company) return 'No company';
        return lead.company.name;
    };

    const formatCurrency = (value, currency) => {
        if (!value) return '-';
        return `${currency} ${parseFloat(value).toLocaleString()}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="h-full overflow-y-auto">
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
                        <p className="text-gray-600">{lead.source || 'No source'}</p>
                        {lead.company && (
                            <p className="text-sm text-gray-500">{getCompanyName()}</p>
                        )}
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

            {/* Lead Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Status</span>
                            {getStatusBadge(lead.status)}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Priority</span>
                            {getPriorityBadge(lead.priority)}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Assigned To</span>
                            <span className="text-sm text-gray-900">{getAssignedUserName()}</span>
                        </div>
                        {lead.source && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Source</span>
                                <span className="text-sm text-gray-900">{lead.source}</span>
                            </div>
                        )}
                        {lead.estimatedValue && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Estimated Value</span>
                                <span className="text-sm text-gray-900">{formatCurrency(lead.estimatedValue, lead.currency)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dates and Timeline */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
                    <div className="space-y-4">
                        {lead.expectedCloseDate && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Expected Close Date</span>
                                <p className="text-sm text-gray-900 mt-1">{formatDate(lead.expectedCloseDate)}</p>
                            </div>
                        )}
                        {lead.actualCloseDate && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Actual Close Date</span>
                                <p className="text-sm text-gray-900 mt-1">{formatDate(lead.actualCloseDate)}</p>
                            </div>
                        )}
                        <div>
                            <span className="text-sm font-medium text-gray-500">Created</span>
                            <p className="text-sm text-gray-900 mt-1">{formatDate(lead.createdAt)}</p>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-500">Last Updated</span>
                            <p className="text-sm text-gray-900 mt-1">{formatDate(lead.updatedAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Company Information */}
                {lead.company && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Company</h2>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-900 font-medium">{getCompanyName()}</p>
                            {lead.company.industry && (
                                <p className="text-sm text-gray-600">{lead.company.industry}</p>
                            )}
                            {lead.company.website && (
                                <p className="text-sm text-gray-900">
                                    <a href={lead.company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                        {lead.company.website}
                                    </a>
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Contact Information */}
                {lead.contact && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact</h2>
                        <div className="space-y-2">
                            <p className="text-sm text-gray-900 font-medium">{getContactName()}</p>
                            {lead.contact.email && (
                                <p className="text-sm text-gray-900">
                                    <a href={`mailto:${lead.contact.email}`} className="text-blue-600 hover:text-blue-800">
                                        {lead.contact.email}
                                    </a>
                                </p>
                            )}
                            {lead.contact.jobTitle && (
                                <p className="text-sm text-gray-600">{lead.contact.jobTitle}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {lead.tags && lead.tags.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {lead.tags.map((tag, index) => (
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
            </div>

            {/* Description */}
            {lead.description && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                </div>
            )}

            {/* Notes */}
            {lead.notes && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{lead.notes}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Lead</h2>
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
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title || ''}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status || 'new'}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                            </div>
                            
                            {/* Priority and Value */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                                    <select
                                        name="priority"
                                        value={formData.priority || 'medium'}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                                        value={formData.estimatedValue || ''}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                                    <select
                                        name="currency"
                                        value={formData.currency || 'USD'}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Dates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Expected Close Date</label>
                                    <input
                                        type="date"
                                        name="expectedCloseDate"
                                        value={formData.expectedCloseDate || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Actual Close Date</label>
                                    <input
                                        type="date"
                                        name="actualCloseDate"
                                        value={formData.actualCloseDate || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Source and Assignment */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Source</label>
                                    <input
                                        type="text"
                                        name="source"
                                        value={formData.source || ''}
                                        onChange={handleInputChange}
                                        placeholder="e.g., Website, Referral, Trade Show"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                                    <select
                                        name="assignedTo"
                                        value={formData.assignedTo || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select User</option>
                                        {Array.isArray(dropdownData.users) && dropdownData.users.map(user => (
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
                                        value={formData.companyId || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Company</option>
                                        {Array.isArray(dropdownData.companies) && dropdownData.companies.map(company => (
                                            <option key={company.id} value={company.id}>
                                                {company.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Contact */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Contact</label>
                                <select
                                    name="contactId"
                                    value={formData.contactId || ''}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select Contact</option>
                                    {Array.isArray(dropdownData.contacts) && dropdownData.contacts.map(contact => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.firstName} {contact.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            {/* Tags and Notes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tags</label>
                                    <input
                                        type="text"
                                        placeholder="Press Enter to add a tag"
                                        onKeyPress={handleTagInput}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    {(formData.tags || []).length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(formData.tags || []).map((tag, index) => (
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
                                        value={formData.notes || ''}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
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
                                    Update Lead
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

export default memo(LeadProfileWidget); 