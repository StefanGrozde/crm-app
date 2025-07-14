import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const TicketQueueWidget = ({ 
    queueType = 'all', 
    title, 
    onOpenTicketProfile,
    showStats = false,
    showAssignmentActions = false,
    showBulkActions = false,
    customFilters = {}
}) => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        type: '',
        assignedTo: '',
        ...customFilters
    });
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('DESC');
    const [filterOptions, setFilterOptions] = useState({});
    const [selectedTickets, setSelectedTickets] = useState([]);
    const [queueStats, setQueueStats] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    // Get API endpoint based on queue type
    const getApiEndpoint = useCallback(() => {
        switch (queueType) {
            case 'my':
                return `${process.env.REACT_APP_API_URL}/api/tickets/queue/my`;
            case 'unassigned':
                return `${process.env.REACT_APP_API_URL}/api/tickets/queue/unassigned`;
            case 'team':
                return `${process.env.REACT_APP_API_URL}/api/tickets/queue/team`;
            default:
                return `${process.env.REACT_APP_API_URL}/api/tickets`;
        }
    }, [queueType]);

    // Debounced search
    const debouncedSearch = useMemo(() => {
        const handler = (searchTerm) => {
            setSearch(searchTerm);
            setPage(1);
        };
        
        let timeoutId;
        return (searchTerm) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler(searchTerm), 300);
        };
    }, []);

    // Fetch tickets
    const fetchTickets = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                sortBy,
                sortOrder
            });

            if (search) params.append('search', search);
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.type) params.append('type', filters.type);
            if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);

            const response = await fetch(`${getApiEndpoint()}?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch tickets');
            }

            const data = await response.json();
            setTickets(data.tickets || []);
            setTotalPages(data.pagination?.totalPages || 1);
            setTotalItems(data.pagination?.totalItems || 0);
        } catch (err) {
            setError(err.message);
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [page, search, filters, sortBy, sortOrder, getApiEndpoint]);

    // Fetch filter options
    const fetchFilterOptions = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/filter-options`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setFilterOptions(data);
            }
        } catch (err) {
            console.error('Error fetching filter options:', err);
        }
    }, []);

    // Fetch queue stats
    const fetchQueueStats = useCallback(async () => {
        if (!showStats) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/queue/stats`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setQueueStats(data);
            }
        } catch (err) {
            console.error('Error fetching queue stats:', err);
        }
    }, [showStats]);

    // Assign ticket to user
    const assignTicket = useCallback(async (ticketId, assignedTo) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/${ticketId}/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ assignedTo })
            });

            if (!response.ok) {
                throw new Error('Failed to assign ticket');
            }

            await fetchTickets();
            await fetchQueueStats();
        } catch (err) {
            console.error('Error assigning ticket:', err);
        }
    }, [fetchTickets, fetchQueueStats]);

    // Bulk assign tickets
    const bulkAssignTickets = useCallback(async (assignedTo) => {
        if (selectedTickets.length === 0) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/bulk/assign`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ ticketIds: selectedTickets, assignedTo })
            });

            if (!response.ok) {
                throw new Error('Failed to bulk assign tickets');
            }

            setSelectedTickets([]);
            await fetchTickets();
            await fetchQueueStats();
        } catch (err) {
            console.error('Error bulk assigning tickets:', err);
        }
    }, [selectedTickets, fetchTickets, fetchQueueStats]);

    // Bulk update status
    const bulkUpdateStatus = useCallback(async (status) => {
        if (selectedTickets.length === 0) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/tickets/bulk/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ ticketIds: selectedTickets, status })
            });

            if (!response.ok) {
                throw new Error('Failed to bulk update status');
            }

            setSelectedTickets([]);
            await fetchTickets();
            await fetchQueueStats();
        } catch (err) {
            console.error('Error bulk updating status:', err);
        }
    }, [selectedTickets, fetchTickets, fetchQueueStats]);

    // Update filters
    const updateFilters = useCallback((newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
        setPage(1);
    }, []);

    // Toggle ticket selection
    const toggleTicketSelection = useCallback((ticketId) => {
        setSelectedTickets(prev => 
            prev.includes(ticketId) 
                ? prev.filter(id => id !== ticketId)
                : [...prev, ticketId]
        );
    }, []);

    // Select all tickets
    const selectAllTickets = useCallback(() => {
        setSelectedTickets(tickets.map(ticket => ticket.id));
    }, [tickets]);

    // Clear selection
    const clearSelection = useCallback(() => {
        setSelectedTickets([]);
    }, []);

    // Get priority badge class
    const getPriorityBadgeClass = useCallback((priority) => {
        switch (priority) {
            case 'urgent':
                return 'bg-red-100 text-red-800';
            case 'high':
                return 'bg-orange-100 text-orange-800';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800';
            case 'low':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, []);

    // Get status badge class
    const getStatusBadgeClass = useCallback((status) => {
        switch (status) {
            case 'open':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800';
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'closed':
                return 'bg-gray-100 text-gray-800';
            case 'on_hold':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, []);

    // Get type badge class
    const getTypeBadgeClass = useCallback((type) => {
        switch (type) {
            case 'bug':
                return 'bg-red-100 text-red-800';
            case 'feature_request':
                return 'bg-blue-100 text-blue-800';
            case 'support':
                return 'bg-green-100 text-green-800';
            case 'incident':
                return 'bg-purple-100 text-purple-800';
            case 'task':
                return 'bg-yellow-100 text-yellow-800';
            case 'question':
                return 'bg-indigo-100 text-indigo-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }, []);

    // Effects
    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    useEffect(() => {
        fetchFilterOptions();
    }, [fetchFilterOptions]);

    useEffect(() => {
        fetchQueueStats();
    }, [fetchQueueStats]);

    if (loading && page === 1) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                        {title || `Ticket Queue - ${queueType}`}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Filters
                        </button>
                        <button
                            onClick={fetchTickets}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Queue Stats */}
                {showStats && queueStats.queues && (
                    <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded">
                            <div className="text-blue-600 font-medium">My Queue</div>
                            <div className="text-blue-900 text-xl">{queueStats.queues.my}</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded">
                            <div className="text-yellow-600 font-medium">Unassigned</div>
                            <div className="text-yellow-900 text-xl">{queueStats.queues.unassigned}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded">
                            <div className="text-green-600 font-medium">Team</div>
                            <div className="text-green-900 text-xl">{queueStats.queues.team}</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <div className="text-gray-600 font-medium">Total</div>
                            <div className="text-gray-900 text-xl">{queueStats.queues.total}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={(e) => debouncedSearch(e.target.value)}
                        />
                    </div>
                    
                    {showFilters && (
                        <div className="flex items-center space-x-2">
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilters({ status: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Status</option>
                                {filterOptions.statuses?.map(status => (
                                    <option key={status} value={status}>
                                        {status.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.priority}
                                onChange={(e) => updateFilters({ priority: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Priority</option>
                                {filterOptions.priorities?.map(priority => (
                                    <option key={priority} value={priority}>
                                        {priority.toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={filters.type}
                                onChange={(e) => updateFilters({ type: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Types</option>
                                {filterOptions.types?.map(type => (
                                    <option key={type} value={type}>
                                        {type.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>

                            {queueType === 'team' && (
                                <select
                                    value={filters.assignedTo}
                                    onChange={(e) => updateFilters({ assignedTo: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Assignees</option>
                                    {filterOptions.assignedUsers?.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.username}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Actions */}
            {showBulkActions && selectedTickets.length > 0 && (
                <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">
                            {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center space-x-2">
                            <select
                                onChange={(e) => e.target.value && bulkAssignTickets(e.target.value)}
                                className="text-sm px-2 py-1 border border-gray-300 rounded"
                            >
                                <option value="">Assign to...</option>
                                {filterOptions.assignedUsers?.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.username}
                                    </option>
                                ))}
                            </select>
                            <select
                                onChange={(e) => e.target.value && bulkUpdateStatus(e.target.value)}
                                className="text-sm px-2 py-1 border border-gray-300 rounded"
                            >
                                <option value="">Update Status...</option>
                                {filterOptions.statuses?.map(status => (
                                    <option key={status} value={status}>
                                        {status.replace('_', ' ').toUpperCase()}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={clearSelection}
                                className="text-sm px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tickets List */}
            <div className="divide-y divide-gray-200">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                {showBulkActions && (
                                    <input
                                        type="checkbox"
                                        checked={selectedTickets.includes(ticket.id)}
                                        onChange={() => toggleTicketSelection(ticket.id)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                )}
                                
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => onOpenTicketProfile && onOpenTicketProfile(ticket.id)}
                                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                        >
                                            {ticket.ticketNumber}
                                        </button>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityBadgeClass(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(ticket.status)}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeClass(ticket.type)}`}>
                                            {ticket.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                                        <p className="text-sm text-gray-500">
                                            {ticket.contact ? `${ticket.contact.firstName} ${ticket.contact.lastName}` : 'No contact'} • 
                                            {ticket.assignedUser ? ` Assigned to ${ticket.assignedUser.username}` : ' Unassigned'} • 
                                            {' '}{new Date(ticket.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center space-x-2">
                                {showAssignmentActions && (
                                    <select
                                        value={ticket.assignedTo || ''}
                                        onChange={(e) => assignTicket(ticket.id, e.target.value || null)}
                                        className="text-sm px-2 py-1 border border-gray-300 rounded"
                                    >
                                        <option value="">Unassigned</option>
                                        {filterOptions.assignedUsers?.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.username}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <button
                                    onClick={() => onOpenTicketProfile && onOpenTicketProfile(ticket.id)}
                                    className="text-sm px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalItems)} of {totalItems} tickets
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-2 text-sm">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page === totalPages}
                            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {tickets.length === 0 && !loading && (
                <div className="px-6 py-12 text-center text-gray-500">
                    No tickets found in this queue.
                </div>
            )}
        </div>
    );
};

export default TicketQueueWidget;