import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const EmailConfigurationModal = ({ isOpen, onClose, configuration, onSave }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    emailAddress: '',
    isActive: true,
    defaultTicketType: 'support',
    defaultTicketPriority: 'medium',
    defaultAssignedTo: '',
    subjectPrefix: '',
    autoResolveKeywords: [],
    ignoredSenders: [],
    createTicketsForInternalEmails: false,
    requireContactMatch: false,
    autoCreateContacts: true
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [senderInput, setSenderInput] = useState('');

  // Check if user is Administrator
  const isAdmin = user?.role === 'Administrator';

  useEffect(() => {
    if (configuration) {
      setFormData({
        emailAddress: configuration.emailAddress || '',
        isActive: configuration.isActive ?? true,
        defaultTicketType: configuration.defaultTicketType || 'support',
        defaultTicketPriority: configuration.defaultTicketPriority || 'medium',
        defaultAssignedTo: configuration.defaultAssignedTo || '',
        subjectPrefix: configuration.subjectPrefix || '',
        autoResolveKeywords: configuration.autoResolveKeywords || [],
        ignoredSenders: configuration.ignoredSenders || [],
        createTicketsForInternalEmails: configuration.createTicketsForInternalEmails || false,
        requireContactMatch: configuration.requireContactMatch || false,
        autoCreateContacts: configuration.autoCreateContacts ?? true
      });
    }
  }, [configuration]);

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchUsers();
    }
  }, [isOpen, isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/users`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        // Handle both array and object responses
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          console.error('Unexpected users data format:', data);
          setUsers([]);
        }
      } else {
        console.error('Failed to fetch users:', response.status);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAdmin) {
      setError('You must be an Administrator to manage email configurations');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare form data for submission - convert empty strings to null for optional fields
      const submitData = {
        ...formData,
        defaultAssignedTo: formData.defaultAssignedTo === '' ? null : formData.defaultAssignedTo,
        subjectPrefix: formData.subjectPrefix === '' ? null : formData.subjectPrefix
      };

      const method = configuration ? 'PUT' : 'POST';
      const url = configuration 
        ? `${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations/${configuration.id}`
        : `${process.env.REACT_APP_API_URL}/api/email-to-ticket/configurations`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const savedConfiguration = await response.json();
        onSave(savedConfiguration);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.autoResolveKeywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        autoResolveKeywords: [...prev.autoResolveKeywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword) => {
    setFormData(prev => ({
      ...prev,
      autoResolveKeywords: prev.autoResolveKeywords.filter(k => k !== keyword)
    }));
  };

  const addIgnoredSender = () => {
    if (senderInput.trim() && !formData.ignoredSenders.includes(senderInput.trim())) {
      setFormData(prev => ({
        ...prev,
        ignoredSenders: [...prev.ignoredSenders, senderInput.trim()]
      }));
      setSenderInput('');
    }
  };

  const removeIgnoredSender = (sender) => {
    setFormData(prev => ({
      ...prev,
      ignoredSenders: prev.ignoredSenders.filter(s => s !== sender)
    }));
  };

  const handleKeywordKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleSenderKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIgnoredSender();
    }
  };

  if (!isOpen) return null;

  // Show access denied message for non-admin users
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="text-center py-4">
            <div className="text-red-600 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">
              You must be an Administrator to manage email-to-ticket configurations.
            </p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            {configuration ? 'Edit Email Configuration' : 'New Email Configuration'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="support@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Active</span>
              </div>
            </div>
          </div>

          {/* Ticket Defaults */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Ticket Type
              </label>
              <select
                name="defaultTicketType"
                value={formData.defaultTicketType}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="support">Support</option>
                <option value="bug">Bug</option>
                <option value="feature_request">Feature Request</option>
                <option value="question">Question</option>
                <option value="task">Task</option>
                <option value="incident">Incident</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Priority
              </label>
              <select
                name="defaultTicketPriority"
                value={formData.defaultTicketPriority}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Assigned To
              </label>
              <select
                name="defaultAssignedTo"
                value={formData.defaultAssignedTo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Prefix (Optional)
            </label>
            <input
              type="text"
              name="subjectPrefix"
              value={formData.subjectPrefix}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="[SUPPORT]"
            />
          </div>

          {/* Auto-Resolve Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auto-Resolve Keywords
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={handleKeywordKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add keyword (e.g., 'resolved', 'fixed')"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.autoResolveKeywords.map(keyword => (
                <span
                  key={keyword}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(keyword)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Ignored Senders */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ignored Senders
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={senderInput}
                onChange={(e) => setSenderInput(e.target.value)}
                onKeyPress={handleSenderKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add email address to ignore"
              />
              <button
                type="button"
                onClick={addIgnoredSender}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.ignoredSenders.map(sender => (
                <span
                  key={sender}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                >
                  {sender}
                  <button
                    type="button"
                    onClick={() => removeIgnoredSender(sender)}
                    className="ml-2 text-red-600 hover:text-red-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Processing Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-800">Processing Options</h3>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="createTicketsForInternalEmails"
                checked={formData.createTicketsForInternalEmails}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">
                Create tickets for internal emails (same domain)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="requireContactMatch"
                checked={formData.requireContactMatch}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">
                Require sender to be an existing contact
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="autoCreateContacts"
                checked={formData.autoCreateContacts}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label className="text-sm text-gray-700">
                Automatically create contacts for unknown senders
              </label>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {loading ? 'Saving...' : (configuration ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmailConfigurationModal;