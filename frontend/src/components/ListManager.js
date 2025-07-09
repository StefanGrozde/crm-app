import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const ListManager = ({ entityType, selectedListId, onListChange }) => {
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
        color: '#3B82F6',
        icon: 'list'
    });

    // Load lists for the specified entity type
    const loadLists = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/lists?entityType=${entityType}`, {
                withCredentials: true
            });
            setLists(response.data);
        } catch (error) {
            console.error('Error loading lists:', error);
            setError('Failed to load lists');
        } finally {
            setLoading(false);
        }
    }, [entityType]);

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    // Create new list
    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/api/lists`, {
                ...formData,
                entityType
            }, {
                withCredentials: true
            });
            
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
            await axios.put(`${API_URL}/api/lists/${editingList.id}`, formData, {
                withCredentials: true
            });
            
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
    const handleEditList = (list) => {
        setEditingList(list);
        setFormData({
            name: list.name,
            description: list.description || '',
            type: list.type,
            color: list.color,
            icon: list.icon
        });
        setShowEditModal(true);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'static',
            color: '#3B82F6',
            icon: 'list'
        });
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Create New {entityType} List</h3>
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
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type
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