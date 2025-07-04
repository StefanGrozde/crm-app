// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom'; // Import router components
import Login from './components/Login';
import LoginCallback from './components/LoginCallback';

// --- Icon Components ---
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);


function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();

  const handleSetToken = (newToken) => {
      setToken(newToken);
  };
  
  const handleLogout = () => {
      setToken(null);
      localStorage.removeItem('token');
      navigate('/'); // Navigate to login page on logout
  };

  return (
    <Routes>
        <Route
            path="/"
            element={
                token ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" />
            }
        />
        <Route
            path="/login"
            element={!token ? <LoginPage setToken={handleSetToken} /> : <Navigate to="/" />}
        />
        <Route 
            path="/login/callback" 
            element={<LoginCallback setToken={handleSetToken} />}
        />
    </Routes>
);
}

// Helper component for the Login Page
const LoginPage = ({ setToken }) => (
<div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
    <Login setToken={setToken} />
</div>
);

// Helper component for the Dashboard
const Dashboard = ({ onLogout }) => (
<div className="min-h-screen bg-gray-50 font-sans">
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        {/* ... (Your existing header JSX with the logout button) ... */}
    </header>
    <main className="py-10">
        {/* ... (Your existing main content JSX) ... */}
    </main>
</div>
);


export default App;