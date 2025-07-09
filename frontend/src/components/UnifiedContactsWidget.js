import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedContactsWidget = ({ onOpenContactProfile }) => {
    const handleCustomAction = (actionKey, contactId) => {
        switch (actionKey) {
            case 'startLead':
                console.log('Start Lead for contact:', contactId);
                // TODO: Implement start lead functionality
                break;
            case 'startOpportunity':
                console.log('Start Opportunity for contact:', contactId);
                // TODO: Implement start opportunity functionality
                break;
            case 'startSale':
                console.log('Start Sale for contact:', contactId);
                // TODO: Implement start sale functionality
                break;
            default:
                console.log('Unknown action:', actionKey, contactId);
        }
    };

    return (
        <EntityWidget
            config={entityConfigs.contacts}
            onOpenProfile={onOpenContactProfile}
            onCustomAction={handleCustomAction}
        />
    );
};

export default UnifiedContactsWidget;