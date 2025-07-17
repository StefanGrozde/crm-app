import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ListManager from './ListManager';
import WidgetSearchBar from './WidgetSearchBar';

const API_URL = process.env.REACT_APP_API_URL;

const EntityWidget = ({ 
    config, 
    onOpenProfile,
    onCustomAction
}) => {
    console.log('EntityWidget render for:', config?.title);
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    });
    
    // Filter and search states
    const [filters, setFilters] = useState(config.defaultFilters || {});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFormData, setFilterFormData] = useState({});
    
    // Selection and list management
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectedListId, setSelectedListId] = useState(null);
    const [availableLists, setAvailableLists] = useState([]);
    
    // Modal states
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Invite functionality states
    const [inviteFormData, setInviteFormData] = useState({
        email: '',
        role: 'Employee'
    });
    const [generatedInvitation, setGeneratedInvitation] = useState(null);
    
    // Additional dropdown data
    const [dropdownData, setDropdownData] = useState({});
    
    // Undo delete functionality
    const [deletedItem, setDeletedItem] = useState(null);
    const [showUndoNotification, setShowUndoNotification] = useState(false);
    
    // Tags state (for entities that support tags)
    const [tagInput, setTagInput] = useState('');
    
    // Load entity data
    const loadData = useCallback(async (page = 1) => {
        console.log('loadData called for:', config?.title, 'page:', page);
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                search: searchTerm,
                ...filters
            });
            
            if (selectedListId) {
                params.append('listId', selectedListId);
            }
            
            const response = await axios.get(`${API_URL}/api/${config.apiEndpoint}?${params}`, {
                withCredentials: true
            });
            
            // Handle different response formats
            if (response.data.data || response.data[config.dataKey]) {
                setData(response.data.data || response.data[config.dataKey]);
                setPagination(response.data.pagination || response.data.meta || pagination);
            } else {
                setData(response.data);
            }
        } catch (error) {
            console.error(`Error loading ${config.title}:`, error);
            setError(`Failed to load ${config.title.toLowerCase()}`);
        } finally {
            setLoading(false);
        }
    }, [config, filters, searchTerm, selectedListId, pagination.itemsPerPage]);
    
    // Load dropdown data for form fields and filters
    const loadDropdownData = useCallback(async () => {
        try {
            const dropdownSources = new Set();
            
            // Collect all dropdown sources from form fields and filters
            [...(config.fields?.form || []), ...Object.values(config.filters || {})].forEach(field => {
                if (field.source) {
                    dropdownSources.add(field.source);
                }
            });
            
            // Load data for each source
            const dropdownPromises = Array.from(dropdownSources).map(async (source) => {
                try {
                    const response = await axios.get(`${API_URL}/api/${source}`, { withCredentials: true });
                    // Ensure we're getting an array, handle different response formats
                    let data = response.data;
                    if (data && typeof data === 'object' && !Array.isArray(data)) {
                        // If it's an object, try to extract the array from common properties
                        data = data.data || data.items || data.results || data[source] || [];
                    }
                    if (!Array.isArray(data)) {
                        console.warn(`Dropdown source ${source} did not return an array:`, data);
                        data = [];
                    }
                    return [source, data];
                } catch (error) {
                    console.error(`Error loading dropdown data for source ${source}:`, error);
                    return [source, []];
                }
            });
            
            const dropdownResults = await Promise.all(dropdownPromises);
            const newDropdownData = Object.fromEntries(dropdownResults);
            
            // Also load filter options if configured
            if (config.features?.filterOptions) {
                try {
                    const filterResponse = await axios.get(`${API_URL}/api/${config.apiEndpoint}/filter-options`, {
                        withCredentials: true
                    });
                    newDropdownData.filterOptions = filterResponse.data;
                } catch (error) {
                    console.warn(`Filter options not available for ${config.apiEndpoint}:`, error);
                    // Don't throw error, just continue without filter options
                }
            }
            
            setDropdownData(newDropdownData);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, [config]);
    
    // Initialize component
    useEffect(() => {
        console.log('EntityWidget useEffect triggered for:', config?.title);
        const initialize = async () => {
            await Promise.all([loadData(), loadDropdownData()]);
        };
        initialize();
    }, [loadData, loadDropdownData]);
    
    // Handle search
    const handleSearch = useCallback((value) => {
        setSearchTerm(value);
        loadData(1);
    }, [loadData]);
    
    // Handle filter changes
    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
        loadData(1);
    }, [loadData]);
    
    // Handle form input changes
    const handleInputChange = useCallback((e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
        }));
    }, []);
    
    // Reset form
    const resetForm = useCallback(() => {
        const initialData = {};
        config.fields?.form?.forEach(field => {
            if (field.defaultValue !== undefined) {
                initialData[field.name] = field.defaultValue;
            }
        });
        setFormData(initialData);
    }, [config]);
    
    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            let processedData = { ...formData };
            
            // Apply any configured data transformations
            if (config.transformations?.beforeSubmit) {
                processedData = config.transformations.beforeSubmit(processedData);
            }
            
            if (showEditModal) {
                await axios.put(`${API_URL}/api/${config.apiEndpoint}/${editingItem.id}`, processedData, {
                    withCredentials: true
                });
                setShowEditModal(false);
            } else {
                await axios.post(`${API_URL}/api/${config.apiEndpoint}`, processedData, {
                    withCredentials: true
                });
                setShowAddModal(false);
            }
            
            resetForm();
            loadData(pagination.currentPage);
        } catch (error) {
            console.error(`Error saving ${config.title.toLowerCase()}:`, error);
            alert(error.response?.data?.message || `Failed to save ${config.title.toLowerCase()}`);
        }
    }, [config, formData, showEditModal, editingItem, loadData, pagination.currentPage, resetForm]);
    
    // Handle delete/archive
    const handleDelete = useCallback(async (itemId) => {
        const isArchivable = config.apiEndpoint === 'tickets' || config.apiEndpoint === 'tasks';
        const actionText = isArchivable ? 'archive' : 'delete';
        const confirmText = `Are you sure you want to ${actionText} this ${config.title.toLowerCase().slice(0, -1)}?`;
        
        if (!window.confirm(confirmText)) {
            return;
        }
        
        try {
            const response = await axios.delete(`${API_URL}/api/${config.apiEndpoint}/${itemId}`, {
                withCredentials: true
            });
            
            // If undo is supported, show undo notification
            if (config.features?.undoDelete && response.data?.deletedItem) {
                setDeletedItem(response.data.deletedItem);
                setShowUndoNotification(true);
                
                // Auto-hide undo notification after 10 seconds
                setTimeout(() => {
                    setShowUndoNotification(false);
                    setDeletedItem(null);
                }, 10000);
            }
            
            loadData(pagination.currentPage);
        } catch (error) {
            const actionText = isArchivable ? 'archiving' : 'deleting';
            console.error(`Error ${actionText} ${config.title.toLowerCase()}:`, error);
            alert(`Failed to ${actionText.slice(0, -3)} ${config.title.toLowerCase().slice(0, -1)}`);
        }
    }, [config, loadData, pagination.currentPage]);
    
    // Handle undo delete
    const handleUndo = useCallback(async () => {
        if (!deletedItem) return;
        
        try {
            await axios.post(`${API_URL}/api/${config.apiEndpoint}/${deletedItem.id}/undo`, {
                deletedItem
            }, {
                withCredentials: true
            });
            
            setShowUndoNotification(false);
            setDeletedItem(null);
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error undoing deletion:', error);
            alert(`Failed to restore ${config.title.toLowerCase().slice(0, -1)}`);
        }
    }, [deletedItem, config, loadData, pagination.currentPage]);
    
    // Handle tag input (for entities that support tags)
    const handleTagInput = useCallback((e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const newTag = e.target.value.trim();
            if (!formData.tags?.includes(newTag)) {
                setFormData(prev => ({
                    ...prev,
                    tags: [...(prev.tags || []), newTag]
                }));
            }
            setTagInput('');
        }
    }, [formData.tags]);
    
    // Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setFormData(prev => ({
            ...prev,
            tags: (prev.tags || []).filter(tag => tag !== tagToRemove)
        }));
    }, []);
    
    // Handle invite form input changes
    const handleInviteInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setInviteFormData(prev => ({ ...prev, [name]: value }));
    }, []);
    
    // Handle invitation generation
    const handleGenerateInvitation = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const response = await axios.post(`${API_URL}/api/invitations`, inviteFormData, {
                withCredentials: true
            });
            
            setGeneratedInvitation(response.data.invitation);
        } catch (error) {
            console.error('Error generating invitation:', error);
            alert(error.response?.data?.message || 'Failed to generate invitation');
        }
    }, [inviteFormData]);
    
    // Handle bulk operations
    const handleBulkAddToList = useCallback(async (listId) => {
        if (selectedItems.size === 0) {
            alert(`Please select ${config.title.toLowerCase()} to add to the list`);
            return;
        }

        try {
            const entities = Array.from(selectedItems).map(itemId => ({
                entityType: config.apiEndpoint.slice(0, -1), // Remove 's' from endpoint
                entityId: itemId
            }));

            const response = await axios.post(`${API_URL}/api/lists/${listId}/members`, {
                entities
            }, {
                withCredentials: true
            });

            alert(`Added ${response.data.added} ${config.title.toLowerCase()} to the list`);
            setSelectedItems(new Set());
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error adding to list:', error);
            alert('Failed to add to list: ' + (error.response?.data?.message || error.message));
        }
    }, [selectedItems, config, loadData, pagination.currentPage]);
    
    // Remove selected items from current list
    const handleBulkRemoveFromList = useCallback(async () => {
        if (!selectedListId || selectedItems.size === 0) {
            alert(`Please select ${config.title.toLowerCase()} to remove from the list`);
            return;
        }

        if (!window.confirm(`Are you sure you want to remove the selected ${config.title.toLowerCase()} from this list?`)) {
            return;
        }

        try {
            // This would need to be implemented based on the specific list API
            const membershipPromises = Array.from(selectedItems).map(itemId =>
                axios.delete(`${API_URL}/api/lists/${selectedListId}/members/entity/${config.apiEndpoint.slice(0, -1)}/${itemId}`, {
                    withCredentials: true
                })
            );

            await Promise.all(membershipPromises);
            alert(`${config.title} removed from list successfully`);
            setSelectedItems(new Set());
            loadData(pagination.currentPage);
        } catch (error) {
            console.error('Error removing from list:', error);
            alert('Failed to remove from list: ' + (error.response?.data?.message || error.message));
        }
    }, [selectedListId, selectedItems, config, loadData, pagination.currentPage]);
    
    // Open edit modal
    const openEditModal = useCallback((item) => {
        setEditingItem(item);
        
        const editData = {};
        config.fields?.form?.forEach(field => {
            editData[field.name] = item[field.name] || field.defaultValue || '';
        });
        setFormData(editData);
        setShowEditModal(true);
    }, [config]);
    
    // Render form field
    const renderFormField = (field) => {
        const { name, type, label, required, options, source, placeholder, ...fieldProps } = field;
        const displayLabel = label || name.charAt(0).toUpperCase() + name.slice(1);
        
        switch (type) {
            case 'select':
                let selectOptions = options || [];
                if (source && dropdownData[source]) {
                    // Ensure dropdownData[source] is an array before calling map
                    const sourceData = Array.isArray(dropdownData[source]) ? dropdownData[source] : [];
                    selectOptions = sourceData.map(item => ({
                        value: item.id,
                        label: item[field.displayField || 'name'] || item.name || item.username
                    }));
                }
                
                return (
                    <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayLabel} {required && '*'}
                        </label>
                        <select
                            name={name}
                            value={formData[name] || ''}
                            onChange={handleInputChange}
                            required={required}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            {...fieldProps}
                        >
                            <option value="">Select {displayLabel}</option>
                            {selectOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                );
                
            case 'textarea':
                return (
                    <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayLabel} {required && '*'}
                        </label>
                        <textarea
                            name={name}
                            value={formData[name] || ''}
                            onChange={handleInputChange}
                            required={required}
                            placeholder={placeholder}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            {...fieldProps}
                        />
                    </div>
                );
                
            default:
                // Tags field
                if (name === 'tags' && config.features?.tags) {
                    return (
                        <div key={name} className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {displayLabel}
                            </label>
                            <input
                                type="text"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyPress={handleTagInput}
                                placeholder="Press Enter to add a tag"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {formData.tags.map((tag, index) => (
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
                    );
                }
                
                return (
                    <div key={name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {displayLabel} {required && '*'}
                        </label>
                        <input
                            type={type}
                            name={name}
                            value={formData[name] || ''}
                            onChange={handleInputChange}
                            required={required}
                            placeholder={placeholder}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            {...fieldProps}
                        />
                    </div>
                );
        }
    };
    
    // Render table cell value
    const renderCellValue = (item, field) => {
        let value = item[field.name];
        
        if (field.render) {
            return field.render(value, item, onOpenProfile);
        }
        
        if (field.type === 'currency') {
            const currency = item[field.currencyField] || 'USD';
            return value ? `${currency} ${parseFloat(value).toLocaleString()}` : '-';
        }
        
        if (field.type === 'status') {
            const statusColors = field.statusColors || {
                active: 'bg-green-100 text-green-800',
                inactive: 'bg-red-100 text-red-800',
                pending: 'bg-yellow-100 text-yellow-800'
            };
            return (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
                    {value}
                </span>
            );
        }
        
        if (field.type === 'date') {
            return value ? new Date(value).toLocaleDateString() : '-';
        }
        
        return value || '-';
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
                    onClick={() => loadData()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }
    
    const hasActiveFilters = Object.values(filters).some(value => value && value !== '') || searchTerm.trim() !== '';
    
    return (
        <div className="h-full overflow-hidden">
            {/* Header */}
            {!config.hideHeader && (
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
                    <div className="flex space-x-2">
                    {config.features?.filtering && (
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
                        </button>
                    )}
                    {config.features?.invite && (
                        <button
                            onClick={() => {
                                setInviteFormData({ email: '', role: 'Employee' });
                                setGeneratedInvitation(null);
                                setShowInviteModal(true);
                            }}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1 mr-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Invite</span>
                        </button>
                    )}
                    {/* Header Custom Actions */}
                    {config.customActions && config.customActions
                        .filter(action => action.position === 'header')
                        .map(action => (
                            <button
                                key={action.key}
                                onClick={() => onCustomAction && onCustomAction(action.key)}
                                className={`px-3 py-1 text-sm rounded hover:opacity-80 flex items-center space-x-1 mr-2 ${
                                    action.variant === 'secondary' 
                                        ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                                        : 'bg-blue-600 text-white'
                                }`}
                            >
                                {action.icon === 'upload' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                )}
                                {action.icon === 'history' && (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                <span>{action.label}</span>
                            </button>
                        ))}
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add</span>
                    </button>
                </div>
                </div>
            )}
            
            {/* List Manager */}
            {config.features?.listManagement && (
                <ListManager
                    entityType={config.apiEndpoint}
                    selectedListId={selectedListId}
                    onListChange={setSelectedListId}
                    onListsLoaded={setAvailableLists}
                />
            )}
            
            {/* Search */}
            <div className="mb-4">
                <WidgetSearchBar
                    placeholder={`Search ${config.title.toLowerCase()}...`}
                    onSearch={handleSearch}
                    searchTerm={searchTerm}
                    className="w-full"
                />
            </div>
            
            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            {/* Show search term if active */}
                            {searchTerm.trim() && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Search: {searchTerm}
                                    <button
                                        onClick={() => handleSearch('')}
                                        className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </span>
                            )}
                            {Object.entries(filters).map(([key, value]) => {
                                if (value && value !== '') {
                                    return (
                                        <span
                                            key={key}
                                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                        >
                                            {key}: {value}
                                            <button
                                                onClick={() => {
                                                    const newFilters = { ...filters, [key]: '' };
                                                    handleFilterChange(newFilters);
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
                            onClick={() => handleFilterChange({})}
                            className="text-xs text-blue-600 hover:text-blue-800"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            )}
            
            {/* Bulk Actions */}
            {config.features?.bulkSelection && selectedItems.size > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-yellow-800">
                                {selectedItems.size} {config.title.toLowerCase()} selected
                            </span>
                            <button
                                onClick={() => setSelectedItems(new Set())}
                                className="text-xs text-yellow-600 hover:text-yellow-800"
                            >
                                Clear selection
                            </button>
                        </div>
                        <div className="flex items-center space-x-2">
                            {selectedListId && (
                                <button
                                    onClick={handleBulkRemoveFromList}
                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                    Remove from List
                                </button>
                            )}
                            {config.features?.listManagement && availableLists.length > 0 && (
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleBulkAddToList(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                >
                                    <option value="">Add to List...</option>
                                    {availableLists.map(list => (
                                        <option key={list.id} value={list.id}>
                                            {list.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Data Table */}
            <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            {config.features?.bulkSelection && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                    <input
                                        type="checkbox"
                                        checked={data.length > 0 && data.every(item => selectedItems.has(item.id))}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedItems(new Set(data.map(item => item.id)));
                                            } else {
                                                setSelectedItems(new Set());
                                            }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                            )}
                            {config.fields?.display?.map(field => (
                                <th key={field.name || field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                    {field.label || (typeof field === 'string' ? field : field.name)}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                Actions
                            </th>
                            {config.features?.customActions && config.customActions && (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                                    Quick Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {data.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                {config.features?.bulkSelection && (
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(item.id)}
                                            onChange={(e) => {
                                                const newSelected = new Set(selectedItems);
                                                if (e.target.checked) {
                                                    newSelected.add(item.id);
                                                } else {
                                                    newSelected.delete(item.id);
                                                }
                                                setSelectedItems(newSelected);
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                )}
                                {config.fields?.display?.map(field => (
                                    <td key={field.name || field} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                        {renderCellValue(item, typeof field === 'string' ? { name: field } : field)}
                                    </td>
                                ))}
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-900 text-xs font-medium"
                                        >
                                            {config.apiEndpoint === 'tickets' || config.apiEndpoint === 'tasks' ? 'Archive' : 'Delete'}
                                        </button>
                                    </div>
                                </td>
                                {/* Custom Actions Column */}
                                {config.features?.customActions && config.customActions && (
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="flex space-x-1">
                                            {config.customActions.map(action => (
                                                <button
                                                    key={action.key}
                                                    onClick={() => onCustomAction && onCustomAction(action.key, item.id)}
                                                    className={action.className}
                                                    title={action.title}
                                                >
                                                    {action.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Filter Modal */}
            {showFilterModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Filter {config.title}</h2>
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(config.filters || {}).map(([filterKey, filterConfig]) => {
                                    let options = filterConfig.options || [];
                                    
                                    // Handle dynamic options from API
                                    if (filterConfig.source) {
                                        const sourcePath = filterConfig.source.split('.');
                                        let sourceData = dropdownData;
                                        sourcePath.forEach(path => {
                                            sourceData = sourceData?.[path];
                                        });
                                        
                                        if (Array.isArray(sourceData)) {
                                            options = sourceData.map(item => ({
                                                value: filterConfig.displayField ? item[filterConfig.displayField] : item.id,
                                                label: filterConfig.displayField ? 
                                                    (filterConfig.displayField === 'value' ? `${item.value} (${item.count || ''})` : item[filterConfig.displayField]) :
                                                    (item.name || item.username || item.title)
                                            }));
                                        }
                                    }
                                    
                                    return (
                                        <div key={filterKey}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
                                            </label>
                                            <select
                                                name={filterKey}
                                                value={filterFormData[filterKey] || ''}
                                                onChange={(e) => setFilterFormData(prev => ({ ...prev, [filterKey]: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="">All {filterKey}</option>
                                                {options.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleFilterChange({});
                                        setFilterFormData({});
                                        setShowFilterModal(false);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Clear All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowFilterModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleFilterChange(filterFormData);
                                        setShowFilterModal(false);
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Apply Filters
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Add/Edit Modal */}
            {(showAddModal || showEditModal) && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {showEditModal ? 'Edit' : 'Add'} {config.title.slice(0, -1)}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {config.fields?.form?.map(renderFormField)}
                            </div>
                            
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    {showEditModal ? 'Update' : 'Create'} {config.title.slice(0, -1)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
            
            {/* Invitation Modal */}
            {config.features?.invite && showInviteModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
                        
                        {!generatedInvitation ? (
                            <form onSubmit={handleGenerateInvitation} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={inviteFormData.email}
                                        onChange={handleInviteInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Role</label>
                                    <select
                                        name="role"
                                        value={inviteFormData.role}
                                        onChange={handleInviteInputChange}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="Sales Representative">Sales Representative</option>
                                        <option value="Sales Manager">Sales Manager</option>
                                        <option value="Marketing Manager">Marketing Manager</option>
                                        <option value="Support Representative">Support Representative</option>
                                        <option value="Administrator">Administrator</option>
                                    </select>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Generate Invitation
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                    <h4 className="text-sm font-medium text-green-800 mb-2">Invitation Generated Successfully!</h4>
                                    <p className="text-sm text-green-700 mb-3">
                                        Send this link to <strong>{generatedInvitation.email}</strong> to complete their registration.
                                    </p>
                                    <div className="bg-white p-3 border border-green-300 rounded">
                                        <p className="text-xs text-gray-600 mb-2">Invitation URL:</p>
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="text"
                                                value={generatedInvitation.invitationUrl}
                                                readOnly
                                                className="flex-1 text-xs p-2 border border-gray-300 rounded bg-gray-50"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(generatedInvitation.invitationUrl);
                                                    alert('URL copied to clipboard!');
                                                }}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-green-600 mt-2">
                                        Expires: {new Date(generatedInvitation.expiresAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowInviteModal(false);
                                            setGeneratedInvitation(null);
                                        }}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
            
            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center px-4">
                    <div className="text-xs text-gray-500">
                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                        {pagination.totalItems} entries
                    </div>
                    <div className="flex space-x-1">
                        <button
                            onClick={() => loadData(pagination.currentPage - 1)}
                            disabled={pagination.currentPage <= 1}
                            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum;
                            if (pagination.totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (pagination.currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (pagination.currentPage >= pagination.totalPages - 2) {
                                pageNum = pagination.totalPages - 4 + i;
                            } else {
                                pageNum = pagination.currentPage - 2 + i;
                            }
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => loadData(pageNum)}
                                    className={`px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 ${
                                        pageNum === pagination.currentPage 
                                            ? 'bg-blue-600 text-white border-blue-600' 
                                            : ''
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        <button
                            onClick={() => loadData(pagination.currentPage + 1)}
                            disabled={pagination.currentPage >= pagination.totalPages}
                            className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
            
            {/* Undo Notification */}
            {config.features?.undoDelete && showUndoNotification && deletedItem && createPortal(
                <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
                    <span className="text-sm">{config.title.slice(0, -1)} deleted</span>
                    <button
                        onClick={handleUndo}
                        className="bg-white text-red-600 px-2 py-1 rounded text-xs font-medium hover:bg-gray-100"
                    >
                        Undo
                    </button>
                    <button
                        onClick={() => setShowUndoNotification(false)}
                        className="text-white hover:text-gray-200"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

export default memo(EntityWidget);