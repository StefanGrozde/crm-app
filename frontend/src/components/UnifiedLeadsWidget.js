import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedLeadsWidget = ({ onOpenLeadProfile }) => {
    return (
        <EntityWidget
            config={entityConfigs.leads}
            onOpenProfile={onOpenLeadProfile}
        />
    );
};

export default UnifiedLeadsWidget;