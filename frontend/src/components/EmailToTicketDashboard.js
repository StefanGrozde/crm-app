import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailConfigurationModal from './EmailConfigurationModal';
import EmailProcessingHistory from './EmailProcessingHistory';

const EmailToTicketDashboard = () => {
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    if (isAdmin) {
      fetchConfigurations();
      fetchStats();
    }
  }, [isAdmin]);

  const fetchConfigurations = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setConfigurations(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch configurations');
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      setError('Failed to fetch configurations');
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching stats...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/stats`, {
        credentials: 'include'
      });

      console.log('Stats response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Stats data:', data);
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stats fetch error:', errorData);
        setError(errorData.error || `Failed to fetch statistics (${response.status})`);
        // Set default stats to prevent crashes
        setStats({
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          successRate: 0,
          actions: {
            ticketsCreated: 0,
            commentsAdded: 0,
            ticketsReopened: 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to fetch statistics: ' + error.message);
      // Set default stats to prevent crashes
      setStats({
        totalProcessed: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        successRate: 0,
        actions: {
          ticketsCreated: 0,
          commentsAdded: 0,
          ticketsReopened: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = (savedConfig) => {
    if (editingConfig) {
      setConfigurations(prev => 
        prev.map(config => config.id === savedConfig.id ? savedConfig : config)
      );
    } else {
      setConfigurations(prev => [...prev, savedConfig]);
    }
    setShowConfigModal(false);
    setEditingConfig(null);
    fetchStats(); // Refresh stats after configuration change
  };

  const handleEditConfiguration = (config) => {
    setEditingConfig(config);
    setShowConfigModal(true);
  };

  const handleDeleteConfiguration = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this email configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${configId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setConfigurations(prev => prev.filter(config => config.id !== configId));
        fetchStats(); // Refresh stats after deletion
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      setError('Failed to delete configuration');
    }
  };

  const handleToggleWebhook = async (configId, action) => {
    try {
      const method = action === 'create' ? 'POST' : action === 'renew' ? 'PUT' : 'DELETE';
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${configId}/webhook`, {
        method,
        credentials: 'include'
      });

      if (response.ok) {
        fetchConfigurations(); // Refresh configurations to get updated webhook status
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${action} webhook`);
      }
    } catch (error) {
      console.error(`Error ${action} webhook:`, error);
      setError(`Failed to ${action} webhook`);
    }
  };

  const getStatusBadge = (config) => {
    if (!config.isActive) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;
    }
    
    if (!config.webhookSubscriptionId) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">No Webhook</span>;
    }
    
    const expirationDate = new Date(config.webhookExpirationDateTime);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilExpiration <= 0) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Expired</span>;
    } else if (hoursUntilExpiration <= 24) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Expiring Soon</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
    }
  };

  const getWebhookActions = (config) => {
    if (!config.isActive) return null;
    
    if (!config.webhookSubscriptionId) {
      return (
        <button
          onClick={() => handleToggleWebhook(config.id, 'create')}
          className="text-blue-600 hover:text-blue-900 text-sm"
        >
          Create Webhook
        </button>
      );
    }
    
    const expirationDate = new Date(config.webhookExpirationDateTime);
    const now = new Date();
    const hoursUntilExpiration = (expirationDate - now) / (1000 * 60 * 60);
    
    if (hoursUntilExpiration <= 0) {
      return (
        <button
          onClick={() => handleToggleWebhook(config.id, 'create')}
          className="text-orange-600 hover:text-orange-900 text-sm"
        >
          Recreate Webhook
        </button>
      );
    } else {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => handleToggleWebhook(config.id, 'renew')}
            className="text-blue-600 hover:text-blue-900 text-sm"
          >
            Renew
          </button>
          <button
            onClick={() => handleToggleWebhook(config.id, 'delete')}
            className="text-red-600 hover:text-red-900 text-sm"
          >
            Delete
          </button>
        </div>
      );
    }
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
            You must be an Administrator to access email-to-ticket management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Email to Ticket Management</h1>
        <button
          onClick={() => {
            setEditingConfig(null);
            setShowConfigModal(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Add Email Configuration
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Processed</div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalProcessed}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Success Rate</div>
                <div className="text-2xl font-bold text-gray-900">{stats.successRate}%</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Tickets Created</div>
                <div className="text-2xl font-bold text-gray-900">{stats.actions.ticketsCreated}</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Comments Added</div>
                <div className="text-2xl font-bold text-gray-900">{stats.actions.commentsAdded}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configurations
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Processing History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Email Configurations</h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading configurations...</p>
              </div>
            ) : configurations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No email configurations found.</p>
                <button
                  onClick={() => setShowConfigModal(true)}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add First Configuration
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Defaults
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Webhook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {configurations.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{config.emailAddress}</div>
                        {config.subjectPrefix && (
                          <div className="text-sm text-gray-500">Prefix: {config.subjectPrefix}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(config)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {config.defaultTicketType} / {config.defaultTicketPriority}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {config.webhookExpirationDateTime && (
                          <div className="text-sm text-gray-500">
                            Expires: {new Date(config.webhookExpirationDateTime).toLocaleDateString()}
                          </div>
                        )}
                        {getWebhookActions(config)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditConfiguration(config)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteConfiguration(config.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && <EmailProcessingHistory />}

      {/* Configuration Modal */}
      <EmailConfigurationModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setEditingConfig(null);
        }}
        configuration={editingConfig}
        onSave={handleSaveConfiguration}
      />
    </div>
  );
};

export default EmailToTicketDashboard;