import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const CompaniesWidget = () => {
    const { user } = useContext(AuthContext);
    const [companies, setCompanies] = useState([]);
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
        industry: '',
        size: '',
        status: ''
    });
    
    // Separate state for search input
    const [searchInput, setSearchInput] = useState('');
    
    // Filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterFormData, setFilterFormData] = useState({
        industry: '',
        size: '',
        status: ''
    });
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        industry: '',
        size: '',
        website: '',
        phoneNumber: '',
        email: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        description: '',
        status: 'active'
    });
    


    // Load companies
    const loadCompanies = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/companies?${params}`, {
                withCredentials: true
            });
            
            setCompanies(response.data.companies);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading companies:', error);
            setError('Failed to load companies');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await loadCompanies();
            } catch (error) {
                console.error('Error initializing CompaniesWidget:', error);
                setError('Failed to initialize companies widget');
            }
        };

        initializeComponent();
        
        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [loadCompanies]);

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
            loadCompanies(1);
        }, 300);
    }, [searchInput, loadCompanies]);

    // Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadCompanies(1);
    }, [filterFormData, loadCompanies]);

    // Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = {
            search: searchInput,
            industry: '',
            size: '',
            status: ''
        };
        setFilters(clearedFilters);
        setFilterFormData({
            industry: '',
            size: '',
            status: ''
        });
        loadCompanies(1);
    }, [searchInput, loadCompanies]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await axios.put(`${API_URL}/api/companies/${editingCompany.id}`, formData, {
                    withCredentials: true
                });
            } else {
                await axios.post(`${API_URL}/api/companies`, formData, {
                    withCredentials: true
                });
            }
            
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingCompany(null);
            setFormData({
                name: '',
                industry: '',
                size: '',
                website: '',
                phoneNumber: '',
                email: '',
                address: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
                description: '',
                status: 'active'
            });
            loadCompanies();
        } catch (error) {
            console.error('Error saving company:', error);
            alert('Failed to save company');
        }
    }, [editingCompany, formData, loadCompanies]);

    // Handle edit
    const handleEdit = useCallback((company) => {
        setEditingCompany(company);
        setFormData({
            name: company.name || '',
            industry: company.industry || '',
            size: company.size || '',
            website: company.website || '',
            phoneNumber: company.phoneNumber || '',
            email: company.email || '',
            address: company.address || '',
            city: company.city || '',
            state: company.state || '',
            zipCode: company.zipCode || '',
            country: company.country || '',
            description: company.description || '',
            status: company.status || 'active'
        });
        setShowEditModal(true);
    }, []);

    // Handle delete
    const handleDelete = useCallback(async (companyId) => {
        if (!window.confirm('Are you sure you want to delete this company?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/companies/${companyId}`, {
                withCredentials: true
            });
            loadCompanies();
        } catch (error) {
            console.error('Error deleting company:', error);
            alert('Failed to delete company');
        }
    }, [loadCompanies]);

    // Get status color
    const getStatusColor = useCallback((status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            prospect: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }, []);

    // Filter Modal Component
    const FilterModal = ({ isOpen, onClose }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Filter Companies</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Industry</label>
                            <input
                                type="text"
                                name="industry"
                                value={filterFormData.industry}
                                onChange={handleFilterInputChange}
                                placeholder="Enter industry to filter"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Size</label>
                            <select
                                name="size"
                                value={filterFormData.size}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Sizes</option>
                                <option value="1-10">1-10 employees</option>
                                <option value="11-50">11-50 employees</option>
                                <option value="51-200">51-200 employees</option>
                                <option value="201-500">201-500 employees</option>
                                <option value="501-1000">501-1000 employees</option>
                                <option value="1000+">1000+ employees</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                name="status"
                                value={filterFormData.status}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="prospect">Prospect</option>
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

    // Company Modal Component
    const CompanyModal = ({ isOpen, onClose, title, onSubmit }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">{title}</h3>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Company Name *</label>
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
                                <input
                                    type="text"
                                    name="industry"
                                    value={formData.industry}
                                    onChange={handleInputChange}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
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
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="501-1000">501-1000 employees</option>
                                    <option value="1000+">1000+ employees</option>
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
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="prospect">Prospect</option>
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
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                {editingCompany ? 'Update Company' : 'Create Company'}
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
                    onClick={() => loadCompanies()}
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
                <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilterModal(true)}
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
                        onClick={() => setShowAddModal(true)}
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
                    placeholder="Search companies..."
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
                                            industry: 'Industry',
                                            size: 'Size',
                                            status: 'Status'
                                        };
                                        return labels[filterKey] || filterKey;
                                    };

                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {getFilterLabel(key)}: {value}
                                            <button
                                                onClick={() => {
                                                    setFilters(prev => ({ ...prev, [key]: '' }));
                                                    setFilterFormData(prev => ({ ...prev, [key]: '' }));
                                                    loadCompanies(1);
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

            {/* Companies Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Industry
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Size
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Contact
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {companies.map((company) => (
                            <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                            <span className="text-xs font-medium text-blue-600">
                                                {company.name.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {company.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {company.website || 'No Website'}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {company.industry || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {company.size || '-'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        company.status === 'active' ? 'bg-green-100 text-green-800' :
                                        company.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {company.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div>{company.phoneNumber || '-'}</div>
                                    <div className="text-xs text-gray-500">{company.email || '-'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(company)}
                                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(company.id)}
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
                                onClick={() => loadCompanies(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => loadCompanies(pagination.currentPage + 1)}
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
            <FilterModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} />
            <CompanyModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                title="Add New Company"
                onSubmit={handleSubmit}
            />
            <CompanyModal 
                isOpen={showEditModal} 
                onClose={() => setShowEditModal(false)} 
                title="Edit Company"
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default memo(CompaniesWidget); 