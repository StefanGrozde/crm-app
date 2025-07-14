import React, { useState, useEffect } from 'react';

const TicketQueueConfigModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialConfig = {} 
}) => {
    const [config, setConfig] = useState({
        queueType: 'my',
        title: '',
        ...initialConfig
    });

    useEffect(() => {
        if (isOpen) {
            setConfig({
                queueType: 'my',
                title: '',
                ...initialConfig
            });
        }
    }, [isOpen, initialConfig]);

    const queueOptions = [
        { value: 'my', label: 'My Tickets', description: 'Tickets assigned to me' },
        { value: 'unassigned', label: 'Unassigned Tickets', description: 'Tickets without assignee' },
        { value: 'team', label: 'Team Tickets', description: 'Tickets assigned to team members' },
        { value: 'all', label: 'All Tickets', description: 'All tickets in the system' }
    ];

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    const handleQueueTypeChange = (queueType) => {
        const queueOption = queueOptions.find(opt => opt.value === queueType);
        setConfig(prev => ({
            ...prev,
            queueType,
            // Auto-set title if not manually edited
            title: prev.title === '' ? queueOption.label : prev.title
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
                
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="w-full">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    Configure Ticket Queue Widget
                                </h3>
                                
                                {/* Queue Type Selection */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Queue Type
                                    </label>
                                    <div className="space-y-2">
                                        {queueOptions.map(option => (
                                            <div key={option.value} className="flex items-start">
                                                <input
                                                    type="radio"
                                                    id={`queue-${option.value}`}
                                                    name="queueType"
                                                    value={option.value}
                                                    checked={config.queueType === option.value}
                                                    onChange={(e) => handleQueueTypeChange(e.target.value)}
                                                    className="mt-1 mr-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <label htmlFor={`queue-${option.value}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                                                        {option.label}
                                                    </label>
                                                    <p className="text-xs text-gray-500">{option.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Title */}
                                <div className="mb-4">
                                    <label htmlFor="widget-title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Widget Title (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        id="widget-title"
                                        value={config.title}
                                        onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder={queueOptions.find(opt => opt.value === config.queueType)?.label || 'Widget Title'}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty to use default title</p>
                                </div>

                                {/* Preview */}
                                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Preview:</h4>
                                    <div className="text-sm text-gray-600">
                                        <strong>Title:</strong> {config.title || queueOptions.find(opt => opt.value === config.queueType)?.label}
                                        <br />
                                        <strong>Type:</strong> {queueOptions.find(opt => opt.value === config.queueType)?.description}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSave}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Save Configuration
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TicketQueueConfigModal;