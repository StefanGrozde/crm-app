import React, { useState, useEffect, memo, useMemo } from 'react';
import SearchResultWidget from './SearchResultWidget';
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
import MyTicketQueueWidget from './MyTicketQueueWidget';
import UnassignedTicketQueueWidget from './UnassignedTicketQueueWidget';
import TeamTicketQueueWidget from './TeamTicketQueueWidget';
import AllTicketQueueWidget from './AllTicketQueueWidget';
import TicketQueueDashboard from './TicketQueueDashboard';

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
    'my-ticket-queue-widget': MyTicketQueueWidget,
    'unassigned-ticket-queue-widget': UnassignedTicketQueueWidget,
    'team-ticket-queue-widget': TeamTicketQueueWidget,
    'all-ticket-queue-widget': AllTicketQueueWidget,
    'ticket-queue-dashboard-widget': TicketQueueDashboard
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
                
                return <RegisteredWidget {...props} />;
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
                
                // Pass contact profile handler to ContactsWidget (unified or legacy)
                if (memoizedWidgetKey === 'contacts-widget' || memoizedWidgetKey === 'legacy-contacts-widget') {
                    return <RegisteredWidget onOpenContactProfile={onOpenContactProfile} />;
                }
                // Pass lead profile handler to LeadsWidget (unified or legacy)
                if (memoizedWidgetKey === 'leads-widget' || memoizedWidgetKey === 'legacy-leads-widget') {
                    return <RegisteredWidget onOpenLeadProfile={onOpenLeadProfile} />;
                }
                // Pass opportunity profile handler to OpportunitiesWidget (unified or legacy)
                if (memoizedWidgetKey === 'opportunities-widget' || memoizedWidgetKey === 'legacy-opportunities-widget') {
                    return <RegisteredWidget onOpenOpportunityProfile={onOpenOpportunityProfile} />;
                }
                // Pass company profile handler to legacy CompaniesWidget
                if (memoizedWidgetKey === 'legacy-companies-widget') {
                    return <RegisteredWidget onOpenCompanyProfile={onOpenBusinessProfile} />;
                }
                // Pass business profile handler to BusinessWidget
                if (memoizedWidgetKey === 'business-widget') {
                    return <RegisteredWidget onOpenBusinessProfile={onOpenBusinessProfile} />;
                }
                // Pass user profile handler to UsersWidget (unified or legacy)
                if (memoizedWidgetKey === 'users-widget' || memoizedWidgetKey === 'legacy-users-widget') {
                    return <RegisteredWidget onOpenUserProfile={onOpenUserProfile} />;
                }
                // Pass sales profile handler to SalesWidget
                if (memoizedWidgetKey === 'sales-widget') {
                    return <RegisteredWidget onOpenSaleProfile={onOpenSaleProfile} />;
                }
                // Pass task profile handler to TasksWidget
                if (memoizedWidgetKey === 'tasks-widget') {
                    return <RegisteredWidget onOpenTaskProfile={onOpenTaskProfile} />;
                }
                // Pass ticket profile handler to TicketsWidget and all ticket queue widgets
                if (memoizedWidgetKey === 'tickets-widget' || 
                    memoizedWidgetKey === 'my-ticket-queue-widget' ||
                    memoizedWidgetKey === 'unassigned-ticket-queue-widget' ||
                    memoizedWidgetKey === 'team-ticket-queue-widget' ||
                    memoizedWidgetKey === 'all-ticket-queue-widget' ||
                    memoizedWidgetKey === 'ticket-queue-dashboard-widget') {
                    return <RegisteredWidget onOpenTicketProfile={onOpenTicketProfile} />;
                }
                // Pass widgetData to ContactProfileWidget
                if (baseWidgetKey === 'contact-profile-widget' && widgetData) {
                    return <RegisteredWidget contactId={widgetData.contactId} />;
                }
                // Pass widgetData to LeadProfileWidget
                if (baseWidgetKey === 'lead-profile-widget' && widgetData) {
                    return <RegisteredWidget leadId={widgetData.leadId} />;
                }
                // Pass widgetData to OpportunityProfileWidget
                if (baseWidgetKey === 'opportunity-profile-widget' && widgetData) {
                    return <RegisteredWidget opportunityId={widgetData.opportunityId} />;
                }
                // Pass widgetData to BusinessProfileWidget
                if (baseWidgetKey === 'business-profile-widget' && widgetData) {
                    return <RegisteredWidget businessId={widgetData.businessId} />;
                }
                // Pass widgetData to UserProfileWidget
                if (baseWidgetKey === 'user-profile-widget' && widgetData) {
                    return <RegisteredWidget userId={widgetData.userId} />;
                }
                // Pass widgetData to SalesProfileWidget
                if (baseWidgetKey === 'sales-profile-widget' && widgetData) {
                    return <RegisteredWidget saleId={widgetData.saleId} />;
                }
                // Pass widgetData to TaskProfileWidget
                if (baseWidgetKey === 'task-profile-widget' && widgetData) {
                    return <RegisteredWidget taskId={widgetData.taskId} />;
                }
                // Pass widgetData to TicketProfileWidget
                if (baseWidgetKey === 'ticket-profile-widget' && widgetData) {
                    return <RegisteredWidget ticketId={widgetData.ticketId} />;
                }
                return <RegisteredWidget {...props} />;
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