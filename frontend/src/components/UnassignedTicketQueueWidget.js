import React from 'react';
import TicketQueueWidget from './TicketQueueWidget';

const UnassignedTicketQueueWidget = ({ onOpenTicketProfile }) => {
    return (
        <TicketQueueWidget
            queueType="unassigned"
            title="Unassigned Tickets"
            onOpenTicketProfile={onOpenTicketProfile}
            showStats={false}
            showAssignmentActions={true}
            showBulkActions={true}
            customFilters={{
                // Default filters for unassigned queue
                status: 'open'
            }}
        />
    );
};

export default UnassignedTicketQueueWidget;