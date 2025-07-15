import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import LoginSuccess from './pages/LoginSuccess';
import Dashboard from './pages/Dashboard';
import CreateCompany from './pages/CreateCompany';
import EditCompany from './pages/EditCompany';
import Contacts from './pages/Contacts';
import Tickets from './pages/Tickets';
import TicketQueues from './pages/TicketQueues';

import InviteRegistration from './pages/InviteRegistration';
import InviteSuccess from './pages/InviteSuccess';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login/success" element={<LoginSuccess />} />
          <Route path="/invite/:token" element={<InviteRegistration />} />
          <Route path="/invite-success" element={<InviteSuccess />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/create-company" element={<PrivateRoute><CreateCompany /></PrivateRoute>} />
          <Route path="/contacts" element={<PrivateRoute><Contacts /></PrivateRoute>} />
          <Route path="/tickets" element={<PrivateRoute><Tickets /></PrivateRoute>} />
          <Route path="/ticket-queues" element={<PrivateRoute><TicketQueues /></PrivateRoute>} />


          {/* Admin Only Route */}
          <Route element={<AdminRoute />}>
            <Route path="/edit-company" element={<EditCompany />} />
          </Route>

          {/* Redirect root to login or dashboard */}
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;