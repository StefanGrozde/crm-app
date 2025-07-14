import React from 'react';
import TicketQueueWidget from './TicketQueueWidget';

const TeamTicketQueueWidget = ({ onOpenTicketProfile }) => {
    return (
        <TicketQueueWidget
            queueType="team"
            title="Team Tickets"
            onOpenTicketProfile={onOpenTicketProfile}
            showStats={false}
            showAssignmentActions={true}
            showBulkActions={true}
            customFilters={{
                // Default filters for team queue
                status: 'open'
            }}
        />
    );
};

export default TeamTicketQueueWidget;