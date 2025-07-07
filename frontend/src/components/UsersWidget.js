import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const UsersWidget = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
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
        role: '',
        company: ''
    });
    
    // Separate state for search input
    const [searchInput, setSearchInput] = useState('');
    
    // Filter modal state
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [filterFormData, setFilterFormData] = useState({
        role: '',
        company: ''
    });
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        role: 'Sales Representative',
        companyId: ''
    });
    
    // Additional data for dropdowns
    const [companies, setCompanies] = useState([]);

    // Load users
    const loadUsers = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/users?${params}`, {
                withCredentials: true
            });
            
            setUsers(response.data.users);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.itemsPerPage]);

    // Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const companiesResponse = await axios.get(`${API_URL}/api/companies`, { withCredentials: true });
            setCompanies(companiesResponse.data);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadUsers(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing UsersWidget:', error);
                setError('Failed to initialize users widget');
            }
        };

        initializeComponent();
        
        return () => {
            if (window.searchTimeout) {
                clearTimeout(window.searchTimeout);
            }
        };
    }, [loadUsers, loadDropdownData]);

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
            loadUsers(1);
        }, 300);
    }, [searchInput, loadUsers]);

    // Handle filter form input changes
    const handleFilterInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFilterFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Apply filters
    const applyFilters = useCallback(() => {
        setFilters(prev => ({ ...prev, ...filterFormData }));
        setShowFilterModal(false);
        loadUsers(1);
    }, [filterFormData, loadUsers]);

    // Clear filters
    const clearFilters = useCallback(() => {
        const clearedFilters = {
            search: searchInput,
            role: '',
            company: ''
        };
        setFilters(clearedFilters);
        setFilterFormData({
            role: '',
            company: ''
        });
        loadUsers(1);
    }, [searchInput, loadUsers]);

    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await axios.put(`${API_URL}/api/users/${editingUser.id}`, formData, {
                    withCredentials: true
                });
            } else {
                await axios.post(`${API_URL}/api/users`, formData, {
                    withCredentials: true
                });
            }
            
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingUser(null);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                role: 'Sales Representative',
                companyId: ''
            });
            loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Failed to save user');
        }
    }, [editingUser, formData, loadUsers]);

    // Handle edit
    const handleEdit = useCallback((user) => {
        setEditingUser(user);
        setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            role: user.role || 'Sales Representative',
            companyId: user.companyId || ''
        });
        setShowEditModal(true);
    }, []);

    // Handle delete
    const handleDelete = useCallback(async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/users/${userId}`, {
                withCredentials: true
            });
            loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    }, [loadUsers]);

    // Get role color
    const getRoleColor = useCallback((role) => {
        const colors = {
            'Administrator': 'bg-red-100 text-red-800',
            'Sales Manager': 'bg-blue-100 text-blue-800',
            'Sales Representative': 'bg-green-100 text-green-800',
            'Marketing Manager': 'bg-purple-100 text-purple-800',
            'Support Representative': 'bg-yellow-100 text-yellow-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    }, []);

    // Filter Modal Component
    const FilterModal = ({ isOpen, onClose }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Filter Users</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select
                                name="role"
                                value={filterFormData.role}
                                onChange={handleFilterInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="">All Roles</option>
                                <option value="Sales Representative">Sales Representative</option>
                                <option value="Sales Manager">Sales Manager</option>
                                <option value="Marketing Manager">Marketing Manager</option>
                                <option value="Support Representative">Support Representative</option>
                                <option value="Administrator">Administrator</option>
                            </select>
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
                                    <option key={company.id} value={company.id}>{company.name}</option>
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

    // User Modal Component
    const UserModal = ({ isOpen, onClose, title, onSubmit }) => {
        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">{title}</h3>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">First Name *</label>
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="Sales Representative">Sales Representative</option>
                                <option value="Sales Manager">Sales Manager</option>
                                <option value="Marketing Manager">Marketing Manager</option>
                                <option value="Support Representative">Support Representative</option>
                                <option value="Administrator">Administrator</option>
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
                                {editingUser ? 'Update User' : 'Create User'}
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
                    onClick={() => loadUsers()}
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
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
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
                    placeholder="Search users..."
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
                                            role: 'Role',
                                            company: 'Company'
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
                                                    loadUsers(1);
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

            {/* Users Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                User
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Role
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Company
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {users.map((userItem) => (
                            <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                            <span className="text-xs font-medium text-blue-600">
                                                {userItem.firstName.charAt(0)}{userItem.lastName.charAt(0)}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {userItem.firstName} {userItem.lastName}
                                            </div>
                                            <div className="text-xs text-gray-500">{userItem.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userItem.role)}`}>
                                        {userItem.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    {userItem.company ? userItem.company.name : 'No Company'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(userItem)}
                                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(userItem.id)}
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
                                onClick={() => loadUsers(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => loadUsers(pagination.currentPage + 1)}
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
            <UserModal 
                isOpen={showAddModal} 
                onClose={() => setShowAddModal(false)} 
                title="Add New User"
                onSubmit={handleSubmit}
            />
            <UserModal 
                isOpen={showEditModal} 
                onClose={() => setShowEditModal(false)} 
                title="Edit User"
                onSubmit={handleSubmit}
            />
        </div>
    );
};

export default memo(UsersWidget); 