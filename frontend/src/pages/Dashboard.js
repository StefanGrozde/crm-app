// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { arrayMove } from '@dnd-kit/sortable';
import { useLocation } from 'react-router-dom';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import TabBar from '../components/TabBar';
import DashboardGrid from '../components/DashboardGrid';
import EmbeddedEditLayout from '../components/EmbeddedEditLayout';
import { useTabSession } from '../hooks/useTabSession';

const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
    // Auth context
    const { user } = useContext(AuthContext);
    const location = useLocation();

    // State variables
    const [layout, setLayout] = useState([]);
    const [widgetLibrary, setWidgetLibrary] = useState([]);
    const [views, setViews] = useState([]);
    const [currentViewId, setCurrentViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTabSwitching, setIsTabSwitching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    
    // Tab management state with session persistence
    const {
        openTabs,
        setOpenTabs,
        activeTabId,
        setActiveTabId,
        tabLayouts,
        setTabLayouts,
        // eslint-disable-next-line no-unused-vars
        loadSession,
        // eslint-disable-next-line no-unused-vars
        saveSession,
        clearSession,
        hasSession,
        getSessionInfo,
        isSessionLoading
    } = useTabSession(user?.id);

    // Track if a tab is being dragged
    const [isDraggingTab, setIsDraggingTab] = useState(false);
    const dragTimeoutRef = useRef(null);

    // Track previous openTabs length
    const prevTabsLengthRef = useRef(openTabs.length);
    const prevLocationRef = useRef(location.pathname);
    
    // Track navigation state
    const lastNavigationTimeRef = useRef(0);

    // Debug: Log state changes
    useEffect(() => {
        console.log('Current layout:', layout);
        console.log('Open tabs:', openTabs);
        console.log('Active tab:', activeTabId);
    }, [layout, openTabs, activeTabId]);

    // Define refreshCurrentView function early to avoid circular dependencies
    const refreshCurrentView = useCallback(async () => {
        if (!activeTabId || String(activeTabId).includes('-page') || String(activeTabId).includes('search-')) {
            console.log('Skipping refresh for non-view tab:', activeTabId);
            return;
        }

        try {
            setIsRefreshing(true);
            console.log('Refreshing current view from backend:', activeTabId);
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${activeTabId}`, { withCredentials: true });
            
            // Convert widgets to layout format
            let refreshedLayout = [];
            if (data.widgets && data.widgets.length > 0) {
                refreshedLayout = data.widgets.map(w => ({ 
                    i: w.widgetKey, 
                    x: w.x || 0, 
                    y: w.y || 0, 
                    w: w.w || 6, 
                    h: w.h || 2,
                    widgetKey: w.widgetKey,
                    widgetData: w.widgetData || {}
                }));
            }
            
            // Update the tab's layout in session
            setTabLayouts(prev => ({ ...prev, [activeTabId]: refreshedLayout }));
            
            // Always update the current layout immediately after refresh
            setLayout(refreshedLayout);
            console.log('Current layout updated with refreshed data:', refreshedLayout);
            
            // Update the tab name and color if they changed
            const currentTab = openTabs.find(tab => tab.id === activeTabId);
            if (currentTab && (currentTab.name !== data.name || currentTab.color !== data.color)) {
                setOpenTabs(prev => prev.map(tab => 
                    tab.id === activeTabId ? { 
                        ...tab, 
                        name: data.name,
                        color: data.color 
                    } : tab
                ));
                console.log('Tab updated:', { name: data.name, color: data.color });
            }
            
            // Also update the views state to keep it in sync
            setViews(prev => prev.map(view => 
                view.id === activeTabId ? { 
                    ...view, 
                    name: data.name,
                    color: data.color 
                } : view
            ));
            
            // Note: EditLayout return flag logic removed since we now use embedded edit mode
            
            console.log('View refreshed successfully:', data.name, 'Layout:', refreshedLayout);
        } catch (error) {
            console.error("Failed to refresh view", error);
            console.error("Error details:", error.response?.data);
            console.error("Error status:", error.response?.status);
            
            // Show user-friendly error message
            if (error.response?.status === 404) {
                console.log('View not found, it may have been deleted');
                // Optionally close the tab or show a message
            } else if (error.response?.status === 403) {
                console.log('Access denied to view');
            } else {
                console.log('Network or server error occurred');
            }
        } finally {
            setIsRefreshing(false);
        }
    }, [activeTabId, openTabs, setTabLayouts, setOpenTabs]);

    // Enhanced location change detection with timestamp tracking
    useEffect(() => {
        const currentPath = location.pathname;
        const previousPath = prevLocationRef.current;
        const currentTime = Date.now();
        
        console.log('Location changed from:', previousPath, 'to:', currentPath);
        console.log('Time since last navigation:', currentTime - lastNavigationTimeRef.current, 'ms');
        
        // Update navigation timestamp
        lastNavigationTimeRef.current = currentTime;
        
        // Note: Removed EditLayout navigation logic since we now use embedded edit mode
        // The refresh logic is now handled by the embedded edit mode save success callback
        
        prevLocationRef.current = currentPath;
    }, [location.pathname, activeTabId, refreshCurrentView]);

    // Note: Removed EditLayout return refresh logic since we now use embedded edit mode

    // Note: Removed EditLayout fallback refresh logic since we now use embedded edit mode

    // Note: Removed EditLayout aggressive refresh logic since we now use embedded edit mode

    // Note: Removed EditLayout return flag logic since we now use embedded edit mode

    // Note: Removed EditLayout mount refresh logic since we now use embedded edit mode

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                console.log('Loading initial data...');
                console.log('API_URL:', API_URL);
                console.log('User:', user);

                // Wait for session to be loaded first
                if (isSessionLoading) {
                    console.log('Waiting for session to load...');
                    return;
                }

                // Load widget library from backend (external widgets)
                console.log('Fetching widget library...');
                const widgetResponse = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
                console.log('Backend widget library:', widgetResponse.data);
                
                // Create hybrid widget library with built-in React widgets
                const builtinReactWidgets = [
                    {
                        key: 'contacts-widget',
                        name: 'Contacts Widget',
                        description: 'Manage and view contacts',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'contact-profile-widget',
                        name: 'Contact Profile Widget',
                        description: 'Display detailed contact information',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'search-result-widget',
                        name: 'Search Result Widget',
                        description: 'Display search results',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'leads-widget',
                        name: 'Leads Widget',
                        description: 'Manage and view leads',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'lead-profile-widget',
                        name: 'Lead Profile Widget',
                        description: 'Display detailed lead information',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'opportunities-widget',
                        name: 'Opportunities Widget',
                        description: 'Manage and view opportunities',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'opportunity-profile-widget',
                        name: 'Opportunity Profile Widget',
                        description: 'Display detailed opportunity information',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'business-widget',
                        name: 'Business Widget',
                        description: 'Manage and view businesses',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'business-profile-widget',
                        name: 'Business Profile Widget',
                        description: 'Display detailed business information',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'users-widget',
                        name: 'Users Widget',
                        description: 'Manage and view users',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'user-profile-widget',
                        name: 'User Profile Widget',
                        description: 'Display detailed user information',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'lead-conversion',
                        name: 'Lead Conversion Analytics',
                        description: 'Track lead conversion rates and metrics',
                        type: 'builtin-react',
                        path: null
                    },
                    {
                        key: 'my-views-widget',
                        name: 'My Views Widget',
                        description: 'Manage your dashboard views',
                        type: 'builtin-react',
                        path: null
                    }
                ];
                
                const hybridWidgetLibrary = [...builtinReactWidgets, ...widgetResponse.data];
                console.log('Hybrid widget library:', hybridWidgetLibrary);
                console.log('Widget library keys:', hybridWidgetLibrary.map(w => w.key));
                setWidgetLibrary(hybridWidgetLibrary);
                console.log('Widget library loaded:', hybridWidgetLibrary);
                console.log('Widget library length:', hybridWidgetLibrary.length);

                // Load views
                console.log('Fetching views...');
                const viewsResponse = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
                console.log('Views response:', viewsResponse);
                
                // Extract views from the paginated response
                const viewsData = viewsResponse.data.items || viewsResponse.data;
                setViews(viewsData);
                console.log('Views loaded:', viewsData);

                // Check if we have a saved session
                const sessionExists = hasSession();
                console.log('Has saved session:', sessionExists);

                if (sessionExists) {
                    // Session is already loaded by useTabSession, just validate and restore
                    console.log('Session exists, validating tabs...');
                    console.log('Current openTabs from hook:', openTabs);
                    console.log('Current activeTabId from hook:', activeTabId);
                    
                    // Use the state from the hook instead of reading from localStorage
                    const savedTabs = openTabs || [];
                    
                    // Validate that all saved tabs correspond to existing views
                    console.log('Validating saved tabs against views...');
                    console.log('Saved tabs:', savedTabs);
                    console.log('Available views:', viewsData.map(v => ({ id: v.id, name: v.name, is_default: v.is_default })));
                    
                    const validTabs = savedTabs.filter(tab => {
                        // Check if it's a search result tab, main page tab, or a regular view tab
                        if (String(tab.id).startsWith('search-') || String(tab.id).includes('-page')) {
                            console.log('Tab is special type (search/page):', tab.id);
                            return true; // Search result tabs and main page tabs are always valid
                        }
                        const isValid = viewsData.some(view => String(view.id) === String(tab.id));
                        console.log(`Tab ${tab.id} validation:`, isValid);
                        return isValid;
                    });

                    if (validTabs.length > 0) {
                        console.log('Valid tabs found:', validTabs);
                        // Don't set openTabs again since they're already set by the hook
                        
                        // Switch to the active tab if it's still valid
                        const savedActiveTab = activeTabId;
                        console.log('Saved active tab:', savedActiveTab, 'Type:', typeof savedActiveTab);
                        console.log('Valid tab IDs:', validTabs.map(tab => ({ id: tab.id, type: typeof tab.id })));
                        
                        if (savedActiveTab && validTabs.some(tab => String(tab.id) === String(savedActiveTab))) {
                            console.log('Switching to saved active tab:', savedActiveTab);
                            await switchToTab(savedActiveTab);
                        } else {
                            // Switch to the first valid tab
                            console.log('Saved active tab not found, switching to first valid tab:', validTabs[0].id);
                            await switchToTab(validTabs[0].id);
                        }
                    } else {
                        console.log('No valid tabs in session, checking if views exist...');
                        if (viewsData && viewsData.length > 0) {
                            console.log('Views exist but no valid tabs, opening first view');
                            const firstView = viewsData.find(v => v.is_default) || viewsData[0];
                            await openViewAsTab(firstView);
                        } else {
                            console.log('No views exist, creating default view');
                            await createDefaultView();
                        }
                    }
                } else {
                    // No saved session, check if user has any views
                    console.log('No saved session, checking for existing views...');
                    console.log('Views data:', viewsData);
                    console.log('Views data length:', viewsData ? viewsData.length : 'undefined');
                    
                    if (!viewsData || viewsData.length === 0) {
                        console.log('No views found, creating default view...');
                        await createDefaultView();
                    } else {
                        // Load the first view (or a view marked as default) as the first tab
                        console.log('Found existing views:', viewsData.map(v => ({ id: v.id, name: v.name, is_default: v.is_default })));
                        const defaultView = viewsData.find(v => v.is_default) || viewsData[0];
                        console.log('Loading default view as first tab:', defaultView);
                        await openViewAsTab(defaultView);
                    }
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
                console.error("Error details:", error.response?.data);
                console.error("Error status:", error.response?.status);
                
                // Only create a fallback default view if we don't have any views
                if (!views || views.length === 0) {
                    console.log('Creating fallback default view due to error');
                    await createDefaultView();
                } else {
                    console.log('Error occurred but views exist, not creating fallback');
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (user && !isSessionLoading) {
            loadInitialData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSessionLoading]);

    // Create a default view for the user
    const createDefaultView = async () => {
        try {
            console.log('Creating default view...');
            
            // Check if a default view already exists
            const existingDefaultView = views.find(v => v.is_default);
            if (existingDefaultView) {
                console.log('Default view already exists, opening it instead:', existingDefaultView);
                await openViewAsTab(existingDefaultView);
                return;
            }
            
            // Get available widgets to populate the default view
            const availableWidgets = widgetLibrary.slice(0, 4); // Take first 4 widgets
            
            // Create default layout with available widgets
            const defaultWidgets = availableWidgets.map((widget, index) => ({
                widgetKey: widget.key,
                x: (index % 2) * 6, // Alternate between x=0 and x=6
                y: Math.floor(index / 2) * 2, // Stack rows
                w: 6,
                h: 2
            }));

            // If no widgets available, create empty view
            const viewData = {
                name: 'My Dashboard',
                widgets: defaultWidgets,
                isDefault: true
            };

            console.log('Creating default view with data:', viewData);
            
            const response = await axios.post(`${API_URL}/api/dashboard/views`, viewData, { withCredentials: true });
            console.log('Default view created:', response.data);
            
            // Update state with the new default view
            setViews(prevViews => [response.data, ...prevViews]);
            
            // Open the newly created default view as a tab
            await openViewAsTab(response.data);
            
        } catch (error) {
            console.error('Failed to create default view:', error);
            
            // Create a client-side fallback
            const fallbackView = {
                id: 'fallback-default',
                name: 'My Dashboard',
                widgets: [],
                is_default: true
            };
            
            const fallbackLayout = [];
            setViews([fallbackView]);
            await openViewAsTab(fallbackView, fallbackLayout);
        }
    };

    // Open a view as a new tab
    const openViewAsTab = async (view, customLayout = null) => {
        try {
            console.log('Opening view as tab:', view);
            
            let tabLayout = [];
            if (customLayout) {
                tabLayout = customLayout;
            } else if (view.widgets && view.widgets.length > 0) {
                tabLayout = view.widgets.map(w => ({ 
                    i: w.widgetKey, 
                    x: w.x || 0, 
                    y: w.y || 0, 
                    w: w.w || 6, 
                    h: w.h || 2,
                    widgetKey: w.widgetKey,
                    widgetData: w.widgetData || {}
                }));
            }
            
            // Add the view to open tabs if not already open
            const isTabOpen = openTabs.find(tab => tab.id === view.id);
            if (!isTabOpen) {
                const newTab = {
                    id: view.id,
                    name: view.name,
                    isDefault: view.is_default,
                    color: view.color
                };
                
                // Update all state synchronously
                setOpenTabs(prev => [...prev, newTab]);
                setTabLayouts(prev => ({ ...prev, [view.id]: tabLayout }));
                
                // Switch to the new tab immediately
                setIsTabSwitching(true);
                setActiveTabId(view.id);
                setCurrentViewId(view.id);
                setLayout(tabLayout);
                
                console.log('Opened new tab:', view.id, 'with layout:', tabLayout);
                
                // Small delay to ensure state updates are processed
                setTimeout(() => setIsTabSwitching(false), 50);
            } else {
                // If already open, just switch
                await switchToTab(view.id);
            }
        } catch (error) {
            console.error('Failed to open view as tab:', error);
        }
    };

    // Effect: Track tab count for debugging (removed backup switching to prevent race conditions)
    useEffect(() => {
        console.log('Tab count changed:', openTabs.length, 'Previous:', prevTabsLengthRef.current);
        prevTabsLengthRef.current = openTabs.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openTabs]);

    // Switch to a specific tab
    const switchToTab = async (tabId) => {
        console.log('Switching to tab:', tabId, 'Type:', typeof tabId);
        console.log('Available tab layouts:', Object.keys(tabLayouts));
        
        setIsTabSwitching(true);
        
        try {
            // Update active tab
            setActiveTabId(tabId);
            setCurrentViewId(tabId);
            
            // Load the tab's layout
            const tabLayout = tabLayouts[tabId] || [];
            console.log('Loading layout for tab:', tabId, 'Layout:', tabLayout);
            setLayout(tabLayout);
            
            console.log('Switched to tab:', tabId, 'with layout:', tabLayout);
        } finally {
            // Small delay to ensure state updates are processed
            setTimeout(() => setIsTabSwitching(false), 50);
        }
    };

    // Close a tab
    const closeTab = async (tabId) => {
        console.log('Closing tab:', tabId);
        
        // Don't close if it's the only tab
        if (openTabs.length <= 1) {
            alert('Cannot close the last tab. Please open another view first.');
            return;
        }
        
        // Remove tab from open tabs
        const newOpenTabs = openTabs.filter(tab => tab.id !== tabId);
        setOpenTabs(newOpenTabs);
        
        // Keep the layout data in memory (don't delete it)
        // This allows the tab to be reopened with the same layout
        
        // If we're closing the active tab, switch to another tab
        if (activeTabId === tabId) {
            const remainingTabs = newOpenTabs;
            const newActiveTab = remainingTabs[0]; // Switch to first remaining tab
            await switchToTab(newActiveTab.id);
        }
    };

    // Load specific view (now opens as tab)
    const loadView = async (viewId) => {
        try {
            console.log('Loading view:', viewId);
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
            await openViewAsTab(data);
        } catch (error) { 
            console.error("Failed to load view", error); 
        }
    };



    // Refresh views list from backend
    const refreshViewsList = async () => {
        try {
            console.log('Refreshing views list from backend');
            const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
            
            // Extract views from the paginated response
            const viewsData = data.items || data;
            setViews(viewsData);
            console.log('Views list refreshed successfully:', viewsData.length, 'views');
            
            // Validate that current tabs still exist
            const validTabs = openTabs.filter(tab => {
                if (String(tab.id).startsWith('search-') || String(tab.id).includes('-page')) {
                    return true; // Search result tabs and main page tabs are always valid
                }
                return viewsData.some(view => String(view.id) === String(tab.id));
            });
            
            if (validTabs.length !== openTabs.length) {
                console.log('Some tabs are no longer valid, updating tab list');
                setOpenTabs(validTabs);
                
                // If the active tab is no longer valid, switch to the first valid tab
                if (activeTabId && !validTabs.some(tab => String(tab.id) === String(activeTabId))) {
                    if (validTabs.length > 0) {
                        console.log('Active tab no longer valid, switching to first valid tab');
                        await switchToTab(validTabs[0].id);
                    } else {
                        console.log('No valid tabs remaining');
                        setActiveTabId(null);
                        setCurrentViewId(null);
                        setLayout([]);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to refresh views list", error);
            console.error("Error details:", error.response?.data);
            console.error("Error status:", error.response?.status);
        }
    };

    // Handle opening search results as new tabs
    const handleOpenSearchResult = (result) => {
        console.log('Opening search result as tab:', result);
        
        // Create a unique ID for the search result tab
        const tabId = `search-${result.type}-${result.id}`;
        
        // Check if tab is already open
        const isTabOpen = openTabs.find(tab => tab.id === tabId);
        if (isTabOpen) {
            // If already open, just switch to it
            switchToTab(tabId);
            return;
        }
        
        // Create a new tab for the search result
        const newTab = {
            id: tabId,
            name: (result.type === 'contact' || result.type === 'contacts') ? result.title : `${result.title} (${result.type})`,
            isDefault: false,
            color: result.type === 'contact' || result.type === 'contacts' ? 'blue' :
                   result.type === 'lead' || result.type === 'leads' ? 'green' :
                   result.type === 'opportunity' || result.type === 'opportunities' ? 'purple' :
                   result.type === 'company' || result.type === 'business' ? 'orange' :
                   result.type === 'user' || result.type === 'users' ? 'gray' : 'blue'
        };
        
        // Create a simple layout for the search result
        let resultLayout;
        
        // For contacts, use the contact profile widget
        if (result.type === 'contact' || result.type === 'contacts') {
            resultLayout = [{
                i: `contact-profile-${result.id}`,
                x: 0,
                y: 0,
                w: 12,
                h: 8,
                widgetKey: 'contact-profile-widget',
                widgetData: { contactId: result.id }
            }];
        } else if (result.type === 'lead' || result.type === 'leads') {
            // For leads, use the lead profile widget
            resultLayout = [{
                i: `lead-profile-${result.id}`,
                x: 0,
                y: 0,
                w: 12,
                h: 8,
                widgetKey: `lead-profile-widget-${result.id}`,
                widgetData: { leadId: result.id }
            }];
        } else if (result.type === 'opportunity' || result.type === 'opportunities') {
            // For opportunities, use the opportunity profile widget
            resultLayout = [{
                i: `opportunity-profile-${result.id}`,
                x: 0,
                y: 0,
                w: 12,
                h: 8,
                widgetKey: 'opportunity-profile-widget',
                widgetData: { opportunityId: result.id }
            }];
        } else if (result.type === 'user' || result.type === 'users') {
            // For users, use the user profile widget
            resultLayout = [{
                i: `user-profile-${result.id}`,
                x: 0,
                y: 0,
                w: 12,
                h: 8,
                widgetKey: 'user-profile-widget',
                widgetData: { userId: result.id }
            }];
        } else {
            resultLayout = [{
                i: `search-result-${result.id}`,
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                widgetKey: 'search-result-widget',
                resultData: result // Store the result data in the layout item
            }, {
                i: `search-result-details-${result.id}`,
                x: 12, // This extends beyond the 12-column grid
                y: 0,
                w: 8,
                h: 4,
                widgetKey: 'search-result-widget',
                resultData: { ...result, isDetails: true } // Additional details widget
            }];
        }
        
        // Update all state synchronously
        setOpenTabs(prev => [...prev, newTab]);
        setTabLayouts(prev => ({ ...prev, [tabId]: resultLayout }));
        
        // Switch to the new tab immediately
        setIsTabSwitching(true);
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        setLayout(resultLayout);
        
        console.log('Opened search result tab:', tabId, 'with layout:', resultLayout);
        
        // Small delay to ensure state updates are processed
        setTimeout(() => setIsTabSwitching(false), 50);
    };

    // Consolidated main function to handle opening any profile type as a tab
    const handleOpenProfile = async (profileType, profileId, profileName = null) => {
        console.log(`Opening ${profileType} profile as tab:`, profileId, profileName);
        
        // Create a unique ID for the profile tab
        const tabId = `${profileType}-profile-${profileId}`;
        
        // Check if tab is already open
        const isTabOpen = openTabs.find(tab => tab.id === tabId);
        if (isTabOpen) {
            // If already open, just switch to it
            switchToTab(tabId);
            return;
        }
        
        // Profile type configurations
        const profileConfigs = {
            contact: {
                endpoint: 'contacts',
                nameFields: (data) => `${data.firstName} ${data.lastName}`,
                defaultName: 'Contact Profile'
            },
            opportunity: {
                endpoint: 'opportunities',
                nameFields: (data) => data.name,
                defaultName: 'Opportunity Profile'
            },
            lead: {
                endpoint: 'leads',
                nameFields: (data) => data.title,
                defaultName: 'Lead Profile'
            },
            user: {
                endpoint: 'users',
                nameFields: (data) => data.username || data.email,
                defaultName: 'User Profile'
            },
            business: {
                endpoint: 'businesses',
                nameFields: (data) => data.name,
                defaultName: 'Business Profile'
            }
        };
        
        const config = profileConfigs[profileType];
        if (!config) {
            console.error(`Unknown profile type: ${profileType}`);
            return;
        }
        
        // Use provided name or fetch it from API
        let displayName = profileName || config.defaultName;
        if (!profileName) {
            try {
                const response = await axios.get(`${API_URL}/api/${config.endpoint}/${profileId}`, {
                    withCredentials: true
                });
                displayName = config.nameFields(response.data);
            } catch (error) {
                console.error(`Failed to fetch ${profileType} details for tab name:`, error);
            }
        }
        
        // Create a new tab for the profile
        const newTab = {
            id: tabId,
            name: displayName,
            isDefault: false,
            color: profileType === 'contact' ? 'blue' :
                   profileType === 'lead' ? 'green' :
                   profileType === 'opportunity' ? 'purple' :
                   profileType === 'business' ? 'orange' :
                   profileType === 'user' ? 'gray' : 'blue'
        };
        
        // Create a simple layout for the profile
        const profileLayout = [{
            i: `${profileType}-profile-${profileId}`,
            x: 0,
            y: 0,
            w: 12,
            h: 8,
            widgetKey: `${profileType}-profile-widget-${profileId}`,
            widgetData: { [`${profileType}Id`]: profileId }
        }];
        
        // Update all state synchronously
        setOpenTabs(prev => [...prev, newTab]);
        setTabLayouts(prev => ({ ...prev, [tabId]: profileLayout }));
        
        // Switch to the new tab immediately
        setIsTabSwitching(true);
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        setLayout(profileLayout);
        
        console.log(`Opened ${profileType} profile tab:`, tabId, 'with layout:', profileLayout);
        
        // Small delay to ensure state updates are processed
        setTimeout(() => setIsTabSwitching(false), 50);
    };

    // Simplified individual functions that call the main function
    const handleOpenContactProfile = async (contactId) => {
        console.log('Dashboard handleOpenContactProfile called with contactId:', contactId);
        await handleOpenProfile('contact', contactId);
    };

    const handleOpenOpportunityProfile = async (opportunityId, opportunityTitle) => {
        await handleOpenProfile('opportunity', opportunityId, opportunityTitle);
    };

    const handleOpenLeadProfile = async (leadId, leadTitle) => {
        await handleOpenProfile('lead', leadId, leadTitle);
    };

    const handleOpenUserProfile = async (userId, userName) => {
        await handleOpenProfile('user', userId, userName);
    };

    const handleOpenBusinessProfile = async (businessId, businessName) => {
        await handleOpenProfile('business', businessId, businessName);
    };

    // Generic function to open any page as a new tab
    const handleOpenPageTab = (pageType, pageName, widgetKey) => {
        console.log(`Opening ${pageName} tab`);
        
        const tabId = `${pageType}-page`;
        
        // Check if tab is already open
        const isTabOpen = openTabs.find(tab => tab.id === tabId);
        if (isTabOpen) {
            // If already open, just switch to it
            switchToTab(tabId);
            return;
        }
        
        // Create a new tab with appropriate color
        const newTab = {
            id: tabId,
            name: pageName,
            isDefault: false,
            color: pageType === 'my-views' ? 'green' : undefined // My Views gets green color
        };
        
        // Create a layout for the widget
        const pageLayout = [{
            i: widgetKey,
            x: 0,
            y: 0,
            w: 12,
            h: 8,
            widgetKey: widgetKey,
            widgetData: {}
        }];
        
        // Update all state synchronously
        setOpenTabs(prev => [...prev, newTab]);
        setTabLayouts(prev => ({ ...prev, [tabId]: pageLayout }));
        
        // Switch to the new tab immediately
        setIsTabSwitching(true);
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        setLayout(pageLayout);
        
        console.log('Opened new page tab:', tabId, 'with layout:', pageLayout);
        
        // Small delay to ensure state updates are processed
        setTimeout(() => setIsTabSwitching(false), 50);
    };

    // Handle opening My Views as a tab
    const handleOpenMyViews = () => {
        handleOpenPageTab('my-views', 'My Views', 'my-views-widget');
    };

    // Handle entering edit mode
    const handleEnterEditMode = () => {
        if (activeTabId && !String(activeTabId).includes('-page') && !String(activeTabId).includes('search-')) {
            console.log('Entering edit mode for view:', activeTabId);
            setIsEditMode(true);
        }
    };

    // Handle exiting edit mode
    const handleExitEditMode = () => {
        console.log('Exiting edit mode');
        setIsEditMode(false);
    };

    // Handle save success from edit mode
    const handleEditSaveSuccess = (updatedView) => {
        console.log('Edit save success:', updatedView);
        // Refresh the current view data
        if (activeTabId === updatedView.id) {
            refreshCurrentView();
        }
        // Also refresh the views list to update the dropdown
        refreshViewsList();
    };

    // Create sample data for testing
    const createSampleData = async () => {
        try {
            const response = await axios.post(`${API_URL}/api/search/sample-data`, {}, { withCredentials: true });
            alert(`Sample data created successfully! Created ${response.data.created.contacts} contacts, ${response.data.created.leads} leads, and ${response.data.created.opportunities} opportunities.`);
        } catch (error) {
            console.error('Failed to create sample data:', error);
            alert('Failed to create sample data. Please check the console for details.');
        }
    };

    // Test table accessibility
    const testTables = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/search/test-tables`, { withCredentials: true });
            console.log('Table test results:', response.data);
            alert(`Table test completed! Check console for details.`);
        } catch (error) {
            console.error('Failed to test tables:', error);
            alert('Failed to test tables. Please check the console for details.');
        }
    };

    // Debug session info
    const debugSessionInfo = () => {
        const sessionInfo = getSessionInfo();
        console.log('Session info:', sessionInfo);
        console.log('Current state - openTabs:', openTabs);
        console.log('Current state - activeTabId:', activeTabId, 'Type:', typeof activeTabId);
        console.log('Current state - tabLayouts keys:', Object.keys(tabLayouts));
        console.log('Session loading state:', isSessionLoading);
        
        // Get raw localStorage data for comparison
        const sessionKey = `dashboard_tab_session_${user?.id}`;
        const rawSession = localStorage.getItem(sessionKey);
        console.log('Raw localStorage session:', rawSession ? JSON.parse(rawSession) : 'None');
        
        alert(`Session Info:\nExists: ${sessionInfo.exists}\nTab Count: ${sessionInfo.tabCount || 0}\nActive Tab: ${sessionInfo.activeTab || 'None'} (${typeof sessionInfo.activeTab})\nCurrent Active Tab: ${activeTabId || 'None'} (${typeof activeTabId})\nSession Loading: ${isSessionLoading}\nAge: ${sessionInfo.age ? Math.round(sessionInfo.age / 1000 / 60) + ' minutes' : 'N/A'}\nExpires In: ${sessionInfo.expiresIn ? Math.round(sessionInfo.expiresIn / 1000 / 60) + ' minutes' : 'N/A'}`);
    };

    // Handle tab drag end
    const handleTabDragEnd = (event) => {
        const { active, over } = event;
        // Add a 100ms delay before allowing tab switching again
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        dragTimeoutRef.current = setTimeout(() => {
            setIsDraggingTab(false);
        }, 100);
        if (active && over && active.id !== over.id) {
            const oldIndex = openTabs.findIndex(tab => tab.id === active.id);
            const newIndex = openTabs.findIndex(tab => tab.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newTabs = arrayMove(openTabs, oldIndex, newIndex);
                setOpenTabs(newTabs);
            }
        }
    };

    // Handle tab drag start
    const handleTabDragStart = () => {
        setIsDraggingTab(true);
    };

    // Handle tab color update
    const handleUpdateTabColor = async (tabId, newColor) => {
        try {
            console.log('Updating tab color:', tabId, 'to:', newColor);
            
            // Update the view color in the backend
            await axios.patch(`${API_URL}/api/dashboard/views/${tabId}/color`, 
                { color: newColor }, 
                { withCredentials: true }
            );
            
            // Update the tab data in the openTabs state
            setOpenTabs(prev => prev.map(tab => 
                tab.id === tabId 
                    ? { ...tab, color: newColor }
                    : tab
            ));
            
            // Update the views state to reflect the change
            setViews(prev => prev.map(view => 
                view.id === tabId 
                    ? { ...view, color: newColor }
                    : view
            ));
            
            console.log('Tab color updated successfully');
        } catch (error) {
            console.error('Failed to update tab color:', error);
            // You could show a toast notification here
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        };
    }, []);

    // Note: Removed EditLayout enhanced refresh mechanism since we now use embedded edit mode

    if (!user) return <div>Loading...</div>;
    if (isLoading || isSessionLoading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading dashboard...</div>;

    return (
        <>
            <style>
                {`
                   .tab-close-button {
                       opacity: 0;
                       transition: opacity 0.2s;
                   }
                   .tab:hover .tab-close-button {
                       opacity: 1;
                   }
                   

                   

               `}
            </style>
            <div className="min-h-screen bg-gray-100">
                {/* Debug info - Remove in production */}
                <div className="bg-yellow-100 p-2 text-xs">
                    <div className="flex justify-between items-center">
                        <div>
                            <strong>Debug:</strong> 
                            ViewID: {currentViewId || 'None'} | 
                            Layout items: {layout.length} | 
                            Widgets: {widgetLibrary.length} |
                            Open tabs: {openTabs.length} |
                            Active tab: {activeTabId || 'None'} |
                            Session: {openTabs.length > 0 ? 'Saved' : 'None'} |
                            Session Loading: {isSessionLoading ? 'Yes' : 'No'} |
                            Refreshing: {isRefreshing ? 'Yes' : 'No'} |
                            Nav Time: {Math.round((Date.now() - lastNavigationTimeRef.current) / 1000)}s |
                            Grid: 12 cols (Responsive) |
                            Layout: {layout.length > 0 ? `${layout.length} items` : 'Empty'}
                        </div>
                        {user.role === 'Administrator' && (
                            <>
                                <button
                                    onClick={createSampleData}
                                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 mr-2"
                                >
                                    Create Sample Data
                                </button>
                                <button
                                    onClick={testTables}
                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 mr-2"
                                >
                                    Test Tables
                                </button>
                            </>
                        )}
                        <button
                            onClick={clearSession}
                            className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 mr-2"
                            title="Clear saved tab session"
                        >
                            Clear Session
                        </button>
                        <button
                            onClick={debugSessionInfo}
                            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 mr-2"
                            title="Show session debug info"
                        >
                            Session Info
                        </button>
                        <button
                            onClick={refreshCurrentView}
                            className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 mr-2"
                            title="Refresh current view from backend"
                        >
                            Refresh View
                        </button>
                        <button
                            onClick={refreshViewsList}
                            className="px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 mr-2"
                            title="Refresh views list from backend"
                        >
                            Refresh Views
                        </button>
                        <button
                            onClick={() => {
                                console.log('Manual refresh trigger - navigation time:', Date.now() - lastNavigationTimeRef.current);
                                refreshCurrentView();
                            }}
                            className="px-2 py-1 bg-pink-500 text-white text-xs rounded hover:bg-pink-600"
                            title="Force refresh current view"
                        >
                            Force Refresh
                        </button>
                        <button
                            onClick={() => {
                                // Test scroll functionality by creating a wide layout
                                const testLayout = [
                                    { i: 'test-widget-1', x: 0, y: 0, w: 12, h: 4, widgetKey: 'contacts-widget', widgetData: {} },
                                    { i: 'test-widget-2', x: 12, y: 0, w: 8, h: 4, widgetKey: 'leads-widget', widgetData: {} },
                                    { i: 'test-widget-3', x: 20, y: 0, w: 6, h: 4, widgetKey: 'opportunities-widget', widgetData: {} }
                                ];
                                const testTabId = 'test-scroll-tab';
                                const testTab = {
                                    id: testTabId,
                                    name: 'Test Scroll Tab',
                                    isDefault: false,
                                    color: 'purple'
                                };
                                
                                setOpenTabs(prev => [...prev, testTab]);
                                setTabLayouts(prev => ({ ...prev, [testTabId]: testLayout }));
                                setActiveTabId(testTabId);
                                setCurrentViewId(testTabId);
                                setLayout(testLayout);
                                console.log('Created test scroll tab with layout:', testLayout);
                            }}
                            className="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                            title="Test scroll functionality"
                        >
                            Test Scroll
                        </button>
                    </div>
                </div>

                {/* Layout Debug Info */}
                {layout.length > 0 && (
                    <div className="bg-blue-100 p-2 text-xs">
                        <strong>Layout Debug:</strong> {layout.map(item => 
                            `${item.i}: ${item.w}x${item.h}@(${item.x},${item.y})`
                        ).join(' | ')}
                    </div>
                )}

                {/* Refresh indicator */}
                {isRefreshing && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 mx-4 mb-4">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            <span className="text-green-800 font-medium">
                                Refreshing dashboard view...
                            </span>
                        </div>
                    </div>
                )}

                <Navbar 
                    views={views}
                    onLoadView={loadView}
                    onOpenSearchResult={handleOpenSearchResult}
                    onOpenPageTab={handleOpenPageTab}
                    onOpenUserProfile={handleOpenUserProfile}
                    onOpenMyViews={handleOpenMyViews}
                    currentViewId={currentViewId}
                    onEnterEditMode={handleEnterEditMode}
                    isEditMode={isEditMode}
                />

                <TabBar 
                    openTabs={openTabs}
                    activeTabId={activeTabId}
                    onSwitchTab={switchToTab}
                    onCloseTab={closeTab}
                    onTabDragEnd={handleTabDragEnd}
                    onTabDragStart={handleTabDragStart}
                    isDraggingTab={isDraggingTab}
                    onRefreshTab={refreshCurrentView}
                    isRefreshing={isRefreshing}
                    onUpdateTabColor={handleUpdateTabColor}
                />

                <main className="p-4">
                    {/* No active tab message */}
                    {!activeTabId && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                No views open. Use the dropdown above to open a view.
                            </div>
                        </div>
                    )}

                    {/* Grid layout - only show if there's an active tab and layout is ready */}
                    {activeTabId && layout && !isEditMode && (
                        <DashboardGrid
                            layout={layout}
                            widgetLibrary={widgetLibrary}
                            isVisible={!isTabSwitching}
                            isDashboardView={typeof activeTabId === 'number' || (typeof activeTabId === 'string' && /^\d+$/.test(activeTabId))}
                            onWidgetReady={(widgetKey, loadTime) => {
                                console.log(`Widget ${widgetKey} ready in ${loadTime}ms`);
                            }}
                            onWidgetError={(widgetKey, error) => {
                                console.error(`Widget ${widgetKey} error:`, error);
                            }}
                            onOpenContactProfile={handleOpenContactProfile}
                            onOpenLeadProfile={handleOpenLeadProfile}
                            onOpenOpportunityProfile={handleOpenOpportunityProfile}
                            onOpenBusinessProfile={handleOpenBusinessProfile}
                            onOpenUserProfile={handleOpenUserProfile}
                        />
                    )}
                    
                    {/* Edit Layout Mode */}
                    {activeTabId && isEditMode && !String(activeTabId).includes('-page') && !String(activeTabId).includes('search-') && (
                        <EmbeddedEditLayout
                            viewId={activeTabId}
                            onExitEditMode={handleExitEditMode}
                            onSaveSuccess={handleEditSaveSuccess}
                        />
                    )}
                    
                    {/* Loading state for active tab */}
                    {activeTabId && (!layout || isTabSwitching) && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                {isTabSwitching ? 'Switching tabs...' : 'Loading tab content...'}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default Dashboard;