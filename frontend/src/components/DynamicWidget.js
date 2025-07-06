import React, { Suspense, useState, useEffect } from 'react';
import SearchResultWidget from './SearchResultWidget';

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

    if (type === 'uploaded') {
        // For uploaded widgets, use script loader that expects global exposure
        return <ScriptLoader widgetKey={widgetKey} widgetPath={widgetPath} />;
    } else if (type === 'builtin') {
        // For built-in widgets served from backend
        return <RemoteWidgetLoader widgetKey={widgetKey} widgetPath={widgetPath} />;
    }

    // Fallback
    return <div className="p-4 text-yellow-500">Unknown widget type: {type}</div>;
};

export default DynamicWidget;