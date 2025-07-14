import React from 'react';
import TicketQueueWidget from './TicketQueueWidget';

const MyTicketQueueWidget = ({ onOpenTicketProfile }) => {
    return (
        <TicketQueueWidget
            queueType="my"
            title="My Tickets"
            onOpenTicketProfile={onOpenTicketProfile}
            showStats={true}
            showAssignmentActions={false}
            showBulkActions={true}
            customFilters={{
                // Default filters for my queue
                status: 'open'
            }}
        />
    );
};

export default MyTicketQueueWidget;