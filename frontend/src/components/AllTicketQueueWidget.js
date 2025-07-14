import React from 'react';
import TicketQueueWidget from './TicketQueueWidget';

const AllTicketQueueWidget = ({ onOpenTicketProfile }) => {
    return (
        <TicketQueueWidget
            queueType="all"
            title="All Tickets"
            onOpenTicketProfile={onOpenTicketProfile}
            showStats={true}
            showAssignmentActions={true}
            showBulkActions={true}
            customFilters={{
                // Default filters for all tickets
            }}
        />
    );
};

export default AllTicketQueueWidget;