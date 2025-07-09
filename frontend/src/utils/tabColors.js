// Tab color utility functions

// Color mapping for different tab types
export const TAB_COLORS = {
    // Basic pages
    'contacts': 'blue',
    'leads': 'green', 
    'opportunities': 'purple',
    'business': 'orange',
    'users': 'gray',
    'my-views': 'green',
    
    // Profile pages (inherit from parent)
    'contacts-profile': 'blue',
    'leads-profile': 'green',
    'opportunities-profile': 'purple',
    'business-profile': 'orange',
    'users-profile': 'gray',
    
    // Search results
    'search-contacts': 'blue',
    'search-leads': 'green',
    'search-opportunities': 'purple',
    'search-business': 'orange',
    'search-users': 'gray',
    
    // Default for dashboard views
    'default': 'blue'
};

// Get color for a specific tab
export const getTabColor = (tabId, tabData = null) => {
    // If tab has custom color data (for dashboard views)
    if (tabData && tabData.color) {
        return tabData.color;
    }
    
    // Check if it's a dashboard view (numeric ID)
    if (typeof tabId === 'number' || (typeof tabId === 'string' && /^\d+$/.test(tabId))) {
        return tabData?.color || TAB_COLORS.default;
    }
    
    // Check for specific tab types
    const tabIdStr = String(tabId).toLowerCase();
    
    // Check for profile pages
    if (tabIdStr.includes('-profile')) {
        const baseType = tabIdStr.replace('-profile', '');
        return TAB_COLORS[baseType] || TAB_COLORS.default;
    }
    
    // Check for search results
    if (tabIdStr.startsWith('search-')) {
        const searchType = tabIdStr.replace('search-', '');
        return TAB_COLORS[searchType] || TAB_COLORS.default;
    }
    
    // Check for page tabs (e.g., my-views-page)
    if (tabIdStr.endsWith('-page')) {
        const pageType = tabIdStr.replace('-page', '');
        return TAB_COLORS[pageType] || TAB_COLORS.default;
    }
    
    // Check for basic pages
    return TAB_COLORS[tabIdStr] || TAB_COLORS.default;
};

// Get CSS classes for tab styling
export const getTabColorClasses = (color, isActive = false) => {
    const colorMap = {
        'blue': {
            active: 'border-blue-500 bg-blue-50 text-blue-700',
            inactive: 'border-blue-300 bg-blue-50 text-blue-600 hover:border-blue-400 hover:bg-blue-100'
        },
        'green': {
            active: 'border-green-500 bg-green-50 text-green-700',
            inactive: 'border-green-300 bg-green-50 text-green-600 hover:border-green-400 hover:bg-green-100'
        },
        'purple': {
            active: 'border-purple-500 bg-purple-50 text-purple-700',
            inactive: 'border-purple-300 bg-purple-50 text-purple-600 hover:border-purple-400 hover:bg-purple-100'
        },
        'orange': {
            active: 'border-orange-500 bg-orange-50 text-orange-700',
            inactive: 'border-orange-300 bg-orange-50 text-orange-600 hover:border-orange-400 hover:bg-orange-100'
        },
        'gray': {
            active: 'border-gray-500 bg-gray-50 text-gray-700',
            inactive: 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-gray-100'
        },
        'red': {
            active: 'border-red-500 bg-red-50 text-red-700',
            inactive: 'border-red-300 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100'
        },
        'yellow': {
            active: 'border-yellow-500 bg-yellow-50 text-yellow-700',
            inactive: 'border-yellow-300 bg-yellow-50 text-yellow-600 hover:border-yellow-400 hover:bg-yellow-100'
        },
        'pink': {
            active: 'border-pink-500 bg-pink-50 text-pink-700',
            inactive: 'border-pink-300 bg-pink-50 text-pink-600 hover:border-pink-400 hover:bg-pink-100'
        },
        'indigo': {
            active: 'border-indigo-500 bg-indigo-50 text-indigo-700',
            inactive: 'border-indigo-300 bg-indigo-50 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-100'
        },
        'teal': {
            active: 'border-teal-500 bg-teal-50 text-teal-700',
            inactive: 'border-teal-300 bg-teal-50 text-teal-600 hover:border-teal-400 hover:bg-teal-100'
        }
    };
    
    const colorClasses = colorMap[color] || colorMap['blue'];
    return isActive ? colorClasses.active : colorClasses.inactive;
};

// Available colors for user selection
export const AVAILABLE_COLORS = [
    { name: 'Blue', value: 'blue', class: 'bg-blue-500' },
    { name: 'Green', value: 'green', class: 'bg-green-500' },
    { name: 'Purple', value: 'purple', class: 'bg-purple-500' },
    { name: 'Orange', value: 'orange', class: 'bg-orange-500' },
    { name: 'Gray', value: 'gray', class: 'bg-gray-500' },
    { name: 'Red', value: 'red', class: 'bg-red-500' },
    { name: 'Yellow', value: 'yellow', class: 'bg-yellow-500' },
    { name: 'Pink', value: 'pink', class: 'bg-pink-500' },
    { name: 'Indigo', value: 'indigo', class: 'bg-indigo-500' },
    { name: 'Teal', value: 'teal', class: 'bg-teal-500' }
];

// Get color class for a color value
export const getColorClass = (color) => {
    const colorOption = AVAILABLE_COLORS.find(c => c.value === color);
    return colorOption ? colorOption.class : 'bg-blue-500';
}; 