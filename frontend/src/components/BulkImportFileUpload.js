import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, X, CheckCircle, File } from 'lucide-react';

const BulkImportFileUpload = ({ onUploadComplete }) => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const error = rejection.errors[0];
      
      let errorMessage = 'File upload failed';
      if (error.code === 'file-too-large') {
        errorMessage = 'File size must be less than 10MB';
      } else if (error.code === 'file-invalid-type') {
        errorMessage = 'Only CSV and Excel files are supported';
      } else {
        errorMessage = error.message || 'Invalid file';
      }
      
      setErrorMessage(errorMessage);
      setUploadStatus('error');
      return;
    }

    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      handleUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const handleUpload = async (file) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bulk-import/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        setUploadProgress(100);
        
        // Call parent callback with upload result
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error.message || 'Upload failed. Please try again.');
    }
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    if (extension === 'csv') {
      return <FileText className="text-green-500" size={24} />;
    } else if (extension === 'xlsx' || extension === 'xls') {
      return <File className="text-blue-500" size={24} />;
    }
    return <File className="text-gray-500" size={24} />;
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Area */}
      {uploadStatus === 'idle' && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse and select a file
          </p>
          <div className="flex justify-center space-x-4 text-xs text-gray-400">
            <span>• CSV files</span>
            <span>• Excel files (.xlsx, .xls)</span>
            <span>• Max 10MB</span>
          </div>
        </div>
      )}

      {/* File Selected */}
      {selectedFile && uploadStatus !== 'idle' && (
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile.name)}
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {uploadStatus === 'success' && (
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-500" size={20} />
                <span className="text-sm text-green-600 font-medium">Upload Complete</span>
              </div>
            )}
            {uploadStatus === 'error' && (
              <button
                onClick={handleRemoveFile}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {uploadStatus === 'uploading' && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading and processing...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === 'error' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-2" size={16} />
                <span className="text-sm text-red-700">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {uploadStatus === 'error' && (
            <div className="flex space-x-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retry Upload
              </button>
              <button
                onClick={handleRemoveFile}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Remove File
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">File Requirements:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Maximum 10,000 rows</li>
          <li>• First row should contain column headers</li>
          <li>• Include at least one of: First Name, Last Name, or Email</li>
        </ul>
      </div>

      {/* Sample Data Format */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-2">Sample Data Format:</h3>
        <div className="text-xs text-gray-700 font-mono bg-white p-2 rounded border overflow-x-auto">
          <div className="grid grid-cols-4 gap-2 min-w-max">
            <div className="font-bold">First Name</div>
            <div className="font-bold">Last Name</div>
            <div className="font-bold">Email</div>
            <div className="font-bold">Phone</div>
            <div>John</div>
            <div>Doe</div>
            <div>john.doe@example.com</div>
            <div>555-0123</div>
            <div>Jane</div>
            <div>Smith</div>
            <div>jane.smith@example.com</div>
            <div>555-0456</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportFileUpload;