import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminRoute = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        // Show a loading indicator while we verify the user's auth state
        return <div>Loading...</div>;
    }

    // If the user is authenticated and is an Administrator, render the child routes.
    // Otherwise, redirect them to the dashboard.
    return user && user.role === 'Administrator' ? <Outlet /> : <Navigate to="/dashboard" />;
};

export default AdminRoute;
