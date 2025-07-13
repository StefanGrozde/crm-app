import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedTicketsWidget = ({ onOpenTicketProfile }) => {
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
        <EntityWidget
            config={entityConfigs.tickets}
            onOpenProfile={onOpenTicketProfile}
            onCustomAction={handleCustomAction}
        />
    );
};

export default UnifiedTicketsWidget;