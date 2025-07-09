import React, { useState, useRef, useCallback } from 'react';

const WidgetSearchBar = ({ 
    placeholder = "Search...", 
    onSearch, 
    searchTerm = "",
    debounceDelay = 300,
    className = ""
}) => {
    const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
    const searchInputRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Handle search input changes with debouncing
    const handleSearchInputChange = useCallback((e) => {
        const value = e.target.value;
        setLocalSearchTerm(value);
        
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Set new timeout for search
        searchTimeoutRef.current = setTimeout(() => {
            if (onSearch) {
                onSearch(value);
            }
        }, debounceDelay);
    }, [onSearch, debounceDelay]);

    // Handle direct search input change (for non-debounced updates)
    const handleDirectChange = useCallback((e) => {
        const value = e.target.value;
        setLocalSearchTerm(value);
        
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Set new timeout for search
        searchTimeoutRef.current = setTimeout(() => {
            if (onSearch) {
                onSearch(value);
            }
        }, debounceDelay);
    }, [onSearch, debounceDelay]);

    // Clear search
    const clearSearch = useCallback(() => {
        setLocalSearchTerm('');
        if (searchInputRef.current) {
            searchInputRef.current.value = '';
        }
        if (onSearch) {
            onSearch('');
        }
    }, [onSearch]);

    // Cleanup timeout on unmount
    React.useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Update local search term when prop changes
    React.useEffect(() => {
        setLocalSearchTerm(searchTerm);
        if (searchInputRef.current) {
            searchInputRef.current.value = searchTerm;
        }
    }, [searchTerm]);

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={placeholder}
                    value={localSearchTerm}
                    onChange={handleDirectChange}
                    onKeyDown={(e) => {
                        // Prevent any key events from bubbling up to parent components
                        e.stopPropagation();
                    }}
                    className="w-full border border-gray-300 rounded-md pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {localSearchTerm && (
                    <button
                        onClick={clearSearch}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                        title="Clear search"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default WidgetSearchBar;