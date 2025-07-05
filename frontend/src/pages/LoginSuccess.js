import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginSuccess = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // The browser will automatically send the HttpOnly cookie
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/me`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData); // Set the user in our global context
          
          // Redirect to dashboard or company creation page
          if (userData.companyId) {
            navigate('/dashboard');
          } else {
            navigate('/create-company');
          }
        } else {
          // If fetching the user fails, redirect to login
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate, setUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Finalizing login...</p>
    </div>
  );
};

export default LoginSuccess;