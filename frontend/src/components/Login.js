// frontend/src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';

// The backend URL should be stored in an environment variable
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const Login = ({ setToken }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const url = isRegistering ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
        const payload = isRegistering ? { username, email, password } : { username, password };

        try {
            const response = await axios.post(url, payload);

            if (!isRegistering) {
                // If logging in, save the token
                setToken(response.data.token);
                localStorage.setItem('token', response.data.token);
            } else {
                // If registering, switch to login view
                alert('Registration successful! Please log in.');
                setIsRegistering(false);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred.');
        }
    };

    return (
        <div>
            <h2>{isRegistering ? 'Register' : 'Login'}</h2>
            <form onSubmit={handleSubmit}>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <div>
                    <label>Username:</label>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                {isRegistering && (
                    <div>
                        <label>Email:</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                )}
                <div>
                    <label>Password:</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
            </form>
            <button onClick={() => setIsRegistering(!isRegistering)}>
                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>
        </div>
    );
};

export default Login;