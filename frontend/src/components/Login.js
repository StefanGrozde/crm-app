// frontend/src/components/Login.js
import React, { useState } from 'react';
import axios from 'axios';

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
                setToken(response.data.token);
                localStorage.setItem('token', response.data.token);
            } else {
                alert('Registration successful! Please log in.');
                setIsRegistering(false);
                // Clear form for login
                setPassword('');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An unexpected error occurred.');
        }
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <form onSubmit={handleSubmit}>
                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                {isRegistering && (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                
                <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                    type="submit"
                >
                    {isRegistering ? 'Register' : 'Sign In'}
                </button>
            </form>
            <p className="text-center text-gray-500 text-xs mt-4">
                <button onClick={() => setIsRegistering(!isRegistering)} className="font-semibold text-blue-500 hover:text-blue-800 bg-transparent p-0">
                    {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
                </button>
            </p>
        </div>
    );
};

export default Login;