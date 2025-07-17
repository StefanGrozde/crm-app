import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';
import EmailToTicketConfigModal from './EmailToTicketConfigModal';
import { useAuth } from '../context/AuthContext';

const UnifiedTicketsWidget = ({ onOpenTicketProfile }) => {
    const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === 'Administrator';
    
    const handleCustomAction = (actionKey, ticketId) => {
        switch (actionKey) {
            case 'addComment':
                console.log('Add Comment for ticket:', ticketId);
                // TODO: Implement add comment functionality
                break;
            case 'resolve':
                console.log('Resolve ticket:', ticketId);
                // TODO: Implement resolve ticket functionality
                break;
            default:
                console.log('Unknown action:', actionKey, ticketId);
        }
    };

    return (
        <div className="h-full overflow-hidden">
            {/* Custom Header with Email Configuration Button for Admins */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Tickets</h2>
                {isAdmin && (
                    <button
                        onClick={() => setShowEmailConfigModal(true)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 flex items-center space-x-1"
                        title="Configure Email-to-Ticket"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Email Config</span>
                    </button>
                )}
            </div>

            {/* Entity Widget without its own header */}
            <div className="h-full">
                <EntityWidget
                    config={{
                        ...entityConfigs.tickets,
                        hideHeader: true // We'll add this feature to hide the default header
                    }}
                    onOpenProfile={onOpenTicketProfile}
                    onCustomAction={handleCustomAction}
                />
            </div>

            {/* Email Configuration Modal - Rendered via Portal */}
            {showEmailConfigModal && createPortal(
                <EmailToTicketConfigModal
                    isOpen={showEmailConfigModal}
                    onClose={() => setShowEmailConfigModal(false)}
                />,
                document.body
            )}
        </div>
    );
};

export default UnifiedTicketsWidget;