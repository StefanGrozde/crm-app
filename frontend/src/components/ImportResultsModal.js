import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, TrendingUp, Users, Clock, Download, RefreshCw, History } from 'lucide-react';

const ImportResultsModal = ({ isOpen, resultsData, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!isOpen || !resultsData) return null;

  const { import: importInfo, summary, actions, errors, successes, statistics } = resultsData;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'completed_with_errors':
        return 'text-orange-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'completed_with_errors':
        return <AlertCircle className="text-orange-500" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-500" size={20} />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getActionLabel = (action) => {
    const labels = {
      'created': 'Created',
      'updated': 'Updated',
      'merged': 'Merged',
      'skipped_duplicate': 'Skipped',
      'restored': 'Restored'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      'created': 'text-green-600',
      'updated': 'text-blue-600',
      'merged': 'text-purple-600',
      'skipped_duplicate': 'text-gray-600',
      'restored': 'text-orange-600'
    };
    return colors[action] || 'text-gray-600';
  };

  const getErrorTypeColor = (errorType) => {
    const colors = {
      'validation': 'text-orange-600',
      'duplicate': 'text-blue-600',
      'format': 'text-red-600',
      'required': 'text-red-600',
      'system': 'text-purple-600'
    };
    return colors[errorType] || 'text-gray-600';
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: TrendingUp },
    { id: 'successes', label: 'Successful', icon: CheckCircle },
    { id: 'errors', label: 'Errors', icon: AlertCircle },
    { id: 'statistics', label: 'Statistics', icon: Users }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Import Results</h2>
              <p className="text-blue-100 mt-1">{importInfo.originalFileName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {getStatusIcon(importInfo.status)}
                <span className={`ml-2 font-medium ${getStatusColor(importInfo.status)}`}>
                  {importInfo.status === 'completed' ? 'Completed' : 
                   importInfo.status === 'completed_with_errors' ? 'Completed with Errors' : 
                   'Failed'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent size={16} className="mr-2" />
                  {tab.label}
                  {tab.id === 'successes' && successes?.length > 0 && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {successes.length}
                    </span>
                  )}
                  {tab.id === 'errors' && errors?.records?.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      {errors.records.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{summary.successRate}%</div>
                  <div className="text-sm text-blue-700">Success Rate</div>
                </div>
              </div>

              {/* Import Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Import Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">File Name:</span>
                    <span className="ml-2 text-gray-900">{importInfo.originalFileName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Started:</span>
                    <span className="ml-2 text-gray-900">{formatDate(importInfo.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completed:</span>
                    <span className="ml-2 text-gray-900">{formatDate(importInfo.completedAt)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 text-gray-900">{formatDuration(importInfo.processingTimeMs)}</span>
                  </div>
                </div>
              </div>

              {/* Actions Summary */}
              {actions && actions.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Actions Performed</h3>
                  <div className="space-y-2">
                    {actions.map((action, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className={`font-medium ${getActionColor(action.actionTaken)}`}>
                          {getActionLabel(action.actionTaken)}
                        </span>
                        <span className="text-gray-600">{action.count} contacts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Progress</h3>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${summary.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{summary.processed} of {summary.total} processed</span>
                  <span>{summary.progressPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'successes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Successful Imports ({successes?.length || 0})</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  <Download size={16} className="inline mr-1" />
                  Export Success List
                </button>
              </div>
              
              {successes && successes.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {successes.map((success, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {success.rowNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {success.contact.firstName} {success.contact.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {success.contact.email}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              success.actionTaken === 'created' ? 'bg-green-100 text-green-800' :
                              success.actionTaken === 'updated' ? 'bg-blue-100 text-blue-800' :
                              success.actionTaken === 'merged' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {getActionLabel(success.actionTaken)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(success.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No successful imports to display</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Import Errors ({errors?.records?.length || 0})</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  <Download size={16} className="inline mr-1" />
                  Export Error List
                </button>
              </div>

              {/* Error Summary */}
              {errors?.summary && errors.summary.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Error Summary</h4>
                  <div className="space-y-2">
                    {errors.summary.map((error, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`font-medium ${getErrorTypeColor(error.errorType)}`}>
                            {error.errorType}
                          </span>
                          {error.fieldName && (
                            <span className="ml-2 text-gray-600">({error.fieldName})</span>
                          )}
                        </div>
                        <span className="text-gray-600">{error.count} occurrences</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {errors?.records && errors.records.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Row
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Error Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {errors.records.map((error, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {error.rowNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {error.fieldName || 'General'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              error.errorType === 'validation' ? 'bg-orange-100 text-orange-800' :
                              error.errorType === 'duplicate' ? 'bg-blue-100 text-blue-800' :
                              error.errorType === 'format' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {error.errorType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {error.errorMessage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No errors to display</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Field Statistics</h3>
              
              {statistics && statistics.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Values
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valid
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invalid
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Empty
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quality
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {statistics.map((stat, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {stat.fieldName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {stat.totalValues}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                            {stat.validValues}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                            {stat.invalidValues}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {stat.emptyValues}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${stat.validationRate}%` }}
                                ></div>
                              </div>
                              <span>{stat.validationRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No statistics available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium">
                <History size={16} className="mr-1" />
                View Import History
              </button>
              {importInfo.canRetry && (
                <button className="flex items-center text-green-600 hover:text-green-800 text-sm font-medium">
                  <RefreshCw size={16} className="mr-1" />
                  Retry Import
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportResultsModal;