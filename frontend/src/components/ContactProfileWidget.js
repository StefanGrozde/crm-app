import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const ContactProfileWidget = ({ contactId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    // eslint-disable-next-line no-unused-vars
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
            const [usersResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data);
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
            <div className="flex items-center justify-center h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading contact profile...</p>
                </div>
            </div>
        );
    }

    // Rendering: Error state
    if (error) {
        return (
            <div className="text-center py-12 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl">
                <div className="text-red-600 text-lg font-medium mb-4">{error}</div>
                <button
                    onClick={() => loadContact()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No contact found
    if (!contact) {
        return (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl">
                <div className="text-gray-600 text-lg font-medium">Contact not found</div>
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
        const statusConfig = {
            active: { bg: 'bg-gradient-to-r from-green-500 to-emerald-500', text: 'text-white', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            inactive: { bg: 'bg-gradient-to-r from-red-500 to-pink-500', text: 'text-white', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
            prospect: { bg: 'bg-gradient-to-r from-yellow-500 to-orange-500', text: 'text-white', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
        };
        
        const config = statusConfig[status] || statusConfig.active;
        
        return (
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${config.bg} ${config.text} shadow-sm`}>
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                </svg>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Generate gradient colors based on name
    const getGradientColors = (firstName, lastName) => {
        const colors = [
            'from-blue-500 to-indigo-600',
            'from-purple-500 to-pink-600',
            'from-green-500 to-teal-600',
            'from-orange-500 to-red-600',
            'from-indigo-500 to-purple-600',
            'from-pink-500 to-rose-600',
            'from-teal-500 to-cyan-600',
            'from-yellow-500 to-orange-600'
        ];
        
        const nameHash = (firstName + lastName).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        return colors[Math.abs(nameHash) % colors.length];
    };

    const gradientColors = getGradientColors(contact.firstName, contact.lastName);

    return (
        <div className="h-full overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 p-6">
            {/* Header with enhanced design */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-6 lg:space-y-0">
                    <div className="flex items-start space-x-6">
                        {/* Enhanced Avatar */}
                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradientColors} flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200`}>
                            <span className="text-3xl font-bold text-white">
                                {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                            </span>
                        </div>
                        
                        {/* Contact Info */}
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {contact.firstName} {contact.lastName}
                            </h1>
                            {contact.jobTitle && (
                                <p className="text-lg text-gray-600 mb-2 font-medium">{contact.jobTitle}</p>
                            )}
                            {contact.company && (
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    <span className="text-gray-700 font-medium">{contact.company.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={openEditModal}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit Profile</span>
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium rounded-xl hover:from-red-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Contact Information Grid with enhanced cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Basic Information Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Status
                            </span>
                            {getStatusBadge(contact.status)}
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Assigned To
                            </span>
                            <span className="text-sm text-gray-900 font-medium">{getAssignedUserName()}</span>
                        </div>
                        {contact.source && (
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                                <span className="text-sm font-medium text-gray-500 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Source
                                </span>
                                <span className="text-sm text-gray-900 font-medium">{contact.source}</span>
                            </div>
                        )}
                        {contact.department && (
                            <div className="flex justify-between items-center py-3">
                                <span className="text-sm font-medium text-gray-500 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Department
                                </span>
                                <span className="text-sm text-gray-900 font-medium">{contact.department}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Details Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Contact Details</h2>
                    </div>
                    <div className="space-y-4">
                        {contact.email && (
                            <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                                    {contact.email}
                                </a>
                            </div>
                        )}
                        {contact.phone && (
                            <div className="flex items-center space-x-3 py-3 border-b border-gray-100">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <a href={`tel:${contact.phone}`} className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                                    {contact.phone}
                                </a>
                            </div>
                        )}
                        {contact.mobile && (
                            <div className="flex items-center space-x-3 py-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <a href={`tel:${contact.mobile}`} className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                                    {contact.mobile}
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Address Information Card */}
                {(contact.address || contact.city || contact.state || contact.country) && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Address</h2>
                        </div>
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

                {/* Tags Card */}
                {contact.tags && contact.tags.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Tags</h2>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {contact.tags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 hover:from-blue-200 hover:to-indigo-200 transition-all duration-200"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Notes Card */}
            {contact.notes && (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Notes</h2>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                </div>
            )}

            {/* Sales Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Sales History</h2>
                    </div>
                    <div className="text-sm text-gray-500">
                        {contact.sales && Array.isArray(contact.sales) ? contact.sales.length : 0} sale{(contact.sales && Array.isArray(contact.sales) && contact.sales.length !== 1) ? 's' : ''}
                    </div>
                </div>
                
                {contact.sales && Array.isArray(contact.sales) && contact.sales.length > 0 ? (
                    <div className="space-y-4">
                        {contact.sales.map((sale) => (
                            <div key={sale.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">{sale.title}</h3>
                                        <p className="text-sm text-gray-600 mb-2">{sale.saleNumber}</p>
                                        {sale.description && (
                                            <p className="text-sm text-gray-700 mb-2 line-clamp-2">{sale.description}</p>
                                        )}
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="text-lg font-bold text-gray-900">
                                            ${parseFloat(sale.totalAmount).toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-500">{sale.currency}</div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-1">
                                            <span className="text-gray-500">Date:</span>
                                            <span className="font-medium text-gray-900">
                                                {new Date(sale.saleDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {sale.category && (
                                            <div className="flex items-center space-x-1">
                                                <span className="text-gray-500">Category:</span>
                                                <span className="font-medium text-gray-900">{sale.category}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                        {/* Status Badge */}
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            sale.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                            sale.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                            sale.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                                        </span>
                                        
                                        {/* Payment Status Badge */}
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                            sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                                            sale.paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                                            sale.paymentStatus === 'pending' ? 'bg-blue-100 text-blue-800' :
                                            sale.paymentStatus === 'failed' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {sale.paymentStatus === 'partially_paid' ? 'Partial' : 
                                             sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Additional Details */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500">Amount:</span>
                                            <div className="font-medium text-gray-900">${parseFloat(sale.amount).toLocaleString()}</div>
                                        </div>
                                        {parseFloat(sale.discountAmount) > 0 && (
                                            <div>
                                                <span className="text-gray-500">Discount:</span>
                                                <div className="font-medium text-gray-900">${parseFloat(sale.discountAmount).toLocaleString()}</div>
                                            </div>
                                        )}
                                        {parseFloat(sale.taxAmount) > 0 && (
                                            <div>
                                                <span className="text-gray-500">Tax:</span>
                                                <div className="font-medium text-gray-900">${parseFloat(sale.taxAmount).toLocaleString()}</div>
                                            </div>
                                        )}
                                        {sale.paymentMethod && (
                                            <div>
                                                <span className="text-gray-500">Payment:</span>
                                                <div className="font-medium text-gray-900">{sale.paymentMethod}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Sales Yet</h3>
                        <p className="text-gray-500">This contact hasn't made any purchases yet.</p>
                    </div>
                )}
            </div>

            {/* Enhanced Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Edit Contact Profile</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            value={formData.firstName || ''}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            value={formData.lastName || ''}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Contact Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                                        <input
                                            type="tel"
                                            name="mobile"
                                            value={formData.mobile || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Professional Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                                        <input
                                            type="text"
                                            name="jobTitle"
                                            value={formData.jobTitle || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                        <input
                                            type="text"
                                            name="department"
                                            value={formData.department || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                        <select
                                            name="status"
                                            value={formData.status || 'active'}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="prospect">Prospect</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Address Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                        <textarea
                                            name="address"
                                            value={formData.address || ''}
                                            onChange={handleInputChange}
                                            rows="2"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                                        <input
                                            type="text"
                                            name="zipCode"
                                            value={formData.zipCode || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={formData.country || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Additional Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                                        <input
                                            type="text"
                                            name="source"
                                            value={formData.source || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g., Website, Referral, Trade Show"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
                                        <select
                                            name="assignedTo"
                                            value={formData.assignedTo || ''}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                                        <input
                                            type="text"
                                            placeholder="Press Enter to add a tag"
                                            onKeyPress={handleTagInput}
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                        {(formData.tags || []).length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {(formData.tags || []).map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                                    >
                                                        {tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTag(tag)}
                                                            className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 transition-colors duration-200"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes || ''}
                                            onChange={handleInputChange}
                                            rows="3"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
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