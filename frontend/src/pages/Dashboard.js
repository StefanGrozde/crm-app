// frontend/src/pages/Dashboard.js
import React, { useState, useEffect, useContext, useRef, Suspense } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Link, useNavigate } from 'react-router-dom';

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

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load widget library
                const widgetResponse = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
                setWidgetLibrary(widgetResponse.data);

                // Load views
                const viewsResponse = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
                setViews(viewsResponse.data);

                // Load default view if available
                if (viewsResponse.data.length > 0) {
                    const defaultView = viewsResponse.data[0];
                    const newLayout = defaultView.widgets.map(w => ({ 
                        i: w.widgetKey, 
                        x: w.x, 
                        y: w.y, 
                        w: w.w, 
                        h: w.h 
                    }));
                    setLayout(newLayout);
                    setOriginalLayout(newLayout);
                    setCurrentViewId(defaultView.id);
                }
            } catch (error) {
                console.error("Failed to load initial data", error);
            }
        };

        if (user) {
            loadInitialData();
        }
    }, [user]);

    // Handle clicks outside menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load specific view
    const loadView = async (viewId) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
            const newLayout = data.widgets.map(w => ({ i: w.widgetKey, x: w.x, y: w.y, w: w.w, h: w.h }));
            setLayout(newLayout);
            setOriginalLayout(newLayout);
            setCurrentViewId(viewId);
        } catch (error) { 
            console.error("Failed to load view", error); 
        }
    };

    // Handlers
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSaveNewView = async (viewName) => {
        try {
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
            setOriginalLayout(layout);
            
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
        const widgetToAdd = widgetLibrary.find(w => w.key === widgetKey);
        if (!widgetToAdd) return;

        const newLayoutItem = {
            i: widgetKey,
            x: (layout.length * 3) % 12,
            y: Infinity,
            w: 6, // Default width
            h: 2, // Default height
        };

        setLayout([...layout, newLayoutItem]);
        setAddModalOpen(false);
    };

    const handleCancelEdit = () => {
        setLayout(originalLayout);
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

    // Derived state
    const currentWidgetKeys = layout.map(item => item.i);
    const availableWidgets = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));

    if (!user) return <div>Loading...</div>;

    return (
        <>
            <div className="min-h-screen bg-gray-100">
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
                                        onClick={() => {
                                            setIsEditMode(true);
                                            setOriginalLayout([...layout]); // Create a deep copy
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        disabled={!currentViewId}
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
                    <ResponsiveReactGridLayout
                        layouts={{ lg: layout }}
                        onLayoutChange={(layout) => setLayout(layout)}
                        className="layout"
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={100}
                        isDraggable={isEditMode}
                        isResizable={isEditMode}
                    >
                        {layout.map(item => {
                            const widget = widgetLibrary.find(w => w.key === item.i);
                            return (
                                <div 
                                    key={item.i} 
                                    className={`bg-white rounded-lg shadow-lg p-2 overflow-hidden ${isEditMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                                >
                                    {widget ? (
                                        <DynamicWidget widgetKey={widget.key} widgetPath={widget.path} type={widget.type} />
                                    ) : (
                                        <div className="text-red-500">Unknown Widget: {item.i}</div>
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