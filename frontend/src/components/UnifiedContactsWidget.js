import React, { useMemo, useCallback } from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedContactsWidget = ({ onOpenContactProfile }) => {
    // Memoize the render function to prevent unnecessary re-renders
    const contactNameRenderer = useCallback((value, item, onOpenProfile) => (
        <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                <span className="text-xs font-medium text-blue-600">
                    {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
                </span>
            </div>
            <div>
                <div 
                    className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                    onClick={() => onOpenProfile && onOpenProfile(item.id)}
                >
                    {item.firstName} {item.lastName}
                </div>
                <div className="text-xs text-gray-500">
                    {item.companyName || 'No Company'}
                </div>
            </div>
        </div>
    ), []);

    // Memoize the config to prevent unnecessary re-renders
    const memoizedConfig = useMemo(() => ({
        ...entityConfigs.contacts,
        fields: {
            ...entityConfigs.contacts.fields,
            display: entityConfigs.contacts.fields.display.map(field => 
                field.name === 'name' 
                    ? { ...field, render: contactNameRenderer }
                    : field
            )
        }
    }), [contactNameRenderer]);

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
            config={memoizedConfig}
            onOpenProfile={onOpenContactProfile}
            onCustomAction={handleCustomAction}
        />
    );
};

export default UnifiedContactsWidget;