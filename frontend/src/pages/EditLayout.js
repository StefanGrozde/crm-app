import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useNavigate, useParams } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from '../components/SaveViewModal';
import AddWidgetModal from '../components/AddWidgetModal';
import { WidgetRenderer } from '../components/WidgetRenderer';

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

const EditLayout = () => {
    // Auth context
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { viewId } = useParams();

    // State variables
    const [layout, setLayout] = useState([]);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [widgetLibrary, setWidgetLibrary] = useState([]);
    const [currentView, setCurrentView] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Modal states
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                console.log('Loading initial data for EditLayout...');
                console.log('View ID:', viewId);

                // Load widget library
                console.log('Fetching widget library...');
                const widgetResponse = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
                console.log('Widget library response:', widgetResponse);
                
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
                        key: 'leads-widget',
                        name: 'Leads Widget',
                        description: 'Manage and view leads',
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
                        key: 'companies-widget',
                        name: 'Companies Widget',
                        description: 'Manage and view companies',
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
                        key: 'lead-conversion',
                        name: 'Lead Conversion Analytics',
                        description: 'Track lead conversion rates and metrics',
                        type: 'builtin-react',
                        path: null
                    }
                ];
                
                const hybridWidgetLibrary = [...builtinReactWidgets, ...widgetResponse.data];
                console.log('Hybrid widget library:', hybridWidgetLibrary);
                setWidgetLibrary(hybridWidgetLibrary);

                // Load the specific view
                if (viewId) {
                    console.log('Loading view:', viewId);
                    const viewResponse = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
                    console.log('View response:', viewResponse.data);
                    setCurrentView(viewResponse.data);

                    // Convert widgets to layout format
                    if (viewResponse.data.widgets && viewResponse.data.widgets.length > 0) {
                        const viewLayout = viewResponse.data.widgets.map(w => ({ 
                            i: w.widgetKey, 
                            x: w.x || 0, 
                            y: w.y || 0, 
                            w: w.w || 6, 
                            h: w.h || 2,
                            minW: 2,
                            minH: 1,
                            maxW: 12,
                            maxH: 12
                        }));
                        setLayout(viewLayout);
                        setOriginalLayout([...viewLayout]);
                    } else {
                        setLayout([]);
                        setOriginalLayout([]);
                    }
                } else {
                    // No view ID provided, redirect to dashboard
                    console.log('No view ID provided, redirecting to dashboard');
                    navigate('/dashboard');
                    return;
                }

            } catch (error) {
                console.error("Failed to load initial data", error);
                console.error("Error details:", error.response?.data);
                console.error("Error status:", error.response?.status);
                
                if (error.response?.status === 404) {
                    alert('View not found. Redirecting to dashboard.');
                    navigate('/dashboard');
                    return;
                }
                
                alert('Failed to load view data. Please try again.');
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        if (user) {
            loadInitialData();
        }
    }, [user, viewId, navigate]);

    // Handlers
    const handleSaveView = async () => {
        try {
            setIsSaving(true);
            console.log('Saving view:', currentView?.id);
            
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

            const response = await axios.put(`${API_URL}/api/dashboard/views/${currentView.id}`, { 
                name: currentView.name, 
                widgets: widgetsData 
            }, { withCredentials: true });

            console.log("View updated successfully:", response.data);
            
            setOriginalLayout([...layout]); // Update original layout to current
            
            // Set a flag to indicate that the view has been updated
            localStorage.setItem('dashboard_view_updated', 'true');
            localStorage.setItem('dashboard_view_updated_id', currentView.id);
            localStorage.setItem('dashboard_view_updated_timestamp', Date.now().toString());
            
            alert('View saved successfully!');
            
        } catch (error) { 
            console.error("Failed to update view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to save view. Please try again.");
        } finally {
            setIsSaving(false);
        }
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
            
            // Set a flag to indicate that a new view has been created
            localStorage.setItem('dashboard_view_updated', 'true');
            localStorage.setItem('dashboard_view_updated_id', response.data.id);
            localStorage.setItem('dashboard_view_updated_timestamp', Date.now().toString());
            
            setSaveModalOpen(false);
            alert('New view saved successfully!');
            
        } catch (error) { 
            console.error("Failed to save new view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to save new view. Please try again.");
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
            minW: 2,
            minH: 1,
            maxW: 12,
            maxH: 12
        };

        console.log('Adding new layout item:', newLayoutItem);
        const newLayout = [...layout, newLayoutItem];
        setLayout(newLayout);
        
        setAddModalOpen(false);
    };

    const handleCancelEdit = () => {
        console.log('Canceling edit, reverting to original layout');
        console.log('Original layout:', originalLayout);
        setLayout([...originalLayout]); // Restore original layout
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard');
    };

    // Handle layout changes during edit mode
    const handleLayoutChange = (newLayout) => {
        console.log('Layout changed:', newLayout);
        console.log('Previous layout:', layout);
        console.log('New layout:', newLayout);
        
        // Ensure all layout items have proper constraints
        const validatedLayout = newLayout.map(item => ({
            ...item,
            minW: item.minW || 2,
            minH: item.minH || 1,
            maxW: item.maxW || 12,
            maxH: item.maxH || 12
        }));
        
        setLayout(validatedLayout);
    };

    // Handle widget removal
    const handleRemoveWidget = (widgetKey, event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('Removing widget:', widgetKey);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        setLayout(newLayout);
    };

    // Derived state - memoized to prevent unnecessary re-renders
    const currentWidgetKeys = useMemo(() => layout.map(item => item.i), [layout]);
    const availableWidgets = useMemo(() => {
        const filtered = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));
        console.log('Available widgets:', filtered);
        console.log('Current widget keys:', currentWidgetKeys);
        console.log('Widget library:', widgetLibrary);
        return filtered;
    }, [widgetLibrary, currentWidgetKeys]);



    if (!user) return <div>Loading...</div>;
    if (isLoading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading edit layout...</div>;

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
                   .react-grid-item {
                       transition: all 200ms ease;
                       transition-property: left, top, width, height;
                   }
                   .react-grid-item.react-draggable-dragging {
                       transition: none !important;
                       z-index: 3 !important;
                       will-change: transform;
                   }
                   .react-grid-item.react-grid-item.resizing {
                       z-index: 1 !important;
                       will-change: width, height;
                   }
                   .react-grid-item.react-grid-item.react-draggable.react-resizable {
                       transition: all 200ms ease;
                   }
                   .react-grid-item.react-grid-item.react-draggable.react-resizable.react-resizable-handle {
                       transition: none;
                   }
                   .react-grid-layout {
                       position: relative;
                       transition: height 200ms ease;
                   }
                   .react-grid-item {
                       transition: all 200ms ease;
                       transition-property: left, top, width, height;
                       position: absolute;
                       box-sizing: border-box;
                   }
                   .react-grid-item.cssTransforms {
                       transition-property: transform, width, height;
                   }
                   .react-grid-item.resizing {
                       z-index: 1;
                       will-change: width, height;
                   }
                   .react-grid-item.react-draggable-dragging {
                       transition: none !important;
                       z-index: 3 !important;
                       will-change: transform;
                   }
                   .react-grid-item.react-grid-placeholder {
                       background: #cbd5e0 !important;
                       border: 2px dashed #718096 !important;
                       border-radius: 8px !important;
                       transition-duration: 100ms;
                       z-index: 2;
                       -webkit-user-select: none;
                       -moz-user-select: none;
                       -ms-user-select: none;
                       -o-user-select: none;
                       user-select: none;
                   }
               `}
            </style>
            
            <div className="min-h-screen bg-gray-100">
                {/* Header */}
                <header className="bg-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-4">
                            <div className="flex items-center space-x-4">
                                <h1 className="text-2xl font-bold text-gray-900">Edit Layout</h1>
                                {currentView && (
                                    <span className="text-gray-600">- {currentView.name}</span>
                                )}
                            </div>
                            
                            {/* Edit controls */}
                            <div className="flex items-center space-x-4">
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
                                    onClick={handleSaveView}
                                    disabled={isSaving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                                
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                >
                                    Reset
                                </button>
                                
                                <button
                                    onClick={() => setSaveModalOpen(true)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                >
                                    Save as New View
                                </button>
                                
                                <button
                                    onClick={handleBackToDashboard}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Edit mode indicator */}
                <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg mx-4 mt-4">
                    <p className="text-blue-800 font-medium">
                        🎯 Edit Mode Active - You can now drag, resize, and remove widgets. Click the red X to remove widgets.
                    </p>
                </div>

                {/* Modals */}
                {isSaveModalOpen && <SaveViewModal onSave={handleSaveNewView} onClose={() => setSaveModalOpen(false)} />}
                {isAddModalOpen && <AddWidgetModal availableWidgets={availableWidgets} onAddWidget={handleAddWidget} onClose={() => setAddModalOpen(false)} />}

                <main className="p-4">
                    {/* Debug info */}
                    <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                        <div>Layout items: {layout.length}</div>
                        <div>Widget library: {widgetLibrary.length} widgets</div>
                        <div>Current view: {currentView?.name || 'None'}</div>
                        <div>Layout: {JSON.stringify(layout.map(item => ({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h })))}</div>
                    </div>
                    
                    {/* Grid layout */}
                    <ResponsiveReactGridLayout
                        layouts={{ lg: layout }}
                        onLayoutChange={handleLayoutChange}
                        className="layout"
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={100}
                        isDraggable={true}
                        isResizable={true}
                        margin={[10, 10]}
                        containerPadding={[10, 10]}
                        style={{ minHeight: '400px' }}
                        useCSSTransforms={true}
                        compactType="vertical"
                        preventCollision={false}
                        isBounded={false}
                        autoSize={true}
                        verticalCompact={true}
                        allowOverlap={false}
                    >
                        {layout.map(item => {
                            console.log('Looking for widget:', item.i, 'in library:', widgetLibrary);
                            const widget = widgetLibrary.find(w => w.key === item.i);
                            console.log('Found widget:', widget, 'for item:', item);
                            
                            // Skip rendering if widget library is not loaded yet
                            if (widgetLibrary.length === 0) {
                                return (
                                    <div key={item.i} className="bg-white rounded-lg shadow-lg p-4">
                                        <div className="text-gray-500">Loading widget library...</div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div 
                                    key={item.i} 
                                    className="bg-white rounded-lg shadow-lg p-2 overflow-hidden transition-all duration-200 relative ring-2 ring-blue-500 ring-offset-2 cursor-move"
                                    data-widget-key={item.i}
                                >
                                    {/* Remove button - always shown in edit mode */}
                                    <button
                                        onClick={(e) => handleRemoveWidget(item.i, e)}
                                        className="absolute top-2 right-2 z-50 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors duration-200 shadow-lg"
                                        style={{ zIndex: 9999 }}
                                        title="Remove widget"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    
                                    {/* Widget content with robust rendering */}
                                    <div className="pt-6">
                                        {console.log('Rendering widget:', item.i, 'widget data:', widget, 'type:', widget?.type)}
                                        {widget ? (
                                            <WidgetRenderer 
                                                widgetKey={item.i} 
                                                widgetPath={widget?.path} 
                                                type={widget?.type}
                                                isVisible={true}
                                                onWidgetReady={(widgetKey, loadTime) => {
                                                    console.log(`Widget ${widgetKey} ready in ${loadTime}ms`);
                                                }}
                                                onWidgetError={(widgetKey, error) => {
                                                    console.error(`Widget ${widgetKey} error:`, error);
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center p-4">
                                                <div className="text-red-600 text-sm font-medium">
                                                    Widget not found: {item.i}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    This widget may have been removed or renamed. You can remove it from the layout.
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Size: {item.w}x{item.h} | Position: ({item.x}, {item.y})
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Widget info overlay */}
                                    <div className="absolute bottom-1 left-1 z-10">
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded opacity-75">
                                            {item.w}×{item.h}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </ResponsiveReactGridLayout>
                    
                    {/* Empty state */}
                    {layout.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">
                                No widgets in this layout. Click "Add Widget" to get started.
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default EditLayout; 