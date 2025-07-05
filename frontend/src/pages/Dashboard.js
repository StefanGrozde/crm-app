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
import DynamicWidget from '../components/DynamicWidget'; // Import the new DynamicWidget

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;



const Dashboard = () => {
    // ... (all existing state and effects)
    const [isUploadModalOpen, setUploadModalOpen] = useState(false); // Add this state

    // ... (rest of the component logic)

    // Add a handler for the upload
    const handleWidgetUpload = async (file) => {
        const formData = new FormData();
        formData.append('widget', file);

        try {
            await axios.post(`${API_URL}/api/widgets/upload`, formData, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // Refresh the widget library after upload
            const { data } = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
            setWidgetLibrary(data);
            alert('Widget uploaded successfully!');
        } catch (error) {
            console.error('Failed to upload widget', error);
            alert('Failed to upload widget.');
        } finally {
            setUploadModalOpen(false);
        }
    };
    
    // ... (inside the return statement)
    return (
        <>
            {/* ... (other modals) */}
            {isUploadModalOpen && (
                <UploadWidgetModal onUpload={handleWidgetUpload} onClose={() => setUploadModalOpen(false)} />
            )}

            {/* ... (inside the user dropdown menu) */}
            {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ...">
                    {isEditMode && (
                        <button onClick={() => { setAddModalOpen(true); setMenuOpen(false); }} className="...">
                            Add Widget
                        </button>
                    )}
                    {/* New Upload Button for Admins */}
                    {user.role === 'Administrator' && (
                        <button onClick={() => { setUploadModalOpen(true); setMenuOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Upload Widget
                        </button>
                    )}
                    {/* ... (other menu items) */}
                </div>
            )}

            {/* ... (the rest of the Dashboard component's JSX) */}
             <main className="p-4">
                <ResponsiveReactGridLayout
                    // ... (props)
                >
                    {layout.map(item => {
                        const widget = widgetLibrary.find(w => w.key === item.i);
                        return (
                            <div key={item.i} className={`...`}>
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
        </>
    );


    const loadView = async (viewId) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
            const newLayout = data.widgets.map(w => ({ i: w.widgetKey, x: w.x, y: w.y, w: w.w, h: w.h }));
            setLayout(newLayout);
            setOriginalLayout(newLayout);
            setCurrentViewId(viewId);
        } catch (error) { console.error("Failed to load view", error); }
    };

    // --- HANDLERS ---
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSaveNewView = async (viewName) => {
        try {
            await axios.post(`${API_URL}/api/dashboard/views`, { name: viewName, layout }, { withCredentials: true });
            setSaveModalOpen(false);
            const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
            setViews(data);
        } catch (error) { console.error("Failed to save new view", error); }
    };

    const handleUpdateView = async () => {
        try {
            const currentView = views.find(v => v.id === currentViewId);
            if (!currentView) return;

            await axios.put(`${API_URL}/api/dashboard/views/${currentViewId}`, { name: currentView.name, layout }, { withCredentials: true });

            setIsEditMode(false);
            setOriginalLayout(layout);
        } catch (error) { console.error("Failed to update view", error); }
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

    const toggleMenu = () => setMenuOpen(!menuOpen);
    const handleOpenEditPopup = () => {
        setMenuOpen(false);
        setEditPopupOpen(true);
    };

    // --- DERIVED STATE ---
    const currentWidgetKeys = layout.map(item => item.i);
    const availableWidgets = widgetLibrary.filter(widget => !currentWidgetKeys.includes(widget.key));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) return <div>Loading...</div>;

    return (
        <>
            <div className="min-h-screen bg-gray-100">
                {isSaveModalOpen && <SaveViewModal onSave={handleSaveNewView} onClose={() => setSaveModalOpen(false)} />}
                {isEditPopupOpen && <EditUserPopup onClose={() => setEditPopupOpen(false)} />}
                {isAddModalOpen && <AddWidgetModal availableWidgets={availableWidgets} onAddWidget={handleAddWidget} onClose={() => setAddModalOpen(false)} />}

                <header className="bg-white shadow-md">
                    {/* ... (header content remains the same) ... */}
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
                        {layout.map(item => (
                            <div key={item.i} className={`bg-white rounded-lg shadow-lg p-2 overflow-hidden ${isEditMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                                <DynamicWidget widgetKey={item.i} />
                            </div>
                        ))}
                    </ResponsiveReactGridLayout>
                </main>
            </div>
        </>
    );
};

export default Dashboard;