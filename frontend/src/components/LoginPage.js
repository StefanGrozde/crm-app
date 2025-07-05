// frontend/src/components/LoginPage.js
import React from 'react';
import Login from './Login'; // The actual form component

const LoginPage = ({ setToken }) => (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
        <Login setToken={setToken} />
    </div>
);

export default LoginPage;