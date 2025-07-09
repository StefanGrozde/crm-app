import { useState, useEffect, useCallback, useRef } from 'react';

// Widget lifecycle states
export const WIDGET_STATES = {
    INITIALIZING: 'initializing',
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error',
    UNMOUNTED: 'unmounted',
    RELOADING: 'reloading'
};

// Widget lifecycle hook
export const useWidgetLifecycle = (widgetKey, options = {}) => {
    const {
        autoReload = false,
        reloadInterval = 30000, // 30 seconds
        onReady,
        onError,
        onStateChange
    } = options;
    
    const [state, setState] = useState(WIDGET_STATES.INITIALIZING);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState({
        loadTime: 0,
        lastReady: null,
        reloadCount: 0,
        errorCount: 0
    });
    
    const mountTimeRef = useRef(Date.now());
    const reloadTimerRef = useRef(null);
    const isMountedRef = useRef(true);
    
    // Update state with callback
    const updateState = useCallback((newState, additionalData = {}) => {
        if (!isMountedRef.current) return;
        
        const now = Date.now();
        const oldState = state;
        
        setState(newState);
        
        // Update metrics based on state change
        if (newState === WIDGET_STATES.READY) {
            const loadTime = now - mountTimeRef.current;
            setMetrics(prev => ({
                ...prev,
                loadTime,
                lastReady: now,
                reloadCount: prev.reloadCount + (oldState === WIDGET_STATES.RELOADING ? 1 : 0)
            }));
            
            if (onReady) {
                onReady(widgetKey, { loadTime, ...additionalData });
            }
        } else if (newState === WIDGET_STATES.ERROR) {
            setMetrics(prev => ({
                ...prev,
                errorCount: prev.errorCount + 1
            }));
            
            if (onError) {
                onError(widgetKey, error, additionalData);
            }
        }
        
        if (onStateChange) {
            onStateChange(widgetKey, newState, oldState, additionalData);
        }
    }, [state, error, widgetKey, onReady, onError, onStateChange]);
    
    // Initialize widget
    const initialize = useCallback(() => {
        mountTimeRef.current = Date.now();
        setError(null);
        updateState(WIDGET_STATES.LOADING);
    }, [updateState]);
    
    // Mark widget as ready
    const setReady = useCallback((data = {}) => {
        updateState(WIDGET_STATES.READY, data);
    }, [updateState]);
    
    // Mark widget as error
    const setWidgetError = useCallback((errorMessage, data = {}) => {
        setError(errorMessage);
        updateState(WIDGET_STATES.ERROR, data);
    }, [updateState]);
    
    // Reload widget
    const reload = useCallback(() => {
        updateState(WIDGET_STATES.RELOADING);
        mountTimeRef.current = Date.now();
        setError(null);
        
        // Small delay to show reloading state
        setTimeout(() => {
            if (isMountedRef.current) {
                updateState(WIDGET_STATES.LOADING);
            }
        }, 100);
    }, [updateState]);
    
    // Unmount widget
    const unmount = useCallback(() => {
        updateState(WIDGET_STATES.UNMOUNTED);
    }, [updateState]);
    
    // Set up auto-reload if enabled
    useEffect(() => {
        if (autoReload && state === WIDGET_STATES.READY) {
            reloadTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                    reload();
                }
            }, reloadInterval);
        }
        
        return () => {
            if (reloadTimerRef.current) {
                clearTimeout(reloadTimerRef.current);
            }
        };
    }, [autoReload, reloadInterval, state, reload]);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (reloadTimerRef.current) {
                clearTimeout(reloadTimerRef.current);
            }
        };
    }, []);
    
    return {
        state,
        error,
        metrics,
        initialize,
        setReady,
        setWidgetError,
        reload,
        unmount,
        isReady: state === WIDGET_STATES.READY,
        isLoading: state === WIDGET_STATES.LOADING || state === WIDGET_STATES.RELOADING,
        hasError: state === WIDGET_STATES.ERROR,
        isUnmounted: state === WIDGET_STATES.UNMOUNTED
    };
};

// Widget manager hook for handling multiple widgets
export const useWidgetManager = (options = {}) => {
    const [widgets, setWidgets] = useState({});
    const [globalMetrics, setGlobalMetrics] = useState({
        totalWidgets: 0,
        readyWidgets: 0,
        errorWidgets: 0,
        loadingWidgets: 0
    });
    
    const { onWidgetEvent } = options;
    
    // Register a widget
    const registerWidget = useCallback((widgetKey, lifecycleOptions = {}) => {
        setWidgets(prev => ({
            ...prev,
            [widgetKey]: {
                key: widgetKey,
                lifecycle: useWidgetLifecycle(widgetKey, {
                    ...lifecycleOptions,
                    onReady: (key, data) => {
                        if (lifecycleOptions.onReady) {
                            lifecycleOptions.onReady(key, data);
                        }
                        if (onWidgetEvent) {
                            onWidgetEvent('ready', { widgetKey: key, ...data });
                        }
                    },
                    onError: (key, error, data) => {
                        if (lifecycleOptions.onError) {
                            lifecycleOptions.onError(key, error, data);
                        }
                        if (onWidgetEvent) {
                            onWidgetEvent('error', { widgetKey: key, error, ...data });
                        }
                    }
                })
            }
        }));
    }, [onWidgetEvent]);
    
    // Unregister a widget
    const unregisterWidget = useCallback((widgetKey) => {
        setWidgets(prev => {
            const newWidgets = { ...prev };
            delete newWidgets[widgetKey];
            return newWidgets;
        });
    }, []);
    
    // Get widget lifecycle
    const getWidgetLifecycle = useCallback((widgetKey) => {
        return widgets[widgetKey]?.lifecycle;
    }, [widgets]);
    
    // Update global metrics
    useEffect(() => {
        const readyCount = Object.values(widgets).filter(w => w.lifecycle.isReady).length;
        const errorCount = Object.values(widgets).filter(w => w.lifecycle.hasError).length;
        const loadingCount = Object.values(widgets).filter(w => w.lifecycle.isLoading).length;
        
        setGlobalMetrics({
            totalWidgets: Object.keys(widgets).length,
            readyWidgets: readyCount,
            errorWidgets: errorCount,
            loadingWidgets: loadingCount
        });
    }, [widgets]);
    
    return {
        widgets,
        globalMetrics,
        registerWidget,
        unregisterWidget,
        getWidgetLifecycle
    };
};

export default useWidgetLifecycle; 