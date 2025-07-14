import React from 'react';

const AuditEntry = ({ 
  log, 
  showSensitive = false,
  showMetadata = false,
  compact = false 
}) => {
  // Get icon based on operation type
  const getOperationIcon = (operation) => {
    const iconClass = compact ? "w-3 h-3" : "w-4 h-4";
    
    switch (operation) {
      case 'CREATE':
        return (
          <svg className={`${iconClass} text-green-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
          </svg>
        );
      case 'UPDATE':
        return (
          <svg className={`${iconClass} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
        );
      case 'DELETE':
        return (
          <svg className={`${iconClass} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
        );
      case 'LOGIN':
        return (
          <svg className={`${iconClass} text-purple-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd"/>
          </svg>
        );
      case 'LOGOUT':
        return (
          <svg className={`${iconClass} text-orange-500`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
          </svg>
        );
      case 'ACCESS':
        return (
          <svg className={`${iconClass} text-indigo-500`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-500`} fill="currentColor" viewBox="0 0 20 20">
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
    
    if (compact) {
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)}h`;
      } else {
        return date.toLocaleDateString();
      }
    } else {
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} hours ago`;
      } else {
        return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }
  };

  // Format change description based on operation and field
  const formatChangeDescription = () => {
    switch (log.operation) {
      case 'CREATE':
        return `created ${log.entityType}`;
      case 'DELETE':
        return `deleted ${log.entityType}`;
      case 'LOGIN':
        return 'logged in';
      case 'LOGOUT':
        const duration = log.metadata?.sessionDuration;
        return `logged out${duration ? ` (session: ${duration})` : ''}`;
      case 'ACCESS':
        return 'accessed application';
      case 'UPDATE':
        if (log.fieldName) {
          const oldVal = log.oldValue !== null ? String(log.oldValue) : 'empty';
          const newVal = log.newValue !== null ? String(log.newValue) : 'empty';
          
          // Special formatting for different field types
          if (log.fieldName === 'status') {
            return `changed status to ${newVal}`;
          } else if (log.fieldName === 'assigned_to' || log.fieldName === 'assignedTo') {
            return `assigned ${log.entityType} to ${newVal}`;
          } else if (log.fieldName.includes('_id') || log.fieldName.includes('Id')) {
            return `moved ${log.entityType} to ${newVal}`;
          } else {
            return `changed ${log.fieldName}: ${oldVal} → ${newVal}`;
          }
        } else {
          return `updated ${log.entityType}`;
        }
      default:
        return `performed ${log.operation.toLowerCase()} operation`;
    }
  };

  // Get operation badge color
  const getOperationBadgeClass = () => {
    switch (log.operation) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800';
      case 'LOGOUT':
        return 'bg-orange-100 text-orange-800';
      case 'ACCESS':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className={`${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'} ${colors[colorIndex]} rounded-full flex items-center justify-center text-white font-semibold`}>
        {initials}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2 py-1">
        {generateUserAvatar(log.user?.username || 'SY')}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getOperationIcon(log.operation)}
            <span className="text-sm text-gray-900 truncate">
              <span className="font-medium">{log.user?.username || 'System'}</span> {formatChangeDescription()}
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 flex-shrink-0">
          {formatTimestamp(log.createdAt)}
        </div>
      </div>
    );
  }

  return (
    <div className="audit-entry bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {generateUserAvatar(log.user?.username || 'SY')}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header with user and operation */}
            <div className="flex items-center space-x-2 mb-1">
              <div className="flex-shrink-0">
                {getOperationIcon(log.operation)}
              </div>
              
              <p className="text-sm font-medium text-gray-900">
                {log.user?.username || 'System'}
              </p>
              
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getOperationBadgeClass()}`}>
                {log.operation}
              </span>
              
              {log.isSensitive && showSensitive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                  Sensitive
                </span>
              )}
            </div>
            
            {/* Description */}
            <p className="text-sm text-gray-600">
              {formatChangeDescription()}
            </p>

            {/* Additional metadata */}
            {showMetadata && log.metadata && Object.keys(log.metadata).length > 0 && (
              <div className="mt-2 text-xs text-gray-500 space-y-1">
                {log.metadata.deviceInfo && (
                  <div>
                    <span className="font-medium">Device:</span> {log.metadata.deviceInfo.browser} on {log.metadata.deviceInfo.os}
                    {log.metadata.deviceInfo.isMobile && <span className="ml-1">(Mobile)</span>}
                  </div>
                )}
                {log.ipAddress && (
                  <div>
                    <span className="font-medium">IP Address:</span> {log.ipAddress}
                  </div>
                )}
                {log.metadata.endpoint && (
                  <div>
                    <span className="font-medium">Endpoint:</span> {log.metadata.endpoint}
                  </div>
                )}
                {log.sessionId && (
                  <div>
                    <span className="font-medium">Session:</span> {log.sessionId.substring(0, 8)}...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 text-xs text-gray-500">
          {formatTimestamp(log.createdAt)}
        </div>
      </div>
    </div>
  );
};

export default AuditEntry;