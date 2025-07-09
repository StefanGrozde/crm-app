import React, { useState } from 'react';

const UploadWidgetModal = ({ onUpload, onClose }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        setUploadError(''); // Clear any previous errors
        
        // Validate file type
        if (file && !file.name.endsWith('.js')) {
            setUploadError('Please select a JavaScript (.js) file');
            setSelectedFile(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('widget', selectedFile);

            const response = await fetch('/api/widgets/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include', // Include cookies for auth
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Upload failed');
            }

            const result = await response.json();
            
            // Call the onUpload callback with success info
            if (onUpload) {
                onUpload({
                    success: true,
                    fileName: result.fileName,
                    message: result.message
                });
            }
            
            // Close modal on success
            onClose();
            
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload widget');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h2 className="text-xl font-bold mb-4">Upload New Widget</h2>
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                        Upload a bundled JavaScript file for a new widget.
                    </p>
                    <p className="text-xs text-gray-500">
                        The widget should export a React component as default export.
                    </p>
                </div>
                
                <input
                    type="file"
                    accept=".js,application/javascript,text/javascript"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border rounded-md mb-4"
                    disabled={isUploading}
                />
                
                {uploadError && (
                    <div className="text-red-600 text-sm mb-4 p-2 bg-red-50 rounded">
                        {uploadError}
                    </div>
                )}
                
                {selectedFile && (
                    <div className="text-sm text-gray-600 mb-4">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                )}
                
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={onClose} 
                        className="mr-2 px-4 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300"
                        disabled={isUploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isUploading}
                        className="px-4 py-2 rounded text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadWidgetModal;