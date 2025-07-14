import React, { useState } from 'react';
import TicketQueueDashboard from '../components/TicketQueueDashboard';
import TicketProfileWidget from '../components/TicketProfileWidget';

const TicketQueues = () => {
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    const handleOpenTicketProfile = (ticketId) => {
        setSelectedTicketId(ticketId);
    };

    const handleCloseTicketProfile = () => {
        setSelectedTicketId(null);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Ticket Queues</h1>
                <p className="text-gray-600">Manage and organize your ticket workflow</p>
            </div>

            <TicketQueueDashboard onOpenTicketProfile={handleOpenTicketProfile} />

            {/* Ticket Profile Modal */}
            {selectedTicketId && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCloseTicketProfile}></div>
                        
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Ticket Details</h3>
                                    <button
                                        onClick={handleCloseTicketProfile}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <TicketProfileWidget
                                    ticketId={selectedTicketId}
                                    onClose={handleCloseTicketProfile}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicketQueues;