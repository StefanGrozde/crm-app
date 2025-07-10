import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedUsersWidget = ({ onOpenUserProfile }) => {
    return (
        <EntityWidget
            config={entityConfigs.users}
            onOpenProfile={onOpenUserProfile}
        />
    );
};

export default UnifiedUsersWidget;