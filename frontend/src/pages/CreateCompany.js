import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const CreateCompany = () => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Microsoft 365 Email Configuration
  const [ms365ClientId, setMs365ClientId] = useState('');
  const [ms365ClientSecret, setMs365ClientSecret] = useState('');
  const [ms365TenantId, setMs365TenantId] = useState('');
  const [ms365EmailFrom, setMs365EmailFrom] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name || !industry) {
      setError('Company name and industry are required.');
      setLoading(false);
      return;
    }

    try {
      // The `protect` middleware on your backend will use the cookie to identify the user.
      // We MUST include `withCredentials: true` for the browser to send the cookie.
      const { data: company } = await axios.post(`${API_URL}/api/companies`, {
        name,
        industry,
        website,
        phone_number: phoneNumber,
        ms365ClientId,
        ms365ClientSecret,
        ms365TenantId,
        ms365EmailFrom,
        emailEnabled,
      }, { withCredentials: true }); // <--- FIX: Added withCredentials

      // Update the frontend's auth context with the new company info.
      const updatedUser = { ...user, companyId: company.id, role: 'Administrator' };
      setUser(updatedUser);

      // Navigate to the dashboard.
      navigate('/dashboard');

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to create company.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-center mb-2">Create Your Company</h1>
        <p className="text-center text-gray-600 mb-6">
          Welcome! Let's get your company set up in the CRM.
        </p>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Microsoft 365 Email Configuration */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Microsoft 365 Email Configuration (Optional)</h2>
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
                  <label htmlFor="ms365ClientId" className="block text-sm font-medium text-gray-700">Client ID</label>
                  <input
                    type="text"
                    id="ms365ClientId"
                    value={ms365ClientId}
                    onChange={(e) => setMs365ClientId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Application (client) ID from Azure App Registration"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="ms365ClientSecret" className="block text-sm font-medium text-gray-700">Client Secret</label>
                  <input
                    type="password"
                    id="ms365ClientSecret"
                    value={ms365ClientSecret}
                    onChange={(e) => setMs365ClientSecret(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Client Secret from Azure App Registration"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="ms365TenantId" className="block text-sm font-medium text-gray-700">Tenant ID</label>
                  <input
                    type="text"
                    id="ms365TenantId"
                    value={ms365TenantId}
                    onChange={(e) => setMs365TenantId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Directory (tenant) ID from Azure App Registration"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="ms365EmailFrom" className="block text-sm font-medium text-gray-700">From Email Address</label>
                  <input
                    type="email"
                    id="ms365EmailFrom"
                    value={ms365EmailFrom}
                    onChange={(e) => setMs365EmailFrom(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="email@yourdomain.com"
                  />
                </div>
                <div className="mb-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> You can configure email settings later in the Company Settings. 
                    This will allow you to send emails directly from your CRM using Microsoft 365.
                  </p>
                </div>
              </>
            )}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {loading ? 'Creating...' : 'Create Company & Go to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCompany;
