import React from 'react';
import EntityWidget from './EntityWidget';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedCompaniesWidget = ({ onOpenCompanyProfile }) => {
    return (
        <EntityWidget
            config={entityConfigs.companies}
            onOpenProfile={onOpenCompanyProfile}
        />
    );
};

export default UnifiedCompaniesWidget;