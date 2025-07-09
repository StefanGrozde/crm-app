import React, { useState, useEffect, useContext, useCallback, memo, useMemo } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from './SaveViewModal';
import AddWidgetModal from './AddWidgetModal';
import EditViewModal from './EditViewModal';
import { WidgetRenderer } from './WidgetRenderer';
import { getColorClass } from '../utils/tabColors';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

const EmbeddedEditLayout = ({ viewId, onExitEditMode, onSaveSuccess }) => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Core data states
    const [layout, setLayout] = useState([]);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [widgetLibrary, setWidgetLibrary] = useState([]);
    const [currentView, setCurrentView] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
    
    // Modal states
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditViewModal, setShowEditViewModal] = useState(false);

    // Logic: Load widget library
    const loadWidgetLibrary = useCallback(async () => {
        try {
            console.log('Fetching widget library...');
            const response = await axios.get(`${API_URL}/api/widgets/manifest?includeInactive=false`, { 
                withCredentials: true 
            });
            setWidgetLibrary(response.data);
        } catch (error) {
            console.error('Error loading widget library:', error);
            setError('Failed to load widget library');
        }
    }, []);

    // Logic: Load view data
    const loadViewData = useCallback(async () => {
        if (!viewId) {
            setError('No view ID provided');
            return;
        }

        try {
            console.log('Loading view:', viewId);
            const response = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { 
                withCredentials: true 
            });
            
            setCurrentView(response.data);

            // Convert widgets to layout format
            if (response.data.widgets && response.data.widgets.length > 0) {
                const viewLayout = response.data.widgets.map(w => ({ 
                    i: w.widgetKey, 
                    x: w.x || 0, 
                    y: w.y || 0, 
                    w: w.w || 6, 
                    h: w.h || 2,
                    widgetKey: w.widgetKey,
                    widgetData: w.widgetData || {},
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
        } catch (error) {
            console.error('Error loading view data:', error);
            if (error.response?.status === 404) {
                setError('View not found');
            } else {
                setError('Failed to load view data');
            }
        }
    }, [viewId]);

    // Logic: Initialize component
    useEffect(() => {
        const initializeComponent = async () => {
            try {
                setLoading(true);
                await Promise.all([loadWidgetLibrary(), loadViewData()]);
            } catch (error) {
                console.error('Error initializing edit layout:', error);
                setError('Failed to initialize edit layout');
            } finally {
                setLoading(false);
            }
        };

        initializeComponent();
    }, [loadWidgetLibrary, loadViewData]);

    // Logic: Handle layout changes
    const handleLayoutChange = useCallback((newLayout) => {
        console.log('Layout changed:', newLayout);
        
        // Ensure all layout items have proper constraints
        const validatedLayout = newLayout.map(item => ({
            ...item,
            minW: item.minW || 2,
            minH: item.minH || 1,
            maxW: item.maxW || 12,
            maxH: item.maxH || 12
        }));
        
        setLayout(validatedLayout);
    }, []);

    // Logic: Handle widget removal
    const handleRemoveWidget = useCallback((widgetKey, event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('Removing widget:', widgetKey);
        const newLayout = layout.filter(item => item.i !== widgetKey);
        setLayout(newLayout);
    }, [layout]);

    // Logic: Handle add widget
    const handleAddWidget = useCallback((widgetKey) => {
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
            w: 6,
            h: 2,
            widgetKey: widgetKey,
            widgetData: {},
            minW: 2,
            minH: 1,
            maxW: 12,
            maxH: 12
        };

        console.log('Adding new layout item:', newLayoutItem);
        const newLayout = [...layout, newLayoutItem];
        setLayout(newLayout);
        
        setShowAddModal(false);
    }, [layout, widgetLibrary]);

    // Logic: Handle save view
    const handleSaveView = useCallback(async () => {
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
            
            if (onSaveSuccess) {
                onSaveSuccess(response.data);
            }
            
            alert('View saved successfully!');
            
        } catch (error) { 
            console.error("Failed to update view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to save view. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }, [currentView, layout, onSaveSuccess]);

    // Logic: Handle save as new view
    const handleSaveNewView = useCallback(async (viewName) => {
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
            
            setShowSaveModal(false);
            alert('New view saved successfully!');
            
        } catch (error) { 
            console.error("Failed to save new view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to save new view. Please try again.");
        }
    }, [layout]);

    // Logic: Handle edit view
    const handleEditView = useCallback(async (viewData) => {
        try {
            console.log('Editing view:', viewData);
            
            if (!currentView) {
                console.error("No current view selected");
                return;
            }

            // Update the view with new name and color
            const response = await axios.put(`${API_URL}/api/dashboard/views/${currentView.id}`, { 
                name: viewData.name,
                color: viewData.color
            }, { withCredentials: true });

            console.log("View updated successfully:", response.data);
            
            // Update the current view state
            setCurrentView(prev => ({
                ...prev,
                name: viewData.name,
                color: viewData.color
            }));
            
            setShowEditViewModal(false);
            
            // Notify parent component about the view update
            if (onSaveSuccess) {
                onSaveSuccess(response.data);
            }
            
            alert('View updated successfully!');
            
        } catch (error) { 
            console.error("Failed to update view", error);
            console.error("Error details:", error.response?.data);
            alert("Failed to update view. Please try again.");
        }
    }, [currentView, onSaveSuccess]);

    // Logic: Handle cancel edit
    const handleCancelEdit = useCallback(() => {
        console.log('Canceling edit, reverting to original layout');
        console.log('Original layout:', originalLayout);
        setLayout([...originalLayout]); // Restore original layout
    }, [originalLayout]);

    // Logic: Handle exit edit mode
    const handleExitEditMode = useCallback(() => {
        // Check if there are unsaved changes before exiting
        const hasChanges = JSON.stringify(layout) !== JSON.stringify(originalLayout);
        if (hasChanges) {
            const confirmLeave = window.confirm(
                'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
            );
            if (!confirmLeave) {
                return; // Stay in edit mode
            }
            console.log('User confirmed leaving with unsaved changes');
        }
        
        console.log('Exiting edit mode');
        if (onExitEditMode) {
            onExitEditMode();
        }
    }, [layout, originalLayout, onExitEditMode]);

    // Derived state - memoized to prevent unnecessary re-renders
    const currentWidgetKeys = useMemo(() => layout.map(item => item.i), [layout]);
    const availableWidgets = useMemo(() => {
        const filtered = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));
        console.log('Available widgets:', filtered);
        console.log('Current widget keys:', currentWidgetKeys);
        console.log('Widget library:', widgetLibrary);
        return filtered;
    }, [widgetLibrary, currentWidgetKeys]);

    // Rendering: Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Rendering: Error state
    if (error) {
        return (
            <div className="text-center py-8">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                    onClick={() => {
                        setError(null);
                        setLoading(true);
                        loadViewData();
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden">
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

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Layout</h2>
                    {currentView && (
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-600">- {currentView.name}</span>
                            {currentView.color && (
                                <div 
                                    className={`w-4 h-4 rounded-full border border-gray-300 ${getColorClass(currentView.color)}`}
                                    title={`Tab color: ${currentView.color}`}
                                />
                            )}
                        </div>
                    )}
                </div>
                
                {/* Edit controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowEditViewModal(true)}
                        className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center space-x-1"
                        title="Edit view name and color"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit View</span>
                    </button>
                    
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 flex items-center space-x-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Add Widget</span>
                    </button>
                    
                    <button
                        onClick={handleSaveView}
                        disabled={isSaving}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-blue-400"
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    
                    <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                        Reset
                    </button>
                    
                    <button
                        onClick={() => setShowSaveModal(true)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                        Save as New View
                    </button>
                    
                    <button
                        onClick={handleExitEditMode}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                        Exit Edit Mode
                    </button>
                </div>
            </div>

            {/* Edit mode indicator */}
            <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <p className="text-blue-800 font-medium">
                    🎯 Edit Mode Active - You can now drag, resize, and remove widgets. Click the red X to remove widgets.
                </p>
            </div>

            {/* Debug info */}
            <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <div>Layout items: {layout.length}</div>
                <div>Widget library: {widgetLibrary.length} widgets</div>
                <div>Current view: {currentView?.name || 'None'}</div>
                <div>Current breakpoint: {currentBreakpoint}</div>
                <div>Grid: 12 cols (lg/md/sm/xs/xxs)</div>
            </div>
            
            {/* Grid layout */}
            <ResponsiveReactGridLayout
                layouts={{ lg: layout }}
                onLayoutChange={handleLayoutChange}
                className="layout"
                cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
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
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                onBreakpointChange={(newBreakpoint) => {
                    console.log('EmbeddedEditLayout breakpoint changed to:', newBreakpoint);
                    setCurrentBreakpoint(newBreakpoint);
                }}
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

            {/* Modals */}
            {showSaveModal && (
                <SaveViewModal 
                    onSave={handleSaveNewView} 
                    onClose={() => setShowSaveModal(false)} 
                />
            )}
            {showAddModal && (
                <AddWidgetModal 
                    availableWidgets={availableWidgets} 
                    onAddWidget={handleAddWidget} 
                    onClose={() => setShowAddModal(false)} 
                />
            )}
            {showEditViewModal && (
                <EditViewModal 
                    isOpen={showEditViewModal}
                    currentView={currentView}
                    onSave={handleEditView}
                    onClose={() => setShowEditViewModal(false)}
                />
            )}
        </div>
    );
};

export default memo(EmbeddedEditLayout); 