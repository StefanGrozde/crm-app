import React, { useState, useEffect, memo } from 'react';
import SearchResultWidget from './SearchResultWidget';
import ContactsWidget from './ContactsWidget';

// Component to load scripts from a URL
const ScriptLoader = ({ widgetKey, widgetPath }) => {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Create a script tag
        const script = document.createElement('script');
        script.src = widgetPath;
        script.async = true;

        script.onload = () => {
            // This assumes the uploaded widget bundle exposes itself on a global object.
            // For example: window.UploadedWidgets['MyUploadedWidget']
            if (window.UploadedWidgets && window.UploadedWidgets[widgetKey]) {
                setComponent(() => window.UploadedWidgets[widgetKey]);
                setLoading(false);
            } else {
                setError(`Widget ${widgetKey} not found in global scope`);
                setLoading(false);
            }
        };

        script.onerror = () => {
            setError(`Failed to load widget script: ${widgetPath}`);
            setLoading(false);
        };

        document.body.appendChild(script);

        // Cleanup
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [widgetKey, widgetPath]);

    if (loading) return <div className="p-4">Loading widget...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!Component) return <div className="p-4">Widget not found</div>;

    return <Component />;
};

// Component to load widgets from backend
const RemoteWidgetLoader = ({ widgetKey, widgetPath }) => {
    const [Component, setComponent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadWidget = async () => {
            try {
                // Fetch the widget code from backend
                const response = await fetch(widgetPath);
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
                setLoading(false);
            } catch (err) {
                console.error('Error loading widget:', err);
                setError(err.message);
                setLoading(false);
            }
        };

        loadWidget();
    }, [widgetKey, widgetPath]);

    if (loading) return <div className="p-4">Loading widget...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
    if (!Component) return <div className="p-4">Widget not found</div>;

    return <Component />;
};

const DynamicWidget = ({ widgetKey, widgetPath, type, resultData, ...props }) => {
    // Initialize the global container if it doesn't exist
    if (!window.UploadedWidgets) {
        window.UploadedWidgets = {};
    }

    // Handle search result widgets
    if (widgetKey.startsWith('search-result-')) {
        return <SearchResultWidget resultData={resultData} />;
    }

    // Handle contacts widget (special case - not in widget library)
    if (widgetKey === 'contacts-widget') {
        return <ContactsWidget />;
    }

    // Handle other page widgets (special cases - not in widget library)
    if (widgetKey === 'leads-widget') {
        return (
            <div className="p-4 text-center">
                <div className="text-gray-600 text-lg font-medium mb-2">Leads Management</div>
                <div className="text-gray-500 text-sm">Leads functionality coming soon...</div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-800 text-sm">
                        This will include: Lead capture, qualification, conversion tracking, and more.
                    </div>
                </div>
            </div>
        );
    }

    if (widgetKey === 'opportunities-widget') {
        return (
            <div className="p-4 text-center">
                <div className="text-gray-600 text-lg font-medium mb-2">Opportunities Management</div>
                <div className="text-gray-500 text-sm">Opportunities functionality coming soon...</div>
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                    <div className="text-purple-800 text-sm">
                        This will include: Pipeline management, deal tracking, forecasting, and more.
                    </div>
                </div>
            </div>
        );
    }

    if (widgetKey === 'companies-widget') {
        return (
            <div className="p-4 text-center">
                <div className="text-gray-600 text-lg font-medium mb-2">Companies Management</div>
                <div className="text-gray-500 text-sm">Companies functionality coming soon...</div>
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                    <div className="text-orange-800 text-sm">
                        This will include: Company profiles, relationships, hierarchy, and more.
                    </div>
                </div>
            </div>
        );
    }

    if (widgetKey === 'users-widget') {
        return (
            <div className="p-4 text-center">
                <div className="text-gray-600 text-lg font-medium mb-2">Users Management</div>
                <div className="text-gray-500 text-sm">Users functionality coming soon...</div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-800 text-sm">
                        This will include: User profiles, roles, permissions, and more.
                    </div>
                </div>
            </div>
        );
    }



    if (type === 'uploaded') {
        // For uploaded widgets, use script loader that expects global exposure
        return <ScriptLoader widgetKey={widgetKey} widgetPath={widgetPath} />;
    } else if (type === 'builtin') {
        // For built-in widgets served from backend
        return <RemoteWidgetLoader widgetKey={widgetKey} widgetPath={widgetPath} />;
    }

    // Fallback
    return (
        <div className="p-4 text-yellow-500">
            <div>Unknown widget type: {type}</div>
            <div>Widget key: {widgetKey}</div>
            <div>Widget path: {widgetPath}</div>
        </div>
    );
};

export default memo(DynamicWidget);