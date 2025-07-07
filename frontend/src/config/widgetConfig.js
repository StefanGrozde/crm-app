// Widget Configuration System
// This provides a centralized way to manage widget settings and behavior

// Default widget settings
export const DEFAULT_WIDGET_CONFIG = {
    // Rendering settings
    renderMode: 'lazy', // 'eager', 'lazy', 'virtual'
    preloadThreshold: 100, // pixels from viewport to start preloading
    
    // Performance settings
    debounceDelay: 300, // ms for input debouncing
    throttleDelay: 100, // ms for scroll/throttle events
    maxRetries: 3, // maximum retry attempts for failed loads
    
    // Lifecycle settings
    autoReload: false, // whether widgets should auto-reload
    reloadInterval: 30000, // ms between auto-reloads
    cacheTimeout: 300000, // ms to cache widget data (5 minutes)
    
    // Error handling
    showErrors: true, // whether to display error states
    retryOnError: true, // whether to retry on error
    errorDisplayDuration: 5000, // ms to show error messages
    
    // Loading states
    showLoadingSpinner: true, // whether to show loading spinner
    loadingSpinnerSize: 'medium', // 'small', 'medium', 'large'
    skeletonLoading: false, // whether to use skeleton loading
    
    // Responsive settings
    responsiveBreakpoints: {
        xs: 480,
        sm: 768,
        md: 1024,
        lg: 1280,
        xl: 1536
    },
    
    // Animation settings
    enableAnimations: true, // whether to enable animations
    animationDuration: 200, // ms for animations
    animationEasing: 'ease-out', // CSS easing function
};

// Widget type configurations
export const WIDGET_TYPE_CONFIG = {
    'contacts-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'eager', // Contacts widget should load immediately
        debounceDelay: 300, // Search debouncing
        autoReload: false, // No auto-reload for contacts
        showLoadingSpinner: true,
        skeletonLoading: true, // Use skeleton loading for better UX
        cacheTimeout: 60000, // Cache for 1 minute
    },
    
    // Built-in React widgets
    'builtin-react': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'eager', // Built-in React widgets should load immediately
        showLoadingSpinner: true,
        autoReload: false,
    },
    
    'leads-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: false,
        showLoadingSpinner: true,
    },
    
    'opportunities-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: false,
        showLoadingSpinner: true,
    },
    
    'companies-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: false,
        showLoadingSpinner: true,
    },
    
    'users-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: false,
        showLoadingSpinner: true,
    },
    
    'search-result-widget': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'eager', // Search results should load immediately
        debounceDelay: 0, // No debouncing for search results
        autoReload: false,
        showLoadingSpinner: false, // Don't show spinner for search results
        cacheTimeout: 300000, // Cache for 5 minutes
    },
    
    // Built-in widgets
    'sample-chart': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: true, // Charts should auto-reload
        reloadInterval: 60000, // Reload every minute
        showLoadingSpinner: true,
        cacheTimeout: 30000, // Short cache for charts
    },
    
    // Default for unknown widgets
    'default': {
        ...DEFAULT_WIDGET_CONFIG,
        renderMode: 'lazy',
        autoReload: false,
        showLoadingSpinner: true,
    }
};

// Widget registry configuration
export const WIDGET_REGISTRY_CONFIG = {
    // Built-in React widgets (loaded immediately)
    builtinReact: [
        'contacts-widget',
        'leads-widget', 
        'opportunities-widget',
        'companies-widget',
        'users-widget',
        'search-result-widget'
    ],
    
    // Built-in external widgets (loaded from backend)
    builtinExternal: [
        'sample-chart'
    ],
    
    // Uploaded widgets (loaded dynamically)
    uploaded: []
};

// Widget validation rules
export const WIDGET_VALIDATION_RULES = {
    // Required properties for widget manifests
    requiredProperties: ['key', 'name', 'type'],
    
    // Allowed widget types
    allowedTypes: ['builtin', 'custom', 'uploaded'],
    
    // Maximum widget size limits
    maxSize: {
        width: 12, // grid columns
        height: 20, // grid rows
        minWidth: 2,
        minHeight: 1
    },
    
    // File size limits for uploaded widgets
    fileSizeLimits: {
        total: 10 * 1024 * 1024, // 10MB total
        individual: 2 * 1024 * 1024 // 2MB per file
    },
    
    // Allowed file types for uploaded widgets
    allowedFileTypes: [
        'application/javascript',
        'text/javascript',
        'text/html',
        'text/css',
        'application/json',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/svg+xml'
    ]
};

// Widget performance monitoring configuration
export const WIDGET_PERFORMANCE_CONFIG = {
    // Performance thresholds
    thresholds: {
        loadTime: {
            warning: 1000, // 1 second
            error: 5000 // 5 seconds
        },
        renderTime: {
            warning: 100, // 100ms
            error: 500 // 500ms
        },
        memoryUsage: {
            warning: 50 * 1024 * 1024, // 50MB
            error: 100 * 1024 * 1024 // 100MB
        }
    },
    
    // Monitoring settings
    enableMonitoring: true,
    logPerformance: true,
    alertOnThreshold: true,
    
    // Metrics collection
    collectMetrics: {
        loadTime: true,
        renderTime: true,
        memoryUsage: false, // Disabled by default
        errorRate: true,
        userInteractions: true
    }
};

// Widget security configuration
export const WIDGET_SECURITY_CONFIG = {
    // Content Security Policy for widgets
    csp: {
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", "data:", "https:"],
        'connect-src': ["'self'"],
        'frame-src': ["'none'"],
        'object-src': ["'none'"]
    },
    
    // Sandbox settings
    sandbox: {
        enabled: true,
        permissions: ['allow-scripts', 'allow-same-origin'],
        restrictions: ['allow-top-navigation', 'allow-forms']
    },
    
    // Validation settings
    validation: {
        validateHtml: true,
        validateCss: true,
        validateJs: false, // Disabled for performance
        sanitizeInputs: true
    }
};

// Helper functions for widget configuration

/**
 * Get configuration for a specific widget
 * @param {string} widgetKey - The widget key
 * @returns {Object} Widget configuration
 */
export const getWidgetConfig = (widgetKey) => {
    // First try to get specific widget config
    if (WIDGET_TYPE_CONFIG[widgetKey]) {
        return WIDGET_TYPE_CONFIG[widgetKey];
    }
    
    // Check if it's a built-in React widget
    if (widgetKey.endsWith('-widget') && ['contacts', 'leads', 'opportunities', 'companies', 'users'].some(type => widgetKey.startsWith(type))) {
        return WIDGET_TYPE_CONFIG['builtin-react'];
    }
    
    // Return default config
    return WIDGET_TYPE_CONFIG['default'];
};

/**
 * Merge widget configuration with defaults
 * @param {string} widgetKey - The widget key
 * @param {Object} customConfig - Custom configuration to merge
 * @returns {Object} Merged configuration
 */
export const mergeWidgetConfig = (widgetKey, customConfig = {}) => {
    const baseConfig = getWidgetConfig(widgetKey);
    return {
        ...baseConfig,
        ...customConfig
    };
};

/**
 * Validate widget configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateWidgetConfig = (config) => {
    const errors = [];
    
    // Check required properties
    WIDGET_VALIDATION_RULES.requiredProperties.forEach(prop => {
        if (!config[prop]) {
            errors.push(`Missing required property: ${prop}`);
        }
    });
    
    // Check widget type
    if (config.type && !WIDGET_VALIDATION_RULES.allowedTypes.includes(config.type)) {
        errors.push(`Invalid widget type: ${config.type}`);
    }
    
    // Check size limits
    if (config.w && (config.w > WIDGET_VALIDATION_RULES.maxSize.width || config.w < WIDGET_VALIDATION_RULES.maxSize.minWidth)) {
        errors.push(`Invalid width: ${config.w}`);
    }
    
    if (config.h && (config.h > WIDGET_VALIDATION_RULES.maxSize.height || config.h < WIDGET_VALIDATION_RULES.maxSize.minHeight)) {
        errors.push(`Invalid height: ${config.h}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Get performance configuration for a widget
 * @param {string} widgetKey - The widget key
 * @returns {Object} Performance configuration
 */
export const getWidgetPerformanceConfig = (widgetKey) => {
    return {
        ...WIDGET_PERFORMANCE_CONFIG,
        widgetKey
    };
};

/**
 * Get security configuration for a widget
 * @param {string} widgetKey - The widget key
 * @returns {Object} Security configuration
 */
export const getWidgetSecurityConfig = (widgetKey) => {
    return {
        ...WIDGET_SECURITY_CONFIG,
        widgetKey
    };
};

export default {
    DEFAULT_WIDGET_CONFIG,
    WIDGET_TYPE_CONFIG,
    WIDGET_REGISTRY_CONFIG,
    WIDGET_VALIDATION_RULES,
    WIDGET_PERFORMANCE_CONFIG,
    WIDGET_SECURITY_CONFIG,
    getWidgetConfig,
    mergeWidgetConfig,
    validateWidgetConfig,
    getWidgetPerformanceConfig,
    getWidgetSecurityConfig
}; 