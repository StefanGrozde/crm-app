import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const OpportunityProfileWidget = ({ opportunityId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [opportunity, setOpportunity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns and relationships
    const [dropdownData, setDropdownData] = useState({});
    // eslint-disable-next-line no-unused-vars
    const [relatedData, setRelatedData] = useState({});

    // Logic: Load opportunity data
    const loadOpportunity = useCallback(async () => {
        if (!opportunityId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/opportunities/${opportunityId}`, {
                withCredentials: true
            });
            
            setOpportunity(response.data);
        } catch (error) {
            console.error('Error loading opportunity:', error);
            setError('Failed to load opportunity details');
        } finally {
            setLoading(false);
        }
    }, [opportunityId]);

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
                    loadOpportunity(),
                    loadAdditionalData()
                ]);
            } catch (error) {
                console.error('Error initializing OpportunityProfileWidget:', error);
                setError('Failed to initialize opportunity profile widget');
            }
        };

        initializeComponent();
    }, [loadOpportunity, loadAdditionalData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Handle tag input (if applicable)
    // eslint-disable-next-line no-unused-vars
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
    // eslint-disable-next-line no-unused-vars
    const removeTag = useCallback((tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        if (!opportunity) return;
        
        setEditingOpportunity(opportunity);
        setFormData({
            name: opportunity.name || '',
            description: opportunity.description || '',
            stage: opportunity.stage || 'prospecting',
            probability: opportunity.probability || 10,
            amount: opportunity.amount || '',
            currency: opportunity.currency || 'USD',
            expectedCloseDate: opportunity.expectedCloseDate ? opportunity.expectedCloseDate.split('T')[0] : '',
            actualCloseDate: opportunity.actualCloseDate ? opportunity.actualCloseDate.split('T')[0] : '',
            type: opportunity.type || '',
            source: opportunity.source || '',
            notes: opportunity.notes || '',
            assignedTo: opportunity.assignedTo || '',
            companyId: opportunity.companyId || '',
            contactId: opportunity.contactId || '',
            tags: opportunity.tags || []
        });
        setShowEditModal(true);
    }, [opportunity]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/opportunities/${opportunityId}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadOpportunity(); // Reload opportunity data
        } catch (error) {
            console.error('Error updating opportunity:', error);
            alert(error.response?.data?.message || 'Failed to update opportunity');
        }
    }, [opportunityId, formData, loadOpportunity]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this opportunity?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/opportunities/${opportunityId}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('Opportunity deleted successfully');
        } catch (error) {
            console.error('Error deleting opportunity:', error);
            alert('Failed to delete opportunity');
        }
    }, [opportunityId]);

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
                    onClick={() => loadOpportunity()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No opportunity found
    if (!opportunity) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Opportunity not found</div>
            </div>
        );
    }

    // Helper functions for rendering
    const getStageBadge = (stage) => {
        const stageColors = {
            prospecting: 'bg-blue-100 text-blue-800',
            qualification: 'bg-yellow-100 text-yellow-800',
            proposal: 'bg-purple-100 text-purple-800',
            negotiation: 'bg-orange-100 text-orange-800',
            closed_won: 'bg-green-100 text-green-800',
            closed_lost: 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stageColors[stage] || 'bg-gray-100 text-gray-800'}`}>
                {stage.replace('_', ' ')}
            </span>
        );
    };

    const getProbabilityColor = (probability) => {
        if (probability >= 80) return 'bg-green-100 text-green-800';
        if (probability >= 60) return 'bg-yellow-100 text-yellow-800';
        if (probability >= 40) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    };

    const getDisplayName = () => {
        return opportunity.name || 'Unknown Opportunity';
    };

    const getInitials = () => {
        return getDisplayName().charAt(0);
    };

    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-purple-600">
                            {getInitials()}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {getDisplayName()}
                        </h1>
                        <p className="text-gray-600">{opportunity.type || 'No type specified'}</p>
                        <p className="text-sm text-gray-500">{opportunity.source || 'No source specified'}</p>
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

            {/* Opportunity Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        {opportunity.stage && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Stage</span>
                                {getStageBadge(opportunity.stage)}
                            </div>
                        )}
                        
                        {opportunity.probability && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Probability</span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProbabilityColor(opportunity.probability)}`}>
                                    {opportunity.probability}%
                                </span>
                            </div>
                        )}
                        
                        {opportunity.assignedUser && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Assigned To</span>
                                <span className="text-sm text-gray-900">
                                    {`${opportunity.assignedUser.firstName || ''} ${opportunity.assignedUser.lastName || opportunity.assignedUser.username}`}
                                </span>
                            </div>
                        )}
                        
                        {opportunity.creator && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Created By</span>
                                <span className="text-sm text-gray-900">
                                    {`${opportunity.creator.firstName || ''} ${opportunity.creator.lastName || opportunity.creator.username}`}
                                </span>
                            </div>
                        )}
                        
                        {opportunity.amount && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Amount</span>
                                <span className="text-sm text-gray-900">
                                    {new Intl.NumberFormat('en-US', { 
                                        style: 'currency', 
                                        currency: opportunity.currency || 'USD' 
                                    }).format(opportunity.amount)}
                                </span>
                            </div>
                        )}
                        
                        {opportunity.expectedCloseDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Expected Close Date</span>
                                <span className="text-sm text-gray-900">
                                    {new Date(opportunity.expectedCloseDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                        
                        {opportunity.actualCloseDate && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Actual Close Date</span>
                                <span className="text-sm text-gray-900">
                                    {new Date(opportunity.actualCloseDate).toLocaleDateString()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company and Contact Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Related Information</h2>
                    <div className="space-y-4">
                        {opportunity.company && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Company</span>
                                <p className="text-sm text-gray-900 mt-1">
                                    <span className="text-blue-600 hover:text-blue-800">
                                        {opportunity.company.name}
                                    </span>
                                </p>
                            </div>
                        )}
                        
                        {opportunity.contact && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Contact</span>
                                <p className="text-sm text-gray-900 mt-1">
                                    <span className="text-blue-600 hover:text-blue-800">
                                        {`${opportunity.contact.firstName} ${opportunity.contact.lastName}`}
                                    </span>
                                </p>
                                {opportunity.contact.email && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        <a href={`mailto:${opportunity.contact.email}`} className="text-blue-600 hover:text-blue-800">
                                            {opportunity.contact.email}
                                        </a>
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {opportunity.type && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Type</span>
                                <p className="text-sm text-gray-900 mt-1">{opportunity.type}</p>
                            </div>
                        )}
                        
                        {opportunity.source && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Source</span>
                                <p className="text-sm text-gray-900 mt-1">{opportunity.source}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tags (if applicable) */}
                {opportunity.tags && opportunity.tags.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {opportunity.tags.map((tag, index) => (
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
            {opportunity.description && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{opportunity.description}</p>
                </div>
            )}

            {/* Notes */}
            {opportunity.notes && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{opportunity.notes}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Opportunity</h2>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Stage</label>
                                    <select
                                        name="stage"
                                        value={formData.stage}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="prospecting">Prospecting</option>
                                        <option value="qualification">Qualification</option>
                                        <option value="proposal">Proposal</option>
                                        <option value="negotiation">Negotiation</option>
                                        <option value="closed_won">Closed Won</option>
                                        <option value="closed_lost">Closed Lost</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Probability (%)</label>
                                    <input
                                        type="number"
                                        name="probability"
                                        value={formData.probability}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="100"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                                    <label className="block text-sm font-medium text-gray-700">Type</label>
                                    <input
                                        type="text"
                                        name="type"
                                        value={formData.type}
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
                                        {Array.isArray(dropdownData.users) && dropdownData.users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.username}
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
                                        {Array.isArray(dropdownData.companies) && dropdownData.companies.map(company => (
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
                                        {Array.isArray(dropdownData.contacts) && dropdownData.contacts.map(contact => (
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
                                    Update Opportunity
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(OpportunityProfileWidget); 