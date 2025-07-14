import React from 'react';
import TicketQueueWidget from './TicketQueueWidget';

const ConfigurableTicketQueueWidget = ({ 
    onOpenTicketProfile, 
    widgetData = {} 
}) => {
    // Get queue configuration from widget data
    const queueType = widgetData.queueType || 'my';
    const customTitle = widgetData.title;
    
    // Queue type configurations
    const queueConfigs = {
        my: {
            title: 'My Tickets',
            showStats: true,
            showAssignmentActions: false,
            showBulkActions: true,
            customFilters: { status: 'open' }
        },
        unassigned: {
            title: 'Unassigned Tickets',
            showStats: false,
            showAssignmentActions: true,
            showBulkActions: true,
            customFilters: { status: 'open' }
        },
        team: {
            title: 'Team Tickets',
            showStats: false,
            showAssignmentActions: true,
            showBulkActions: true,
            customFilters: { status: 'open' }
        },
        all: {
            title: 'All Tickets',
            showStats: true,
            showAssignmentActions: true,
            showBulkActions: true,
            customFilters: {}
        }
    };

    const config = queueConfigs[queueType] || queueConfigs.my;

    return (
        <TicketQueueWidget
            queueType={queueType}
            title={customTitle || config.title}
            onOpenTicketProfile={onOpenTicketProfile}
            showStats={config.showStats}
            showAssignmentActions={config.showAssignmentActions}
            showBulkActions={config.showBulkActions}
            customFilters={config.customFilters}
        />
    );
};

export default ConfigurableTicketQueueWidget;