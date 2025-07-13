import React, { useState } from 'react';
import UnifiedTicketsWidget from '../components/UnifiedTicketsWidget';
import TicketProfileWidget from '../components/TicketProfileWidget';

const Tickets = () => {
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    const handleOpenTicketProfile = (ticketId) => {
        setSelectedTicketId(ticketId);
        setShowProfile(true);
    };

    const handleCloseProfile = () => {
        setShowProfile(false);
        setSelectedTicketId(null);
    };

    if (showProfile && selectedTicketId) {
        return (
            <div className="h-screen flex flex-col">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={handleCloseProfile}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Tickets
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900">Ticket Details</h1>
                    <div></div>
                </div>

                {/* Profile Content */}
                <div className="flex-1 overflow-auto">
                    <TicketProfileWidget ticketId={selectedTicketId} />
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
                <p className="text-gray-600">Track and manage support tickets</p>
            </div>

            {/* Widget Content */}
            <div className="flex-1 overflow-auto p-6">
                <UnifiedTicketsWidget onOpenTicketProfile={handleOpenTicketProfile} />
            </div>
        </div>
    );
};

export default Tickets;