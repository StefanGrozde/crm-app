// frontend/src/components/LoginCallback.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = ({ setToken }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // Save the token and update the app state
      localStorage.setItem('token', token);
      setToken(token);
      // Redirect to the dashboard
      navigate('/');
    } else {
        // Handle error or redirect to login
        navigate('/login');
    }
  }, [location, navigate, setToken]);

  return <div>Loading...</div>;
};

export default LoginCallback;