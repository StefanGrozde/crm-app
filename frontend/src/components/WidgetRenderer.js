import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import DynamicWidget from './DynamicWidget';
import { getWidgetConfig } from '../config/widgetConfig';

// Widget lifecycle states
const WIDGET_STATES = {
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error',
    UNMOUNTED: 'unmounted'
};

// Widget Renderer Component
const WidgetRenderer = memo(({ 
    widgetKey, 
    widgetPath, 
    type, 
    resultData, 
    widgetData,
    isVisible = true,
    onWidgetReady,
    onWidgetError,
    onOpenContactProfile,
    onOpenLeadProfile,
    onOpenOpportunityProfile,
    ...props 
}) => {
    // Get widget configuration
    const widgetConfig = useMemo(() => {
        const config = getWidgetConfig(widgetKey);
        console.log(`Widget ${widgetKey} config:`, config);
        return config;
    }, [widgetKey]);
    
    const [widgetState, setWidgetState] = useState(WIDGET_STATES.LOADING);
    const [error, setError] = useState(null);
    const [renderKey, setRenderKey] = useState(0);
    const mountTimeRef = useRef(Date.now());
    const lastRenderTimeRef = useRef(0);
    
    // Memoize widget props to prevent unnecessary re-renders
    const memoizedProps = useMemo(() => ({
        widgetKey,
        widgetPath,
        type,
        resultData,
        widgetData,
        onOpenContactProfile,
        onOpenLeadProfile,
        onOpenOpportunityProfile,
        ...props
    }), [widgetKey, widgetPath, type, resultData, widgetData, onOpenContactProfile, onOpenLeadProfile, onOpenOpportunityProfile, props]);
    
    // Handle widget ready state
    const handleWidgetReady = useCallback(() => {
        const now = Date.now();
        const loadTime = now - mountTimeRef.current;
        
        console.log(`Widget ${widgetKey} ready in ${loadTime}ms`);
        
        setWidgetState(WIDGET_STATES.READY);
        lastRenderTimeRef.current = now;
        
        if (onWidgetReady) {
            onWidgetReady(widgetKey, loadTime);
        }
    }, [widgetKey, onWidgetReady]);
    
    console.log(`WidgetRenderer for ${widgetKey} - onLoad callback:`, !!handleWidgetReady);
    
    // Handle widget error
    const handleWidgetError = useCallback((error) => {
        console.error(`Widget ${widgetKey} error:`, error);
        
        setWidgetState(WIDGET_STATES.ERROR);
        setError(error);
        
        if (onWidgetError) {
            onWidgetError(widgetKey, error);
        }
    }, [widgetKey, onWidgetError]);
    
    // Reset widget state when key changes
    useEffect(() => {
        setWidgetState(WIDGET_STATES.LOADING);
        setError(null);
        mountTimeRef.current = Date.now();
        setRenderKey(prev => prev + 1);
    }, [widgetKey]);
    
    // Handle visibility changes based on render mode
    useEffect(() => {
        if (widgetConfig.renderMode === 'eager') {
            // Eager widgets always stay mounted
            return;
        }
        
        if (!isVisible && widgetState === WIDGET_STATES.READY) {
            setWidgetState(WIDGET_STATES.UNMOUNTED);
        } else if (isVisible && widgetState === WIDGET_STATES.UNMOUNTED) {
            setWidgetState(WIDGET_STATES.READY);
        }
    }, [isVisible, widgetState, widgetConfig.renderMode]);
    
    // Don't render if widget is unmounted due to visibility
    if (widgetState === WIDGET_STATES.UNMOUNTED) {
        return (
            <div className="widget-placeholder">
                <div className="flex items-center justify-center p-8 text-gray-400">
                    <div className="animate-pulse">
                        <div className="w-8 h-8 bg-gray-200 rounded-full mb-2"></div>
                        <div className="text-sm">Widget hidden</div>
                    </div>
                </div>
            </div>
        );
    }
    
    // Render error state
    if (widgetState === WIDGET_STATES.ERROR) {
        if (!widgetConfig.showErrors) {
            return null; // Don't show error state for widgets that don't want it
        }
        
        return (
            <div className="widget-error">
                <div className="p-4 text-red-500 border border-red-200 rounded-lg bg-red-50">
                    <div className="font-medium">Widget Error: {widgetKey}</div>
                    <div className="text-sm">{error}</div>
                    {widgetConfig.retryOnError && (
                        <button 
                            onClick={() => {
                                setWidgetState(WIDGET_STATES.LOADING);
                                setError(null);
                                mountTimeRef.current = Date.now();
                                setRenderKey(prev => prev + 1);
                            }}
                            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    )}
                </div>
            </div>
        );
    }
    
    // Always render the DynamicWidget, let it handle loading states
    return (
        <div 
            className="widget-container"
            data-widget-key={widgetKey}
            data-widget-state={widgetState}
            data-render-key={renderKey}
        >
            <DynamicWidget 
                key={`${widgetKey}-${renderKey}`}
                {...memoizedProps}
                onLoad={handleWidgetReady}
                onError={handleWidgetError}
                widgetState={widgetState}
                showLoadingSpinner={widgetConfig.showLoadingSpinner}
                loadingSpinnerSize={widgetConfig.loadingSpinnerSize}
            />
        </div>
    );
});

// Widget Manager for handling multiple widgets
const WidgetManager = memo(({ widgets, activeTabId, onWidgetEvent }) => {
    // Handle widget ready event
    const handleWidgetReady = useCallback((widgetKey, loadTime) => {
        if (onWidgetEvent) {
            onWidgetEvent('ready', { widgetKey, loadTime });
        }
    }, [onWidgetEvent]);
    
    // Handle widget error event
    const handleWidgetError = useCallback((widgetKey, error) => {
        if (onWidgetEvent) {
            onWidgetEvent('error', { widgetKey, error });
        }
    }, [onWidgetEvent]);
    
    // Memoize widgets to prevent unnecessary re-renders
    const memoizedWidgets = useMemo(() => widgets, [widgets]);
    
    return (
        <div className="widget-manager">
            {memoizedWidgets.map((widget) => (
                <WidgetRenderer
                    key={widget.i}
                    widgetKey={widget.i}
                    widgetPath={widget.path}
                    type={widget.type}
                    resultData={widget.resultData}
                    isVisible={activeTabId === widget.tabId}
                    onWidgetReady={handleWidgetReady}
                    onWidgetError={handleWidgetError}
                    {...widget.props}
                />
            ))}
        </div>
    );
});

// Add display names for debugging
WidgetRenderer.displayName = 'WidgetRenderer';
WidgetManager.displayName = 'WidgetManager';

export { WidgetRenderer, WidgetManager, WIDGET_STATES };
export default WidgetRenderer; 