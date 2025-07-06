// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useContext, useRef, Suspense } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Link, useNavigate } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from '../components/SaveViewModal';
import EditUserPopup from '../components/EditUserPopup';
import AddWidgetModal from '../components/AddWidgetModal';
import UploadWidgetModal from '../components/UploadWidgetModal';
import DynamicWidget from '../components/DynamicWidget';

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

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
    
    // Modal states
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);
    
    // Menu state
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Debug: Log state changes
    useEffect(() => {
        console.log('Edit mode changed:', isEditMode);
        console.log('Current layout:', layout);
        console.log('Original layout:', originalLayout);
    }, [isEditMode, layout, originalLayout]);

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
                    // Load the first view (or a view marked as default)
                    const defaultView = viewsResponse.data.find(v => v.isDefault) || viewsResponse.data[0];
                    console.log('Loading default view:', defaultView);
                    await loadViewData(defaultView);
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
            
            // Load the newly created default view
            await loadViewData(response.data);
            
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
            setLayout(fallbackLayout);
            setOriginalLayout([...fallbackLayout]);
            setCurrentViewId(fallbackView.id);
        }
    };

    // Load view data into the layout
    const loadViewData = async (view) => {
        try {
            console.log('Loading view data:', view);
            
            if (view.widgets && view.widgets.length > 0) {
                const newLayout = view.widgets.map(w => ({ 
                    i: w.widgetKey, 
                    x: w.x || 0, 
                    y: w.y || 0, 
                    w: w.w || 6, 
                    h: w.h || 2 
                }));
                console.log('Setting layout from view:', newLayout);
                setLayout(newLayout);
                setOriginalLayout([...newLayout]);
            } else {
                console.log('View has no widgets, setting empty layout');
                setLayout([]);
                setOriginalLayout([]);
            }
            
            setCurrentViewId(view.id);
        } catch (error) {
            console.error('Failed to load view data:', error);
        }
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

    // Load specific view
    const loadView = async (viewId) => {
        try {
            console.log('Loading view:', viewId);
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
            await loadViewData(data);
            
            // If we were in edit mode, exit it when switching views
            if (isEditMode) {
                setIsEditMode(false);
            }
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
            
            // Optionally set the new view as current
            if (response.data && response.data.id) {
                setCurrentViewId(response.data.id);
            }
            
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
        setLayout([...layout, newLayoutItem]);
        setAddModalOpen(false);
    };

    const handleCancelEdit = () => {
        console.log('Canceling edit, reverting to original layout');
        console.log('Original layout:', originalLayout);
        setLayout([...originalLayout]); // Restore original layout
        setIsEditMode(false);
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
    };

    // Debug function to test remove functionality
    const debugRemoveWidget = (widgetKey) => {
        console.log('Debug: Attempting to remove widget:', widgetKey);
        console.log('Current layout before removal:', layout);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        console.log('New layout after removal:', newLayout);
        setLayout(newLayout);
    };

    // Handle widget removal
    const handleRemoveWidget = (widgetKey, event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('Removing widget:', widgetKey);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        setLayout(newLayout);
    };

    // Derived state
    const currentWidgetKeys = layout.map(item => item.i);
    const availableWidgets = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));

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
                `}
            </style>
            <div className="min-h-screen bg-gray-100">
                {/* Debug info - Remove in production */}
                <div className="bg-yellow-100 p-2 text-xs">
                    <strong>Debug:</strong> EditMode: {isEditMode ? 'ON' : 'OFF'} | 
                    ViewID: {currentViewId || 'None'} | 
                    Layout items: {layout.length} | 
                    Widgets: {widgetLibrary.length}
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
                            
                            {/* View selector */}
                            <div className="flex items-center space-x-4">
                                <select 
                                    value={currentViewId || ''} 
                                    onChange={(e) => loadView(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Select a view</option>
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
                                            <DynamicWidget widgetKey={widget.key} widgetPath={widget.path} type={widget.type} />
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
                </main>
            </div>
        </>
    );
};

export default Dashboard;