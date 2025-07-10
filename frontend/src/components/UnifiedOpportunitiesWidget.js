import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedOpportunitiesWidget = ({ onOpenOpportunityProfile }) => {
    return (
        <EntityWidget
            config={entityConfigs.opportunities}
            onOpenProfile={onOpenOpportunityProfile}
        />
    );
};

export default UnifiedOpportunitiesWidget;