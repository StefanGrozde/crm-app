import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const WidgetManager = () => {
    const { user } = useContext(AuthContext);
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingWidget, setEditingWidget] = useState(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        widgetKey: '',
        name: '',
        description: '',
        type: 'builtin-react',
        version: '1.0.0',
        author: 'System',
        isActive: true,
        sortOrder: 0
    });

    useEffect(() => {
        loadWidgets();
    }, []);

    const loadWidgets = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/widgets/manifest`, { withCredentials: true });
            setWidgets(response.data);
        } catch (error) {
            console.error('Error loading widgets:', error);
            alert('Failed to load widgets');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingWidget) {
                await axios.post(`${API_URL}/api/widgets/database`, formData, { withCredentials: true });
                alert('Widget updated successfully!');
            } else {
                await axios.post(`${API_URL}/api/widgets/database`, formData, { withCredentials: true });
                alert('Widget created successfully!');
            }
            
            setShowForm(false);
            setEditingWidget(null);
            resetForm();
            loadWidgets();
        } catch (error) {
            console.error('Error saving widget:', error);
            alert('Failed to save widget: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleEdit = (widget) => {
        setEditingWidget(widget);
        setFormData({
            widgetKey: widget.key,
            name: widget.name,
            description: widget.description || '',
            type: widget.type,
            version: widget.version || '1.0.0',
            author: widget.author || 'System',
            isActive: widget.is_active !== false,
            sortOrder: widget.sortOrder || 0
        });
        setShowForm(true);
    };

    const handleDelete = async (widgetKey) => {
        if (!window.confirm('Are you sure you want to delete this widget?')) {
            return;
        }

        try {
            await axios.delete(`${API_URL}/api/widgets/database/${widgetKey}`, { withCredentials: true });
            alert('Widget deleted successfully!');
            loadWidgets();
        } catch (error) {
            console.error('Error deleting widget:', error);
            alert('Failed to delete widget: ' + (error.response?.data?.error || error.message));
        }
    };

    const resetForm = () => {
        setFormData({
            widgetKey: '',
            name: '',
            description: '',
            type: 'builtin-react',
            version: '1.0.0',
            author: 'System',
            isActive: true,
            sortOrder: 0
        });
    };

    const handleNewWidget = () => {
        setEditingWidget(null);
        resetForm();
        setShowForm(true);
    };

    if (!user || user.role !== 'Administrator') {
        return <div className="p-4">Access denied. Administrator privileges required.</div>;
    }

    if (loading) {
        return <div className="p-4">Loading widgets...</div>;
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Widget Manager</h1>
                <button
                    onClick={handleNewWidget}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Add New Widget
                </button>
            </div>

            {/* Widget Form */}
            {showForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h2 className="text-lg font-semibold mb-4">
                        {editingWidget ? 'Edit Widget' : 'Add New Widget'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Widget Key</label>
                                <input
                                    type="text"
                                    value={formData.widgetKey}
                                    onChange={(e) => setFormData({...formData, widgetKey: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                    disabled={!!editingWidget}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                    <option value="builtin-react">Built-in React</option>
                                    <option value="buildin">Built-in</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Version</label>
                                <input
                                    type="text"
                                    value={formData.version}
                                    onChange={(e) => setFormData({...formData, version: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Author</label>
                                <input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                                <input
                                    type="number"
                                    value={formData.sortOrder}
                                    onChange={(e) => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                rows="3"
                            />
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                className="mr-2"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                Active (Available in Add Widget Menu)
                            </label>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                {editingWidget ? 'Update Widget' : 'Create Widget'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingWidget(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Widgets List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {widgets.map((widget) => (
                        <li key={widget.key} className="px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center">
                                        <h3 className="text-lg font-medium text-gray-900">{widget.name}</h3>
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {widget.type}
                                        </span>
                                        {widget.is_active === false && (
                                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Hidden
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">{widget.description}</p>
                                    <div className="mt-2 text-xs text-gray-400">
                                        Key: {widget.key} | Version: {widget.version} | Author: {widget.author}
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEdit(widget)}
                                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                                    >
                                        Edit
                                    </button>
                                    {widget.type === 'builtin-react' && (
                                        <button
                                            onClick={() => handleDelete(widget.key)}
                                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {widgets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No widgets found. Create your first widget using the "Add New Widget" button.
                </div>
            )}
        </div>
    );
};

export default WidgetManager; 