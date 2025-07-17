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

  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchConfigurations();
      fetchStats();
    }
  }, [isOpen, isAdmin]);

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