import React, { useState, useEffect, useContext, useCallback, memo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import TimelineWithComments from './TimelineWithComments';

const API_URL = process.env.REACT_APP_API_URL;

const TaskProfileWidget = ({ taskId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    // eslint-disable-next-line no-unused-vars
    const [editingTask, setEditingTask] = useState(null);
    const [formData, setFormData] = useState({});
    
    // Additional data for dropdowns
    const [users, setUsers] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [contacts, setContacts] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [leads, setLeads] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [opportunities, setOpportunities] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [sales, setSales] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    
    // Tags handling
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Assignment management
    // eslint-disable-next-line no-unused-vars
    const [assignmentStatuses, setAssignmentStatuses] = useState({});
    const [hoursLogged, setHoursLogged] = useState({});

    // Logic: Load task data
    const loadTask = useCallback(async () => {
        if (!taskId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/tasks/${taskId}`, {
                withCredentials: true
            });
            
            setTask(response.data);
            setTags(response.data.tags || []);
            setSelectedUsers(response.data.assignments?.map(a => a.userId) || []);
            
            // Initialize assignment statuses and hours
            const statuses = {};
            const hours = {};
            response.data.assignments?.forEach(assignment => {
                statuses[assignment.userId] = assignment.status;
                hours[assignment.userId] = assignment.hoursLogged || 0;
            });
            setAssignmentStatuses(statuses);
            setHoursLogged(hours);
            
        } catch (error) {
            console.error('Error loading task:', error);
            setError('Failed to load task details');
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    // Logic: Load dropdown data
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

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                await Promise.all([
                    loadTask(),
                    loadDropdownData()
                ]);
            } catch (error) {
                console.error('Error initializing TaskProfileWidget:', error);
                setError('Failed to initialize task profile widget');
            }
        };

        initializeComponent();
    }, [loadTask, loadDropdownData]);

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
            if (!tags.includes(newTag)) {
                setTags(prev => [...prev, newTag]);
                setTagInput('');
            }
        }
    }, [tags]);

    // Logic: Remove tag
    const removeTag = useCallback((tagToRemove) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    // Logic: Handle user selection
    const handleUserSelection = useCallback((userId) => {
        setSelectedUsers(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    }, []);

    // Logic: Open edit modal
    const openEditModal = useCallback(() => {
        setEditingTask(task);
        setFormData({
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            priority: task.priority || 'medium',
            dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
            completedDate: task.completedDate ? task.completedDate.split('T')[0] : '',
            estimatedHours: task.estimatedHours || '',
            actualHours: task.actualHours || '',
            assignmentType: task.assignmentType || 'individual',
            category: task.category || '',
            notes: task.notes || '',
            contactId: task.contactId || '',
            leadId: task.leadId || '',
            opportunityId: task.opportunityId || '',
            saleId: task.saleId || ''
        });
        setTags(task.tags || []);
        setSelectedUsers(task.assignments?.map(a => a.userId) || []);
        setShowEditModal(true);
    }, [task]);

    // Logic: Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        try {
            // Structure the data according to what the backend expects
            const submitData = {
                title: formData.title,
                description: formData.description || '',
                status: formData.status,
                priority: formData.priority,
                dueDate: formData.dueDate || null,
                completedDate: formData.completedDate || null,
                estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
                actualHours: formData.actualHours ? parseFloat(formData.actualHours) : null,
                assignmentType: formData.assignmentType || 'individual',
                category: formData.category || '',
                notes: formData.notes || '',
                contactId: formData.contactId && formData.contactId !== '' ? parseInt(formData.contactId) : null,
                leadId: formData.leadId && formData.leadId !== '' ? parseInt(formData.leadId) : null,
                opportunityId: formData.opportunityId && formData.opportunityId !== '' ? parseInt(formData.opportunityId) : null,
                saleId: formData.saleId && formData.saleId !== '' ? parseInt(formData.saleId) : null,
                tags: tags,
                assignedUsers: selectedUsers.map(id => parseInt(id))
            };
            
            console.log('Submitting task data:', submitData);
            
            const response = await axios.put(`${API_URL}/api/tasks/${task.id}`, submitData, {
                withCredentials: true
            });
            
            console.log('Task update response:', response.data);
            
            setShowEditModal(false);
            setTask(response.data); // Update the task with the response data
            setTags(response.data.tags || []);
            setSelectedUsers(response.data.assignments?.map(a => a.userId) || []);
            
            // Notify other components that a task was updated
            window.dispatchEvent(new CustomEvent('taskUpdated', { 
                detail: { taskId: task.id, status: submitData.status } 
            }));
        } catch (error) {
            console.error('Error updating task:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update task';
            alert(errorMessage);
        }
    }, [formData, tags, selectedUsers, task, loadTask]);

    // Logic: Handle delete
    const handleDelete = useCallback(async () => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        try {
            await axios.delete(`${API_URL}/api/tasks/${task.id}`, {
                withCredentials: true
            });
            
            // Notify other components that a task was deleted
            window.dispatchEvent(new CustomEvent('taskDeleted', { 
                detail: { taskId: task.id } 
            }));
            
            // Optionally notify parent component about deletion
            window.history.back();
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task');
        }
    }, [task]);

    // Logic: Update assignment status
    const updateAssignmentStatus = useCallback(async (userId, status, hours = null) => {
        try {
            const updateData = { status };
            if (hours !== null) {
                updateData.hoursLogged = hours;
            }

            await axios.put(`${API_URL}/api/tasks/${task.id}/assignment/${userId}`, updateData, {
                withCredentials: true
            });

            // Update local state
            setAssignmentStatuses(prev => ({ ...prev, [userId]: status }));
            if (hours !== null) {
                setHoursLogged(prev => ({ ...prev, [userId]: hours }));
            }

            // Reload task to get updated data
            await loadTask();
            
            // Notify other components that a task assignment was updated
            window.dispatchEvent(new CustomEvent('taskUpdated', { 
                detail: { taskId: task.id, assignmentUpdate: true } 
            }));
        } catch (error) {
            console.error('Error updating assignment:', error);
            alert('Failed to update assignment');
        }
    }, [task, loadTask]);

    // Helper functions
    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'text-red-600 bg-red-100';
            case 'high': return 'text-orange-600 bg-orange-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-green-600 bg-green-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'in_progress': return 'text-blue-600 bg-blue-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getAssignmentStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-100';
            case 'in_progress': return 'text-blue-600 bg-blue-100';
            case 'accepted': return 'text-indigo-600 bg-indigo-100';
            case 'pending': return 'text-yellow-600 bg-yellow-100';
            case 'declined': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const isOverdue = (task) => {
        return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    };

    const calculateProgress = () => {
        if (!task.assignments || task.assignments.length === 0) return 0;
        const completedAssignments = task.assignments.filter(a => a.status === 'completed').length;
        return Math.round((completedAssignments / task.assignments.length) * 100);
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
                    onClick={() => loadTask()}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Rendering: No task found
    if (!task) {
        return (
            <div className="text-center py-8">
                <div className="text-gray-600 text-sm">Task not found</div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                    <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority} priority
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                        </span>
                        {isOverdue(task) && (
                            <span className="px-2 py-1 rounded-full text-xs text-red-600 bg-red-100">
                                Overdue
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={openEditModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center space-x-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Task Information</h3>
                        <div className="space-y-3">
                            {task.description && (
                                <div>
                                    <span className="text-gray-600 font-medium">Description:</span>
                                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{task.description}</p>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Assignment Type:</span>
                                <span className="font-medium capitalize">{task.assignmentType.replace('_', ' ')}</span>
                            </div>
                            {task.category && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Category:</span>
                                    <span className="font-medium">{task.category}</span>
                                </div>
                            )}
                            {task.dueDate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Due Date:</span>
                                    <span className={`font-medium ${isOverdue(task) ? 'text-red-600' : ''}`}>
                                        {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            {task.completedDate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Completed Date:</span>
                                    <span className="font-medium">{new Date(task.completedDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Created By:</span>
                                <span className="font-medium">{task.creator?.username || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Time Tracking</h3>
                        <div className="space-y-3">
                            {task.estimatedHours && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Estimated Hours:</span>
                                    <span className="font-medium">{task.estimatedHours}h</span>
                                </div>
                            )}
                            {task.actualHours && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Actual Hours:</span>
                                    <span className="font-medium">{task.actualHours}h</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Logged Hours:</span>
                                <span className="font-medium">
                                    {Object.values(hoursLogged).reduce((sum, hours) => sum + parseFloat(hours || 0), 0)}h
                                </span>
                            </div>
                            {task.estimatedHours && (
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Progress:</span>
                                        <span>{calculateProgress()}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${calculateProgress()}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Assignments */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Assignments</h3>
                        {task.assignments && task.assignments.length > 0 ? (
                            <div className="space-y-3">
                                {task.assignments.map((assignment) => (
                                    <div key={assignment.id} className="border rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <div className="font-medium">{assignment.user.username}</div>
                                                <div className="text-sm text-gray-600">{assignment.user.email}</div>
                                            </div>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getAssignmentStatusColor(assignment.status)}`}>
                                                {assignment.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        {assignment.hoursLogged > 0 && (
                                            <div className="text-sm text-gray-600 mb-2">
                                                Hours Logged: {assignment.hoursLogged}h
                                            </div>
                                        )}

                                        {/* Only show controls for current user's assignment */}
                                        {assignment.userId === user.id && assignment.status !== 'completed' && (
                                            <div className="flex space-x-2 mt-2">
                                                {assignment.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateAssignmentStatus(assignment.userId, 'accepted')}
                                                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => updateAssignmentStatus(assignment.userId, 'declined')}
                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                        >
                                                            Decline
                                                        </button>
                                                    </>
                                                )}
                                                {assignment.status === 'accepted' && (
                                                    <button
                                                        onClick={() => updateAssignmentStatus(assignment.userId, 'in_progress')}
                                                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                                    >
                                                        Start Work
                                                    </button>
                                                )}
                                                {assignment.status === 'in_progress' && (
                                                    <button
                                                        onClick={() => updateAssignmentStatus(assignment.userId, 'completed')}
                                                        className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                                    >
                                                        Mark Complete
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-center py-4">
                                No assignments yet
                            </div>
                        )}
                    </div>

                    {/* Related Records */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-4">Related Records</h3>
                        <div className="space-y-3">
                            {task.contact && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Contact:</span>
                                    <span className="font-medium">
                                        {task.contact.firstName} {task.contact.lastName}
                                    </span>
                                </div>
                            )}
                            {task.lead && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Lead:</span>
                                    <span className="font-medium">{task.lead.title}</span>
                                </div>
                            )}
                            {task.opportunity && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Opportunity:</span>
                                    <span className="font-medium">{task.opportunity.name}</span>
                                </div>
                            )}
                            {task.sale && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Sale:</span>
                                    <span className="font-medium">{task.sale.title}</span>
                                </div>
                            )}
                            {!task.contact && !task.lead && !task.opportunity && !task.sale && (
                                <div className="text-gray-500 text-center py-4">
                                    No related records
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {task.notes && (
                        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Notes</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{task.notes}</p>
                        </div>
                    )}

                    {/* Tags */}
                    {tags && tags.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-4">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline with Comments - Enhanced Task View */}
            {task && (
                <div className="mt-6">
                    <TimelineWithComments
                        entityType="task"
                        entityId={task.id}
                        entityData={task}
                        userRole={user?.role}
                        showAddComment={true}
                        showFilters={false}
                        maxHeight="h-96"
                        className="w-full"
                    />
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">Edit Task</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
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
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleInputChange}
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
                                        type="date"
                                        name="dueDate"
                                        value={formData.dueDate}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                                    <input
                                        type="number"
                                        name="estimatedHours"
                                        value={formData.estimatedHours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
                                    <select
                                        name="assignmentType"
                                        value={formData.assignmentType}
                                        onChange={handleInputChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="multiple">Multiple</option>
                                        <option value="all_company">All Company</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Actual Hours</label>
                                    <input
                                        type="number"
                                        name="actualHours"
                                        value={formData.actualHours}
                                        onChange={handleInputChange}
                                        step="0.5"
                                        min="0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
                                    <input
                                        type="date"
                                        name="completedDate"
                                        value={formData.completedDate}
                                        onChange={handleInputChange}
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
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
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
        </div>
    );
};

export default memo(TaskProfileWidget);