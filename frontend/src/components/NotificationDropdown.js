import React, { useState, useEffect, useRef } from 'react';
import { FaCheck, FaTimes, FaTask, FaTicketAlt, FaCommentAlt, FaUserPlus, FaExchangeAlt, FaBell } from 'react-icons/fa';

const NotificationDropdown = ({ 
  notifications = [], 
  isOpen, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead, 
  onDeleteNotification,
  onNotificationClick,
  loading = false 
}) => {
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Get notification icon based on type
  const getNotificationIcon = (type, entityType) => {
    const iconClass = "w-4 h-4 text-gray-500";
    
    switch (type) {
      case 'assignment':
        return <FaUserPlus className={iconClass} />;
      case 'status_change':
        return <FaExchangeAlt className={iconClass} />;
      case 'comment':
        return <FaCommentAlt className={iconClass} />;
      default:
        return entityType === 'task' ? <FaTask className={iconClass} /> : <FaTicketAlt className={iconClass} />;
    }
  };

  // Format notification time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  // Handle notification click to open profile
  const handleNotificationClick = (notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    
    // Mark as read if not already read
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            <FaBell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  px-4 py-3 hover:bg-gray-50 transition-colors duration-150 cursor-pointer
                  ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                `}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.entityType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                        {notification.title}
                      </p>
                      
                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAsRead(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-green-600 focus:outline-none"
                            title="Mark as read"
                          >
                            <FaCheck className="w-3 h-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNotification(notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                          title="Delete notification"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {formatTime(notification.createdAt)}
                      </span>
                      
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${notification.entityType === 'task' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                        }
                      `}>
                        {notification.entityType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;