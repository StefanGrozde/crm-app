import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const BusinessProfileWidget = ({ businessId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingBusiness, setEditingBusiness] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns and relationships
    const [dropdownData, setDropdownData] = useState({
        industries: [],
        sizes: [],
        statuses: []
    });
    // eslint-disable-next-line no-unused-vars
    const [relatedData, setRelatedData] = useState({});

    // Logic: Load business data
    const loadBusiness = useCallback(async () => {
        if (!businessId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/businesses/${businessId}`, {
                withCredentials: true
            });
            
            setBusiness(response.data);
        } catch (error) {
            console.error('Error loading business:', error);
            setError('Failed to load business details');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    // Logic: Load dropdown and related data
    const loadAdditionalData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/businesses/filter-options`, { 
                withCredentials: true 
            });
            setDropdownData(response.data);
        } catch (error) {
            console.error('Error loading additional data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadBusiness(),
                    loadAdditionalData()
                ]);
            } catch (error) {
                console.error('Error initializing BusinessProfileWidget:', error);
                setError('Failed to initialize business profile widget');
            }
        };

        initializeComponent();
    }, [loadBusiness, loadAdditionalData]);

    // Logic: Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        if (!business) return;
        
        setEditingBusiness(business);
        setFormData({
            name: business.name,
            industry: business.industry || '',
            size: business.size || '',
            website: business.website || '',
            phoneNumber: business.phoneNumber || '',
            email: business.email || '',
            address: business.address || '',
            city: business.city || '',
            state: business.state || '',
            zipCode: business.zipCode || '',
            country: business.country || '',
            description: business.description || '',
            status: business.status || 'active'
        });
        setShowEditModal(true);
    }, [business]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            await axios.put(`${API_URL}/api/businesses/${businessId}`, formData, {
                withCredentials: true
            });
            
            setShowEditModal(false);
            loadBusiness(); // Reload business data
        } catch (error) {
            console.error('Error updating business:', error);
            alert(error.response?.data?.message || 'Failed to update business');
        }
    }, [businessId, formData, loadBusiness]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this business?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/businesses/${businessId}`, {
                withCredentials: true
            });
            
            // Redirect or show message
            alert('Business deleted successfully');
        } catch (error) {
            console.error('Error deleting business:', error);
            alert('Failed to delete business');
        }
    }, [businessId]);

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
                    onClick={() => loadBusiness()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No business found
    if (!business) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Business not found</div>
            </div>
        );
    }

    // Helper functions for rendering
    const getStatusBadge = (status) => {
        const statusColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    const getDisplayName = () => {
        return business.name || 'Unknown Business';
    };

    const getInitials = () => {
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
                        <p className="text-sm text-gray-500">{business.industry || 'No industry'}</p>
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

            {/* Business Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        {business.status && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Status</span>
                                {getStatusBadge(business.status)}
                            </div>
                        )}
                        
                        {business.industry && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Industry</span>
                                <span className="text-sm text-gray-900">{business.industry}</span>
                            </div>
                        )}
                        
                        {business.size && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Size</span>
                                <span className="text-sm text-gray-900">{business.size} employees</span>
                            </div>
                        )}
                        
                        {business.website && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-500">Website</span>
                                <span className="text-sm text-gray-900">
                                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                        {business.website}
                                    </a>
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Details */}
                {(business.email || business.phoneNumber) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Details</h2>
                        <div className="space-y-4">
                            {business.email && (
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Email</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                        <a href={`mailto:${business.email}`} className="text-blue-600 hover:text-blue-800">
                                            {business.email}
                                        </a>
                                    </p>
                                </div>
                            )}
                            {business.phoneNumber && (
                                <div>
                                    <span className="text-sm font-medium text-gray-500">Phone</span>
                                    <p className="text-sm text-gray-900 mt-1">
                                        <a href={`tel:${business.phoneNumber}`} className="text-blue-600 hover:text-blue-800">
                                            {business.phoneNumber}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Address Information */}
                {(business.address || business.city || business.state || business.country) && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
                        <div className="space-y-2">
                            {business.address && (
                                <p className="text-sm text-gray-900">{business.address}</p>
                            )}
                            <p className="text-sm text-gray-900">
                                {[business.city, business.state, business.zipCode].filter(Boolean).join(', ')}
                            </p>
                            {business.country && (
                                <p className="text-sm text-gray-900">{business.country}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Description */}
            {business.description && (
                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{business.description}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Edit Business</h2>
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
                                    <label className="block text-sm font-medium text-gray-700">Business Name *</label>
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
                                    <label className="block text-sm font-medium text-gray-700">Industry</label>
                                    <select
                                        name="industry"
                                        value={formData.industry}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="">Select Industry</option>
                                        {dropdownData.industries.map(industry => (
                                            <option key={industry} value={industry}>{industry}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Size</label>
                                    <select
                                        name="size"
                                        value={formData.size}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="">Select Size</option>
                                        {dropdownData.sizes.map(size => (
                                            <option key={size} value={size}>{size} employees</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        {dropdownData.statuses.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Contact Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Website</label>
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>

                            {/* Address Information */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={formData.zipCode}
                                        onChange={handleInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                            </div>

                            {/* Additional Information */}
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
                                    Update Business
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(BusinessProfileWidget); 