import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Dashboard from './pages/Dashboard'; // We will create this next
import Login from './pages/Login';         // We will create this next
import LoginSuccess from './pages/LoginSuccess';
import CreateCompany from './pages/CreateCompany'; // We will create this next

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/success" element={<LoginSuccess />} />
          <Route path="/create-company" element={<CreateCompany />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/" element={<Login />} /> {/* Default route */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;