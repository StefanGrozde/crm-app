import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const ContactProfileWidget = ({ contactId }) => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);

    // Logic: Load contact data
    const loadContact = useCallback(async () => {
        if (!contactId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/contacts/${contactId}`, {
                withCredentials: true
            });
            
            setContact(response.data);
        } catch (error) {
            console.error('Error loading contact:', error);
            setError('Failed to load contact details');
        } finally {
            setLoading(false);
        }
    }, [contactId]);

    // Logic: Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersResponse, companiesResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/companies`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data);
            setCompanies(companiesResponse.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadContact(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing ContactProfileWidget:', error);
                setError('Failed to initialize contact profile widget');
            }
        };

        initializeComponent();
    }, [loadContact, loadDropdownData]);

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
        if (!contact) return;
        
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
    }, [contact]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/contacts/${contactId}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadContact(); // Reload contact data
        } catch (error) {
            console.error('Error updating contact:', error);
            alert(error.response?.data?.message || 'Failed to update contact');
        }
    }, [contactId, formData, loadContact]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this contact?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/contacts/${contactId}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('Contact deleted successfully');
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Failed to delete contact');
        }
    }, [contactId]);

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
                    onClick={() => loadContact()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No contact found
    if (!contact) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Contact not found</div>
            </div>
        );
    }

    // Get assigned user name
    const getAssignedUserName = () => {
        if (!contact.assignedUser) return 'Not assigned';
        return `${contact.assignedUser.firstName} ${contact.assignedUser.lastName}`;
    };

    // Get status badge
    const getStatusBadge = (status) => {
        const statusColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            prospect: 'bg-yellow-100 text-yellow-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">
                            {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {contact.firstName} {contact.lastName}
                        </h1>
                        <p className="text-gray-600">{contact.jobTitle || 'No job title'}</p>
                        {contact.company && (
                            <p className="text-sm text-gray-500">{contact.company.name}</p>
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

            {/* Contact Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Status</span>
                            {getStatusBadge(contact.status)}
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Assigned To</span>
                            <span className="text-sm text-gray-900">{getAssignedUserName()}</span>
                        </div>
                        {contact.source && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Source</span>
                                <span className="text-sm text-gray-900">{contact.source}</span>
                            </div>
                        )}
                        {contact.department && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Department</span>
                                <span className="text-sm text-gray-900">{contact.department}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Details */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
                    <div className="space-y-4">
                        {contact.email && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Email</span>
                                <p className="text-sm text-gray-900 mt-1">
                                    <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800">
                                        {contact.email}
                                    </a>
                                </p>
                            </div>
                        )}
                        {contact.phone && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Phone</span>
                                <p className="text-sm text-gray-900 mt-1">
                                    <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800">
                                        {contact.phone}
                                    </a>
                                </p>
                            </div>
                        )}
                        {contact.mobile && (
                            <div>
                                <span className="text-sm font-medium text-gray-500">Mobile</span>
                                <p className="text-sm text-gray-900 mt-1">
                                    <a href={`tel:${contact.mobile}`} className="text-blue-600 hover:text-blue-800">
                                        {contact.mobile}
                                    </a>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Address Information */}
                {(contact.address || contact.city || contact.state || contact.country) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                        <div className="space-y-2">
                            {contact.address && (
                                <p className="text-sm text-gray-900">{contact.address}</p>
                            )}
                            <p className="text-sm text-gray-900">
                                {[contact.city, contact.state, contact.zipCode].filter(Boolean).join(', ')}
                            </p>
                            {contact.country && (
                                <p className="text-sm text-gray-900">{contact.country}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
                        <div className="flex flex-wrap gap-2">
                            {contact.tags.map((tag, index) => (
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

            {/* Notes */}
            {contact.notes && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{contact.notes}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Contact</h2>
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
                                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName || ''}
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
                                        value={formData.lastName || ''}
                                        onChange={handleInputChange}
                                        required
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Mobile</label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={formData.mobile || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Professional Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                    <input
                                        type="text"
                                        name="jobTitle"
                                        value={formData.jobTitle || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Department</label>
                                    <input
                                        type="text"
                                        name="department"
                                        value={formData.department || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status || 'active'}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="prospect">Prospect</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Address Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Address</label>
                                    <textarea
                                        name="address"
                                        value={formData.address || ''}
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
                                        value={formData.city || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country || ''}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            
                            {/* Additional Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        {Array.isArray(users) && users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.firstName} {user.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                    Update Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(ContactProfileWidget); 