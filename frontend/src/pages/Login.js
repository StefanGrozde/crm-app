import React from 'react';

const Login = () => {
  const handleMicrosoftLogin = () => {
    // Redirect to the backend SSO endpoint
    window.location.href = `${process.env.REACT_APP_API_URL}/api/auth/microsoft/login`;
  };

  return (
    <div>
      <h2>Login</h2>
      {/* We will add the username/password form later */}
      <button onClick={handleMicrosoftLogin}>
        Sign in with Microsoft
      </button>
    </div>
  );
};

export default Login;