// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import Login from './components/Login'; // Import the new component
import './App.css';

function App() {
    const [token, setToken] = useState(null);

    // Check for a token in local storage when the app loads
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>CRM App</h1>
                {token ? (
                    <div>
                        <h2>Welcome! You are logged in.</h2>
                        <button onClick={handleLogout}>Logout</button>
                        {/* You can now show the main CRM components here */}
                    </div>
                ) : (
                    // If there is no token, show the Login component
                    <Login setToken={setToken} />
                )}
            </header>
        </div>
    );
}

export default App;