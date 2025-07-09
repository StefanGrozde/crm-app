import React from 'react';

const AddWidgetModal = ({ availableWidgets, onAddWidget, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">Add a Widget</h2>
                
                {availableWidgets.length > 0 ? (
                    <div className="space-y-2">
                        {availableWidgets.map((widget) => (
                            <button
                                key={widget.key}
                                onClick={() => onAddWidget(widget.key)}
                                className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                            >
                                {widget.name}
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">All available widgets have been added.</p>
                )}
                
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded text-gray-700 bg-gray-200">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWidgetModal;