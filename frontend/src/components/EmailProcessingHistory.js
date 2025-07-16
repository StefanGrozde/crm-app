import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const EmailProcessingHistory = () => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });

  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    if (isAdmin) {
      fetchProcessingHistory();
    }
  }, [filters, isAdmin]);

  const fetchProcessingHistory = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', '20');
      if (filters.status) {
        queryParams.append('status', filters.status);
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/processing?${queryParams}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProcessing(data.processing);
        setPagination(data.pagination);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch processing history');
      }
    } catch (error) {
      console.error('Error fetching processing history:', error);
      setError('Failed to fetch processing history');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/processing/${id}/retry`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        fetchProcessingHistory(); // Refresh the list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to retry processing');
      }
    } catch (error) {
      console.error('Error retrying processing:', error);
      setError('Failed to retry processing');
    }
  };

  const handleStatusFilter = (status) => {
    setFilters(prev => ({
      ...prev,
      status: status === filters.status ? '' : status,
      page: 1
    }));
  };

  const handlePageChange = (page) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800', text: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800', text: 'Failed' },
      ignored: { color: 'bg-gray-100 text-gray-800', text: 'Ignored' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getActionBadge = (action) => {
    const actionConfig = {
      ticket_created: { color: 'bg-green-100 text-green-800', text: 'Ticket Created' },
      comment_added: { color: 'bg-blue-100 text-blue-800', text: 'Comment Added' },
      ticket_reopened: { color: 'bg-orange-100 text-orange-800', text: 'Ticket Reopened' },
      ignored: { color: 'bg-gray-100 text-gray-800', text: 'Ignored' },
      error: { color: 'bg-red-100 text-red-800', text: 'Error' }
    };

    const config = actionConfig[action] || { color: 'bg-gray-100 text-gray-800', text: 'No Action' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">
            You must be an Administrator to view email processing history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Email Processing History</h2>
        <button
          onClick={() => fetchProcessingHistory()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleStatusFilter('')}
          className={`px-3 py-1 rounded-full text-sm ${
            filters.status === '' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All
        </button>
        {['pending', 'processing', 'completed', 'failed', 'ignored'].map(status => (
          <button
            key={status}
            onClick={() => handleStatusFilter(status)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              filters.status === status 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading processing history...</p>
        </div>
      ) : processing.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No email processing records found.</p>
        </div>
      ) : (
        <>
          {/* Processing History Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processing.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.fromName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{item.fromEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900" title={item.subject}>
                        {truncateText(item.subject)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.processingStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.actionTaken ? getActionBadge(item.actionTaken) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.Ticket ? (
                        <div className="text-sm">
                          <div className="text-blue-600 hover:text-blue-800 cursor-pointer">
                            {item.Ticket.ticketNumber}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {truncateText(item.Ticket.title, 30)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.receivedDateTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.processingStatus === 'failed' && item.retryCount < item.maxRetries && (
                        <button
                          onClick={() => handleRetry(item.id)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Retry
                        </button>
                      )}
                      {item.processingError && (
                        <span 
                          className="text-red-600 hover:text-red-900 cursor-pointer"
                          title={item.processingError}
                        >
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 text-sm rounded ${
                      page === pagination.page
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailProcessingHistory;