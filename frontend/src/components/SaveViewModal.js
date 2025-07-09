import React, { useState } from 'react';

const SaveViewModal = ({ onSave, onClose }) => {
    const [viewName, setViewName] = useState('');

    const handleSave = () => {
        if (viewName) {
            onSave(viewName);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl">
                <h2 className="text-xl font-bold mb-4">Save Dashboard View</h2>
                <input
                    type="text"
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    placeholder="Enter view name..."
                    className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="mr-2 px-4 py-2 rounded text-gray-700 bg-gray-200">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded text-white bg-blue-600">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveViewModal;