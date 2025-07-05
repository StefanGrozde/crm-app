import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { Link, useNavigate } from 'react-router-dom';

// Component Imports
import { AuthContext } from '../context/AuthContext';
import SaveViewModal from '../components/SaveViewModal';
import EditUserPopup from '../components/EditUserPopup';
import AddWidgetModal from '../components/AddWidgetModal'; // New

// Widget Imports
import SalesPipelineWidget from '../components/widgets/SalesPipelineWidget';
import RecentActivitiesWidget from '../components/widgets/RecentActivitiesWidget'; // New
import LeadConversionWidget from '../components/widgets/LeadConversionWidget'; // New

const ResponsiveReactGridLayout = WidthProvider(Responsive);
const API_URL = process.env.REACT_APP_API_URL;

// --- WIDGET LIBRARY ---
const WIDGET_LIBRARY = [
    { key: 'sales-pipeline', name: 'Sales Pipeline', component: SalesPipelineWidget, defaultW: 6, defaultH: 2 },
    { key: 'recent-activities', name: 'Recent Activities', component: RecentActivitiesWidget, defaultW: 3, defaultH: 2 },
    { key: 'lead-conversion', name: 'Lead Conversion Rate', component: LeadConversionWidget, defaultW: 3, defaultH: 1 },
];

const widgetComponentMap = WIDGET_LIBRARY.reduce((acc, widget) => {
    acc[widget.key] = widget.component;
    return acc;
}, {});


const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const menuRef = useRef(null);

    // --- STATE MANAGEMENT ---
    const [layout, setLayout] = useState([]);
    const [originalLayout, setOriginalLayout] = useState([]);
    const [views, setViews] = useState([]);
    const [currentViewId, setCurrentViewId] = useState(null);
    
    // UI State
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isEditPopupOpen, setEditPopupOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false); // New
    const [menuOpen, setMenuOpen] = useState(false);

    // --- DATA FETCHING & VIEW MANAGEMENT ---
    useEffect(() => {
        const fetchViews = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
                setViews(data);
                if (data.length > 0) {
                    loadView(data[0].id);
                    setCurrentViewId(data[0].id);
                } else {
                     setLayout([{ i: 'sales-pipeline', x: 0, y: 0, w: 6, h: 2 }]);
                }
            } catch (error) { console.error("Failed to fetch views", error); }
        };
        fetchViews();
    }, []);

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
            if (!currentView) return; // Should not happen

            await axios.put(`${API_URL}/api/dashboard/views/${currentViewId}`, { name: currentView.name, layout }, { withCredentials: true });
            
            setIsEditMode(false);
            setOriginalLayout(layout);
        } catch (error) { console.error("Failed to update view", error); }
    };

    const handleAddWidget = (widgetKey) => {
        const widgetToAdd = WIDGET_LIBRARY.find(w => w.key === widgetKey);
        if (!widgetToAdd) return;

        const newLayoutItem = {
            i: widgetKey,
            x: (layout.length * 3) % 12, // Cascade new widgets
            y: Infinity, // Puts it at the bottom
            w: widgetToAdd.defaultW || 3,
            h: widgetToAdd.defaultH || 2,
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
    const availableWidgets = WIDGET_LIBRARY.filter(widget => !currentWidgetKeys.includes(widget.key));

    // Effect to close dropdown menu when clicking outside
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
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                            
                            <div className="flex items-center space-x-4">
                                {isEditMode ? (
                                    <>
                                        <button onClick={() => setAddModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Add Widget</button>
                                        <button onClick={handleUpdateView} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Save Changes</button>
                                        <button onClick={handleCancelEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <select onChange={(e) => loadView(e.target.value)} value={currentViewId || ''} className="border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500">
                                            {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                        <button onClick={() => setIsEditMode(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">Edit View</button>
                                        <button onClick={() => setSaveModalOpen(true)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">Save as New</button>
                                    </>
                                )}

                                {/* User Dropdown Menu */}
                                <div className="relative" ref={menuRef}>
                                    <img src={`https://i.pravatar.cc/40?u=${user.email}`} alt="User Avatar" className="w-10 h-10 rounded-full cursor-pointer" onClick={toggleMenu} />
                                    {menuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 origin-top-right transform -translate-x-1/2 left-1/2">
                                            <button onClick={handleOpenEditPopup} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Edit Profile</button>
                                            {user.role === 'Administrator' && (
                                                <Link to="/edit-company" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMenuOpen(false)}>Edit Company</Link>
                                            )}
                                            <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</button>
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
                            const WidgetComponent = widgetComponentMap[item.i];
                            return (
                                <div key={item.i} className={`bg-white rounded-lg shadow-lg p-2 overflow-hidden ${isEditMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                                    {WidgetComponent ? <WidgetComponent /> : <div className="text-red-500">Unknown Widget</div>}
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