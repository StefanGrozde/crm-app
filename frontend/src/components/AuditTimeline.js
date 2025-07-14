import React, { useState, useEffect, useCallback, useMemo } from 'react';

const AuditTimeline = ({ 
  entityType, 
  entityId, 
  userRole, 
  className = '',
  showFilters = true,
  maxHeight = 'max-h-96'
}) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [filters, setFilters] = useState({
    operation: 'all',
    dateRange: '30days',
    user: 'all'
  });

  const HIGH_SECURITY_ENTITIES = useMemo(() => ['user', 'company', 'system', 'security'], []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        entityType,
        entityId,
        ...filters
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/audit-logs/entity/${entityType}/${entityId}?${queryParams}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, filters]);

  useEffect(() => {
    // Check if user has access to view audit logs for this entity type
    if (HIGH_SECURITY_ENTITIES.includes(entityType) && userRole !== 'Administrator') {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    
    setHasAccess(true);
    fetchAuditLogs();
  }, [entityType, entityId, userRole, filters, fetchAuditLogs, HIGH_SECURITY_ENTITIES]);


  // Get icon based on operation type
  const getOperationIcon = (operation) => {
    switch (operation) {
      case 'CREATE':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
          </svg>
        );
      case 'UPDATE':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
        );
      case 'DELETE':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
        );
      case 'LOGIN':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'LOGOUT':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
          </svg>
        );
      case 'ACCESS':
        return (
          <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
        );
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Format change description based on the analyzed design
  const formatChangeDescription = (log) => {
    if (log.operation === 'CREATE') {
      return `created ${log.entityType}`;
    } else if (log.operation === 'DELETE') {
      return `deleted ${log.entityType}`;
    } else if (log.operation === 'LOGIN') {
      return 'logged in';
    } else if (log.operation === 'LOGOUT') {
      const duration = log.metadata?.sessionDuration;
      return `logged out${duration ? ` (session: ${duration})` : ''}`;
    } else if (log.operation === 'ACCESS') {
      return 'accessed application';
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
      <div className={`w-8 h-8 ${colors[colorIndex]} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
        {initials}
      </div>
    );
  };

  // Group logs by date
  const groupLogsByDate = (logs) => {
    const groups = {};
    logs.forEach(log => {
      const date = new Date(log.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });
    return groups;
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

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-500 mt-2">Loading audit logs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <p className="text-sm text-red-800">Error loading audit logs: {error}</p>
        </div>
      </div>
    );
  }

  const groupedLogs = groupLogsByDate(auditLogs);

  return (
    <div className={`audit-timeline ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Change History</h3>
        {showFilters && (
          <div className="flex space-x-2">
            <select
              value={filters.operation}
              onChange={(e) => setFilters({...filters, operation: e.target.value})}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Operations</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="ACCESS">Access</option>
            </select>
            
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className={`overflow-y-auto ${maxHeight}`}>
        {Object.keys(groupedLogs).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2v8h12V6H4z" clipRule="evenodd"/>
            </svg>
            <p>No changes recorded yet</p>
          </div>
        ) : (
          Object.entries(groupedLogs).map(([date, logs]) => (
            <div key={date} className="mb-6">
              {/* Date header */}
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="ml-3 text-sm font-medium text-gray-900">
                  {date === new Date().toDateString() ? 'Today' : 
                   date === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : 
                   new Date(date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Timeline items */}
              <div className="ml-5 border-l-2 border-gray-200 pl-4">
                {logs.map((log, index) => (
                  <div key={log.id} className={`relative ${index !== logs.length - 1 ? 'pb-6' : ''}`}>
                    {/* Timeline dot */}
                    <div className="absolute -left-6 mt-1.5 w-3 h-3 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                    </div>

                    {/* Log content */}
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {/* User Avatar */}
                          <div className="flex-shrink-0">
                            {generateUserAvatar(log.user?.username || 'System')}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className="flex-shrink-0 mt-0.5">
                                {getOperationIcon(log.operation)}
                              </div>
                              
                              <p className="text-sm text-gray-900">
                                <span className="font-medium">{log.user?.username || 'System'}</span>{' '}
                                {formatChangeDescription(log)}
                              </p>
                              
                              {log.isSensitive && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                                  </svg>
                                  Sensitive
                                </span>
                              )}
                            </div>

                            {/* Additional metadata */}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {log.metadata.deviceInfo && (
                                  <span>
                                    {log.metadata.deviceInfo.browser} on {log.metadata.deviceInfo.os}
                                  </span>
                                )}
                                {log.ipAddress && (
                                  <span className="ml-2">IP: {log.ipAddress}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-xs text-gray-500">
                          {formatTimestamp(log.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AuditTimeline;