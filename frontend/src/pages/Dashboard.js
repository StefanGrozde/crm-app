import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { AuthContext } from '../context/AuthContext';
import SalesPipelineWidget from '../components/widgets/SalesPipelineWidget'; // Example widget
import SaveViewModal from '../components/SaveViewModal';
import { useNavigate } from 'react-router-dom';

const ReactGridLayout = WidthProvider(RGL);
const API_URL = process.env.REACT_APP_API_URL;

// This maps widget keys to their actual components
const widgetComponentMap = {
    'sales-pipeline': SalesPipelineWidget,
    // Add other widgets here: 'recent-activities': RecentActivitiesWidget,
};


const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // State for dashboard
    const [layout, setLayout] = useState([]);
    const [views, setViews] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);

    // Fetch saved views from the backend
    useEffect(() => {
        const fetchViews = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
                setViews(data);
                // Load the first view by default if it exists
                if (data.length > 0) {
                    loadView(data[0].id);
                } else {
                    // Or load a default layout
                     setLayout([
                        { i: 'sales-pipeline', x: 0, y: 0, w: 4, h: 2 },
                     ]);
                }
            } catch (error) {
                console.error("Failed to fetch views", error);
            }
        };
        fetchViews();
    }, []);

    const loadView = async (viewId) => {
        try {
            const { data } = await axios.get(`${API_URL}/api/dashboard/views/${viewId}`, { withCredentials: true });
            const newLayout = data.widgets.map(w => ({ i: w.widgetKey, x: w.x, y: w.y, w: w.w, h: w.h }));
            setLayout(newLayout);
        } catch (error) {
            console.error("Failed to load view", error);
        }
    };

    const handleSaveView = async (viewName) => {
        try {
            await axios.post(`${API_URL}/api/dashboard/views`, {
                name: viewName,
                layout: layout,
            }, { withCredentials: true });
            setModalOpen(false);
            // Refresh the views list
            const { data } = await axios.get(`${API_URL}/api/dashboard/views`, { withCredentials: true });
            setViews(data);
        } catch (error) {
            console.error("Failed to save view", error);
        }
    };

    const onLayoutChange = (newLayout) => {
        setLayout(newLayout);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };


    return (
        <div className="min-h-screen bg-gray-100">
            {isModalOpen && <SaveViewModal onSave={handleSaveView} onClose={() => setModalOpen(false)} />}

            <header className="bg-white shadow-md">
                 <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                        {/* View Selector */}
                         <div className="flex items-center">
                            <select onChange={(e) => loadView(e.target.value)} className="mr-4 border rounded px-2 py-1">
                                 {views.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                            <button onClick={() => setModalOpen(true)} className="px-4 py-2 rounded text-white bg-blue-600">
                                Save View
                            </button>
                             <button onClick={handleLogout} className="ml-4 px-4 py-2 rounded text-white bg-red-600">
                                Logout
                            </button>
                        </div>
                    </div>
                 </div>
            </header>

            <main className="p-4">
                <ReactGridLayout
                    layout={layout}
                    onLayoutChange={onLayoutChange}
                    className="layout"
                    cols={12}
                    rowHeight={100}
                >
                    {layout.map(item => {
                        const WidgetComponent = widgetComponentMap[item.i];
                        return (
                            <div key={item.i} className="bg-white rounded-lg shadow-lg p-2">
                                {WidgetComponent ? <WidgetComponent /> : <div>Unknown Widget</div>}
                            </div>
                        );
                    })}
                </ReactGridLayout>
            </main>
        </div>
    );
};

export default Dashboard;