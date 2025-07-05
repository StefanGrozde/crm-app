import React, { useState } from 'react';

const UploadWidgetModal = ({ onUpload, onClose }) => {
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleUpload = () => {
        if (selectedFile) {
            onUpload(selectedFile);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
                <h2 className="text-xl font-bold mb-4">Upload New Widget</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Upload a bundled JavaScript file for a new widget.
                </p>
                <input
                    type="file"
                    accept=".js"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border rounded-md mb-4"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="mr-2 px-4 py-2 rounded text-gray-700 bg-gray-200">
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile}
                        className="px-4 py-2 rounded text-white bg-blue-600 disabled:bg-gray-400"
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadWidgetModal;