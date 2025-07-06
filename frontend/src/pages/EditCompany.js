import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const EditCompany = () => {
    const navigate = useNavigate();
    // Use the custom hook which is cleaner
    const { user } = useAuth();

    // State for form fields
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('');
    const [website, setWebsite] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    
    // State for Microsoft 365 email configuration
    const [ms365ClientId, setMs365ClientId] = useState('');
    const [ms365ClientSecret, setMs365ClientSecret] = useState('');
    const [ms365TenantId, setMs365TenantId] = useState('');
    const [ms365EmailFrom, setMs365EmailFrom] = useState('');
    const [emailEnabled, setEmailEnabled] = useState(false);
    
    // State for loading and errors
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // State for email testing
    const [testingConfig, setTestingConfig] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [testEmailAddress, setTestEmailAddress] = useState('');
    const [sendingTestEmail, setSendingTestEmail] = useState(false);

    useEffect(() => {
        const fetchCompanyData = async () => {
            // FIX 3: Use user.companyId (camelCase)
            if (!user?.companyId) {
                setError("No company associated with this user.");
                setLoading(false);
                return;
            }
            try {
                // FIX 1 & 2: Use the correct path and include credentials (for the cookie)
                const response = await axios.get(`${API_URL}/api/companies/${user.companyId}`, {
                    withCredentials: true,
                });
                const company = response.data;
                setName(company.name);
                setIndustry(company.industry);
                setWebsite(company.website || '');
                setPhoneNumber(company.phone_number || '');
                setMs365ClientId(company.ms365ClientId || '');
                setMs365ClientSecret(company.ms365ClientSecret || '');
                setMs365TenantId(company.ms365TenantId || '');
                setMs365EmailFrom(company.ms365EmailFrom || '');
                setEmailEnabled(company.emailEnabled || false);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to fetch company details.");
            } finally {
                setLoading(false);
            }
        };

        fetchCompanyData();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!name || !industry) {
            setError('Company name and industry are required.');
            setSubmitting(false);
            return;
        }

        try {
            // FIX 1 & 2: Use the correct path and include credentials
            await axios.put(`${API_URL}/api/companies/${user.companyId}`, {
                name,
                industry,
                website,
                phone_number: phoneNumber,
                ms365ClientId,
                ms365ClientSecret,
                ms365TenantId,
                ms365EmailFrom,
                emailEnabled,
            }, { withCredentials: true });
            
            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update company.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleTestConfiguration = async () => {
        setTestingConfig(true);
        setTestResult(null);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/companies/${user.companyId}/test-email-config`, {}, {
                withCredentials: true,
            });
            setTestResult(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to test email configuration.');
        } finally {
            setTestingConfig(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmailAddress) {
            setError('Please enter a test email address.');
            return;
        }

        setSendingTestEmail(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/companies/${user.companyId}/send-test-email`, {
                testEmailAddress,
            }, {
                withCredentials: true,
            });
            setTestResult(response.data);
            if (response.data.success) {
                setTestEmailAddress('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send test email.');
        } finally {
            setSendingTestEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <p>Loading Company Details...</p>
            </div>
        );
    }
    
    // Using the same TailwindCSS classes as your other pages for consistency
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-2xl">
                <h1 className="text-2xl font-bold text-center mb-6">Edit Company Details</h1>
                <form onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    
                    {/* Basic Company Information */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Basic Information</h2>
                        <div className="mb-4">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Company Name *</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry *</label>
                            <input
                                type="text"
                                id="industry"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                required
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                            <input
                                type="url"
                                id="website"
                                placeholder="https://example.com"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Microsoft 365 Email Configuration */}
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Microsoft 365 Email Configuration</h2>
                        <div className="mb-4">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={emailEnabled}
                                    onChange={(e) => setEmailEnabled(e.target.checked)}
                                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700">Enable Email Functionality</span>
                            </label>
                        </div>
                        
                        {emailEnabled && (
                            <>
                                <div className="mb-4">
                                    <label htmlFor="ms365ClientId" className="block text-sm font-medium text-gray-700">Client ID *</label>
                                    <input
                                        type="text"
                                        id="ms365ClientId"
                                        value={ms365ClientId}
                                        onChange={(e) => setMs365ClientId(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                        placeholder="Application (client) ID from Azure App Registration"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="ms365ClientSecret" className="block text-sm font-medium text-gray-700">Client Secret *</label>
                                    <input
                                        type="password"
                                        id="ms365ClientSecret"
                                        value={ms365ClientSecret}
                                        onChange={(e) => setMs365ClientSecret(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                        placeholder="Client Secret from Azure App Registration"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="ms365TenantId" className="block text-sm font-medium text-gray-700">Tenant ID *</label>
                                    <input
                                        type="text"
                                        id="ms365TenantId"
                                        value={ms365TenantId}
                                        onChange={(e) => setMs365TenantId(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                        placeholder="Directory (tenant) ID from Azure App Registration"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label htmlFor="ms365EmailFrom" className="block text-sm font-medium text-gray-700">From Email Address *</label>
                                    <input
                                        type="email"
                                        id="ms365EmailFrom"
                                        value={ms365EmailFrom}
                                        onChange={(e) => setMs365EmailFrom(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                        placeholder="email@yourdomain.com"
                                    />
                                </div>

                                {/* Email Testing Section */}
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <h3 className="text-md font-semibold mb-3 text-gray-700">Test Email Configuration</h3>
                                    
                                    <div className="mb-4">
                                        <button
                                            type="button"
                                            onClick={handleTestConfiguration}
                                            disabled={testingConfig}
                                            className="w-full mb-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                        >
                                            {testingConfig ? 'Testing...' : 'Test Configuration'}
                                        </button>
                                    </div>

                                    {testResult && (
                                        <div className={`mb-4 p-3 rounded-md ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            <p className="text-sm">{testResult.message}</p>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label htmlFor="testEmailAddress" className="block text-sm font-medium text-gray-700">Test Email Address</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="email"
                                                id="testEmailAddress"
                                                value={testEmailAddress}
                                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                                                placeholder="test@example.com"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleSendTestEmail}
                                                disabled={sendingTestEmail || !testEmailAddress}
                                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400"
                                            >
                                                {sendingTestEmail ? 'Sending...' : 'Send Test'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                         <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className="w-auto inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                         >
                             Cancel
                         </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {submitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCompany;