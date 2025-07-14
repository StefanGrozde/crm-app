import React, { useState, useEffect } from 'react';

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
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C8.14348 2 6.36301 2.7375 5.05025 4.05025C3.7375 5.36301 3 7.14348 3 9V11.586L1.293 13.293C1.199 13.387 1.127 13.499 1.08 13.622C1.033 13.745 1.01 13.877 1.01 14.01C1.01 14.143 1.033 14.275 1.08 14.398C1.127 14.521 1.199 14.633 1.293 14.727C1.387 14.821 1.499 14.893 1.622 14.94C1.745 14.987 1.877 15.01 2.01 15.01H6.05C6.25 16.92 7.92 18.41 10 18.41C12.08 18.41 13.75 16.92 13.95 15.01H17.99C18.123 15.01 18.255 14.987 18.378 14.94C18.501 14.893 18.613 14.821 18.707 14.727C18.801 14.633 18.873 14.521 18.92 14.398C18.967 14.275 18.99 14.143 18.99 14.01C18.99 13.877 18.967 13.745 18.92 13.622C18.873 13.499 18.801 13.387 18.707 13.293L17 11.586V9C17 7.14348 16.2625 5.36301 14.9497 4.05025C13.637 2.7375 11.8565 2 10 2Z"/>
        </svg>
        
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