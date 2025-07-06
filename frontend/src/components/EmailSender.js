import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

const EmailSender = ({ 
  to = '', 
  subject = '', 
  initialContent = '', 
  onSuccess, 
  onCancel, 
  showBcc = false,
  showAttachments = false,
  className = '' 
}) => {
  const { user } = useAuth();
  
  const [emailData, setEmailData] = useState({
    to: to,
    subject: subject,
    htmlContent: initialContent,
    bcc: '',
    attachments: []
  });
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);

    if (!emailData.to || !emailData.subject || !emailData.htmlContent) {
      setError('Recipient, subject, and content are required.');
      setSending(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/companies/${user.companyId}/send-email`, {
        to: emailData.to,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        bcc: emailData.bcc ? [emailData.bcc] : [],
        attachments: emailData.attachments
      }, { withCredentials: true });

      if (response.data.success) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(response.data);
        }
        // Reset form after successful send
        setTimeout(() => {
          setEmailData({
            to: '',
            subject: '',
            htmlContent: '',
            bcc: '',
            attachments: []
          });
          setSuccess(false);
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to send email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEmailData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (success) {
    return (
      <div className={`p-4 bg-green-100 border border-green-400 text-green-700 rounded ${className}`}>
        <p className="font-medium">Email sent successfully!</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Send Email</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            To *
          </label>
          <input
            type="email"
            id="to"
            value={emailData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="recipient@example.com"
            required
          />
        </div>

        {showBcc && (
          <div className="mb-4">
            <label htmlFor="bcc" className="block text-sm font-medium text-gray-700 mb-1">
              BCC
            </label>
            <input
              type="email"
              id="bcc"
              value={emailData.bcc}
              onChange={(e) => handleInputChange('bcc', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="bcc@example.com"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject *
          </label>
          <input
            type="text"
            id="subject"
            value={emailData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Email subject"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            value={emailData.htmlContent}
            onChange={(e) => handleInputChange('htmlContent', e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email content here..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            You can use HTML tags for formatting (e.g., &lt;strong&gt;, &lt;em&gt;, &lt;br&gt;)
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmailSender; 