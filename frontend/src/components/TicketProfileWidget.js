import React, { useState, useEffect, useContext, useCallback, memo, useRef, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { createPortal } from 'react-dom';
import TimelineWithComments from './TimelineWithComments';

const API_URL = process.env.REACT_APP_API_URL;

const TicketProfileWidget = ({ ticketId }) => {
    // Context
    // eslint-disable-next-line no-unused-vars
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit states
    const [showEditModal, setShowEditModal] = useState(false);
    const [formData, setFormData] = useState({});
    
    // Comment states
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [addingComment, setAddingComment] = useState(false);
    
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
    // eslint-disable-next-line no-unused-vars
    const [tasks, setTasks] = useState([]);
    
    // Tags handling
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    
    // Timeline refresh reference
    const timelineRef = useRef(null);

    // Logic: Load ticket data
    const loadTicket = useCallback(async () => {
        if (!ticketId) return;
        
        try {
            setLoading(true);
            setError(null);
            
            const response = await axios.get(`${API_URL}/api/tickets/${ticketId}`, {
                withCredentials: true
            });
            
            setTicket(response.data);
            setTags(response.data.tags || []);
            
        } catch (error) {
            console.error('Error loading ticket:', error);
            setError('Failed to load ticket details');
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    // Logic: Load dropdown data
    const loadDropdownData = useCallback(async () => {
        try {
            const [usersResponse, contactsResponse, leadsResponse, opportunitiesResponse, salesResponse, tasksResponse] = await Promise.all([
                axios.get(`${API_URL}/api/users`, { withCredentials: true }),
                axios.get(`${API_URL}/api/contacts`, { withCredentials: true }),
                axios.get(`${API_URL}/api/leads`, { withCredentials: true }),
                axios.get(`${API_URL}/api/opportunities`, { withCredentials: true }),
                axios.get(`${API_URL}/api/sales`, { withCredentials: true }),
                axios.get(`${API_URL}/api/tasks`, { withCredentials: true })
            ]);
            
            setUsers(usersResponse.data.users || []);
            setContacts(contactsResponse.data.contacts || []);
            setLeads(leadsResponse.data.leads || []);
            setOpportunities(opportunitiesResponse.data.opportunities || []);
            setSales(salesResponse.data.sales || []);
            setTasks(tasksResponse.data.tasks || []);
        } catch (error) {
            console.error('Error loading dropdown data:', error);
        }
    }, []);

    // Logic: Initialize component
    useEffect(() => {
        loadTicket();
        loadDropdownData();
    }, [loadTicket, loadDropdownData]);

    // Logic: Update ticket
    const handleUpdateTicket = async (updatedData) => {
        try {
            // Structure the data according to what the backend expects
            const submitData = {
                title: updatedData.title,
                description: updatedData.description || '',
                status: updatedData.status,
                priority: updatedData.priority,
                type: updatedData.type,
                contactId: updatedData.contactId && updatedData.contactId !== '' ? parseInt(updatedData.contactId) : null,
                assignedTo: updatedData.assignedTo && updatedData.assignedTo !== '' ? parseInt(updatedData.assignedTo) : null,
                relatedLeadId: updatedData.relatedLeadId && updatedData.relatedLeadId !== '' ? parseInt(updatedData.relatedLeadId) : null,
                relatedOpportunityId: updatedData.relatedOpportunityId && updatedData.relatedOpportunityId !== '' ? parseInt(updatedData.relatedOpportunityId) : null,
                relatedSaleId: updatedData.relatedSaleId && updatedData.relatedSaleId !== '' ? parseInt(updatedData.relatedSaleId) : null,
                relatedTaskId: updatedData.relatedTaskId && updatedData.relatedTaskId !== '' ? parseInt(updatedData.relatedTaskId) : null,
                estimatedHours: updatedData.estimatedHours ? parseFloat(updatedData.estimatedHours) : null,
                actualHours: updatedData.actualHours ? parseFloat(updatedData.actualHours) : null,
                resolutionNotes: updatedData.resolutionNotes || '',
                tags: updatedData.tags || []
            };
            
            console.log('Submitting ticket data:', submitData);
            
            const response = await axios.put(`${API_URL}/api/tickets/${ticketId}`, submitData, {
                withCredentials: true
            });
            
            console.log('Ticket update response:', response.data);
            
            setTicket(response.data);
            setShowEditModal(false);
            
            // Reload ticket to get updated assignment data
            await loadTicket();
            
            // Refresh the timeline to show new audit logs (with small delay to ensure audit log creation)
            setTimeout(() => {
                if (timelineRef.current && timelineRef.current.refresh) {
                    timelineRef.current.refresh();
                }
            }, 500);
            
            alert('Ticket updated successfully!');
        } catch (error) {
            console.error('Error updating ticket:', error);
            console.error('Error response:', error.response?.data);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update ticket';
            alert(errorMessage);
        }
    };

    // Logic: Add comment
    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        
        try {
            setAddingComment(true);
            // eslint-disable-next-line no-unused-vars
            const response = await axios.post(`${API_URL}/api/tickets/${ticketId}/comments`, {
                comment: newComment.trim(),
                isInternal: isInternalComment
            }, {
                withCredentials: true
            });
            
            // Reload ticket to get updated comments
            await loadTicket();
            
            // Refresh the timeline to show new audit logs (with small delay to ensure audit log creation)
            setTimeout(() => {
                if (timelineRef.current && timelineRef.current.refresh) {
                    timelineRef.current.refresh();
                }
            }, 500);
            
            setNewComment('');
            setIsInternalComment(false);
            setShowCommentModal(false);
            alert('Comment added successfully!');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        } finally {
            setAddingComment(false);
        }
    };

    // Logic: Handle status change
    const handleStatusChange = async (newStatus) => {
        try {
            await handleUpdateTicket({ status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    // Logic: Handle form data change
    const handleFormChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Logic: Open edit modal
    const openEditModal = () => {
        setFormData({
            title: ticket.title || '',
            description: ticket.description || '',
            status: ticket.status || 'open',
            priority: ticket.priority || 'medium',
            type: ticket.type || 'support',
            contactId: ticket.contactId || '',
            assignedTo: ticket.assignedTo || '',
            relatedLeadId: ticket.relatedLeadId || '',
            relatedOpportunityId: ticket.relatedOpportunityId || '',
            relatedSaleId: ticket.relatedSaleId || '',
            relatedTaskId: ticket.relatedTaskId || '',
            estimatedHours: ticket.estimatedHours || '',
            actualHours: ticket.actualHours || '',
            resolutionNotes: ticket.resolutionNotes || '',
            tags: ticket.tags || []
        });
        setTags(ticket.tags || []);
        setShowEditModal(true);
    };

    // Logic: Save edit
    const handleSaveEdit = () => {
        const updatedData = { 
            ...formData, 
            tags: tags 
        };
        handleUpdateTicket(updatedData);
    };

    // Logic: Add tag
    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    // Logic: Remove tag
    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // Logic: Handle tag input key press
    const handleTagKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
        }
    };

    // Helper: Get status badge color
    const getStatusColor = (status) => {
        const colors = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            resolved: 'bg-green-100 text-green-800',
            closed: 'bg-gray-100 text-gray-800',
            on_hold: 'bg-orange-100 text-orange-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // Helper: Get priority badge color
    const getPriorityColor = (priority) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            urgent: 'bg-red-100 text-red-800'
        };
        return colors[priority] || 'bg-gray-100 text-gray-800';
    };

    // Helper: Get type badge color
    const getTypeColor = (type) => {
        const colors = {
            bug: 'bg-red-100 text-red-800',
            feature_request: 'bg-blue-100 text-blue-800',
            support: 'bg-green-100 text-green-800',
            question: 'bg-purple-100 text-purple-800',
            task: 'bg-yellow-100 text-yellow-800',
            incident: 'bg-red-100 text-red-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };

    // Memoized ticket data for timeline to prevent unnecessary re-renders
    const memoizedTicketData = useMemo(() => {
        if (!ticket) return null;
        return {
            id: ticket.id,
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            type: ticket.type,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            assignedUser: ticket.assignedUser,
            ticketNumber: ticket.ticketNumber,
            description: ticket.description
        };
    }, [ticket?.id, ticket?.title, ticket?.status, ticket?.priority, ticket?.type, ticket?.created_at, ticket?.updated_at, ticket?.assignedUser, ticket?.ticketNumber, ticket?.description]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 text-center">
                <div className="text-red-600 mb-4">{error}</div>
                <button 
                    onClick={loadTicket}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="p-6 text-center text-gray-500">
                Ticket not found
            </div>
        );
    }

    return (
        <div className="bg-white">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-xl font-semibold text-gray-900">
                                {ticket.ticketNumber}
                            </h1>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(ticket.type)}`}>
                                {ticket.type?.replace('_', ' ')}
                            </span>
                        </div>
                        <h2 className="text-lg text-gray-700 mt-1">{ticket.title}</h2>
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowCommentModal(true)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Add Comment
                        </button>
                        <button
                            onClick={openEditModal}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Edit
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Details */}
                    <div className="space-y-6">
                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                                {ticket.description || 'No description provided'}
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Details</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Contact</dt>
                                    <dd className="text-sm text-gray-900">
                                        {ticket.contact ? `${ticket.contact.firstName} ${ticket.contact.lastName}` : 'Not assigned'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                                    <dd className="text-sm text-gray-900">
                                        {ticket.assignedUser ? ticket.assignedUser.username : 'Unassigned'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created By</dt>
                                    <dd className="text-sm text-gray-900">
                                        {ticket.creator ? ticket.creator.username : 'Unknown'}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                                    <dd className="text-sm text-gray-900">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </dd>
                                </div>
                                {ticket.estimatedHours && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Est. Hours</dt>
                                        <dd className="text-sm text-gray-900">{ticket.estimatedHours}h</dd>
                                    </div>
                                )}
                                {ticket.actualHours && (
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500">Actual Hours</dt>
                                        <dd className="text-sm text-gray-900">{ticket.actualHours}h</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Related Items */}
                        {(ticket.relatedLead || ticket.relatedOpportunity || ticket.relatedSale || ticket.relatedTask) && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Related Items</h3>
                                <div className="space-y-2">
                                    {ticket.relatedLead && (
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-500">Lead:</span> {ticket.relatedLead.title}
                                        </div>
                                    )}
                                    {ticket.relatedOpportunity && (
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-500">Opportunity:</span> {ticket.relatedOpportunity.name}
                                        </div>
                                    )}
                                    {ticket.relatedSale && (
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-500">Sale:</span> {ticket.relatedSale.title}
                                        </div>
                                    )}
                                    {ticket.relatedTask && (
                                        <div className="text-sm">
                                            <span className="font-medium text-gray-500">Task:</span> {ticket.relatedTask.title}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tags */}
                        {ticket.tags && ticket.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Tags</h3>
                                <div className="flex flex-wrap gap-1">
                                    {ticket.tags.map((tag, index) => (
                                        <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolution Notes */}
                        {ticket.resolutionNotes && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-2">Resolution Notes</h3>
                                <div className="text-sm text-gray-700 whitespace-pre-wrap bg-green-50 p-3 rounded">
                                    {ticket.resolutionNotes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Comments */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                            Comments ({ticket.comments?.length || 0})
                        </h3>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                            {ticket.comments && ticket.comments.length > 0 ? (
                                ticket.comments.map((comment) => (
                                    <div key={comment.id} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {comment.user ? comment.user.username : 'Unknown User'}
                                                </span>
                                                {comment.isInternal && (
                                                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                                        Internal
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(comment.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {comment.comment}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-gray-500 text-center py-4">
                                    No comments yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                    <div className="flex space-x-2">
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                            <button
                                onClick={() => handleStatusChange('resolved')}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Mark Resolved
                            </button>
                        )}
                        {ticket.status !== 'closed' && (
                            <button
                                onClick={() => handleStatusChange('closed')}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                Close Ticket
                            </button>
                        )}
                        {ticket.status === 'closed' && (
                            <button
                                onClick={() => handleStatusChange('open')}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Reopen Ticket
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Timeline with Comments - Enhanced Ticket View */}
            {memoizedTicketData && (
                <div className="mt-6">
                    <TimelineWithComments
                        ref={timelineRef}
                        entityType="ticket"
                        entityId={memoizedTicketData.id}
                        entityData={memoizedTicketData}
                        userRole={user?.role}
                        showAddComment={true}
                        showFilters={false}
                        maxHeight="h-full"
                        className="w-full"
                    />
                </div>
            )}

            {/* Comment Modal */}
            {showCommentModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Add Comment</h3>
                                <button
                                    onClick={() => setShowCommentModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Comment
                                    </label>
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your comment..."
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isInternal"
                                        checked={isInternalComment}
                                        onChange={(e) => setIsInternalComment(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="isInternal" className="ml-2 text-sm text-gray-700">
                                        Internal comment (not visible to contacts)
                                    </label>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => setShowCommentModal(false)}
                                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={addingComment || !newComment.trim()}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {addingComment ? 'Adding...' : 'Add Comment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Modal */}
            {showEditModal && createPortal(
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Edit Ticket</h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title || ''}
                                            onChange={(e) => handleFormChange('title', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={formData.status || ''}
                                            onChange={(e) => handleFormChange('status', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="open">Open</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                            <option value="on_hold">On Hold</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Priority
                                        </label>
                                        <select
                                            value={formData.priority || ''}
                                            onChange={(e) => handleFormChange('priority', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Type
                                        </label>
                                        <select
                                            value={formData.type || ''}
                                            onChange={(e) => handleFormChange('type', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="bug">Bug</option>
                                            <option value="feature_request">Feature Request</option>
                                            <option value="support">Support</option>
                                            <option value="question">Question</option>
                                            <option value="task">Task</option>
                                            <option value="incident">Incident</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Assign To
                                        </label>
                                        <select
                                            value={formData.assignedTo || ''}
                                            onChange={(e) => handleFormChange('assignedTo', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.username}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Contact
                                        </label>
                                        <select
                                            value={formData.contactId || ''}
                                            onChange={(e) => handleFormChange('contactId', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">No contact</option>
                                            {contacts.map(contact => (
                                                <option key={contact.id} value={contact.id}>
                                                    {contact.firstName} {contact.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description || ''}
                                        onChange={(e) => handleFormChange('description', e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Resolution Notes
                                    </label>
                                    <textarea
                                        value={formData.resolutionNotes || ''}
                                        onChange={(e) => handleFormChange('resolutionNotes', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Estimated Hours
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={formData.estimatedHours || ''}
                                            onChange={(e) => handleFormChange('estimatedHours', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Actual Hours
                                        </label>
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={formData.actualHours || ''}
                                            onChange={(e) => handleFormChange('actualHours', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tags
                                    </label>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {tags.map((tag, index) => (
                                            <span key={index} className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                {tag}
                                                <button
                                                    onClick={() => removeTag(tag)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={handleTagKeyPress}
                                            placeholder="Type a tag and press Enter"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={addTag}
                                            type="button"
                                            className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default memo(TicketProfileWidget);