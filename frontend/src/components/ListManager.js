import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const ListManager = ({ entityType, selectedListId, onListChange, onListsLoaded }) => {
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingList, setEditingList] = useState(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'static',
        entityType: entityType, // Default to the widget's entity type
        color: '#3B82F6',
        icon: 'list'
    });

    // Entity management state
    const [availableEntities, setAvailableEntities] = useState([]);
    const [selectedEntities, setSelectedEntities] = useState([]);
    const [entitySearchTerm, setEntitySearchTerm] = useState('');
    const [loadingEntities, setLoadingEntities] = useState(false);

    // Load lists for the specified entity type
    const loadLists = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/lists?entityType=${entityType}`, {
                withCredentials: true
            });
            setLists(response.data);
            
            // Pass lists data to parent component
            if (onListsLoaded) {
                onListsLoaded(response.data);
            }
        } catch (error) {
            console.error('Error loading lists:', error);
            setError('Failed to load lists');
        } finally {
            setLoading(false);
        }
    }, [entityType, onListsLoaded]);

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    // Load available entities for selection
    const loadAvailableEntities = useCallback(async (entityType, searchTerm = '') => {
        if (!entityType) return;
        
        try {
            setLoadingEntities(true);
            const params = new URLSearchParams({
                limit: 100,
                search: searchTerm
            });
            
            let endpoint = '';
            switch (entityType) {
                case 'contact':
                    endpoint = 'contacts';
                    break;
                case 'lead':
                    endpoint = 'leads';
                    break;
                case 'opportunity':
                    endpoint = 'opportunities';
                    break;
                default:
                    return;
            }
            
            const response = await axios.get(`${API_URL}/api/${endpoint}?${params}`, {
                withCredentials: true
            });
            
            // Extract entities from the response
            const entities = response.data.contacts || response.data.leads || response.data.opportunities || response.data.items || [];
            setAvailableEntities(entities);
        } catch (error) {
            console.error('Error loading entities:', error);
        } finally {
            setLoadingEntities(false);
        }
    }, []);

    // Load entities when modal opens or entity type changes
    useEffect(() => {
        if ((showCreateModal || showEditModal) && formData.entityType) {
            loadAvailableEntities(formData.entityType, entitySearchTerm);
        }
    }, [showCreateModal, showEditModal, formData.entityType, entitySearchTerm, loadAvailableEntities]);

    // Create new list
    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            // Create the list
            const response = await axios.post(`${API_URL}/api/lists`, formData, {
                withCredentials: true
            });
            
            const createdList = response.data;
            
            // Add selected entities to the list if any
            if (selectedEntities.length > 0) {
                const entities = selectedEntities.map(entityId => ({
                    entityType: formData.entityType,
                    entityId: entityId
                }));
                
                await axios.post(`${API_URL}/api/lists/${createdList.id}/members`, {
                    entities
                }, {
                    withCredentials: true
                });
            }
            
            setShowCreateModal(false);
            resetForm();
            loadLists();
        } catch (error) {
            console.error('Error creating list:', error);
            alert('Failed to create list: ' + (error.response?.data?.message || error.message));
        }
    };

    // Update existing list
    const handleUpdateList = async (e) => {
        e.preventDefault();
        try {
            // Update the list metadata
            await axios.put(`${API_URL}/api/lists/${editingList.id}`, formData, {
                withCredentials: true
            });
            
            // Get current list members
            const currentMembersResponse = await axios.get(`${API_URL}/api/lists/${editingList.id}`, {
                withCredentials: true
            });
            const currentMembers = currentMembersResponse.data.members || [];
            const currentMemberIds = currentMembers.map(m => m.entityId);
            
            // Calculate changes
            const toAdd = selectedEntities.filter(id => !currentMemberIds.includes(id));
            const toRemove = currentMemberIds.filter(id => !selectedEntities.includes(id));
            
            // Add new members
            if (toAdd.length > 0) {
                const entities = toAdd.map(entityId => ({
                    entityType: formData.entityType,
                    entityId: entityId
                }));
                
                await axios.post(`${API_URL}/api/lists/${editingList.id}/members`, {
                    entities
                }, {
                    withCredentials: true
                });
            }
            
            // Remove members
            for (const entityId of toRemove) {
                const membership = currentMembers.find(m => m.entityId === entityId);
                if (membership) {
                    await axios.delete(`${API_URL}/api/lists/${editingList.id}/members/${membership.id}`, {
                        withCredentials: true
                    });
                }
            }
            
            setShowEditModal(false);
            setEditingList(null);
            resetForm();
            loadLists();
        } catch (error) {
            console.error('Error updating list:', error);
            alert('Failed to update list: ' + (error.response?.data?.message || error.message));
        }
    };

    // Delete list
    const handleDeleteList = async (listId) => {
        if (!window.confirm('Are you sure you want to delete this list?')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/api/lists/${listId}`, {
                withCredentials: true
            });
            
            // If the deleted list was selected, clear selection
            if (selectedListId === listId) {
                onListChange(null);
            }
            
            loadLists();
        } catch (error) {
            console.error('Error deleting list:', error);
            alert('Failed to delete list: ' + (error.response?.data?.message || error.message));
        }
    };

    // Open edit modal
    const handleEditList = async (list) => {
        setEditingList(list);
        setFormData({
            name: list.name,
            description: list.description || '',
            type: list.type,
            entityType: list.entityType,
            color: list.color,
            icon: list.icon
        });
        
        // Load existing list members
        try {
            const response = await axios.get(`${API_URL}/api/lists/${list.id}`, {
                withCredentials: true
            });
            const existingMembers = response.data.members || [];
            setSelectedEntities(existingMembers.map(m => m.entityId));
        } catch (error) {
            console.error('Error loading list members:', error);
        }
        
        setShowEditModal(true);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'static',
            entityType: entityType,
            color: '#3B82F6',
            icon: 'list'
        });
        setSelectedEntities([]);
        setEntitySearchTerm('');
        setAvailableEntities([]);
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle entity selection
    const handleEntitySelection = (entityId, isSelected) => {
        setSelectedEntities(prev => {
            if (isSelected) {
                return [...prev, entityId];
            } else {
                return prev.filter(id => id !== entityId);
            }
        });
    };

    // Handle entity search
    const handleEntitySearch = (e) => {
        const searchTerm = e.target.value;
        setEntitySearchTerm(searchTerm);
        // Debounce the search
        if (window.entitySearchTimeout) {
            clearTimeout(window.entitySearchTimeout);
        }
        window.entitySearchTimeout = setTimeout(() => {
            loadAvailableEntities(formData.entityType, searchTerm);
        }, 300);
    };

    // Get entity display name
    const getEntityDisplayName = (entity) => {
        if (formData.entityType === 'contact') {
            return `${entity.firstName} ${entity.lastName}`;
        } else if (formData.entityType === 'lead') {
            return entity.title || entity.name;
        } else if (formData.entityType === 'opportunity') {
            return entity.name;
        }
        return 'Unknown';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 text-sm p-4">
                {error}
                <button
                    onClick={loadLists}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* List Selection */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Filter by List:</label>
                    <select
                        value={selectedListId || ''}
                        onChange={(e) => onListChange(e.target.value || null)}
                        className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All {entityType}s</option>
                        {lists.map(list => (
                            <option key={list.id} value={list.id}>
                                {list.name} ({list.type})
                            </option>
                        ))}
                    </select>
                </div>
                
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>New List</span>
                </button>
            </div>

            {/* Lists Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lists.map(list => (
                    <div
                        key={list.id}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedListId === list.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => onListChange(list.id)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: list.color }}
                                />
                                <span className="font-medium text-sm">{list.name}</span>
                                {list.type === 'smart' && (
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        Smart
                                    </span>
                                )}
                                {list.isSystem && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        System
                                    </span>
                                )}
                            </div>
                            
                            {!list.isSystem && (
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditList(list);
                                        }}
                                        className="text-gray-400 hover:text-blue-600 p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteList(list.id);
                                        }}
                                        className="text-gray-400 hover:text-red-600 p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        {list.description && (
                            <p className="text-xs text-gray-500 mt-1">{list.description}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Create List Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Create New List</h3>
                        <form onSubmit={handleCreateList}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Entity Type
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="contact"
                                                checked={formData.entityType === 'contact'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Contacts
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="lead"
                                                checked={formData.entityType === 'lead'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Leads
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="opportunity"
                                                checked={formData.entityType === 'opportunity'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Opportunities
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            List Type
                                        </label>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="static">Static</option>
                                            <option value="smart">Smart</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Color
                                        </label>
                                        <input
                                            type="color"
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            className="w-full h-10 border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>
                                
                                {/* Entity Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Add {formData.entityType === 'contact' ? 'Contacts' : formData.entityType === 'lead' ? 'Leads' : 'Opportunities'} to List
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={`Search ${formData.entityType}s...`}
                                        value={entitySearchTerm}
                                        onChange={handleEntitySearch}
                                        className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    
                                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded">
                                        {loadingEntities ? (
                                            <div className="p-4 text-center text-gray-500">Loading...</div>
                                        ) : availableEntities.length > 0 ? (
                                            availableEntities.map(entity => (
                                                <div key={entity.id} className="flex items-center p-2 hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEntities.includes(entity.id)}
                                                        onChange={(e) => handleEntitySelection(entity.id, e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">{getEntityDisplayName(entity)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-gray-500">
                                                No {formData.entityType}s found
                                            </div>
                                        )}
                                    </div>
                                    
                                    {selectedEntities.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            {selectedEntities.length} {formData.entityType}{selectedEntities.length > 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Create List
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit List Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit List</h3>
                        <form onSubmit={handleUpdateList}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Entity Type
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="contact"
                                                checked={formData.entityType === 'contact'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Contacts
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="lead"
                                                checked={formData.entityType === 'lead'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Leads
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="entityType"
                                                value="opportunity"
                                                checked={formData.entityType === 'opportunity'}
                                                onChange={handleInputChange}
                                                className="mr-2"
                                            />
                                            Opportunities
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            List Type
                                        </label>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleInputChange}
                                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="static">Static</option>
                                            <option value="smart">Smart</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Color
                                        </label>
                                        <input
                                            type="color"
                                            name="color"
                                            value={formData.color}
                                            onChange={handleInputChange}
                                            className="w-full h-10 border border-gray-300 rounded"
                                        />
                                    </div>
                                </div>
                                
                                {/* Entity Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Manage {formData.entityType === 'contact' ? 'Contacts' : formData.entityType === 'lead' ? 'Leads' : 'Opportunities'} in List
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={`Search ${formData.entityType}s...`}
                                        value={entitySearchTerm}
                                        onChange={handleEntitySearch}
                                        className="w-full border border-gray-300 rounded px-3 py-2 mb-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    
                                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded">
                                        {loadingEntities ? (
                                            <div className="p-4 text-center text-gray-500">Loading...</div>
                                        ) : availableEntities.length > 0 ? (
                                            availableEntities.map(entity => (
                                                <div key={entity.id} className="flex items-center p-2 hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEntities.includes(entity.id)}
                                                        onChange={(e) => handleEntitySelection(entity.id, e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    <span className="text-sm">{getEntityDisplayName(entity)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-gray-500">
                                                No {formData.entityType}s found
                                            </div>
                                        )}
                                    </div>
                                    
                                    {selectedEntities.length > 0 && (
                                        <div className="mt-2 text-sm text-gray-600">
                                            {selectedEntities.length} {formData.entityType}{selectedEntities.length > 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingList(null);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Update List
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default memo(ListManager);