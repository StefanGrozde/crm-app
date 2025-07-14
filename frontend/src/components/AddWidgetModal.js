import React from 'react';

const AddWidgetModal = ({ availableWidgets, onAddWidget, onConfigureWidget, onClose }) => {
    const handleWidgetClick = (widget) => {
        // Check if widget is configurable
        if (widget.key === 'configurable-ticket-queue-widget') {
            onConfigureWidget(widget.key);
        } else {
            onAddWidget(widget.key);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Add a Widget</h2>
                
                {availableWidgets.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableWidgets.map((widget) => (
                            <button
                                key={widget.key}
                                onClick={() => handleWidgetClick(widget)}
                                className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-md border transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-medium text-gray-900">{widget.name}</div>
                                        {widget.description && (
                                            <div className="text-sm text-gray-500 mt-1">{widget.description}</div>
                                        )}
                                    </div>
                                    {widget.key === 'configurable-ticket-queue-widget' && (
                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                                            Configure
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">All available widgets have been added.</p>
                )}
                
                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-4 py-2 rounded text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddWidgetModal;