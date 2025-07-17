import React, { useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import EntityWidget from './EntityWidget';
import BulkImportModal from './BulkImportModal';
import ImportHistoryModal from './ImportHistoryModal';
import ImportResultsModal from './ImportResultsModal';
import { entityConfigs } from '../config/entityConfigs';

const UnifiedContactsWidget = ({ onOpenContactProfile }) => {
    console.log('UnifiedContactsWidget render');
    
    // Bulk import states
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [showImportHistoryModal, setShowImportHistoryModal] = useState(false);
    const [showImportResultsModal, setShowImportResultsModal] = useState(false);
    const [importResultsData, setImportResultsData] = useState(null);
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
    ), [onOpenContactProfile]);

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
        },
        // Add bulk import actions
        customActions: [
            ...(entityConfigs.contacts.customActions || []),
            {
                key: 'bulkImport',
                label: 'Bulk Import',
                icon: 'upload',
                variant: 'secondary',
                position: 'header'
            },
            {
                key: 'importHistory',
                label: 'Import History',
                icon: 'history',
                variant: 'secondary',
                position: 'header'
            }
        ]
    }), [contactNameRenderer]);

    const handleCustomAction = useCallback((actionKey, contactId) => {
        switch (actionKey) {
            case 'bulkImport':
                setShowBulkImportModal(true);
                break;
            case 'importHistory':
                setShowImportHistoryModal(true);
                break;
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
    }, []);

    // Handle bulk import related actions
    const handleBulkImportComplete = useCallback((importResults) => {
        setShowBulkImportModal(false);
        setImportResultsData(importResults);
        setShowImportResultsModal(true);
        // Optionally refresh the contacts list here
        // if EntityWidget exposed a refresh method
    }, []);

    const handleViewImportResults = useCallback(async (importId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bulk-import/${importId}/results`, {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    setImportResultsData(result.data);
                    setShowImportHistoryModal(false);
                    setShowImportResultsModal(true);
                }
            }
        } catch (error) {
            console.error('Error fetching import results:', error);
        }
    }, []);

    return (
        <>
            <EntityWidget
                config={memoizedConfig}
                onOpenProfile={onOpenContactProfile}
                onCustomAction={handleCustomAction}
            />
            
            {/* Bulk Import Modals */}
            {showBulkImportModal && createPortal(
                <BulkImportModal
                    isOpen={showBulkImportModal}
                    onClose={() => setShowBulkImportModal(false)}
                    onImportComplete={handleBulkImportComplete}
                />,
                document.body
            )}
            
            {showImportHistoryModal && createPortal(
                <ImportHistoryModal
                    isOpen={showImportHistoryModal}
                    onClose={() => setShowImportHistoryModal(false)}
                    onViewResults={handleViewImportResults}
                />,
                document.body
            )}
            
            {showImportResultsModal && createPortal(
                <ImportResultsModal
                    isOpen={showImportResultsModal}
                    resultsData={importResultsData}
                    onClose={() => setShowImportResultsModal(false)}
                />,
                document.body
            )}
        </>
    );
};

export default React.memo(UnifiedContactsWidget);