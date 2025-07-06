import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const SearchBar = ({ className = '', placeholder = "Search contacts, leads, opportunities...", onOpenResult }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.length < 2) {
      setResults(null);
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Get suggestions
        const suggestionsResponse = await axios.get(`${API_URL}/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`, {
          withCredentials: true
        });
        setSuggestions(suggestionsResponse.data);

        // Get search results
        const resultsResponse = await axios.get(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}&limit=5`, {
          withCredentials: true
        });
        setResults(resultsResponse.data);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Load search analytics on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/search/analytics`, {
          withCredentials: true
        });
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load search analytics:', error);
      }
    };
    loadAnalytics();
  }, []);

  // Handle query changes
  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showResults) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < getTotalResults() - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleResultClick(getResultByIndex(selectedIndex));
        } else if (query.trim()) {
          performSearch();
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Get total number of results across all types
  const getTotalResults = () => {
    if (!results) return 0;
    return Object.values(results.results || {}).reduce((sum, arr) => sum + arr.length, 0);
  };

  // Get result by index across all types
  const getResultByIndex = (index) => {
    if (!results) return null;
    
    let currentIndex = 0;
    for (const [type, typeResults] of Object.entries(results.results || {})) {
      for (const result of typeResults) {
        if (currentIndex === index) {
          return { ...result, type };
        }
        currentIndex++;
      }
    }
    return null;
  };

  // Handle result click
  const handleResultClick = (result) => {
    if (!result) return;

    setShowResults(false);
    setQuery('');
    setSelectedIndex(-1);

    // If onOpenResult callback is provided, use it to open as tab
    if (onOpenResult) {
      onOpenResult(result);
      return;
    }

    // Fallback: Navigate based on result type (for backward compatibility)
    switch (result.type) {
      case 'contact':
        // Navigate to contact detail page (you'll need to create this)
        navigate(`/contacts/${result.id}`);
        break;
      case 'lead':
        // Navigate to lead detail page
        navigate(`/leads/${result.id}`);
        break;
      case 'opportunity':
        // Navigate to opportunity detail page
        navigate(`/opportunities/${result.id}`);
        break;
      case 'company':
        // Navigate to company detail page
        navigate(`/companies/${result.id}`);
        break;
      case 'user':
        // Navigate to user detail page
        navigate(`/users/${result.id}`);
        break;
      default:
        console.log('Unknown result type:', result.type);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowResults(true);
    setSelectedIndex(-1);
  };

  // Perform full search
  const performSearch = () => {
    if (query.trim()) {
      setShowResults(true);
      // The search will be triggered by the useEffect
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for result type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'contact':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'lead':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'opportunity':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'company':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  // Get status badge
  const getStatusBadge = (result) => {
    if (!result.status) return null;

    const statusColors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      prospect: 'bg-blue-100 text-blue-800',
      new: 'bg-yellow-100 text-yellow-800',
      contacted: 'bg-blue-100 text-blue-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800',
      prospecting: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[result.status] || 'bg-gray-100 text-gray-800'}`}>
        {result.status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowResults(true)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={placeholder}
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {/* Suggestions */}
          {suggestions.length > 0 && query.length >= 2 && (
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded cursor-pointer"
                >
                  <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {suggestion}
                </div>
              ))}
            </div>
          )}

          {/* Search Results */}
          {results && getTotalResults() > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Search Results ({results.totalResults})
              </div>
              
              {Object.entries(results.results || {}).map(([type, typeResults]) => (
                typeResults.length > 0 && (
                  <div key={type} className="mb-2">
                    <div className="px-4 py-1 text-xs font-medium text-gray-600 bg-gray-50">
                      {type.charAt(0).toUpperCase() + type.slice(1)} ({typeResults.length})
                    </div>
                    {typeResults.map((result, index) => {
                      const globalIndex = Object.values(results.results || {})
                        .slice(0, Object.keys(results.results || {}).indexOf(type))
                        .reduce((sum, arr) => sum + arr.length, 0) + index;
                      
                      return (
                        <div
                          key={`${type}-${result.id}`}
                          onClick={() => handleResultClick({ ...result, type })}
                          className={`flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer ${
                            selectedIndex === globalIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex-shrink-0 mr-3">
                            {getTypeIcon(type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {result.title}
                              </p>
                              {getStatusBadge(result)}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                            {result.email && (
                              <p className="text-xs text-gray-400 truncate">
                                {result.email}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ))}
            </div>
          )}

          {/* No Results */}
          {results && getTotalResults() === 0 && query.length >= 2 && (
            <div className="px-4 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try searching with different keywords.
              </p>
            </div>
          )}

          {/* Search Analytics */}
          {analytics && !results && query.length < 2 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Searchable Items</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Contacts:</span>
                  <span className="font-medium">{analytics.totalContacts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Leads:</span>
                  <span className="font-medium">{analytics.totalLeads}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Opportunities:</span>
                  <span className="font-medium">{analytics.totalOpportunities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Companies:</span>
                  <span className="font-medium">{analytics.totalCompanies}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 