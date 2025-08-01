import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
import SearchResultWidget from './SearchResultWidget';
import { getProfileProps } from '../utils/profileConfig';
// Legacy widgets for backward compatibility
import ContactsWidget from './ContactsWidget';
import LeadsWidget from './LeadsWidget';
import OpportunitiesWidget from './OpportunitiesWidget';
import CompaniesWidget from './CompaniesWidget';
import UsersWidget from './UsersWidget';
// Unified widgets (preferred)
import UnifiedContactsWidget from './UnifiedContactsWidget';
import UnifiedLeadsWidget from './UnifiedLeadsWidget';
import UnifiedOpportunitiesWidget from './UnifiedOpportunitiesWidget';
import UnifiedUsersWidget from './UnifiedUsersWidget';
// Profile widgets
import ContactProfileWidget from './ContactProfileWidget';
import LeadProfileWidget from './LeadProfileWidget';
import OpportunityProfileWidget from './OpportunityProfileWidget';
import BusinessProfileWidget from './BusinessProfileWidget';
import UserProfileWidget from './UserProfileWidget';
// Other widgets
import BusinessWidget from './BusinessWidget';
import InvitationsWidget from './InvitationsWidget';
import LeadConversionWidget from './LeadConversionWidget';
import MyViewsWidget from './MyViewsWidget';
import SalesWidget from './SalesWidget';
import SalesProfileWidget from './SalesProfileWidget';
import TasksWidget from './TasksWidget';
import TaskProfileWidget from './TaskProfileWidget';
import UnifiedTicketsWidget from './UnifiedTicketsWidget';
import TicketProfileWidget from './TicketProfileWidget';
// Ticket Queue Widgets
import TicketQueueDashboard from './TicketQueueDashboard';
import ConfigurableTicketQueueWidget from './ConfigurableTicketQueueWidget';

// Widget Registry - Central place to register all widgets
const WidgetRegistry = {
    // Unified widgets (preferred) - configuration-driven
    'contacts-widget': UnifiedContactsWidget,
    'leads-widget': UnifiedLeadsWidget,
    'opportunities-widget': UnifiedOpportunitiesWidget,
    'users-widget': UnifiedUsersWidget,
    
    // Legacy widgets (for backward compatibility)
    'legacy-contacts-widget': ContactsWidget,
    'legacy-leads-widget': LeadsWidget,
    'legacy-opportunities-widget': OpportunitiesWidget,
    'legacy-companies-widget': CompaniesWidget,
    'legacy-users-widget': UsersWidget,
    
    // Profile widgets (unchanged)
    'contact-profile-widget': ContactProfileWidget,
    'lead-profile-widget': LeadProfileWidget,
    'opportunity-profile-widget': OpportunityProfileWidget,
    'business-profile-widget': BusinessProfileWidget,
    'user-profile-widget': UserProfileWidget,
    
    // Other widgets (unchanged)
    'search-result-widget': SearchResultWidget,
    'business-widget': BusinessWidget,
    'invitations-widget': InvitationsWidget,
    'lead-conversion': LeadConversionWidget,
    'my-views-widget': MyViewsWidget,
    'sales-widget': SalesWidget,
    'sales-profile-widget': SalesProfileWidget,
    'tasks-widget': TasksWidget,
    'task-profile-widget': TaskProfileWidget,
    'tickets-widget': UnifiedTicketsWidget,
    'ticket-profile-widget': TicketProfileWidget,
    
    // Ticket Queue Widgets
    'ticket-queue-dashboard-widget': TicketQueueDashboard,
    'configurable-ticket-queue-widget': ConfigurableTicketQueueWidget
};

// Dynamic widget loader for external widgets
const ExternalWidgetLoader = memo(({ widgetKey, widgetPath, type, onLoad, onError }) => {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        
        const loadWidget = async () => {
            try {
                setLoading(true);
                setError(null);
                
                if (type === 'uploaded') {
                    // For uploaded widgets, load via script tag
                    await loadScriptWidget(widgetKey, widgetPath);
                } else if (type === 'builtin') {
                    // For built-in widgets, fetch and load as module
                    await loadBuiltinWidget(widgetKey, widgetPath);
                }
                
                if (isMounted) {
                    setLoading(false);
                    // Call onLoad when widget is successfully loaded
                    if (onLoad) {
                        onLoad();
                    }
                }
            } catch (err) {
                console.error('Error loading widget:', err);
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                    // Call onError when widget fails to load
                    if (onError) {
                        onError(err.message);
                    }
                }
            }
        };

        loadWidget();
        
        return () => {
            isMounted = false;
        };
    }, [widgetKey, widgetPath, type, onLoad, onError]);

    const loadScriptWidget = (key, path) => {
        return new Promise((resolve, reject) => {
            // Initialize global container if needed
            if (!window.UploadedWidgets) {
                window.UploadedWidgets = {};
            }
            
            const script = document.createElement('script');
            script.src = path;
            script.async = true;
            
            script.onload = () => {
                if (window.UploadedWidgets && window.UploadedWidgets[key]) {
                    setComponent(() => window.UploadedWidgets[key]);
                    resolve();
                } else {
                    reject(new Error(`Widget ${key} not found in global scope`));
                }
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load widget script: ${path}`));
            };
            
            document.body.appendChild(script);
        });
    };

    const loadBuiltinWidget = async (key, path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch widget: ${response.status}`);
            }
            
            const widgetCode = await response.text();
            
            // Create a blob URL for the widget code
            const blob = new Blob([widgetCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            
            // Load the widget as a module
            const module = await import(blobUrl);
            
            // Cleanup blob URL
            URL.revokeObjectURL(blobUrl);
            
            // Set the component (assuming default export)
            setComponent(() => module.default);
        } catch (error) {
            throw new Error(`Failed to load builtin widget: ${error.message}`);
        }
    };

    if (loading) {
        // Don't show loading state here - let WidgetRenderer handle it
        return null;
    }
    
    if (error) {
        return (
            <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                <div className="font-medium">Widget Error</div>
                <div className="text-sm">{error}</div>
            </div>
        );
    }
    
    if (!Component) {
        return (
            <div className="p-4 text-yellow-500 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="font-medium">Widget Not Found</div>
                <div className="text-sm">Widget component could not be loaded</div>
            </div>
        );
    }

    return <Component />;
});

// Main DynamicWidget component
const DynamicWidget = memo(({ widgetKey, widgetPath, type, resultData, widgetData, onLoad, onError, widgetState, showLoadingSpinner, loadingSpinnerSize, onOpenContactProfile, onOpenLeadProfile, onOpenOpportunityProfile, onOpenBusinessProfile, onOpenUserProfile, onOpenSaleProfile, onOpenTaskProfile, onOpenTicketProfile, ...props }) => {
    // Memoize the widget key to prevent unnecessary re-renders
    const memoizedWidgetKey = useMemo(() => widgetKey, [widgetKey]);
    
    // Unified profile handler system
    const profileHandlers = useMemo(() => ({
        contact: onOpenContactProfile,
        lead: onOpenLeadProfile,
        opportunity: onOpenOpportunityProfile,
        business: onOpenBusinessProfile,
        user: onOpenUserProfile,
        sales: onOpenSaleProfile,
        task: onOpenTaskProfile,
        ticket: onOpenTicketProfile
    }), [onOpenContactProfile, onOpenLeadProfile, onOpenOpportunityProfile, onOpenBusinessProfile, onOpenUserProfile, onOpenSaleProfile, onOpenTaskProfile, onOpenTicketProfile]);

    // Helper function to get profile props for a widget
    const getProfilePropsForWidget = useCallback((widgetKey) => {
        return getProfileProps(widgetKey, profileHandlers);
    }, [profileHandlers]);

    // Show loading state only for external widgets
    if (
        (type === 'uploaded' || type === 'builtin') &&
        widgetState === 'loading' &&
        showLoadingSpinner
    ) {
        const spinnerSize = loadingSpinnerSize === 'small' ? 'h-4 w-4' : 
                           loadingSpinnerSize === 'large' ? 'h-12 w-12' : 'h-8 w-8';
        
        return (
            <div className="widget-loading">
                <div className="flex items-center justify-center p-8">
                    <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-blue-600`}></div>
                    <span className="ml-2 text-gray-600">Loading {widgetKey}...</span>
                </div>
            </div>
        );
    }
    
    // Handle search result widgets
    if (memoizedWidgetKey.startsWith('search-result-')) {
        // Create a wrapper component that calls onLoad after render
        const SearchResultWrapper = () => {
            useEffect(() => {
                if (onLoad) {
                    // Small delay to ensure the widget has rendered
                    const timer = setTimeout(() => {
                        onLoad();
                    }, 10);
                    return () => clearTimeout(timer);
                }
            }, []); // eslint-disable-line react-hooks/exhaustive-deps
            
            return <SearchResultWidget resultData={resultData} />;
        };
        
        return <SearchResultWrapper />;
    }

    // Check if widget is in our registry (only for non-builtin-react widgets)
    if (type !== 'builtin-react') {
        const RegisteredWidget = WidgetRegistry[memoizedWidgetKey];
        if (RegisteredWidget) {
            // Create a wrapper component that calls onLoad after render
            const WidgetWrapper = () => {
                useEffect(() => {
                    if (onLoad) {
                        // Small delay to ensure the widget has rendered
                        const timer = setTimeout(() => {
                            onLoad();
                        }, 10);
                        return () => clearTimeout(timer);
                    }
                }, []); // eslint-disable-line react-hooks/exhaustive-deps
                
                // Get profile props for this widget
                const profileProps = getProfilePropsForWidget(memoizedWidgetKey);
                return <RegisteredWidget {...props} {...profileProps} />;
            };
            
            return <WidgetWrapper />;
        }
    }

    // Handle external widgets (uploaded or builtin)
    if (type === 'uploaded' || type === 'builtin') {
        return (
            <ExternalWidgetLoader 
                widgetKey={memoizedWidgetKey}
                widgetPath={widgetPath}
                type={type}
                onLoad={onLoad}
                onError={onError}
            />
        );
    }
    
    // Handle builtin-react widgets (these are handled by the registry)
    if (type === 'builtin-react') {
        // Handle dynamic widget keys (e.g., lead-profile-widget-35 -> lead-profile-widget)
        let baseWidgetKey = memoizedWidgetKey;
        if (memoizedWidgetKey.includes('-widget-')) {
            baseWidgetKey = memoizedWidgetKey.split('-widget-')[0] + '-widget';
        }
        
        // Check if widget is in our registry
        const RegisteredWidget = WidgetRegistry[baseWidgetKey];
        
        if (RegisteredWidget) {
            // Create a wrapper component that calls onLoad after render
            const BuiltinReactWrapper = () => {
                useEffect(() => {
                    if (onLoad) {
                        // Small delay to ensure the widget has rendered
                        const timer = setTimeout(() => {
                            onLoad();
                        }, 10);
                        return () => clearTimeout(timer);
                    }
                }, []); // eslint-disable-line react-hooks/exhaustive-deps
                
                // Get profile props for this widget
                const profileProps = getProfilePropsForWidget(memoizedWidgetKey);
                
                // Handle profile widgets with widgetData
                if (baseWidgetKey.endsWith('-profile-widget') && widgetData) {
                    const profileType = baseWidgetKey.replace('-profile-widget', '');
                    const idField = profileType === 'sales' ? 'saleId' : `${profileType}Id`;
                    const idValue = widgetData[idField];
                    if (idValue) {
                        return <RegisteredWidget {...{ [idField]: idValue }} />;
                    }
                }
                
                // Return widget with profile props and widgetData
                return <RegisteredWidget {...props} {...profileProps} widgetData={widgetData} />;
            };
            
            return <BuiltinReactWrapper />;
        } else {
            return (
                <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                    <div className="font-medium">Built-in React Widget Not Found</div>
                    <div className="text-sm">Widget key: {memoizedWidgetKey}</div>
                    <div className="text-sm">Base widget key: {baseWidgetKey}</div>
                    <div className="text-sm">Available keys: {Object.keys(WidgetRegistry).join(', ')}</div>
                </div>
            );
        }
    }

    // Fallback for unknown widgets
    const UnknownWidgetWrapper = () => {
        useEffect(() => {
            if (onLoad) {
                // Small delay to ensure the widget has rendered
                const timer = setTimeout(() => {
                    onLoad();
                }, 10);
                return () => clearTimeout(timer);
            }
        }, []); // eslint-disable-line react-hooks/exhaustive-deps
        
        return (
            <div className="p-4 text-yellow-500 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="font-medium">Unknown Widget</div>
                <div className="text-sm">Widget type: {type}</div>
                <div className="text-sm">Widget key: {memoizedWidgetKey}</div>
                <div className="text-sm">Widget path: {widgetPath}</div>
            </div>
        );
    };
    
    return <UnknownWidgetWrapper />;
});

// Add display name for debugging
DynamicWidget.displayName = 'DynamicWidget';
ExternalWidgetLoader.displayName = 'ExternalWidgetLoader';

export default DynamicWidget;