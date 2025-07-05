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
    
    // State for loading and errors
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

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
            }, { withCredentials: true });
            
            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update company.');
        } finally {
            setSubmitting(false);
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
            <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold text-center mb-6">Edit Company Details</h1>
                <form onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                    
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
                    <div className="mb-6">
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        />
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