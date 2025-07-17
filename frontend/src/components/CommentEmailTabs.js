import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL;

/**
 * CommentEmailTabs - A reusable component for adding comments and sending emails
 * 
 * @param {Object} props
 * @param {string} props.entityType - Type of entity (ticket, lead, opportunity, etc.)
 * @param {number} props.entityId - ID of the entity
 * @param {Object} props.entityData - Data about the entity (title, number, etc.)
 * @param {string} props.contactEmail - Email address of the contact (optional)
 * @param {string} props.contactName - Name of the contact (optional)
 * @param {Function} props.onCommentAdded - Callback when comment is added
 * @param {Function} props.onEmailSent - Callback when email is sent
 * @param {string} props.commentEndpoint - API endpoint for comments (optional, defaults to standard pattern)
 * @param {Object} props.defaultEmailData - Default values for email fields
 * @param {string} props.className - Additional CSS classes
 */
const CommentEmailTabs = ({
    entityType,
    entityId,
    entityData = {},
    contactEmail,
    contactName,
    onCommentAdded,
    onEmailSent,
    commentEndpoint,
    defaultEmailData = {},
    className = ''
}) => {
    // Context
    const { user } = useContext(AuthContext);
    
    // Tab state
    const [activeTab, setActiveTab] = useState('comment');
    
    // Comment states
    const [newComment, setNewComment] = useState('');
    const [isInternalComment, setIsInternalComment] = useState(false);
    const [addingComment, setAddingComment] = useState(false);
    
    // Email states
    const [emailData, setEmailData] = useState({
        to: '',
        subject: '',
        htmlContent: '',
        sendFrom: '' // New field for send-from selection
    });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [availableMailboxes, setAvailableMailboxes] = useState([]);
    const [loadingMailboxes, setLoadingMailboxes] = useState(false);

    // Check if user has SSO access (logged in with Windows/Microsoft credentials)
    // Generic SSO detection - any user with a valid email address is considered SSO
    const hasSSO = user?.authMethod === 'microsoft' || 
                   user?.authMethod === 'sso' ||
                   (user?.email && user.email.includes('@')); // Generic email-based SSO detection

    // Fetch available mailboxes for send-from selection
    const fetchAvailableMailboxes = async () => {
        console.log('SSO Check:', { hasSSO, userEmail: user?.email, authMethod: user?.authMethod });
        if (!hasSSO) {
            console.log('User does not have SSO access, using company default email');
            // For non-SSO users, fetch the company's default email from the Edit Company page
            try {
                const response = await axios.get(`${API_URL}/api/companies/${user.companyId}`, {
                    withCredentials: true
                });
                
                if (response.data && response.data.ms365EmailFrom) {
                    setAvailableMailboxes([{
                        email: response.data.ms365EmailFrom,
                        displayName: 'Company Email',
                        isDefault: true,
                        isActive: true,
                        type: 'company'
                    }]);
                    console.log('Using company default email:', response.data.ms365EmailFrom);
                } else {
                    console.log('No company default email configured');
                    setAvailableMailboxes([]);
                }
            } catch (error) {
                console.error('Error fetching company email config:', error);
                setAvailableMailboxes([]);
            }
            return;
        }
        
        try {
            setLoadingMailboxes(true);
            console.log('Fetching mailboxes for company:', user.companyId);
            const response = await axios.get(`${API_URL}/api/companies/${user.companyId}/mailboxes`, {
                withCredentials: true
            });
            
            console.log('Mailboxes response:', response.data);
            if (response.data && Array.isArray(response.data)) {
                const activeMailboxes = response.data.filter(mailbox => mailbox.isActive);
                console.log('Active mailboxes:', activeMailboxes);
                setAvailableMailboxes(activeMailboxes);
            }
        } catch (error) {
            console.error('Error fetching mailboxes:', error);
            // Fallback to default mailbox if available
            setAvailableMailboxes([]);
        } finally {
            setLoadingMailboxes(false);
        }
    };

    // Initialize email data when switching to email tab
    const initializeEmailData = () => {
        // Find default mailbox
        const defaultMailbox = availableMailboxes.find(mb => mb.isDefault) || availableMailboxes[0];
        
        const defaults = {
            to: contactEmail || defaultEmailData.to || '',
            subject: defaultEmailData.subject || `Regarding ${entityType} ${entityData.number || entityData.id}: ${entityData.title || ''}`,
            htmlContent: defaultEmailData.htmlContent || `Dear ${contactName || 'Customer'},

We are writing regarding your ${entityType} ${entityData.number || entityData.id}: ${entityData.title || ''}

Please let us know if you have any questions or need further assistance.

Best regards,
${user.username}
Support Team`,
            sendFrom: defaultMailbox?.email || defaultEmailData.sendFrom || ''
        };
        
        setEmailData(defaults);
    };

    // Initialize data when component loads
    useEffect(() => {
        const initializeComponent = async () => {
            // Fetch mailboxes for all users on component load
            await fetchAvailableMailboxes();
        };
        
        initializeComponent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasSSO, user?.email]); // Run when SSO status or user email changes

    // Initialize email data when key props change
    useEffect(() => {
        initializeEmailData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contactEmail, contactName, entityType, entityData.number, entityData.id, entityData.title, user?.username]);

    // Update email data when available mailboxes change
    useEffect(() => {
        if (availableMailboxes.length > 0) {
            initializeEmailData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableMailboxes]);

    // Handle tab change (simplified since data is already initialized)
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    // Add comment
    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        
        try {
            setAddingComment(true);
            
            // Use custom endpoint if provided, otherwise use standard pattern
            const endpoint = commentEndpoint || `${API_URL}/api/${entityType}s/${entityId}/comments`;
            
            const response = await axios.post(endpoint, {
                comment: newComment.trim(),
                isInternal: isInternalComment
            }, {
                withCredentials: true
            });
            
            // Clear form
            setNewComment('');
            setIsInternalComment(false);
            
            // Call callback if provided
            if (onCommentAdded) {
                onCommentAdded(response.data);
            }
            
            alert('Comment added successfully!');
        } catch (error) {
            console.error('Error adding comment:', error);
            alert('Failed to add comment');
        } finally {
            setAddingComment(false);
        }
    };

    // Send email
    const handleSendEmail = async () => {
        if (!emailData.to || !emailData.subject || !emailData.htmlContent) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            setSendingEmail(true);
            const response = await axios.post(`${API_URL}/api/companies/${user.companyId}/send-email`, {
                to: emailData.to,
                subject: emailData.subject,
                htmlContent: emailData.htmlContent,
                sendFrom: emailData.sendFrom // Include send-from selection
            }, {
                withCredentials: true
            });
            
            if (response.data.success) {
                alert('Email sent successfully!');
                
                // Reset email form to defaults instead of clearing completely
                initializeEmailData();
                
                // Add a comment to record the email was sent
                try {
                    const endpoint = commentEndpoint || `${API_URL}/api/${entityType}s/${entityId}/comments`;
                    await axios.post(endpoint, {
                        comment: `Email sent to ${emailData.to}\nSubject: ${emailData.subject}`,
                        isInternal: true
                    }, {
                        withCredentials: true
                    });
                } catch (error) {
                    console.error('Error adding email record comment:', error);
                }
                
                // Call callback if provided
                if (onEmailSent) {
                    onEmailSent(response.data);
                }
            } else {
                alert(`Failed to send email: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => handleTabChange('comment')}
                    className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                        activeTab === 'comment'
                            ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.172-.268l-5.562 2.067a1 1 0 01-1.295-1.295l2.067-5.562A8.955 8.955 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                    </svg>
                    Add Comment
                </button>
                <button
                    onClick={() => handleTabChange('email')}
                    className={`flex-1 px-4 py-3 text-sm font-medium text-center transition-colors ${
                        activeTab === 'email'
                            ? 'bg-green-50 text-green-700 border-b-2 border-green-700'
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    disabled={!contactEmail}
                    title={!contactEmail ? 'No contact email available' : 'Send email to contact'}
                >
                    <svg className="w-4 h-4 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Email
                </button>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {/* Comment Tab */}
                {activeTab === 'comment' && (
                    <div className="space-y-3">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Type your comment here..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`internal-${entityType}-${entityId}`}
                                    checked={isInternalComment}
                                    onChange={(e) => setIsInternalComment(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`internal-${entityType}-${entityId}`} className="ml-2 text-xs text-gray-600">
                                    Internal comment
                                </label>
                            </div>
                            <button
                                onClick={handleAddComment}
                                disabled={addingComment || !newComment.trim()}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {addingComment ? 'Adding...' : 'Add Comment'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Email Tab */}
                {activeTab === 'email' && (
                    <div className="space-y-4">
                        {contactEmail ? (
                            <>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> This email will be sent using your company's Microsoft 365 configuration.
                                        A record of this email will be added to the {entityType} comments.
                                    </p>
                                </div>

                                {/* Send From Selection for All Users */}
                                {availableMailboxes.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Send From *
                                        </label>
                                        <select
                                            value={emailData.sendFrom}
                                            onChange={(e) => setEmailData(prev => ({ ...prev, sendFrom: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                            disabled={loadingMailboxes}
                                        >
                                            {loadingMailboxes ? (
                                                <option>Loading mailboxes...</option>
                                            ) : (
                                                <>
                                                    <option value="">Select mailbox</option>
                                                    {availableMailboxes.map((mailbox, index) => (
                                                        <option key={index} value={mailbox.email}>
                                                            {mailbox.displayName} ({mailbox.email})
                                                            {mailbox.isDefault ? ' - Default' : ''}
                                                        </option>
                                                    ))}
                                                </>
                                            )}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {hasSSO ? 'Choose which mailbox to send from' : 'Company default email will be used to send'}
                                        </p>
                                    </div>
                                )}
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        To *
                                    </label>
                                    <input
                                        type="email"
                                        value={emailData.to}
                                        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="recipient@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        value={emailData.subject}
                                        onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="Email subject"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Message *
                                    </label>
                                    <textarea
                                        value={emailData.htmlContent}
                                        onChange={(e) => setEmailData(prev => ({ ...prev, htmlContent: e.target.value }))}
                                        rows={6}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="Type your message here..."
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Your message will be sent as formatted text
                                    </p>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={
                                            sendingEmail || 
                                            !emailData.to || 
                                            !emailData.subject || 
                                            !emailData.htmlContent ||
                                            (availableMailboxes.length > 0 && !emailData.sendFrom)
                                        }
                                        className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                        title={
                                            availableMailboxes.length > 0 && !emailData.sendFrom 
                                                ? 'Please select a mailbox to send from' 
                                                : ''
                                        }
                                    >
                                        {sendingEmail ? 'Sending...' : 'Send Email'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm text-gray-500 mb-2">
                                    No contact email available
                                </p>
                                <p className="text-xs text-gray-400">
                                    Please assign a contact with an email address to send emails.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentEmailTabs; 