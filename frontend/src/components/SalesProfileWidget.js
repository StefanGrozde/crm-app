import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import FileManager from './FileManager';

const API_URL = process.env.REACT_APP_API_URL;

const SalesProfileWidget = ({ saleId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [sale, setSale] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingSale, setEditingSale] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    
    // Tags handling
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Logic: Load sale data
    const loadSale = useCallback(async () => {
        if (!saleId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/sales/${saleId}`, {
                withCredentials: true
            });
            
            setSale(response.data);
            setTags(response.data.tags || []);
        } catch (error) {
            console.error('Error loading sale:', error);
            setError('Failed to load sale details');
        } finally {
            setLoading(false);
        }
    }, [saleId]);

    // Logic: Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersResponse, contactsResponse, leadsResponse, opportunitiesResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true }),
                axios.get(`${API_URL}/api/leads`, { withCredentials: true }),
                axios.get(`${API_URL}/api/opportunities`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data.users || []);
            setContacts(contactsResponse.data.contacts || []);
            setLeads(leadsResponse.data.leads || []);
            setOpportunities(opportunitiesResponse.data.opportunities || []);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadSale(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing SalesProfileWidget:', error);
                setError('Failed to initialize sales profile widget');
            }
        };

        initializeComponent();
    }, [loadSale, loadDropdownData]);

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
            if (!tags.includes(newTag)) {
                setTags(prev => [...prev, newTag]);
                setTagInput('');
            }
        }
    }, [tags]);

    // Logic: Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
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
            commissionRate: sale.commissionRate || '0',
            commissionAmount: sale.commissionAmount || '0',
            category: sale.category || '',
            source: sale.source || '',
            notes: sale.notes || '',
            contactId: sale.contactId || '',
            leadId: sale.leadId || '',
            opportunityId: sale.opportunityId || '',
            assignedTo: sale.assignedTo || ''
        });
        setTags(sale.tags || []);
        setShowEditModal(true);
    }, [sale]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const submitData = {
                ...formData,
                tags: tags
            };
            
            await axios.put(`${API_URL}/api/sales/${sale.id}`, submitData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            await loadSale(); // Reload sale data
        } catch (error) {
            console.error('Error updating sale:', error);
            alert(error.response?.data?.message || 'Failed to update sale');
        }
    }, [formData, tags, sale, loadSale]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this sale?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/sales/${sale.id}`, {
                withCredentials: true
            });
            
            // Optionally notify parent component about deletion
            window.history.back();
        } catch (error) {
            console.error('Error deleting sale:', error);
            alert('Failed to delete sale');
        }
    }, [sale]);

    // Auto-calculate total amount
    useEffect(() => {
        if (formData.amount || formData.discountAmount || formData.taxAmount) {
            const amount = parseFloat(formData.amount) || 0;
            const discount = parseFloat(formData.discountAmount) || 0;
            const tax = parseFloat(formData.taxAmount) || 0;
            const total = amount - discount + tax;
            
            if (total !== parseFloat(formData.totalAmount)) {
                setFormData(prev => ({ ...prev, totalAmount: total.toFixed(2) }));
            }
        }
    }, [formData.amount, formData.discountAmount, formData.taxAmount, formData.totalAmount]);

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
                    onClick={() => loadSale()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No sale found
    if (!sale) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Sale not found</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{sale.title}</h2>
                    <p className="text-gray-600">Sale #{sale.saleNumber}</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={openEditModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sale Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Sale Information</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                    sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    sale.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                                    sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {sale.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Sale Date:</span>
                                <span className="font-medium">{new Date(sale.saleDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-medium">${parseFloat(sale.amount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Currency:</span>
                                <span className="font-medium">{sale.currency}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Discount:</span>
                                <span className="font-medium">${parseFloat(sale.discountAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-medium">${parseFloat(sale.taxAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                                <span className="text-gray-600 font-semibold">Total Amount:</span>
                                <span className="font-bold text-lg">${parseFloat(sale.totalAmount).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Status:</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                    sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                    sale.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    sale.paymentStatus === 'partially_paid' ? 'bg-blue-100 text-blue-800' :
                                    sale.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {sale.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="font-medium">{sale.paymentMethod || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Date:</span>
                                <span className="font-medium">
                                    {sale.paymentDate ? new Date(sale.paymentDate).toLocaleDateString() : 'Not paid'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Commission Rate:</span>
                                <span className="font-medium">{parseFloat(sale.commissionRate || 0).toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Commission Amount:</span>
                                <span className="font-medium">${parseFloat(sale.commissionAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Details */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Category:</span>
                                <span className="font-medium">{sale.category || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Source:</span>
                                <span className="font-medium">{sale.source || 'Not specified'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Assigned To:</span>
                                <span className="font-medium">{sale.assignedUser?.username || 'Unassigned'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created By:</span>
                                <span className="font-medium">{sale.creator?.username || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">{new Date(sale.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Updated:</span>
                                <span className="font-medium">{new Date(sale.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Related Records */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Related Records</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Contact:</span>
                                <span className="font-medium">
                                    {sale.contact ? `${sale.contact.firstName} ${sale.contact.lastName}` : 'Not linked'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Lead:</span>
                                <span className="font-medium">{sale.lead?.title || 'Not linked'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Opportunity:</span>
                                <span className="font-medium">{sale.opportunity?.name || 'Not linked'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Company:</span>
                                <span className="font-medium">{sale.company?.name || 'Not specified'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {sale.description && (
                        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Description</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{sale.description}</p>
                        </div>
                    )}

                    {/* Notes */}
                    {sale.notes && (
                        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Notes</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* File Attachments */}
                    <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                        <FileManager 
                            entityType="sale" 
                            entityId={saleId}
                            title="Sale Documents"
                        />
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Sale</h3>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
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
                                        onKeyPress={handleTagInput}
                                        placeholder="Add a tag..."
                                        className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                                                setTags(prev => [...prev, tagInput.trim()]);
                                                setTagInput('');
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Update Sale
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

export default memo(SalesProfileWidget);