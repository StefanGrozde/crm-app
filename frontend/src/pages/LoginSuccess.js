// frontend/src/pages/LoginSuccess.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginSuccess = () => {
  const navigate = useNavigate();
  // Get the checkUserLoggedIn function and the latest user state from the context
  const { checkUserLoggedIn, user, loading } = useAuth();

  useEffect(() => {
    // When this page loads, it means the user has just returned from Microsoft.
    // We tell our AuthContext to re-check the user's status, which will now
    // hopefully find the new cookie.
    checkUserLoggedIn();
  }, [checkUserLoggedIn]);
  
  // This effect will run whenever the user or loading state changes.
  useEffect(() => {
    // Don't do anything until the auth check is complete
    if (loading) return;

    if (user) {
      if (user.companyId) {
        navigate('/dashboard');
      } else {
        navigate('/create-company');
      }
    } else {
      // If after checking, the user is still not found, go to login.
      navigate('/login');
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Finalizing login...</p>
    </div>
  );
};

export default LoginSuccess;