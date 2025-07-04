// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';

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

// --- Backend Status Component ---
/**
 * A component to display the connection status to the backend.
 * @param {{status: 'loading' | 'success' | 'error', message: string}} props
 */
const BackendStatus = ({ status, message }) => {
  const statusConfig = {
    loading: { color: 'bg-yellow-400', text: 'Connecting...' },
    success: { color: 'bg-green-500', text: 'Connected' },
    error: { color: 'bg-red-500', text: 'Connection Error' },
  };

  const { color, text } = statusConfig[status];

  return (
    <div className="flex items-center space-x-2" title={message}>
      <span className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
      </span>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
};


function App() {
  // State for managing backend connection status
  const [backendStatus, setBackendStatus] = useState('loading');
  const [backendMessage, setBackendMessage] = useState('Attempting to connect to the backend...');

  useEffect(() => {
    // Ensure the environment variable is set, otherwise, there's no point in fetching.
    if (!process.env.REACT_APP_API_URL) {
      console.error("REACT_APP_API_URL environment variable not set.");
      setBackendStatus('error');
      setBackendMessage('Frontend is missing the API URL configuration.');
      return;
    }

    // Fetch data from the backend's test route
    fetch(`${process.env.REACT_APP_API_URL}/api/test-db`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Network response was not ok, status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.time) {
          setBackendStatus('success');
          setBackendMessage(`Successfully connected to DB at: ${data.time}`);
        } else {
          // The request was successful, but the backend reported an error (e.g., DB connection failed)
          setBackendStatus('error');
          setBackendMessage(`Backend returned an error: ${data.error || 'Unknown error'}`);
        }
      })
      .catch(error => {
        console.error("Error fetching from API:", error);
        setBackendStatus('error');
        setBackendMessage(`Failed to connect to the backend API. Check CORS, Security Groups, and if the backend is running. Error: ${error.message}`);
      });
  }, []); // The empty array ensures this runs only once on component mount

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-800">MyCRM</h1>
            </div>

            <div className="flex-1 flex justify-center px-4 lg:ml-6">
              <div className="w-full max-w-lg">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon />
                  </div>
                  <input
                    id="search"
                    name="search"
                    className="block w-full bg-white border border-gray-300 rounded-full py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:text-gray-900 focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search for customers, deals, etc."
                    type="search"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
               {/* Backend Status Display */}
              <BackendStatus status={backendStatus} message={backendMessage} />
              <button
                type="button"
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="sr-only">View profile</span>
                <UserIcon />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
          <div className="mt-8 bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800">Welcome!</h2>
            <p className="mt-2 text-gray-600">
              This is where your main application content will be displayed. You can start building out components for contacts, deals, and reports here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
