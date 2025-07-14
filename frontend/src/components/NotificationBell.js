import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';

const NotificationBell = ({ onClick, unreadCount = 0 }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate when new notifications arrive
  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`
          relative p-2 text-gray-600 hover:text-gray-800 focus:outline-none 
          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full
          transition-all duration-200 hover:bg-gray-100
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <FaBell className="w-5 h-5" />
        
        {/* Notification badge */}
        {unreadCount > 0 && (
          <span 
            className={`
              absolute -top-1 -right-1 inline-flex items-center justify-center 
              px-2 py-1 text-xs font-bold leading-none text-white 
              bg-red-500 rounded-full min-w-[20px] h-5
              ${isAnimating ? 'animate-bounce' : ''}
            `}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationBell;