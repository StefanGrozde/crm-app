import React, { useState, useEffect, useContext, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ListManager from './ListManager';
import WidgetSearchBar from './WidgetSearchBar';

const API_URL = process.env.REACT_APP_API_URL;

const TasksWidget = ({ onOpenTaskProfile }) => {
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    const [tasks, setTasks] = useState([]);
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
        status: '',
        priority: '',
        assignedTo: '',
        assignmentType: '',
        category: '',
        overdue: false
    });
    
    // List filtering state
    const [selectedListId, setSelectedListId] = useState(null);
    const [selectedTasks, setSelectedTasks] = useState(new Set());
    const [availableLists, setAvailableLists] = useState([]);
    
    // Separate search state to prevent re-renders
    const [searchTerm, setSearchTerm] = useState('');
    
    // Refs for uncontrolled inputs
    const searchInputRef = useRef(null);
    const formRefs = useRef({
        title: useRef(null),
        description: useRef(null),
        status: useRef(null),
        priority: useRef(null),
        dueDate: useRef(null),
        estimatedHours: useRef(null),
        assignmentType: useRef(null),
        category: useRef(null),
        notes: useRef(null),
        contactId: useRef(null),
        leadId: useRef(null),
        opportunityId: useRef(null),
        saleId: useRef(null)
    });
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [leads, setLeads] = useState([]);
    const [opportunities, setOpportunities] = useState([]);
    const [sales, setSales] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    
    // Tags handling
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Undo delete functionality
    const [deletedTask, setDeletedTask] = useState(null);
    const [showUndoNotification, setShowUndoNotification] = useState(false);

    // Load tasks data
    const loadTasks = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page,
                limit: pagination.itemsPerPage,
                search: searchTerm,
                ...filters
            });
            
            const response = await axios.get(`${API_URL}/api/tasks?${params}`, {
                withCredentials: true
            });
            
            setTasks(response.data.tasks);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error loading tasks:', error);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [filters, searchTerm, pagination.itemsPerPage]);
    
    // Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersResponse, contactsResponse, leadsResponse, opportunitiesResponse, salesResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true }),
                axios.get(`${API_URL}/api/leads`, { withCredentials: true }),
                axios.get(`${API_URL}/api/opportunities`, { withCredentials: true }),
                axios.get(`${API_URL}/api/sales`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data.users || []);
            setContacts(contactsResponse.data.contacts || []);
            setLeads(leadsResponse.data.leads || []);
            setOpportunities(opportunitiesResponse.data.opportunities || []);
            setSales(salesResponse.data.sales || []);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadTasks(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing TasksWidget:', error);
                setError('Failed to initialize tasks widget');
            }
        };

        initializeComponent();
    }, [loadTasks, loadDropdownData]);

    // Handle task creation
    const handleCreateTask = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                title: formRefs.current.title.current.value,
                description: formRefs.current.description.current.value,
                status: formRefs.current.status.current.value,
                priority: formRefs.current.priority.current.value,
                dueDate: formRefs.current.dueDate.current.value || null,
                estimatedHours: parseFloat(formRefs.current.estimatedHours.current.value) || null,
                assignmentType: formRefs.current.assignmentType.current.value,
                category: formRefs.current.category.current.value,
                notes: formRefs.current.notes.current.value,
                contactId: parseInt(formRefs.current.contactId.current.value) || null,
                leadId: parseInt(formRefs.current.leadId.current.value) || null,
                opportunityId: parseInt(formRefs.current.opportunityId.current.value) || null,
                saleId: parseInt(formRefs.current.saleId.current.value) || null,
                assignedUsers: selectedUsers,
                tags: tags
            };

            await axios.post(`${API_URL}/api/tasks`, formData, {
                withCredentials: true
            });

            setShowAddModal(false);
            resetForm();
            await loadTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            alert(error.response?.data?.message || 'Failed to create task');
        }
    }, [selectedUsers, tags, loadTasks]);

    // Handle task update
    const handleUpdateTask = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            const formData = {
                title: formRefs.current.title.current.value,
                description: formRefs.current.description.current.value,
                status: formRefs.current.status.current.value,
                priority: formRefs.current.priority.current.value,
                dueDate: formRefs.current.dueDate.current.value || null,
                estimatedHours: parseFloat(formRefs.current.estimatedHours.current.value) || null,
                assignmentType: formRefs.current.assignmentType.current.value,
                category: formRefs.current.category.current.value,
                notes: formRefs.current.notes.current.value,
                contactId: parseInt(formRefs.current.contactId.current.value) || null,
                leadId: parseInt(formRefs.current.leadId.current.value) || null,
                opportunityId: parseInt(formRefs.current.opportunityId.current.value) || null,
                saleId: parseInt(formRefs.current.saleId.current.value) || null,
                assignedUsers: selectedUsers,
                tags: tags
            };

            await axios.put(`${API_URL}/api/tasks/${editingTask.id}`, formData, {
                withCredentials: true
            });

            setShowEditModal(false);
            setEditingTask(null);
            resetForm();
            await loadTasks();
        } catch (error) {
            console.error('Error updating task:', error);
            alert(error.response?.data?.message || 'Failed to update task');
        }
    }, [editingTask, selectedUsers, tags, loadTasks]);

    // Handle task deletion
    const handleDeleteTask = useCallback(async (task) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/tasks/${task.id}`, {
                withCredentials: true
            });
            
            setDeletedTask(task);
            setShowUndoNotification(true);
            
            // Auto-hide undo notification after 5 seconds
            setTimeout(() => {
                setShowUndoNotification(false);
                setDeletedTask(null);
            }, 5000);
            
            await loadTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    }, [loadTasks]);

    // Reset form
    const resetForm = useCallback(() => {
        Object.values(formRefs.current).forEach(ref => {
            if (ref.current) {
                ref.current.value = '';
            }
        });
        setSelectedUsers([]);
        setTags([]);
        setTagInput('');
    }, []);

    // Handle tag input
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

    // Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Handle user selection for assignment
    const handleUserSelection = useCallback((userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    }, []);

    // Get priority color
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'text-red-600 bg-red-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'in_progress': return 'text-blue-600 bg-blue-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    // Check if task is overdue
    const isOverdue = (task) => {
        return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    };

    // Open edit modal
    const openEditModal = useCallback((task) => {
        setEditingTask(task);
        
        // Populate form with task data
        setTimeout(() => {
            if (formRefs.current.title.current) formRefs.current.title.current.value = task.title || '';
            if (formRefs.current.description.current) formRefs.current.description.current.value = task.description || '';
            if (formRefs.current.status.current) formRefs.current.status.current.value = task.status || 'pending';
            if (formRefs.current.priority.current) formRefs.current.priority.current.value = task.priority || 'medium';
            if (formRefs.current.dueDate.current) formRefs.current.dueDate.current.value = task.dueDate ? task.dueDate.split('T')[0] : '';
            if (formRefs.current.estimatedHours.current) formRefs.current.estimatedHours.current.value = task.estimatedHours || '';
            if (formRefs.current.assignmentType.current) formRefs.current.assignmentType.current.value = task.assignmentType || 'individual';
            if (formRefs.current.category.current) formRefs.current.category.current.value = task.category || '';
            if (formRefs.current.notes.current) formRefs.current.notes.current.value = task.notes || '';
            if (formRefs.current.contactId.current) formRefs.current.contactId.current.value = task.contactId || '';
            if (formRefs.current.leadId.current) formRefs.current.leadId.current.value = task.leadId || '';
            if (formRefs.current.opportunityId.current) formRefs.current.opportunityId.current.value = task.opportunityId || '';
            if (formRefs.current.saleId.current) formRefs.current.saleId.current.value = task.saleId || '';
        }, 100);
        
        setSelectedUsers(task.assignments?.map(a => a.userId) || []);
        setTags(task.tags || []);
        setShowEditModal(true);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={() => loadTasks()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilterModal(true)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                        Filter
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Add Task
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <WidgetSearchBar
                ref={searchInputRef}
                value={searchTerm}
                onChange={setSearchTerm}
                onSearch={() => loadTasks()}
                placeholder="Search tasks..."
                className="mb-4"
            />

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No tasks found
                    </div>
                ) : (
                    <div className="space-y-2">
                        {tasks.map((task) => (
                            <div
                                key={task.id}
                                className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                                    isOverdue(task) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                }`}
                                onClick={() => onOpenTaskProfile && onOpenTaskProfile(task)}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                {task.description}
                                            </p>
                                        )}
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                            {task.dueDate && (
                                                <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
                                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                            {task.assignments && task.assignments.length > 0 && (
                                                <span>
                                                    Assigned: {task.assignments.length} user{task.assignments.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {task.category && (
                                                <span className="px-2 py-1 bg-gray-100 rounded">
                                                    {task.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(task);
                                            }}
                                            className="text-gray-400 hover:text-blue-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteTask(task);
                                            }}
                                            className="text-gray-400 hover:text-red-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center mt-4 space-x-2">
                    <button
                        onClick={() => loadTasks(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrevPage}
                        className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => loadTasks(pagination.currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                        className="px-2 py-1 text-sm border rounded disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        ref={formRefs.current.title}
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        ref={formRefs.current.description}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        ref={formRefs.current.status}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select
                                        ref={formRefs.current.priority}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                    <input
                                        ref={formRefs.current.dueDate}
                                        type="date"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                                    <input
                                        ref={formRefs.current.estimatedHours}
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
                                    <select
                                        ref={formRefs.current.assignmentType}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="multiple">Multiple Users</option>
                                        <option value="all_company">All Company</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        ref={formRefs.current.category}
                                        type="text"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            {/* User Assignment Section */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Users</label>
                                <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                                    {users.map(user => (
                                        <label key={user.id} className="flex items-center space-x-2 mb-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.id)}
                                                onChange={() => handleUserSelection(user.id)}
                                                className="rounded border-gray-300"
                                            />
                                            <span className="text-sm">{user.username} ({user.email})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Related Records */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Contact</label>
                                    <select
                                        ref={formRefs.current.contactId}
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Lead</label>
                                    <select
                                        ref={formRefs.current.leadId}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Lead</option>
                                        {leads.map(lead => (
                                            <option key={lead.id} value={lead.id}>
                                                {lead.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Opportunity</label>
                                    <select
                                        ref={formRefs.current.opportunityId}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Opportunity</option>
                                        {opportunities.map(opportunity => (
                                            <option key={opportunity.id} value={opportunity.id}>
                                                {opportunity.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Related Sale</label>
                                    <select
                                        ref={formRefs.current.saleId}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Select Sale</option>
                                        {sales.map(sale => (
                                            <option key={sale.id} value={sale.id}>
                                                {sale.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Tags */}
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
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={handleTagInput}
                                    placeholder="Add a tag and press Enter"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    ref={formRefs.current.notes}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
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
                                    Create Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Modal - Similar structure to Add Modal */}
            {showEditModal && editingTask && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
                        <form onSubmit={handleUpdateTask} className="space-y-4">
                            {/* Same form structure as Add Modal */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        ref={formRefs.current.title}
                                        type="text"
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                {/* Add all other form fields similar to Add Modal */}
                            </div>

                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingTask(null);
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
                                    Update Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Undo Notification */}
            {showUndoNotification && deletedTask && (
                <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
                    <span>Task "{deletedTask.title}" deleted</span>
                    <button
                        onClick={() => {
                            // Implement undo functionality
                            setShowUndoNotification(false);
                            setDeletedTask(null);
                        }}
                        className="ml-2 text-blue-400 hover:text-blue-300"
                    >
                        Undo
                    </button>
                </div>
            )}
        </div>
    );
};

export default memo(TasksWidget);