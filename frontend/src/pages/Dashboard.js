// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { arrayMove } from '@dnd-kit/sortable';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from '../components/SaveViewModal';
import Navbar from '../components/Navbar';
import TabBar from '../components/TabBar';
import EditLayoutControls from '../components/EditLayoutControls';
import DynamicWidget from '../components/DynamicWidget';
import { useTabSession } from '../hooks/useTabSession';

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
    // Auth context
    const { user } = useContext(AuthContext);

    // State variables
    const [layout, setLayout] = useState([]);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [widgetLibrary, setWidgetLibrary] = useState([]);
    const [views, setViews] = useState([]);
    const [currentViewId, setCurrentViewId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isTabSwitching, setIsTabSwitching] = useState(false);
    
    // Tab management state with session persistence
    const {
        openTabs,
        setOpenTabs,
        activeTabId,
        setActiveTabId,
        tabLayouts,
        setTabLayouts,
        tabEditModes,
        setTabEditModes,
        loadSession,
        // eslint-disable-next-line no-unused-vars
        saveSession,
        clearSession,
        hasSession,
        getSessionInfo
    } = useTabSession(user?.id);
    
    // Modal states
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);

    // Track if a tab is being dragged
    const [isDraggingTab, setIsDraggingTab] = useState(false);
    const dragTimeoutRef = useRef(null);

    // Track previous openTabs length
    const prevTabsLengthRef = useRef(openTabs.length);



    // Debug: Log state changes
    useEffect(() => {
        console.log('Edit mode changed:', isEditMode);
        console.log('Current layout:', layout);
        console.log('Original layout:', originalLayout);
        console.log('Open tabs:', openTabs);
        console.log('Active tab:', activeTabId);
    }, [isEditMode, layout, originalLayout, openTabs, activeTabId]);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                console.log('Loading initial data...');
                console.log('API_URL:', API_URL);
                console.log('User:', user);

                // Load widget library
                console.log('Fetching widget library...');
                const widgetResponse = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
                console.log('Widget library response:', widgetResponse);
                setWidgetLibrary(widgetResponse.data);
                console.log('Widget library loaded:', widgetResponse.data);

                // Load views
                console.log('Fetching views...');
                const viewsResponse = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
                console.log('Views response:', viewsResponse);
                setViews(viewsResponse.data);
                console.log('Views loaded:', viewsResponse.data);

                // Check if we have a saved session
                const sessionExists = hasSession();
                console.log('Has saved session:', sessionExists);

                if (sessionExists) {
                    // Load the session data
                    console.log('Loading saved session...');
                    loadSession();
                    
                    // Validate and restore session immediately
                    console.log('Session loaded, validating tabs...');
                    
                    // Get the current session data after loading
                    const sessionKey = `dashboard_tab_session_${user.id}`;
                    const savedSession = localStorage.getItem(sessionKey);
                    
                    if (savedSession) {
                        const sessionData = JSON.parse(savedSession);
                        const savedTabs = sessionData.openTabs || [];
                        
                        // Validate that all saved tabs correspond to existing views
                        const validTabs = savedTabs.filter(tab => {
                            // Check if it's a search result tab, main page tab, or a regular view tab
                            if (String(tab.id).startsWith('search-') || String(tab.id).includes('-page')) {
                                return true; // Search result tabs and main page tabs are always valid
                            }
                            return viewsResponse.data.some(view => String(view.id) === String(tab.id));
                        });

                        if (validTabs.length > 0) {
                            console.log('Valid tabs found:', validTabs);
                            setOpenTabs(validTabs);
                            
                            // Switch to the active tab if it's still valid
                            const savedActiveTab = sessionData.activeTabId;
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
                            console.log('No valid tabs in session, creating default view');
                            await createDefaultView();
                        }
                    }
                } else {
                    // No saved session, check if user has any views
                    if (!viewsResponse.data || viewsResponse.data.length === 0) {
                        console.log('No views found, creating default view...');
                        await createDefaultView();
                    } else {
                        // Load the first view (or a view marked as default) as the first tab
                        const defaultView = viewsResponse.data.find(v => v.isDefault) || viewsResponse.data[0];
                        console.log('Loading default view as first tab:', defaultView);
                        await openViewAsTab(defaultView);
                    }
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
                console.error("Error details:", error.response?.data);
                console.error("Error status:", error.response?.status);
                
                // Create a fallback default view
                console.log('Creating fallback default view due to error');
                await createDefaultView();
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            loadInitialData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Create a default view for the user
    const createDefaultView = async () => {
        try {
            console.log('Creating default view...');
            
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
            const newViews = [response.data];
            setViews(newViews);
            
            // Open the newly created default view as a tab
            await openViewAsTab(response.data);
            
        } catch (error) {
            console.error('Failed to create default view:', error);
            
            // Create a client-side fallback
            const fallbackView = {
                id: 'fallback-default',
                name: 'My Dashboard',
                widgets: [],
                isDefault: true
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
                    h: w.h || 2 
                }));
            }
            
            // Add the view to open tabs if not already open
            const isTabOpen = openTabs.find(tab => tab.id === view.id);
            if (!isTabOpen) {
                const newTab = {
                    id: view.id,
                    name: view.name,
                    isDefault: view.isDefault
                };
                
                // Update all state synchronously
                setOpenTabs(prev => [...prev, newTab]);
                setTabLayouts(prev => ({ ...prev, [view.id]: tabLayout }));
                setTabEditModes(prev => ({ ...prev, [view.id]: false }));
                
                // Switch to the new tab immediately
                setIsTabSwitching(true);
                setActiveTabId(view.id);
                setCurrentViewId(view.id);
                setLayout(tabLayout);
                setOriginalLayout([...tabLayout]);
                setIsEditMode(false);
                
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
        console.log('Available tab edit modes:', Object.keys(tabEditModes));
        
        setIsTabSwitching(true);
        
        try {
            // Update active tab
            setActiveTabId(tabId);
            setCurrentViewId(tabId);
            
            // Load the tab's layout
            const tabLayout = tabLayouts[tabId] || [];
            console.log('Loading layout for tab:', tabId, 'Layout:', tabLayout);
            setLayout(tabLayout);
            setOriginalLayout([...tabLayout]);
            
            // Load the tab's edit mode
            const tabEditMode = tabEditModes[tabId] || false;
            setIsEditMode(tabEditMode);
            
            console.log('Switched to tab:', tabId, 'with layout:', tabLayout, 'edit mode:', tabEditMode);
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
        
        // Keep the layout and edit mode data in memory (don't delete it)
        // This allows the tab to be reopened with the same layout
        
        // If we're closing the active tab, switch to another tab
        if (activeTabId === tabId) {
            const remainingTabs = newOpenTabs;
            const newActiveTab = remainingTabs[0]; // Switch to first remaining tab
            await switchToTab(newActiveTab.id);
        }
    };

    // Load view data into the layout (legacy function - now handled by switchToTab)
    // eslint-disable-next-line no-unused-vars
    const loadViewData = async (view) => {
        await openViewAsTab(view);
    };

    // Handle widget removal
    useEffect(() => {
        const handleWidgetRemove = (event) => {
            // Check if the clicked element is a remove button or its child
            const removeButton = event.target.closest('[data-remove-widget]');
            if (removeButton && isEditMode) {
                event.preventDefault();
                event.stopPropagation();
                const widgetKey = removeButton.getAttribute('data-remove-widget');
                console.log('Remove button clicked for widget:', widgetKey);
                handleRemoveWidget(widgetKey, event);
            }
        };

        document.addEventListener('click', handleWidgetRemove);
        
        return () => {
            document.removeEventListener('click', handleWidgetRemove);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode]);

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

    // Handlers

    // Enhanced Edit Layout handler with debugging
    const handleEditLayoutClick = () => {
        console.log('Edit Layout button clicked');
        console.log('Current state - isEditMode:', isEditMode, 'currentViewId:', currentViewId);
        console.log('Current layout before edit:', layout);
        console.log('Widget library:', widgetLibrary);
        console.log('Views:', views);
        
        if (!currentViewId) {
            console.log('No view selected, cannot edit');
            alert('Please select a view first. If you have no views, a default view should be created automatically.');
            return;
        }

        // Create a proper deep copy of the layout
        const layoutCopy = layout.map(item => ({ ...item }));
        console.log('Creating layout copy:', layoutCopy);
        
        setOriginalLayout(layoutCopy);
        setIsEditMode(true);
        
        // Update the tab's edit mode
        setTabEditModes(prev => ({ ...prev, [currentViewId]: true }));
        
        console.log('Edit mode should now be active');
    };

    const handleSaveNewView = async (viewName) => {
        try {
            console.log('Saving new view:', viewName);
            // Transform layout to match API expected format
            const widgetsData = layout.map(item => ({
                widgetKey: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h
            }));

            const response = await axios.post(`${API_URL}/api/dashboard/views`, { 
                name: viewName, 
                widgets: widgetsData 
            }, { withCredentials: true });

            console.log("New view saved successfully:", response.data);
            
            setSaveModalOpen(false);
            const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
            setViews(data);
            
            // Open the new view as a tab
            await openViewAsTab(response.data);
            
        } catch (error) { 
            console.error("Failed to save new view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to save new view. Please try again.");
        }
    };

    const handleUpdateView = async () => {
        try {
            console.log('Updating view:', currentViewId);
            const currentView = views.find(v => v.id === currentViewId);
            if (!currentView) {
                console.error("No current view selected");
                return;
            }

            // Transform layout to match API expected format
            const widgetsData = layout.map(item => ({
                widgetKey: item.i,
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h
            }));

            const response = await axios.put(`${API_URL}/api/dashboard/views/${currentViewId}`, { 
                name: currentView.name, 
                widgets: widgetsData 
            }, { withCredentials: true });

            console.log("View updated successfully:", response.data);
            
            setIsEditMode(false);
            setOriginalLayout([...layout]); // Update original layout to current
            
            // Update the tab's edit mode and layout
            setTabEditModes(prev => ({ ...prev, [currentViewId]: false }));
            setTabLayouts(prev => ({ ...prev, [currentViewId]: [...layout] }));
            
            // Refresh the views list to reflect any changes
            const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
            setViews(data);
            
        } catch (error) { 
            console.error("Failed to update view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to update view. Please try again.");
        }
    };

    const handleAddWidget = (widgetKey) => {
        console.log('Adding widget:', widgetKey);
        const widgetToAdd = widgetLibrary.find(w => w.key === widgetKey);
        if (!widgetToAdd) {
            console.log('Widget not found in library');
            return;
        }

        const newLayoutItem = {
            i: widgetKey,
            x: (layout.length * 3) % 12,
            y: Infinity,
            w: 6, // Default width
            h: 2, // Default height
        };

        console.log('Adding new layout item:', newLayoutItem);
        const newLayout = [...layout, newLayoutItem];
        setLayout(newLayout);
        
        // Update the tab's layout
        setTabLayouts(prev => ({ ...prev, [currentViewId]: newLayout }));
        
        setAddModalOpen(false);
    };

    const handleOpenAddModal = () => {
        setAddModalOpen(true);
    };

    const handleCloseAddModal = () => {
        setAddModalOpen(false);
    };

    const handleOpenUploadModal = () => {
        setUploadModalOpen(true);
    };

    const handleCloseUploadModal = () => {
        setUploadModalOpen(false);
    };

    const handleCancelEdit = () => {
        console.log('Canceling edit, reverting to original layout');
        console.log('Original layout:', originalLayout);
        setLayout([...originalLayout]); // Restore original layout
        setIsEditMode(false);
        
        // Update the tab's edit mode
        setTabEditModes(prev => ({ ...prev, [currentViewId]: false }));
    };

    const handleWidgetUpload = async (uploadResult) => {
        try {
            // Refresh the widget library after upload
            const { data } = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
            setWidgetLibrary(data);
            alert('Widget uploaded successfully!');
        } catch (error) {
            console.error('Failed to refresh widget library', error);
            alert('Widget uploaded but failed to refresh library. Please reload the page.');
        }
    };



    // Handle layout changes during edit mode
    const handleLayoutChange = (newLayout) => {
        console.log('Layout changed:', newLayout);
        setLayout(newLayout);
        
        // Update the tab's layout
        setTabLayouts(prev => ({ ...prev, [currentViewId]: newLayout }));
    };

    // Debug function to test remove functionality
    const debugRemoveWidget = (widgetKey) => {
        console.log('Debug: Attempting to remove widget:', widgetKey);
        console.log('Current layout before removal:', layout);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        console.log('New layout after removal:', newLayout);
        setLayout(newLayout);
        
        // Update the tab's layout
        setTabLayouts(prev => ({ ...prev, [currentViewId]: newLayout }));
    };

    // Handle widget removal
    const handleRemoveWidget = (widgetKey, event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('Removing widget:', widgetKey);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        setLayout(newLayout);
        
        // Update the tab's layout
        setTabLayouts(prev => ({ ...prev, [currentViewId]: newLayout }));
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
            name: `${result.title} (${result.type})`,
            isDefault: false
        };
        
        // Create a simple layout for the search result
        const resultLayout = [{
            i: `search-result-${result.id}`,
            x: 0,
            y: 0,
            w: 12,
            h: 4,
            resultData: result // Store the result data in the layout item
        }];
        
        // Update all state synchronously
        setOpenTabs(prev => [...prev, newTab]);
        setTabLayouts(prev => ({ ...prev, [tabId]: resultLayout }));
        setTabEditModes(prev => ({ ...prev, [tabId]: false }));
        
        // Switch to the new tab immediately
        setIsTabSwitching(true);
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        setLayout(resultLayout);
        setOriginalLayout([...resultLayout]);
        setIsEditMode(false);
        
        console.log('Opened search result tab:', tabId, 'with layout:', resultLayout);
        
        // Small delay to ensure state updates are processed
        setTimeout(() => setIsTabSwitching(false), 50);
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
        
        // Create a new tab
        const newTab = {
            id: tabId,
            name: pageName,
            isDefault: false
        };
        
        // Create a layout for the widget
        const pageLayout = [{
            i: widgetKey,
            x: 0,
            y: 0,
            w: 12,
            h: 8
        }];
        
        // Update all state synchronously
        setOpenTabs(prev => [...prev, newTab]);
        setTabLayouts(prev => ({ ...prev, [tabId]: pageLayout }));
        setTabEditModes(prev => ({ ...prev, [tabId]: false }));
        
        // Switch to the new tab immediately
        setIsTabSwitching(true);
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        setLayout(pageLayout);
        setOriginalLayout([...pageLayout]);
        setIsEditMode(false);
        
        console.log('Opened new page tab:', tabId, 'with layout:', pageLayout);
        
        // Small delay to ensure state updates are processed
        setTimeout(() => setIsTabSwitching(false), 50);
    };

    // Convenience functions for specific pages
    const handleOpenContactsTab = () => handleOpenPageTab('contacts', 'Contacts', 'contacts-widget');
    const handleOpenLeadsTab = () => handleOpenPageTab('leads', 'Leads', 'leads-widget');
    const handleOpenOpportunitiesTab = () => handleOpenPageTab('opportunities', 'Opportunities', 'opportunities-widget');
    const handleOpenCompaniesTab = () => handleOpenPageTab('companies', 'Companies', 'companies-widget');
    const handleOpenUsersTab = () => handleOpenPageTab('users', 'Users', 'users-widget');

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
        console.log('Current state - tabEditModes keys:', Object.keys(tabEditModes));
        
        alert(`Session Info:\nExists: ${sessionInfo.exists}\nTab Count: ${sessionInfo.tabCount || 0}\nActive Tab: ${sessionInfo.activeTab || 'None'} (${typeof sessionInfo.activeTab})\nCurrent Active Tab: ${activeTabId || 'None'} (${typeof activeTabId})\nAge: ${sessionInfo.age ? Math.round(sessionInfo.age / 1000 / 60) + ' minutes' : 'N/A'}\nExpires In: ${sessionInfo.expiresIn ? Math.round(sessionInfo.expiresIn / 1000 / 60) + ' minutes' : 'N/A'}`);
    };

    // Derived state
    const currentWidgetKeys = layout.map(item => item.i);
    const availableWidgets = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));

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

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        };
    }, []);

    if (!user) return <div>Loading...</div>;
    if (isLoading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading dashboard...</div>;

    return (
        <>
            <style>
                {`
                    .react-grid-item.react-grid-placeholder {
                        background: #cbd5e0 !important;
                        border: 2px dashed #718096 !important;
                        border-radius: 8px !important;
                    }
                    .react-resizable-handle {
                        background-image: none !important;
                        background-color: #3b82f6 !important;
                        border-radius: 2px !important;
                        width: 8px !important;
                        height: 8px !important;
                    }
                    .react-resizable-handle:hover {
                        background-color: #2563eb !important;
                    }
                    .react-resizable-handle.react-resizable-handle-se {
                        bottom: 2px !important;
                        right: 2px !important;
                    }
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
                            <strong>Debug:</strong> EditMode: {isEditMode ? 'ON' : 'OFF'} | 
                            ViewID: {currentViewId || 'None'} | 
                            Layout items: {layout.length} | 
                            Widgets: {widgetLibrary.length} |
                            Open tabs: {openTabs.length} |
                            Active tab: {activeTabId || 'None'} |
                            Session: {openTabs.length > 0 ? 'Saved' : 'None'}
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
                            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                            title="Show session debug info"
                        >
                            Session Info
                        </button>
                    </div>
                </div>

                {/* Modals */}
                {isSaveModalOpen && <SaveViewModal onSave={handleSaveNewView} onClose={() => setSaveModalOpen(false)} />}

                <Navbar 
                    views={views}
                    onLoadView={loadView}
                    onOpenSearchResult={handleOpenSearchResult}
                    onOpenPageTab={handleOpenPageTab}
                    isEditMode={isEditMode}
                    onEditLayout={handleEditLayoutClick}
                    onAddWidget={handleOpenAddModal}
                    onUpdateView={handleUpdateView}
                    onCancelEdit={handleCancelEdit}
                    onSaveAsNewView={() => setSaveModalOpen(true)}
                    currentViewId={currentViewId}
                    availableWidgets={availableWidgets}
                    onWidgetUpload={handleWidgetUpload}
                    isSaveModalOpen={isSaveModalOpen}
                    onSaveModalClose={() => setSaveModalOpen(false)}
                    isAddModalOpen={isAddModalOpen}
                    onAddModalClose={handleCloseAddModal}
                    isUploadModalOpen={isUploadModalOpen}
                    onUploadModalClose={handleCloseUploadModal}
                />

                <TabBar 
                    openTabs={openTabs}
                    activeTabId={activeTabId}
                    onSwitchTab={switchToTab}
                    onCloseTab={closeTab}
                    onTabDragEnd={handleTabDragEnd}
                    onTabDragStart={handleTabDragStart}
                    isDraggingTab={isDraggingTab}
                />

                <main className="p-4">
                    <EditLayoutControls 
                        isEditMode={isEditMode}
                        layout={layout}
                        onDebugRemoveWidget={debugRemoveWidget}
                        onAddWidget={handleOpenAddModal}
                        onUpdateView={handleUpdateView}
                        onCancelEdit={handleCancelEdit}
                        onSaveAsNewView={() => setSaveModalOpen(true)}
                        currentViewId={currentViewId}
                    />



                    {/* No active tab message */}
                    {!activeTabId && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                No views open. Use the dropdown above to open a view.
                            </div>
                        </div>
                    )}

                    {/* Grid layout - only show if there's an active tab and layout is ready */}
                    {activeTabId && layout && (
                        <ResponsiveReactGridLayout
                            layouts={{ lg: layout }}
                            onLayoutChange={handleLayoutChange}
                            className="layout"
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            rowHeight={100}
                            isDraggable={isEditMode}
                            isResizable={isEditMode}
                            margin={[10, 10]}
                            containerPadding={[10, 10]}
                            style={{ minHeight: '400px' }}
                        >
                            {layout.map(item => {
                                const widget = widgetLibrary.find(w => w.key === item.i);
                                return (
                                    <div 
                                        key={item.i} 
                                        className={`bg-white rounded-lg shadow-lg p-2 overflow-hidden transition-all duration-200 relative ${
                                            isEditMode ? 'ring-2 ring-blue-500 ring-offset-2 cursor-move' : ''
                                        }`}
                                        data-widget-key={item.i}
                                    >
                                        {/* Remove button - only shown in edit mode */}
                                        {isEditMode && (
                                            <button
                                                data-remove-widget={item.i}
                                                className="absolute top-2 right-2 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors duration-200 shadow-lg"
                                                style={{ zIndex: 9999 }}
                                                title="Remove widget"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                        
                                        {/* Widget content */}
                                        <div className={isEditMode ? 'pt-6' : ''}>
                                            <DynamicWidget 
                                                widgetKey={item.i} 
                                                widgetPath={widget?.path} 
                                                type={widget?.type}
                                                resultData={item.i.startsWith('search-result-') ? item.resultData : undefined}
                                            />
                                        </div>
                                        
                                        {/* Widget info overlay in edit mode */}
                                        {isEditMode && (
                                            <div className="absolute bottom-1 left-1 z-10">
                                                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-75">
                                                    {item.w}×{item.h}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </ResponsiveReactGridLayout>
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