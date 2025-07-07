import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const SearchResultWidget = memo(({ resultData }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDetails = useCallback(async () => {
    if (!resultData) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch detailed information based on the result type
      let endpoint = '';
      switch (resultData.type) {
        case 'contact':
          endpoint = `/api/contacts/${resultData.id}`;
          break;
        case 'lead':
          endpoint = `/api/leads/${resultData.id}`;
          break;
        case 'opportunity':
          endpoint = `/api/opportunities/${resultData.id}`;
          break;
        case 'company':
          endpoint = `/api/companies/${resultData.id}`;
          break;
        case 'user':
          endpoint = `/api/users/${resultData.id}`;
          break;
        default:
          throw new Error('Unknown result type');
      }
      
      const response = await axios.get(`${API_URL}${endpoint}`, {
        withCredentials: true
      });
      
      setDetails(response.data);
    } catch (err) {
      console.error('Failed to fetch details:', err);
      setError('Failed to load details. Using search result data instead.');
      // Fallback to the search result data
      setDetails(resultData);
    } finally {
      setLoading(false);
    }
  }, [resultData]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </div>
        </div>
        <SearchResultDisplay result={resultData} />
      </div>
    );
  }

  return <SearchResultDisplay result={details || resultData} />;
});

const SearchResultDisplay = memo(({ result }) => {
  if (!result) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data available
      </div>
    );
  }

  const getTypeIcon = useCallback((type) => {
    switch (type) {
      case 'contact':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'lead':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'opportunity':
        return (
          <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        );
      case 'company':
        return (
          <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'user':
        return (
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  }, []);

  const getStatusBadge = useCallback((status) => {
    if (!status) return null;

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
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  }, []);

  const renderContactDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getTypeIcon('contact')}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {result.firstName} {result.lastName}
          </h3>
          <p className="text-sm text-gray-600">{result.jobTitle}</p>
        </div>
        {getStatusBadge(result.status)}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.email && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
            <p className="text-sm text-gray-900">{result.email}</p>
          </div>
        )}
        {result.phone && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
            <p className="text-sm text-gray-900">{result.phone}</p>
          </div>
        )}
        {result.company && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Company</label>
            <p className="text-sm text-gray-900">{result.company.name}</p>
          </div>
        )}
        {result.department && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Department</label>
            <p className="text-sm text-gray-900">{result.department}</p>
          </div>
        )}
      </div>
      
      {result.notes && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
          <p className="text-sm text-gray-900 mt-1">{result.notes}</p>
        </div>
      )}
    </div>
  );

  const renderLeadDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getTypeIcon('lead')}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{result.title}</h3>
          <p className="text-sm text-gray-600">{result.contact ? `${result.contact.firstName} ${result.contact.lastName}` : 'No contact'}</p>
        </div>
        {getStatusBadge(result.status)}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.estimatedValue && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Estimated Value</label>
            <p className="text-sm text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: result.currency || 'USD' }).format(result.estimatedValue)}
            </p>
          </div>
        )}
        {result.priority && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Priority</label>
            <p className="text-sm text-gray-900 capitalize">{result.priority}</p>
          </div>
        )}
        {result.source && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Source</label>
            <p className="text-sm text-gray-900">{result.source}</p>
          </div>
        )}
        {result.expectedCloseDate && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Expected Close Date</label>
            <p className="text-sm text-gray-900">{new Date(result.expectedCloseDate).toLocaleDateString()}</p>
          </div>
        )}
      </div>
      
      {result.description && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
          <p className="text-sm text-gray-900 mt-1">{result.description}</p>
        </div>
      )}
    </div>
  );

  const renderOpportunityDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getTypeIcon('opportunity')}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{result.name}</h3>
          <p className="text-sm text-gray-600">{result.contact ? `${result.contact.firstName} ${result.contact.lastName}` : 'No contact'}</p>
        </div>
        {getStatusBadge(result.stage)}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.amount && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Amount</label>
            <p className="text-sm text-gray-900">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: result.currency || 'USD' }).format(result.amount)}
            </p>
          </div>
        )}
        {result.probability && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Probability</label>
            <p className="text-sm text-gray-900">{result.probability}%</p>
          </div>
        )}
        {result.expectedCloseDate && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Expected Close Date</label>
            <p className="text-sm text-gray-900">{new Date(result.expectedCloseDate).toLocaleDateString()}</p>
          </div>
        )}
        {result.type && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
            <p className="text-sm text-gray-900">{result.type}</p>
          </div>
        )}
      </div>
      
      {result.description && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
          <p className="text-sm text-gray-900 mt-1">{result.description}</p>
        </div>
      )}
    </div>
  );

  const renderCompanyDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getTypeIcon('company')}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{result.name}</h3>
          <p className="text-sm text-gray-600">{result.industry || 'No industry specified'}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.website && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Website</label>
            <p className="text-sm text-gray-900">
              <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                {result.website}
              </a>
            </p>
          </div>
        )}
        {result.phone_number && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Phone</label>
            <p className="text-sm text-gray-900">{result.phone_number}</p>
          </div>
        )}
        {result.userCount && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Users</label>
            <p className="text-sm text-gray-900">{result.userCount}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUserDetails = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        {getTypeIcon('user')}
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{result.email}</h3>
          <p className="text-sm text-gray-600">{result.role}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.company && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Company</label>
            <p className="text-sm text-gray-900">{result.company.name}</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderDetails = () => {
    switch (result.type) {
      case 'contact':
        return renderContactDetails();
      case 'lead':
        return renderLeadDetails();
      case 'opportunity':
        return renderOpportunityDetails();
      case 'company':
        return renderCompanyDetails();
      case 'user':
        return renderUserDetails();
      default:
        return (
          <div className="p-4 text-center text-gray-500">
            Unknown result type: {result.type}
          </div>
        );
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      {renderDetails()}
    </div>
  );
};

export default SearchResultWidget; 