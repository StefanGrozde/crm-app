import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import MyViewsWidget from '../components/MyViewsWidget';

const MyViews = () => {
    const { user } = useContext(AuthContext);

    if (!user) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">My Views</h1>
                    <p className="text-gray-600 mt-2">Manage your dashboard views</p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <MyViewsWidget />
                </div>
            </div>
        </div>
    );
};

export default MyViews; 