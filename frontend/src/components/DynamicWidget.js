import React, { useState, useEffect, memo, useMemo } from 'react';
import SearchResultWidget from './SearchResultWidget';
import ContactsWidget from './ContactsWidget';

// Widget Registry - Central place to register all widgets
const WidgetRegistry = {
    // Built-in React widgets
    'contacts-widget': ContactsWidget,
    'search-result-widget': SearchResultWidget,
    
    // Placeholder widgets for future implementation
    'leads-widget': () => (
        <div className="p-4 text-center">
            <div className="text-gray-600 text-lg font-medium mb-2">Leads Management</div>
            <div className="text-gray-500 text-sm">Leads functionality coming soon...</div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-800 text-sm">
                    This will include: Lead capture, qualification, conversion tracking, and more.
                </div>
            </div>
        </div>
    ),
    
    'opportunities-widget': () => (
        <div className="p-4 text-center">
            <div className="text-gray-600 text-lg font-medium mb-2">Opportunities Management</div>
            <div className="text-gray-500 text-sm">Opportunities functionality coming soon...</div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <div className="text-purple-800 text-sm">
                    This will include: Pipeline management, deal tracking, forecasting, and more.
                </div>
            </div>
        </div>
    ),
    
    'companies-widget': () => (
        <div className="p-4 text-center">
            <div className="text-gray-600 text-lg font-medium mb-2">Companies Management</div>
            <div className="text-gray-500 text-sm">Companies functionality coming soon...</div>
            <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <div className="text-orange-800 text-sm">
                    This will include: Company profiles, relationships, hierarchy, and more.
                </div>
            </div>
        </div>
    ),
    
    'users-widget': () => (
        <div className="p-4 text-center">
            <div className="text-gray-600 text-lg font-medium mb-2">Users Management</div>
            <div className="text-gray-500 text-sm">Users functionality coming soon...</div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-gray-800 text-sm">
                    This will include: User profiles, roles, permissions, and more.
                </div>
            </div>
        </div>
    )
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
const DynamicWidget = memo(({ widgetKey, widgetPath, type, resultData, onLoad, onError, widgetState, showLoadingSpinner, loadingSpinnerSize, ...props }) => {
    // Memoize the widget key to prevent unnecessary re-renders
    const memoizedWidgetKey = useMemo(() => widgetKey, [widgetKey]);
    
    console.log('DynamicWidget render:', memoizedWidgetKey, 'type:', type, 'has onLoad:', !!onLoad, 'widgetState:', widgetState);
    
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
                    console.log('SearchResultWrapper calling onLoad for:', memoizedWidgetKey);
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

    // Check if widget is in our registry
    const RegisteredWidget = WidgetRegistry[memoizedWidgetKey];
    if (RegisteredWidget) {
        // Create a wrapper component that calls onLoad after render
        const WidgetWrapper = () => {
            useEffect(() => {
                if (onLoad) {
                    console.log('WidgetWrapper calling onLoad for:', memoizedWidgetKey);
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
        console.log('Handling builtin-react widget:', memoizedWidgetKey);
        console.log('onLoad callback:', onLoad);
        console.log('Available registry keys:', Object.keys(WidgetRegistry));
        
        // Create a wrapper component that calls onLoad after render
        const BuiltinReactWrapper = () => {
            console.log('BuiltinReactWrapper mounting for:', memoizedWidgetKey);
            
            useEffect(() => {
                console.log('BuiltinReactWrapper useEffect running for:', memoizedWidgetKey);
                if (onLoad) {
                    console.log('BuiltinReactWrapper calling onLoad for:', memoizedWidgetKey);
                    // Small delay to ensure the widget has rendered
                    const timer = setTimeout(() => {
                        console.log('BuiltinReactWrapper executing onLoad for:', memoizedWidgetKey);
                        onLoad();
                    }, 10);
                    return () => clearTimeout(timer);
                } else {
                    console.log('BuiltinReactWrapper: no onLoad callback provided for:', memoizedWidgetKey);
                }
            }, [memoizedWidgetKey]); // eslint-disable-line react-hooks/exhaustive-deps
            
            // Check if widget is in our registry
            const RegisteredWidget = WidgetRegistry[memoizedWidgetKey];
            console.log('Found RegisteredWidget for:', memoizedWidgetKey, ':', !!RegisteredWidget);
            
            if (RegisteredWidget) {
                return <RegisteredWidget {...props} />;
            } else {
                return (
                    <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                        <div className="font-medium">Built-in React Widget Not Found</div>
                        <div className="text-sm">Widget key: {memoizedWidgetKey}</div>
                        <div className="text-sm">Available keys: {Object.keys(WidgetRegistry).join(', ')}</div>
                    </div>
                );
            }
        };
        
        return <BuiltinReactWrapper />;
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