import React, { Suspense } from 'react';

// Lazy load for built-in widgets
const lazyLoadBuiltIn = (widgetKey) => {
    return React.lazy(() => import(`./widgets/${widgetKey}.js`));
};

// Component to load scripts from a URL
class ScriptLoader extends React.Component {
    state = { Component: null };

    componentDidMount() {
        const { widgetKey, widgetPath } = this.props;

        // Create a script tag
        const script = document.createElement('script');
        script.src = widgetPath;
        script.async = true;

        script.onload = () => {
            // This assumes the uploaded widget bundle exposes itself on a global object.
            // For example: window.UploadedWidgets['MyUploadedWidget']
            if (window.UploadedWidgets && window.UploadedWidgets[widgetKey]) {
                this.setState({ Component: window.UploadedWidgets[widgetKey] });
            }
        };

        document.body.appendChild(script);
    }

    render() {
        const { Component } = this.state;
        return Component ? <Component /> : <div>Loading...</div>;
    }
}


const DynamicWidget = ({ widgetKey, widgetPath, type }) => {
    if (type === 'uploaded') {
        // Initialize the global container if it doesn't exist
        if (!window.UploadedWidgets) {
            window.UploadedWidgets = {};
        }
        return <ScriptLoader widgetKey={widgetKey} widgetPath={widgetPath} />;
    }

    // Default to lazy loading for built-in widgets
    const WidgetComponent = lazyLoadBuiltIn(widgetKey);

    return (
        <Suspense fallback={<div className="p-4">Loading widget...</div>}>
            <WidgetComponent />
        </Suspense>
    );
};

export default DynamicWidget;