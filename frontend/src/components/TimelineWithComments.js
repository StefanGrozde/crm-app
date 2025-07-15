import React, { useState, useContext, useMemo, forwardRef, useImperativeHandle, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useAuditHistory } from '../hooks/useAuditHistory';

/**
 * TimelineWithComments Component - Based on the analyzed UI design
 * Specialized timeline component for Tasks and Tickets with two-panel layout
 */
const TimelineWithComments = React.memo(forwardRef(({ 
  entityType, // 'task' or 'ticket'
  entityId,
  entityData, // The actual task/ticket data for the left panel
  userRole,
  showAddComment = true,
  showFilters = false, // Keep minimal as per design
  maxHeight = 'h-full', // Full height as shown in design
  className = ''
}, ref) => {
  const { user } = useContext(AuthContext);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);

  // Memoize hook options to prevent unnecessary re-renders
  const hookOptions = useMemo(() => ({
    limit: 100,
    autoFetch: true
  }), []);

  // Use the audit history hook
  const {
    auditLogs,
    loading,
    error,
    hasAccess,
    refresh
  } = useAuditHistory(entityType, entityId, hookOptions);

  // Fetch comments for the entity
  const fetchComments = useCallback(async () => {
    if (!entityId || entityType !== 'ticket') {
      setComments([]); // Clear comments for non-tickets
      return;
    }
    
    setCommentsLoading(true);
    setCommentsError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/${entityId}/comments`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setCommentsError(error.message);
      setComments([]); // Clear comments on error
    } finally {
      setCommentsLoading(false);
    }
  }, [entityId, entityType]);

  // Fetch comments when component mounts or entityId changes
  useEffect(() => {
    fetchComments();
  }, [entityId, entityType, fetchComments]);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refresh: () => {
      refresh();
      fetchComments();
    }
  }), [refresh, fetchComments]);

  // Generate user avatar with colored background
  const generateUserAvatar = (username) => {
    if (!username) return null;
    
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    
    const colorIndex = username.charCodeAt(0) % colors.length;
    const initials = username.slice(0, 2).toUpperCase();
    
    return (
      <div className={`w-10 h-10 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm`}>
        {initials}
      </div>
    );
  };

  // Format timestamp to match design (DD/MM/YYYY HH:MM)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Invalid date';
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp:', timestamp);
      return 'Invalid date';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Merge and sort comments with audit logs for unified timeline
  const mergedTimeline = useMemo(() => {
    const timelineItems = [];
    
    // Add audit logs
    auditLogs.forEach(log => {
      timelineItems.push({
        id: `audit-${log.id}`,
        type: 'audit',
        data: log,
        timestamp: new Date(log.createdAt),
        user: log.user,
        createdAt: log.createdAt
      });
    });
    
    // Add comments
    comments.forEach(comment => {
      const timestamp = comment.created_at || comment.createdAt;
      timelineItems.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        data: comment,
        timestamp: new Date(timestamp),
        user: comment.user,
        createdAt: timestamp
      });
    });
    
    // Sort by timestamp (newest first)
    return timelineItems.sort((a, b) => b.timestamp - a.timestamp);
  }, [auditLogs, comments]);

  // Format change description to match the analyzed design
  const formatChangeDescription = (log) => {
    if (log.operation === 'CREATE') {
      return `created ${log.entityType}`;
    } else if (log.operation === 'DELETE') {
      return `deleted ${log.entityType}`;
    } else if (log.operation === 'UPDATE' && log.fieldName) {
      const field = log.fieldName;
      const newVal = log.newValue !== null ? String(log.newValue) : 'empty';
      
      // Special formatting for different field types based on the design
      if (field === 'status') {
        return `has changed the status to ${newVal}`;
      } else if (field === 'assignedTo' || field === 'assigned_to') {
        return `has assigned ${log.entityType} to ${newVal}`;
      } else if (field === 'queueId' || field === 'queue_id') {
        return `has moved the ${log.entityType} to ${newVal}`;
      } else if (field.includes('_id') || field.includes('Id')) {
        return `has moved the ${log.entityType} to ${newVal}`;
      } else {
        return `has changed the ${field} to ${newVal}`;
      }
    } else {
      return `performed ${log.operation.toLowerCase()} operation`;
    }
  };

  // Render comment timeline item
  const renderCommentItem = (comment) => {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 w-full max-w-3xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="font-medium text-gray-900">{comment.user?.username || 'Unknown User'}</span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              {comment.isInternal ? 'Internal Note' : 'Comment'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {formatTimestamp(comment.created_at || comment.createdAt)}
          </span>
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {comment.comment}
        </div>
      </div>
    );
  };

  // Render audit log timeline item
  const renderAuditItem = (log) => {
    return (
      <div className="bg-gray-100 rounded-lg p-3 shadow-sm border border-gray-200 w-full max-w-lg">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{log.user?.username || 'System'}</span>{' '}
            {formatChangeDescription(log)}
          </p>
          <span className="text-xs text-gray-500">
            {formatTimestamp(log.createdAt)}
          </span>
        </div>
        
        {/* Additional metadata for sensitive changes */}
        {log.isSensitive && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            🔒 Sensitive change - requires administrator access to view details
          </div>
        )}
      </div>
    );
  };

  // Handle adding a new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || entityType !== 'ticket') return;
    
    setIsAddingComment(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/${entityId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          comment: newComment.trim(),
          isInternal: false // Default to public comments
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      setNewComment('');
      fetchComments(); // Refresh comments
      refresh(); // Refresh the audit timeline
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  // Render entity information panel
  const renderEntityInfoPanel = () => {
    if (!entityData) return null;

    // Helper functions for future status/priority badge styling
    // eslint-disable-next-line no-unused-vars
    const getStatusColor = (status) => {
      const colors = {
        'open': 'bg-green-100 text-green-800',
        'in_progress': 'bg-blue-100 text-blue-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'on_hold': 'bg-red-100 text-red-800',
        'closed': 'bg-gray-100 text-gray-800',
        'completed': 'bg-green-100 text-green-800'
      };
      return colors[status] || 'bg-gray-100 text-gray-800';
    };

    // eslint-disable-next-line no-unused-vars
    const getPriorityColor = (priority) => {
      const colors = {
        'low': 'bg-gray-100 text-gray-800',
        'medium': 'bg-yellow-100 text-yellow-800',
        'high': 'bg-orange-100 text-orange-800',
        'urgent': 'bg-red-100 text-red-800'
      };
      return colors[priority] || 'bg-gray-100 text-gray-800';
    };

    if (entityType === 'ticket') {
      return (
        <div className="bg-teal-700 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-teal-100 mb-1">Case Number</div>
                <div className="font-medium">{entityData.ticketNumber || entityData.id}</div>
              </div>
            </div>
            
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-teal-100 mb-1">Case Owner</div>
                <div className="font-medium">{entityData.assignedUser?.username || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-teal-100 mb-1">Status</div>
                <div className="font-medium">{entityData.status || 'Open'}</div>
              </div>
            </div>
            
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-teal-100 mb-1">Priority</div>
                <div className="font-medium">{entityData.priority || 'Medium'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-teal-100 mb-1">Subject</div>
            <div className="font-medium">{entityData.title || entityData.subject || 'No subject'}</div>
          </div>

          <div className="bg-white bg-opacity-20 rounded px-3 py-2">
            <div className="text-xs text-teal-100 mb-1">Description</div>
            <div className="text-sm">{entityData.description || 'No description'}</div>
          </div>
        </div>
      );
    } else if (entityType === 'task') {
      return (
        <div className="bg-blue-700 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Task Information</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-blue-100 mb-1">Task ID</div>
                <div className="font-medium">#{entityData.id}</div>
              </div>
            </div>
            
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-blue-100 mb-1">Assigned To</div>
                <div className="font-medium">{entityData.assignedUser?.username || 'Unassigned'}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-blue-100 mb-1">Status</div>
                <div className="font-medium">{entityData.status || 'pending'}</div>
              </div>
            </div>
            
            <div>
              <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
                <div className="text-xs text-blue-100 mb-1">Priority</div>
                <div className="font-medium">{entityData.priority || 'medium'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-blue-100 mb-1">Title</div>
            <div className="font-medium">{entityData.title || 'No title'}</div>
          </div>

          <div className="bg-white bg-opacity-20 rounded px-3 py-2">
            <div className="text-xs text-blue-100 mb-1">Description</div>
            <div className="text-sm">{entityData.description || 'No description'}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (!hasAccess) {
    return (
      <div className={`p-4 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          <p className="text-sm text-yellow-800">
            Access denied. Administrator role required to view audit logs for this entity type.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`timeline-with-comments ${className} flex gap-6 ${maxHeight}`}>
      {/* Left Panel - Entity Information */}
      <div className="w-1/3 flex-shrink-0">
        {renderEntityInfoPanel()}
      </div>

      {/* Right Panel - Timeline Activity */}
      <div className="flex-1 bg-gray-50 rounded-lg p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
          {showFilters && (
            <div className="flex space-x-2">
              <select className="text-sm border border-gray-300 rounded px-2 py-1">
                <option value="all">All Activity</option>
                <option value="changes">Changes Only</option>
                <option value="comments">Comments Only</option>
              </select>
            </div>
          )}
        </div>

        {/* Add Comment Section */}
        {showAddComment && entityType === 'ticket' && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {generateUserAvatar(user?.username || 'You')}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
                <div className="flex justify-end mt-2 space-x-2">
                  <button
                    onClick={() => setNewComment('')}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    disabled={isAddingComment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Note for tasks without comment support */}
        {showAddComment && entityType === 'task' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Comments are not yet supported for tasks. Only audit logs are shown below.
            </p>
          </div>
        )}

        {/* Comment Error Warning (non-blocking) */}
        {commentsError && !error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <div>
                <p className="text-sm text-yellow-800">
                  <strong>Comments unavailable:</strong> {commentsError}
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  Audit logs are still available below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Content */}
        <div className="relative">
          {(loading || commentsLoading) && mergedTimeline.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading activity...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                Error loading activity: {error}
              </p>
            </div>
          ) : mergedTimeline.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2v8h12V6H4z" clipRule="evenodd"/>
              </svg>
              <p>No activity recorded yet</p>
            </div>
          ) : (
            /* Timeline with vertical line */
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
              
              {/* Timeline items */}
              <div className="space-y-6">
                {mergedTimeline.map((item) => (
                  <div key={item.id} className="relative flex items-start">
                    {/* User avatar on the line */}
                    <div className="relative z-10 flex-shrink-0 mr-4">
                      {generateUserAvatar(item.user?.username || 'System')}
                    </div>
                    
                    {/* Content to the right of the line */}
                    <div className="flex-1">
                      {item.type === 'comment' ? 
                        renderCommentItem(item.data) : 
                        renderAuditItem(item.data)
                      }
                    </div>
                  </div>
                ))}
              </div>
              
              {mergedTimeline.length > 10 && (
                <div className="text-center mt-6">
                  <button 
                    onClick={() => {
                      refresh();
                      fetchComments();
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Load More...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}));

export default TimelineWithComments;