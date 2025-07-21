import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailConfigurationModal from './EmailConfigurationModal';
import EmailProcessingHistory from './EmailProcessingHistory';

const EmailToTicketConfigModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [configurations, setConfigurations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Webhook Monitor state
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState(null);
  const [lastWebhookAction, setLastWebhookAction] = useState(null);

  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchConfigurations();
      fetchStats();
      if (activeTab === 'monitoring') {
        fetchWebhookStatus();
      }
    }
  }, [isOpen, isAdmin, activeTab]);

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
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/stats`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDeleteConfiguration = async (id) => {
    if (!window.confirm('Are you sure you want to delete this email configuration? This will also delete any associated webhook subscriptions.')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchConfigurations();
        await fetchStats();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      setError('Failed to delete configuration');
    }
  };

  const handleCreateWebhook = async (configId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${configId}/webhook`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchConfigurations();
        alert('Webhook subscription created successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to create webhook: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Failed to create webhook subscription');
    }
  };

  const handleDeleteWebhook = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this webhook subscription?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${configId}/webhook`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchConfigurations();
        alert('Webhook subscription deleted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete webhook: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting webhook:', error);
      alert('Failed to delete webhook subscription');
    }
  };

  // Webhook Monitor functions
  const fetchWebhookStatus = async () => {
    try {
      setWebhookLoading(true);
      setWebhookError(null);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/webhook-monitor/status`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setWebhookStatus(data.status);
    } catch (error) {
      console.error('Error fetching webhook monitor status:', error);
      setWebhookError(error.message);
    } finally {
      setWebhookLoading(false);
    }
  };

  const runWebhookHealthCheck = async () => {
    try {
      setWebhookLoading(true);
      setWebhookError(null);
      setLastWebhookAction('Running health check...');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/webhook-monitor/check`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLastWebhookAction(`Health check completed: ${data.results.recreated} recreated, ${data.results.failed} failed`);
      
      // Refresh configurations and webhook status
      await fetchConfigurations();
      await fetchWebhookStatus();
    } catch (error) {
      console.error('Error running health check:', error);
      setWebhookError(error.message);
      setLastWebhookAction('Health check failed');
    } finally {
      setWebhookLoading(false);
    }
  };

  const forceRecreateAllWebhooks = async () => {
    if (!window.confirm('This will recreate ALL webhook subscriptions. Are you sure?')) {
      return;
    }

    try {
      setWebhookLoading(true);
      setWebhookError(null);
      setLastWebhookAction('Force recreating all webhooks...');

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/webhook-monitor/force-recreate`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setLastWebhookAction(`Force recreation completed: ${data.results.recreated} recreated, ${data.results.failed} failed`);
      
      // Refresh configurations and webhook status
      await fetchConfigurations();
      await fetchWebhookStatus();
    } catch (error) {
      console.error('Error force recreating webhooks:', error);
      setWebhookError(error.message);
      setLastWebhookAction('Force recreation failed');
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleConfigurationSaved = () => {
    setShowConfigModal(false);
    setEditingConfig(null);
    fetchConfigurations();
    fetchStats();
  };

  if (!isOpen) return null;

  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mb-4">You need Administrator privileges to access email-to-ticket configuration.</p>
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 my-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Email-to-Ticket Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview & Configuration
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Processing History
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'monitoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Webhook Monitor
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="text-red-800">{error}</div>
                  </div>
                )}

                {/* Stats Overview */}
                {stats && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics (Last {stats.period})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.totalProcessed}</div>
                        <div className="text-sm text-gray-600">Total Processed</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.totalSuccessful}</div>
                        <div className="text-sm text-gray-600">Successful</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
                        <div className="text-sm text-gray-600">Failed</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
                        <div className="text-sm text-gray-600">Success Rate</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Actions Taken</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-lg font-semibold text-blue-600">{stats.actions.ticketsCreated}</div>
                          <div className="text-xs text-gray-600">Tickets Created</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-lg font-semibold text-green-600">{stats.actions.commentsAdded}</div>
                          <div className="text-xs text-gray-600">Comments Added</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <div className="text-lg font-semibold text-orange-600">{stats.actions.ticketsReopened}</div>
                          <div className="text-xs text-gray-600">Tickets Reopened</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuration List */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Email Configurations</h3>
                    <button
                      onClick={() => setShowConfigModal(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Add Configuration
                    </button>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading configurations...</p>
                    </div>
                  ) : configurations.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No email configurations found.</p>
                      <p className="text-sm text-gray-500 mt-1">Create your first configuration to start converting emails to tickets.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {configurations.map((config) => (
                        <div key={config.id} className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-900">{config.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">Email: {config.emailAddress}</p>
                              <div className="flex items-center mt-2 space-x-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {config.isActive ? 'Active' : 'Inactive'}
                                </span>
                                {config.webhookSubscriptionId && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Webhook Active
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingConfig(config);
                                  setShowConfigModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                Edit
                              </button>
                              {config.webhookSubscriptionId ? (
                                <button
                                  onClick={() => handleDeleteWebhook(config.id)}
                                  className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                >
                                  Delete Webhook
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleCreateWebhook(config.id)}
                                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                                >
                                  Create Webhook
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteConfiguration(config.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <EmailProcessingHistory />
            )}

            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                {/* Webhook Monitor Content */}
                {webhookError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{webhookError}</p>
                  </div>
                )}

                {lastWebhookAction && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">{lastWebhookAction}</p>
                  </div>
                )}

                {webhookStatus && (
                  <div className="space-y-4">
                    {/* Service Status */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Webhook Monitor Service</h3>
                        <button
                          onClick={fetchWebhookStatus}
                          disabled={webhookLoading}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          {webhookLoading ? 'Loading...' : 'Refresh'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            webhookStatus.isRunning ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {webhookStatus.isRunning ? 'Running' : 'Stopped'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Schedule:</span>
                          <span className="ml-2 text-gray-900">{webhookStatus.schedule}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Last Run:</span>
                          <span className="ml-2 text-gray-900">
                            {webhookStatus.lastRunTime ? new Date(webhookStatus.lastRunTime).toLocaleString() : 'Never'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Next Run:</span>
                          <span className="ml-2 text-gray-900">
                            {webhookStatus.nextRunTime ? new Date(webhookStatus.nextRunTime).toLocaleString() : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Last Run Results */}
                    {webhookStatus.lastRunResults && (
                      <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Last Run Results</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-gray-900">{webhookStatus.lastRunResults.checked}</div>
                            <div className="text-gray-600">Checked</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-green-600">{webhookStatus.lastRunResults.healthy}</div>
                            <div className="text-gray-600">Healthy</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-blue-600">{webhookStatus.lastRunResults.renewed}</div>
                            <div className="text-gray-600">Renewed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-orange-600">{webhookStatus.lastRunResults.recreated}</div>
                            <div className="text-gray-600">Recreated</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-semibold text-red-600">{webhookStatus.lastRunResults.failed}</div>
                            <div className="text-gray-600">Failed</div>
                          </div>
                        </div>
                        {webhookStatus.lastRunResults.errors && webhookStatus.lastRunResults.errors.length > 0 && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs">
                            <strong>Errors:</strong>
                            <ul className="mt-2 list-disc list-inside">
                              {webhookStatus.lastRunResults.errors.map((error, index) => (
                                <li key={index} className="text-red-800">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Webhook Actions</h3>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={runWebhookHealthCheck}
                          disabled={webhookLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Run Health Check
                        </button>
                        
                        <button
                          onClick={forceRecreateAllWebhooks}
                          disabled={webhookLoading}
                          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                        >
                          🚨 Fix All Webhooks
                        </button>
                      </div>
                      
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">About Webhook Monitor</h4>
                        <p className="text-sm text-blue-800">
                          The webhook monitor automatically checks Microsoft Graph webhook subscriptions every 6 hours. 
                          It will renew expiring subscriptions or recreate missing ones to ensure continuous email processing.
                        </p>
                        <p className="text-sm text-blue-800 mt-2">
                          <strong>🚨 Fix All Webhooks:</strong> Use this button if emails are not being processed. 
                          It will recreate all webhook subscriptions immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!webhookStatus && !webhookLoading && !webhookError && (
                  <div className="text-center py-8">
                    <button
                      onClick={fetchWebhookStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Load Webhook Monitor Status
                    </button>
                  </div>
                )}

                {webhookLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading webhook monitor status...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Configuration Modal */}
      {showConfigModal && (
        <EmailConfigurationModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setEditingConfig(null);
          }}
          onSave={handleConfigurationSaved}
          configuration={editingConfig}
        />
      )}
    </div>
  );
};

export default EmailToTicketConfigModal;