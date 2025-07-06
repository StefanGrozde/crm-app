// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useContext, useRef, Suspense } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Link, useNavigate } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from '../components/SaveViewModal';
import EditUserPopup from '../components/EditUserPopup';
import AddWidgetModal from '../components/AddWidgetModal';
import UploadWidgetModal from '../components/UploadWidgetModal';
import DynamicWidget from '../components/DynamicWidget';
import SearchBar from '../components/SearchBar';

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

// SortableTab component for draggable tabs
function SortableTab({ id, children, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        zIndex: isDragging ? 100 : 'auto',
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} {...props}>
            {children}
        </div>
    );
}

const Dashboard = () => {
    // Auth context
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // State variables
    const [layout, setLayout] = useState([]);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [widgetLibrary, setWidgetLibrary] = useState([]);
    const [views, setViews] = useState([]);
    const [currentViewId, setCurrentViewId] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Tab management state
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [tabLayouts, setTabLayouts] = useState({}); // Store layouts for each tab
    const [tabEditModes, setTabEditModes] = useState({}); // Store edit mode for each tab
    
    // Modal states
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    
    // Menu state
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // DnD-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

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

                // Check if user has any views, if not create a default one
                if (!viewsResponse.data || viewsResponse.data.length === 0) {
                    console.log('No views found, creating default view...');
                    await createDefaultView();
                } else {
                    // Load the first view (or a view marked as default) as the first tab
                    const defaultView = viewsResponse.data.find(v => v.isDefault) || viewsResponse.data[0];
                    console.log('Loading default view as first tab:', defaultView);
                    await openViewAsTab(defaultView);
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
                console.error("Error details:", error.response?.data);
                console.error("Error status:", error.response?.status);
                
                // Create a fallback default view
                console.log('Creating fallback default view due to error');
                await createDefaultView();
            }
        };

        if (user) {
            loadInitialData();
        }
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
                setOpenTabs(prev => [...prev, newTab]);
                setTabLayouts(prev => ({ ...prev, [view.id]: tabLayout }));
                setTabEditModes(prev => ({ ...prev, [view.id]: false }));
                // Don't call switchToTab here; let useEffect handle it
            } else {
                // If already open, just switch
                await switchToTab(view.id);
            }
        } catch (error) {
            console.error('Failed to open view as tab:', error);
        }
    };

    // Effect: When a new tab is added, switch to it automatically
    useEffect(() => {
        if (openTabs.length > 0) {
            // Only auto-switch if a new tab was added
            if (openTabs.length > prevTabsLengthRef.current) {
                const lastTab = openTabs[openTabs.length - 1];
                if (activeTabId !== lastTab.id) {
                    switchToTab(lastTab.id);
                }
            }
        }
        prevTabsLengthRef.current = openTabs.length;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openTabs]);

    // Switch to a specific tab
    const switchToTab = async (tabId) => {
        console.log('Switching to tab:', tabId);
        
        // Update active tab
        setActiveTabId(tabId);
        setCurrentViewId(tabId);
        
        // Load the tab's layout
        const tabLayout = tabLayouts[tabId] || [];
        setLayout(tabLayout);
        setOriginalLayout([...tabLayout]);
        
        // Load the tab's edit mode
        const tabEditMode = tabEditModes[tabId] || false;
        setIsEditMode(tabEditMode);
        
        console.log('Switched to tab:', tabId, 'with layout:', tabLayout, 'edit mode:', tabEditMode);
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
        
        // Remove tab's layout and edit mode data
        const newTabLayouts = { ...tabLayouts };
        const newTabEditModes = { ...tabEditModes };
        delete newTabLayouts[tabId];
        delete newTabEditModes[tabId];
        setTabLayouts(newTabLayouts);
        setTabEditModes(newTabEditModes);
        
        // If we're closing the active tab, switch to another tab
        if (activeTabId === tabId) {
            const remainingTabs = newOpenTabs;
            const newActiveTab = remainingTabs[0]; // Switch to first remaining tab
            await switchToTab(newActiveTab.id);
        }
    };

    // Load view data into the layout (legacy function - now handled by switchToTab)
    const loadViewData = async (view) => {
        await openViewAsTab(view);
    };

    // Handle clicks outside menu and widget removal
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

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

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('click', handleWidgetRemove);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('click', handleWidgetRemove);
        };
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
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

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

    const toggleMenu = () => setMenuOpen(!menuOpen);
    
    const handleOpenEditPopup = () => {
        setMenuOpen(false);
        setEditPopupOpen(true);
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
        
        // Add the new tab
        setOpenTabs(prev => [...prev, newTab]);
        
        // Create a simple layout for the search result
        const resultLayout = [{
            i: `search-result-${result.id}`,
            x: 0,
            y: 0,
            w: 12,
            h: 4,
            resultData: result // Store the result data in the layout item
        }];
        
        // Store the layout and edit mode for the new tab
        setTabLayouts(prev => ({ ...prev, [tabId]: resultLayout }));
        setTabEditModes(prev => ({ ...prev, [tabId]: false }));
        
        // Switch to the new tab
        setTimeout(() => switchToTab(tabId), 100);
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
                            Active tab: {activeTabId || 'None'}
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
                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                >
                                    Test Tables
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Modals */}
                {isSaveModalOpen && <SaveViewModal onSave={handleSaveNewView} onClose={() => setSaveModalOpen(false)} />}
                {isEditPopupOpen && <EditUserPopup onClose={() => setEditPopupOpen(false)} />}
                {isAddModalOpen && <AddWidgetModal availableWidgets={availableWidgets} onAddWidget={handleAddWidget} onClose={() => setAddModalOpen(false)} />}
                {isUploadModalOpen && <UploadWidgetModal onUpload={handleWidgetUpload} onClose={() => setUploadModalOpen(false)} />}

                <header className="bg-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                            
                            {/* Search Bar - Centered */}
                            <div className="flex-1 max-w-2xl mx-8">
                                <SearchBar 
                                    placeholder="Search contacts, leads, opportunities, companies..."
                                    className="w-full"
                                    onOpenResult={handleOpenSearchResult}
                                />
                            </div>
                            
                            {/* View selector and controls */}
                            <div className="flex items-center space-x-4">
                                {/* View selector dropdown */}
                                <select 
                                    value="" 
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            loadView(e.target.value);
                                        }
                                    }}
                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Open View...</option>
                                    {views.map(view => (
                                        <option key={view.id} value={view.id}>{view.name}</option>
                                    ))}
                                </select>

                                {/* Edit mode toggle */}
                                {!isEditMode ? (
                                    <button
                                        onClick={handleEditLayoutClick}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                        disabled={!currentViewId}
                                        title={!currentViewId ? "No view selected - a default view should be created automatically" : "Enter edit mode"}
                                    >
                                        Edit Layout
                                    </button>
                                ) : (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setAddModalOpen(true)}
                                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            <span>Add Widget</span>
                                        </button>
                                        <button
                                            onClick={handleUpdateView}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                            disabled={!currentViewId}
                                        >
                                            Save Changes
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => setSaveModalOpen(true)}
                                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                        >
                                            Save as New View
                                        </button>
                                    </div>
                                )}

                                {/* User menu */}
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={toggleMenu}
                                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                                    >
                                        <span>{user.username}</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {menuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                                            {user.role === 'Administrator' && (
                                                <button 
                                                    onClick={() => { setUploadModalOpen(true); setMenuOpen(false); }} 
                                                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                >
                                                    Upload Widget
                                                </button>
                                            )}
                                            <button 
                                                onClick={handleOpenEditPopup}
                                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Edit Profile
                                            </button>
                                            {user.role === 'Administrator' && (
                                                <Link 
                                                    to="/edit-company" 
                                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                    onClick={() => setMenuOpen(false)}
                                                >
                                                    Edit Company
                                                </Link>
                                            )}
                                            <button 
                                                onClick={handleLogout}
                                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab bar */}
                {openTabs.length > 0 && (
                    <div className="bg-white border-b border-gray-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd} onDragStart={handleTabDragStart}>
                                <SortableContext items={openTabs.map(tab => tab.id)} strategy={horizontalListSortingStrategy}>
                                    <div className="flex space-x-1 overflow-x-auto justify-start">
                                        {openTabs.map((tab) => (
                                            <SortableTab key={tab.id} id={tab.id}>
                                                <div
                                                    className={`tab flex items-center space-x-2 px-4 py-2 border-b-2 cursor-pointer whitespace-nowrap ${
                                                        activeTabId === tab.id
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                            : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                    onClick={() => { if (!isDraggingTab) switchToTab(tab.id); }}
                                                >
                                                    <span className="text-sm font-medium">{tab.name}</span>
                                                    {tab.isDefault && (
                                                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                    <button
                                                        className="tab-close-button ml-1 text-gray-400 hover:text-gray-600"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            closeTab(tab.id);
                                                        }}
                                                        title="Close tab"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </SortableTab>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                )}

                <main className="p-4">
                    {/* Edit mode indicator */}
                    {isEditMode && (
                        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                            <p className="text-blue-800 font-medium">
                                🎯 Edit Mode Active - You can now drag, resize, and remove widgets. Click the red X to remove widgets.
                            </p>
                            {layout.length > 0 && (
                                <button 
                                    onClick={() => debugRemoveWidget(layout[0].i)}
                                    className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                >
                                    Debug: Remove First Widget
                                </button>
                            )}
                        </div>
                    )}

                    {/* No active tab message */}
                    {!activeTabId && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                No views open. Use the dropdown above to open a view.
                            </div>
                        </div>
                    )}

                    {/* Grid layout - only show if there's an active tab */}
                    {activeTabId && (
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
                                            {widget ? (
                                                <DynamicWidget 
                                                    widgetKey={widget.key} 
                                                    widgetPath={widget.path} 
                                                    type={widget.type}
                                                    resultData={item.i.startsWith('search-result-') ? item.resultData : undefined}
                                                />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <div className="text-gray-600 text-sm">
                                                        Demo Widget: {item.i}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        Size: {item.w}x{item.h} | Position: ({item.x}, {item.y})
                                                    </div>
                                                </div>
                                            )}
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
                </main>
            </div>
        </>
    );
};

export default Dashboard;