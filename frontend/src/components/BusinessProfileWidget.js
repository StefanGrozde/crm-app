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
    
    // Additional data for dropdowns
    const [dropdownData, setDropdownData] = useState({
        industries: [],
        sizes: [],
        statuses: []
    });

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

    // Logic: Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/businesses/filter-options`, { 
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
                await Promise.all([
                    loadBusiness(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing BusinessProfileWidget:', error);
                setError('Failed to initialize business profile widget');
            }
        };

        initializeComponent();
    }, [loadBusiness, loadDropdownData]);

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

    // Helper function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        
        return (
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

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

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                        <span className="text-lg font-medium text-blue-600">
                            {business.name.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{business.name}</h2>
                        <p className="text-sm text-gray-500">{business.industry || 'No Industry'}</p>
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={openEditModal}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>

            {/* Business Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Business Information</h3>
                    <div className="space-y-3">
                        <div>
                            <span className="text-sm font-medium text-gray-700">Industry:</span>
                            <span className="ml-2 text-sm text-gray-900">{business.industry || 'Not specified'}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Size:</span>
                            <span className="ml-2 text-sm text-gray-900">{business.size || 'Not specified'}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Status:</span>
                            <span className="ml-2">{getStatusBadge(business.status)}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Website:</span>
                            <span className="ml-2 text-sm text-gray-900">
                                {business.website ? (
                                    <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                        {business.website}
                                    </a>
                                ) : 'Not specified'}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
                    <div className="space-y-3">
                        <div>
                            <span className="text-sm font-medium text-gray-700">Phone:</span>
                            <span className="ml-2 text-sm text-gray-900">{business.phoneNumber || 'Not specified'}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Email:</span>
                            <span className="ml-2 text-sm text-gray-900">
                                {business.email ? (
                                    <a href={`mailto:${business.email}`} className="text-blue-600 hover:text-blue-800">
                                        {business.email}
                                    </a>
                                ) : 'Not specified'}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm font-medium text-gray-700">Address:</span>
                            <span className="ml-2 text-sm text-gray-900">
                                {business.address ? (
                                    <div>
                                        <div>{business.address}</div>
                                        <div>{business.city}, {business.state} {business.zipCode}</div>
                                        <div>{business.country}</div>
                                    </div>
                                ) : 'Not specified'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            {business.description && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Description</h3>
                    <p className="text-sm text-gray-900">{business.description}</p>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Business</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
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