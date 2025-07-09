import React, { useState } from 'react';
import { AVAILABLE_COLORS } from '../utils/tabColors';

const TabColorPicker = ({ 
    currentColor = 'blue', 
    onColorChange, 
    onClose, 
    isOpen = false 
}) => {
    const [selectedColor, setSelectedColor] = useState(currentColor);

    const handleColorSelect = (color) => {
        setSelectedColor(color);
        if (onColorChange) {
            onColorChange(color);
        }
    };

    const handleSave = () => {
        if (onColorChange) {
            onColorChange(selectedColor);
        }
        if (onClose) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-80 max-w-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Choose Tab Color</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-3">Select a color for this tab:</p>
                    <div className="grid grid-cols-5 gap-2">
                        {AVAILABLE_COLORS.map((color) => (
                            <button
                                key={color.value}
                                onClick={() => handleColorSelect(color.value)}
                                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                                    color.class
                                } ${
                                    selectedColor === color.value
                                        ? 'border-gray-800 scale-110 shadow-lg'
                                        : 'border-gray-300 hover:scale-105'
                                }`}
                                title={color.name}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Current:</span>
                        <div className={`w-4 h-4 rounded-full ${AVAILABLE_COLORS.find(c => c.value === currentColor)?.class || 'bg-blue-500'}`} />
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TabColorPicker; 