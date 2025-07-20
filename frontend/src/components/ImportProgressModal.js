import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertCircle, Loader, TrendingUp } from 'lucide-react';

const ImportProgressModal = ({ isOpen, importId, onComplete, onClose }) => {
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [userClosed, setUserClosed] = useState(false);

  useEffect(() => {
    if (isOpen && importId) {
      setStartTime(Date.now());
      setUserClosed(false); // Reset the flag when modal opens
      startPolling();
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isOpen, importId]);

  const startPolling = () => {
    // Initial fetch
    fetchProgress();
    
    // Poll every 2 seconds
    const interval = setInterval(() => {
      fetchProgress();
    }, 2000);
    
    setPollingInterval(interval);
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bulk-import/${importId}/progress`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setProgress(result.data);
        setError(null);
        
        // Check if import is complete
        if (result.data.status === 'completed' || result.data.status === 'completed_with_errors' || result.data.status === 'failed') {
          // Stop polling
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          // Fetch final results
          if (result.data.status !== 'failed') {
            fetchFinalResults();
          }
        }
      } else {
        throw new Error(result.message || 'Failed to fetch progress');
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      setError(error.message);
    }
  };

  const fetchFinalResults = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bulk-import/${importId}/results`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Delay to show completion state, but only call onComplete if user hasn't closed the modal
        setTimeout(() => {
          if (!userClosed) {
            onComplete(result.data);
          }
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching final results:', error);
      setError(error.message);
    }
  };

  const handleClose = () => {
    setUserClosed(true);
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    onClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
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
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'processing':
        return <Loader className="text-blue-500 animate-spin" size={20} />;
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

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Waiting to start...';
      case 'processing':
        return 'Processing contacts...';
      case 'completed':
        return 'Import completed successfully!';
      case 'completed_with_errors':
        return 'Import completed with some errors';
      case 'failed':
        return 'Import failed';
      default:
        return 'Unknown status';
    }
  };

  const formatElapsedTime = () => {
    if (!startTime) return '';
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getEstimatedTimeRemaining = () => {
    if (!progress || !progress.processedRows || !progress.totalRows) return null;
    
    const processedPercentage = (progress.processedRows / progress.totalRows) * 100;
    const elapsedTime = Date.now() - startTime;
    
    if (processedPercentage > 0) {
      const totalEstimatedTime = (elapsedTime / processedPercentage) * 100;
      const remaining = totalEstimatedTime - elapsedTime;
      
      if (remaining > 0) {
        const remainingSeconds = Math.floor(remaining / 1000);
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        
        if (remainingMinutes > 0) {
          return `~${remainingMinutes}m ${remainingSeconds % 60}s remaining`;
        }
        return `~${remainingSeconds}s remaining`;
      }
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Import Progress</h2>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : progress ? (
            <div className="space-y-6">
              {/* Status */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  {getStatusIcon(progress.status)}
                  <span className={`ml-2 text-lg font-medium ${getStatusColor(progress.status)}`}>
                    {getStatusText(progress.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {progress.fileName}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{progress.progressPercentage || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progressPercentage || 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.processedRows || 0}
                  </div>
                  <div className="text-sm text-gray-600">Processed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {progress.totalRows || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>

              {/* Results Preview */}
              {progress.status === 'processing' && progress.successfulRows > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-600">
                      {progress.successfulRows || 0}
                    </div>
                    <div className="text-sm text-green-700">Successful</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-600">
                      {progress.errorRows || 0}
                    </div>
                    <div className="text-sm text-red-700">Errors</div>
                  </div>
                </div>
              )}

              {/* Time Information */}
              <div className="text-center text-sm text-gray-600">
                <div className="flex items-center justify-center space-x-4">
                  <div className="flex items-center">
                    <Clock size={14} className="mr-1" />
                    <span>Elapsed: {formatElapsedTime()}</span>
                  </div>
                  {getEstimatedTimeRemaining() && (
                    <div className="flex items-center">
                      <TrendingUp size={14} className="mr-1" />
                      <span>{getEstimatedTimeRemaining()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion Message */}
              {(progress.status === 'completed' || progress.status === 'completed_with_errors') && (
                <div className="text-center bg-green-50 rounded-lg p-4">
                  <CheckCircle className="mx-auto mb-2 text-green-500" size={32} />
                  <p className="text-green-800 font-medium">
                    Import completed successfully!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Processing results...
                  </p>
                </div>
              )}

              {/* Failure Message */}
              {progress.status === 'failed' && (
                <div className="text-center bg-red-50 rounded-lg p-4">
                  <AlertCircle className="mx-auto mb-2 text-red-500" size={32} />
                  <p className="text-red-800 font-medium">
                    Import failed
                  </p>
                  {progress.errorMessage && (
                    <p className="text-sm text-red-700 mt-1">
                      {progress.errorMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading progress...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {progress && progress.status === 'failed' && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              {progress.canRetry && (
                <button
                  onClick={() => {
                    // TODO: Implement retry functionality
                    console.log('Retry import');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Retry Import
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProgressModal;