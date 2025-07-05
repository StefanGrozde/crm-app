// frontend/src/App.js
import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import LoginCallback from './components/LoginCallback';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));

    const handleSetToken = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };
    
    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <Routes>
            <Route
                path="/login"
                element={!token ? <LoginPage setToken={handleSetToken} /> : <Navigate to="/" />}
            />
            <Route 
                path="/login/callback" 
                element={<LoginCallback setToken={handleSetToken} />}
            />
            <Route
                path="/*"
                element={token ? <Dashboard handleLogout={handleLogout} /> : <Navigate to="/login" />}
            />
        </Routes>
    );
}

export default App;