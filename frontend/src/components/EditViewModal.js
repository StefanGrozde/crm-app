import React, { useState } from 'react';
import { AVAILABLE_COLORS } from '../utils/tabColors';

const EditViewModal = ({ 
    isOpen, 
    currentView, 
    onSave, 
    onClose 
}) => {
    const [formData, setFormData] = useState({
        name: currentView?.name || '',
        color: currentView?.color || 'blue'
    });

    // Update form data when currentView changes
    React.useEffect(() => {
        if (currentView) {
            setFormData({
                name: currentView.name || '',
                color: currentView.color || 'blue'
            });
        }
    }, [currentView]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleColorSelect = (color) => {
        setFormData(prev => ({
            ...prev,
            color: color
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.name.trim()) {
            onSave(formData);
        }
    };

    const handleCancel = () => {
        // Reset form data to original values
        if (currentView) {
            setFormData({
                name: currentView.name || '',
                color: currentView.color || 'blue'
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Edit View</h3>
                    <button
                        onClick={handleCancel}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* View Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            View Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter view name..."
                            required
                        />
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tab Color
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {AVAILABLE_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => handleColorSelect(color.value)}
                                    className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                                        color.class
                                    } ${
                                        formData.color === color.value
                                            ? 'border-gray-800 scale-110 shadow-lg'
                                            : 'border-gray-300 hover:scale-105'
                                    }`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Selected: {AVAILABLE_COLORS.find(c => c.value === formData.color)?.name || 'Blue'}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditViewModal; 