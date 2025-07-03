// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [dbStatus, setDbStatus] = useState('');

  useEffect(() => {
    // Fetch data from the backend's test route
    fetch(`${process.env.REACT_APP_API_URL}/api/test-db`)
      .then(response => response.json())
      .then(data => {
        if (data.time) {
          setDbStatus(`Successfully connected to DB at: ${data.time}`);
        } else {
          setDbStatus(`Error: ${data.error}`);
        }
      })
      .catch(error => {
        console.error("Error fetching from API:", error);
        setDbStatus('Failed to connect to the backend API.');
      });
  }, []); // The empty array ensures this runs only once on component mount

  return (
    <div className="App">
      <header className="App-header">
        <h1>CRM Application</h1>
        <p>
          <strong>Backend Status:</strong> {dbStatus}
        </p>
      </header>
    </div>
  );
}

export default App;