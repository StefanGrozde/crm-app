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
    console.log('getTabColor called with:', { tabId, tabData, tabIdType: typeof tabId });
    
    // If tab has custom color data (for dashboard views)
    if (tabData && tabData.color) {
        console.log('Using tabData color:', tabData.color);
        return tabData.color;
    }
    
    // Check if it's a dashboard view (numeric ID)
    if (typeof tabId === 'number' || (typeof tabId === 'string' && /^\d+$/.test(tabId))) {
        const color = tabData?.color || TAB_COLORS.default;
        console.log('Dashboard view color:', color);
        return color;
    }
    
    // Check for specific tab types
    const tabIdStr = String(tabId).toLowerCase();
    console.log('Processing tabIdStr:', tabIdStr);
    
    // Check for profile pages
    if (tabIdStr.includes('-profile')) {
        const baseType = tabIdStr.replace('-profile', '');
        const color = TAB_COLORS[baseType] || TAB_COLORS.default;
        console.log('Profile page color:', color, 'for baseType:', baseType);
        return color;
    }
    
    // Check for search results
    if (tabIdStr.startsWith('search-')) {
        const searchType = tabIdStr.replace('search-', '');
        const color = TAB_COLORS[searchType] || TAB_COLORS.default;
        console.log('Search result color:', color, 'for searchType:', searchType);
        return color;
    }
    
    // Check for page tabs (e.g., my-views-page)
    if (tabIdStr.endsWith('-page')) {
        const pageType = tabIdStr.replace('-page', '');
        const color = TAB_COLORS[pageType] || TAB_COLORS.default;
        console.log('Page tab color:', color, 'for pageType:', pageType);
        return color;
    }
    
    // Check for basic pages
    const color = TAB_COLORS[tabIdStr] || TAB_COLORS.default;
    console.log('Basic page color:', color, 'for tabIdStr:', tabIdStr);
    return color;
};

// Get CSS classes for tab styling
export const getTabColorClasses = (color, isActive = false) => {
    console.log('getTabColorClasses called with:', { color, isActive });
    
    const colorMap = {
        'blue': {
            active: 'border-blue-500 bg-blue-50 text-blue-700',
            inactive: 'border-transparent hover:border-blue-300 hover:bg-blue-50'
        },
        'green': {
            active: 'border-green-500 bg-green-50 text-green-700',
            inactive: 'border-transparent hover:border-green-300 hover:bg-green-50'
        },
        'purple': {
            active: 'border-purple-500 bg-purple-50 text-purple-700',
            inactive: 'border-transparent hover:border-purple-300 hover:bg-purple-50'
        },
        'orange': {
            active: 'border-orange-500 bg-orange-50 text-orange-700',
            inactive: 'border-transparent hover:border-orange-300 hover:bg-orange-50'
        },
        'gray': {
            active: 'border-gray-500 bg-gray-50 text-gray-700',
            inactive: 'border-transparent hover:border-gray-300 hover:bg-gray-50'
        },
        'red': {
            active: 'border-red-500 bg-red-50 text-red-700',
            inactive: 'border-transparent hover:border-red-300 hover:bg-red-50'
        },
        'yellow': {
            active: 'border-yellow-500 bg-yellow-50 text-yellow-700',
            inactive: 'border-transparent hover:border-yellow-300 hover:bg-yellow-50'
        },
        'pink': {
            active: 'border-pink-500 bg-pink-50 text-pink-700',
            inactive: 'border-transparent hover:border-pink-300 hover:bg-pink-50'
        },
        'indigo': {
            active: 'border-indigo-500 bg-indigo-50 text-indigo-700',
            inactive: 'border-transparent hover:border-indigo-300 hover:bg-indigo-50'
        },
        'teal': {
            active: 'border-teal-500 bg-teal-50 text-teal-700',
            inactive: 'border-transparent hover:border-teal-300 hover:bg-teal-50'
        }
    };
    
    const colorClasses = colorMap[color] || colorMap['blue'];
    const result = isActive ? colorClasses.active : colorClasses.inactive;
    console.log('Returning color classes:', result);
    return result;
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