# Email-to-Ticket Implementation Plan with Shared Mailboxes

## 🎯 **Core Objectives**
1. **Receive emails** from shared mailboxes and create tickets automatically
2. **Choose send-from mailbox** when sending emails from the CRM
3. **Dedicated UI organization** with separate configuration interfaces
4. **Minimal complexity** - focus on essential functionality

---

## 🏗️ **System Architecture**

### **1. Email Flow Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  support@       │───▶│  Microsoft 365   │───▶│  Webhook        │
│  sales@         │    │   Graph API      │    │  /api/emails    │
│  info@          │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │ Create Tickets  │
                                                │ Auto-assign     │
                                                └─────────────────┘
```

### **2. UI Component Organization**
```
┌─────────────────────────────────────────────────────────────┐
│                     CRM Application                         │
├─────────────────────────────────────────────────────────────┤
│  UnifiedTicketsWidget                                       │
│  ├─ Email-to-Ticket Configuration Modal                     │
│  │  ├─ Enable/Disable auto-ticket creation                  │
│  │  ├─ Default assignment rules                             │
│  │  ├─ Priority and type settings                           │
│  │  └─ Subject line parsing rules                           │
│  └─ Ticket management interface                             │
├─────────────────────────────────────────────────────────────┤
│  Email Configuration Widget/Page                            │
│  ├─ Microsoft 365 Connection Settings                       │
│  ├─ Available Mailboxes Management                          │
│  ├─ Send-From Configuration                                 │
│  ├─ Webhook Subscription Status                             │
│  └─ Email Processing Logs                                   │
└─────────────────────────────────────────────────────────────┘
```

### **3. Send-From Selection Flow**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Email Compose  │───▶│  From: Dropdown  │───▶│  Microsoft 365  │
│  Interface      │    │  □ support@      │    │  Send API       │
│                 │    │  ✓ sales@        │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🗄️ **Database Schema**

### **Enhanced Company Model**
```javascript
// Add to existing Company model
availableMailboxes: {
  type: DataTypes.JSON,
  allowNull: true,
  defaultValue: []
  // Format: [
  //   { email: "support@company.com", displayName: "Support", isDefault: true },
  //   { email: "sales@company.com", displayName: "Sales", isDefault: false }
  // ]
},
defaultSendFromEmail: {
  type: DataTypes.STRING,
  allowNull: true,
  validate: { isEmail: true }
}
```

### **Email Configuration Model**
```javascript
const EmailConfiguration = sequelize.define('EmailConfiguration', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyId: { 
    type: DataTypes.INTEGER,
    references: { model: 'companies', key: 'id' },
    allowNull: false,
    unique: true // One config per company
  },
  
  // Auto-ticket creation settings
  autoCreateTickets: { type: DataTypes.BOOLEAN, defaultValue: true },
  defaultAssigneeId: { 
    type: DataTypes.INTEGER,
    references: { model: 'users', key: 'id' },
    allowNull: true
  },
  defaultPriority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  defaultType: {
    type: DataTypes.ENUM('bug', 'feature_request', 'support', 'question', 'task', 'incident'),
    defaultValue: 'support'
  },
  
  // Subject line parsing
  extractTicketNumbers: { type: DataTypes.BOOLEAN, defaultValue: true },
  subjectPrefixToRemove: { type: DataTypes.STRING, allowNull: true }, // e.g., "FW:", "RE:"
  
  // Conversation tracking
  enableConversationTracking: { type: DataTypes.BOOLEAN, defaultValue: true },
  autoReopenTickets: { type: DataTypes.BOOLEAN, defaultValue: true }, // Reopen closed tickets on new emails
  conversationLookbackDays: { type: DataTypes.INTEGER, defaultValue: 30 }, // Days to look back for related tickets
  
  // Contact handling
  autoCreateContacts: { type: DataTypes.BOOLEAN, defaultValue: true },
  defaultContactSource: { type: DataTypes.STRING, defaultValue: 'email' },
  
  // Available mailboxes
  availableMailboxes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
    // Format: [
    //   { 
    //     email: "support@company.com", 
    //     displayName: "Support", 
    //     isDefault: true,
    //     subscriptionId: "abc123",
    //     isActive: true
    //   }
    // ]
  },
  
  // Processing settings
  businessHoursOnly: { type: DataTypes.BOOLEAN, defaultValue: false },
  businessHoursStart: { type: DataTypes.TIME, defaultValue: '09:00:00' },
  businessHoursEnd: { type: DataTypes.TIME, defaultValue: '17:00:00' },
  businessDays: { 
    type: DataTypes.JSON, 
    defaultValue: [1, 2, 3, 4, 5] // Monday to Friday
  }
});
```

### **Email Processing Table**
```javascript
const EmailProcessing = sequelize.define('EmailProcessing', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  messageId: { type: DataTypes.STRING, unique: true }, // Microsoft Graph message ID
  internetMessageId: { type: DataTypes.STRING, allowNull: true }, // Standard email Message-ID header
  inReplyTo: { type: DataTypes.STRING, allowNull: true }, // In-Reply-To header for threading
  references: { type: DataTypes.TEXT, allowNull: true }, // References header for conversation tracking
  fromEmail: { type: DataTypes.STRING, allowNull: false },
  toEmail: { type: DataTypes.STRING, allowNull: false },
  subject: { type: DataTypes.TEXT },
  receivedAt: { type: DataTypes.DATE },
  ticketId: { 
    type: DataTypes.INTEGER,
    references: { model: 'tickets', key: 'id' }
  },
  companyId: { 
    type: DataTypes.INTEGER,
    references: { model: 'companies', key: 'id' }
  },
  processed: { type: DataTypes.BOOLEAN, defaultValue: false },
  isReply: { type: DataTypes.BOOLEAN, defaultValue: false } // Track if this email is a reply
});
```

---

## 🔧 **Implementation Phases**

### **Phase 1: Core Infrastructure (Week 1)**

#### **1.1 Database Setup**
- [ ] Create EmailConfiguration model and migration
- [ ] Add availableMailboxes and defaultSendFromEmail to Company model
- [ ] Create EmailProcessing table
- [ ] Add indexes for performance

#### **1.2 Webhook Infrastructure**
```javascript
// Enhanced subscription service
class EmailSubscriptionService {
  async createSubscriptionsForMailboxes(company) {
    const subscriptions = [];
    
    for (const mailbox of company.availableMailboxes) {
      try {
        const subscription = await graphClient.api('/subscriptions').post({
          changeType: 'created',
          notificationUrl: `${process.env.WEBHOOK_BASE_URL}/api/webhooks/email`,
          resource: `users/${mailbox.email}/mailFolders('Inbox')/messages`,
          expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          clientState: this.generateToken(company.id, mailbox.email)
        });
        
        subscriptions.push({
          mailbox: mailbox.email,
          subscriptionId: subscription.id
        });
      } catch (error) {
        console.error(`Failed to create subscription for ${mailbox.email}:`, error);
      }
    }
    
    return subscriptions;
  }
}
```

#### **1.3 Email Processing with Conversation Threading**
```javascript
// Enhanced webhook endpoint with conversation tracking
router.post('/webhooks/email', validateWebhook, async (req, res) => {
  try {
    const { resource, clientState } = req.body;
    
    // Extract company and mailbox from clientState
    const [companyId, mailboxEmail] = this.parseClientState(clientState);
    
    // Get email details
    const emailData = await this.getEmailFromResource(resource);
    
    // Process email - either create new ticket or add to existing conversation
    await this.processEmailWithConversationTracking(emailData, companyId, mailboxEmail);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  }
});
```

#### **1.4 Enhanced Email Processing with Conversation Tracking**
```javascript
class EnhancedEmailProcessor {
  async processEmailWithConversationTracking(emailData, companyId, receivedAt) {
    // Extract email information
    const fromEmail = emailData.from.emailAddress.address;
    const subject = emailData.subject || 'Email from ' + fromEmail;
    const messageId = emailData.internetMessageId; // Standard email Message-ID
    const inReplyTo = emailData.inReplyTo;
    const references = emailData.references;
    
    // Try to find existing ticket from conversation threading
    let existingTicket = await this.findTicketFromConversation(
      messageId, inReplyTo, references, subject, fromEmail, companyId
    );
    
    if (existingTicket) {
      // Add email as comment to existing ticket and reopen if needed
      await this.addEmailToExistingTicket(existingTicket, emailData, fromEmail);
      return existingTicket;
    } else {
      // Create new ticket
      return await this.createNewTicketFromEmail(emailData, companyId, receivedAt);
    }
  }
  
  async findTicketFromConversation(messageId, inReplyTo, references, subject, fromEmail, companyId) {
    // Method 1: Check if this is a reply using In-Reply-To header
    if (inReplyTo) {
      const existingEmail = await EmailProcessing.findOne({
        where: { 
          messageId: inReplyTo,
          companyId 
        },
        include: [{ model: Ticket }]
      });
      if (existingEmail?.ticket) {
        return existingEmail.ticket;
      }
    }
    
    // Method 2: Check References header for conversation thread
    if (references) {
      const referencedIds = references.split(/\s+/);
      for (const refId of referencedIds) {
        const existingEmail = await EmailProcessing.findOne({
          where: { 
            messageId: refId.trim(),
            companyId 
          },
          include: [{ model: Ticket }]
        });
        if (existingEmail?.ticket) {
          return existingEmail.ticket;
        }
      }
    }
    
    // Method 3: Extract ticket number from subject line (e.g., "Re: [TICKET-123] Issue with...")
    const ticketNumberMatch = subject.match(/\[?TICKET-(\d+)\]?/i);
    if (ticketNumberMatch) {
      const ticketNumber = ticketNumberMatch[1];
      const ticket = await Ticket.findOne({
        where: {
          ticketNumber: `TICKET-${ticketNumber}`,
          companyId
        }
      });
      if (ticket) {
        return ticket;
      }
    }
    
    // Method 4: Find recent tickets from the same contact
    const contact = await Contact.findOne({
      where: { email: fromEmail, companyId }
    });
    
    if (contact) {
      // Look for tickets from this contact in the last 30 days
      const recentTicket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        },
        order: [['createdAt', 'DESC']]
      });
      
      // Only link if subject is similar (basic similarity check)
      if (recentTicket && this.isSubjectSimilar(subject, recentTicket.title)) {
        return recentTicket;
      }
    }
    
    return null; // No existing ticket found
  }
  
  async addEmailToExistingTicket(ticket, emailData, fromEmail) {
    const emailContent = this.extractTextFromHtml(emailData.body.content);
    
    // Add email as a comment to the ticket
    await TicketComment.create({
      ticketId: ticket.id,
      comment: `Email received from ${fromEmail}:\n\n${emailContent}`,
      isInternal: false, // Customer email, so not internal
      userId: null, // System created
      createdAt: new Date(emailData.receivedDateTime)
    });
    
    // Reopen ticket if it's closed/resolved
    if (['closed', 'resolved'].includes(ticket.status)) {
      await ticket.update({
        status: 'open',
        updatedAt: new Date()
      });
      
      // Add audit log for status change
      await TicketComment.create({
        ticketId: ticket.id,
        comment: 'Ticket automatically reopened due to new email from customer',
        isInternal: true,
        userId: null
      });
    }
    
    // Store email processing record
    await EmailProcessing.create({
      messageId: emailData.id,
      internetMessageId: emailData.internetMessageId,
      inReplyTo: emailData.inReplyTo,
      references: emailData.references,
      fromEmail,
      toEmail: emailData.toRecipients?.[0]?.emailAddress?.address,
      subject: emailData.subject,
      ticketId: ticket.id,
      companyId: ticket.companyId,
      processed: true,
      isReply: true,
      receivedAt: new Date(emailData.receivedDateTime)
    });
    
    console.log(`Email added to existing ticket ${ticket.ticketNumber}`);
  }
  
  async createNewTicketFromEmail(emailData, companyId, receivedAt) {
    // Extract sender information
    const fromEmail = emailData.from.emailAddress.address;
    const subject = emailData.subject || 'Email from ' + fromEmail;
    
    // Try to find existing contact
    let contact = await Contact.findOne({
      where: { email: fromEmail, companyId }
    });
    
    // Create contact if not found
    if (!contact) {
      contact = await Contact.create({
        email: fromEmail,
        firstName: emailData.from.emailAddress.name || 'Unknown',
        lastName: '',
        companyId
      });
    }
    
    // Create ticket
    const ticket = await Ticket.create({
      title: subject,
      description: this.extractTextFromHtml(emailData.body.content),
      status: 'open',
      priority: 'medium',
      type: 'support',
      contactId: contact.id,
      companyId,
      createdBy: null // System created
    });
    
    // Store email processing record
    await EmailProcessing.create({
      messageId: emailData.id,
      internetMessageId: emailData.internetMessageId,
      inReplyTo: emailData.inReplyTo,
      references: emailData.references,
      fromEmail,
      toEmail: receivedAt,
      subject,
      ticketId: ticket.id,
      companyId,
      processed: true,
      isReply: false,
      receivedAt: new Date(emailData.receivedDateTime)
    });
    
    console.log(`New ticket created: ${ticket.ticketNumber}`);
    return ticket;
  }
  
  isSubjectSimilar(subject1, subject2) {
    // Remove common prefixes and clean subjects
    const clean1 = subject1.replace(/^(re:|fwd?:|fw:)\s*/i, '').toLowerCase().trim();
    const clean2 = subject2.replace(/^(re:|fwd?:|fw:)\s*/i, '').toLowerCase().trim();
    
    // Simple similarity check - at least 60% of words match
    const words1 = clean1.split(/\s+/);
    const words2 = clean2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length) > 0.6;
  }
  
  extractTextFromHtml(htmlContent) {
    // Simple HTML to text conversion
    return htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}
```

### **Phase 2: Email Configuration UI (Week 2)**

#### **2.1 Email Configuration Widget**
```jsx
// EmailConfigurationWidget.js
const EmailConfigurationWidget = () => {
  const { user } = useContext(AuthContext);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('connection');
  
  const tabs = [
    { id: 'connection', name: 'Microsoft 365 Connection', icon: '🔗' },
    { id: 'mailboxes', name: 'Mailboxes', icon: '📧' },
    { id: 'processing', name: 'Email Processing', icon: '⚙️' },
    { id: 'logs', name: 'Activity Logs', icon: '📋' }
  ];
  
  return (
    <div className="email-config-widget">
      <div className="widget-header">
        <h2>Email Configuration</h2>
        <button 
          onClick={() => window.open('/email-configuration', '_blank')}
          className="open-full-page-btn"
        >
          Open Full Configuration
        </button>
      </div>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.name}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'connection' && <ConnectionSettings config={config} />}
        {activeTab === 'mailboxes' && <MailboxManagement config={config} />}
        {activeTab === 'processing' && <ProcessingSettings config={config} />}
        {activeTab === 'logs' && <ActivityLogs config={config} />}
      </div>
    </div>
  );
};
```

#### **2.2 Email Configuration Full Page**
```jsx
// pages/EmailConfiguration.js
const EmailConfiguration = () => {
  const { user } = useContext(AuthContext);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  
  return (
    <div className="email-configuration-page">
      <div className="page-header">
        <h1>Email Configuration</h1>
        <div className="header-actions">
          <button onClick={testConfiguration} className="test-btn">
            Test Configuration
          </button>
          <button onClick={saveConfiguration} className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <div className="configuration-sections">
        {/* Microsoft 365 Connection */}
        <section className="config-section">
          <h2>Microsoft 365 Connection</h2>
          <Microsoft365ConnectionForm config={config} onChange={setConfig} />
        </section>
        
        {/* Mailbox Management */}
        <section className="config-section">
          <h2>Mailbox Management</h2>
          <MailboxManagementForm config={config} onChange={setConfig} />
        </section>
        
        {/* Email Processing Rules */}
        <section className="config-section">
          <h2>Email Processing Rules</h2>
          <EmailProcessingForm config={config} onChange={setConfig} />
        </section>
        
        {/* Webhook Status */}
        <section className="config-section">
          <h2>Webhook Status</h2>
          <WebhookStatusPanel config={config} />
        </section>
      </div>
    </div>
  );
};
```

#### **2.3 Mailbox Management Component**
```jsx
// MailboxManagementForm.js
const MailboxManagementForm = ({ config, onChange }) => {
  const [mailboxes, setMailboxes] = useState(config?.availableMailboxes || []);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  
  const discoverSharedMailboxes = async () => {
    setDiscovering(true);
    try {
      const response = await axios.post(`${API_URL}/api/companies/${config.companyId}/discover-mailboxes`);
      const discovered = response.data.mailboxes.map(mb => ({
        email: mb.email,
        displayName: mb.displayName,
        isDefault: false,
        isActive: false,
        subscriptionId: null
      }));
      setMailboxes([...mailboxes, ...discovered]);
    } catch (error) {
      alert('Failed to discover mailboxes');
    } finally {
      setDiscovering(false);
    }
  };
  
  const toggleMailboxActive = async (index) => {
    const updatedMailboxes = [...mailboxes];
    const mailbox = updatedMailboxes[index];
    
    if (mailbox.isActive) {
      // Disable: Remove webhook subscription
      await removeWebhookSubscription(mailbox.subscriptionId);
      mailbox.isActive = false;
      mailbox.subscriptionId = null;
    } else {
      // Enable: Create webhook subscription
      const subscriptionId = await createWebhookSubscription(mailbox.email);
      mailbox.isActive = true;
      mailbox.subscriptionId = subscriptionId;
    }
    
    setMailboxes(updatedMailboxes);
    onChange({ ...config, availableMailboxes: updatedMailboxes });
  };
  
  return (
    <div className="mailbox-management">
      <div className="section-header">
        <h3>Available Mailboxes</h3>
        <button onClick={() => setShowDiscovery(true)}>
          Discover Shared Mailboxes
        </button>
      </div>
      
      <div className="mailboxes-grid">
        {mailboxes.map((mailbox, index) => (
          <div key={index} className="mailbox-card">
            <div className="mailbox-info">
              <input
                type="text"
                value={mailbox.displayName}
                onChange={(e) => updateMailbox(index, 'displayName', e.target.value)}
                placeholder="Display Name"
              />
              <input
                type="email"
                value={mailbox.email}
                onChange={(e) => updateMailbox(index, 'email', e.target.value)}
                placeholder="Email Address"
              />
            </div>
            
            <div className="mailbox-controls">
              <label>
                <input
                  type="checkbox"
                  checked={mailbox.isDefault}
                  onChange={(e) => updateMailbox(index, 'isDefault', e.target.checked)}
                />
                Default for sending
              </label>
              
              <label>
                <input
                  type="checkbox"
                  checked={mailbox.isActive}
                  onChange={() => toggleMailboxActive(index)}
                />
                Receive emails
              </label>
              
              {mailbox.isActive && (
                <div className="subscription-status">
                  ✅ Webhook Active
                </div>
              )}
            </div>
            
            <button 
              onClick={() => removeMailbox(index)}
              className="remove-btn"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      
      <button onClick={addMailbox} className="add-mailbox-btn">
        + Add Mailbox
      </button>
      
      {/* Discovery Modal */}
      {showDiscovery && (
        <MailboxDiscoveryModal
          onClose={() => setShowDiscovery(false)}
          onDiscovered={(discovered) => setMailboxes([...mailboxes, ...discovered])}
        />
      )}
    </div>
  );
};
```

### **Phase 3: Tickets Widget Integration (Week 3)**

#### **3.1 Enhanced UnifiedTicketsWidget**
```jsx
// Update UnifiedTicketsWidget.js
const UnifiedTicketsWidget = () => {
  const [showEmailConfigModal, setShowEmailConfigModal] = useState(false);
  const [emailConfig, setEmailConfig] = useState(null);
  
  // Add email configuration button to widget actions
  const additionalActions = [
    {
      label: 'Email-to-Ticket Settings',
      icon: '📧',
      onClick: () => setShowEmailConfigModal(true),
      requiresAdmin: true
    }
  ];
  
  return (
    <div className="unified-tickets-widget">
      {/* Existing EntityWidget */}
      <EntityWidget
        entityType="tickets"
        title="Tickets"
        // ... existing props
        additionalActions={additionalActions}
      />
      
      {/* Email Configuration Modal */}
      {showEmailConfigModal && (
        <EmailToTicketConfigModal
          isOpen={showEmailConfigModal}
          onClose={() => setShowEmailConfigModal(false)}
          config={emailConfig}
          onSave={handleEmailConfigSave}
        />
      )}
    </div>
  );
};
```

#### **3.2 Email-to-Ticket Configuration Modal**
```jsx
// EmailToTicketConfigModal.js
const EmailToTicketConfigModal = ({ isOpen, onClose, config, onSave }) => {
  const [formData, setFormData] = useState({
    autoCreateTickets: config?.autoCreateTickets ?? true,
    defaultAssigneeId: config?.defaultAssigneeId || '',
    defaultPriority: config?.defaultPriority || 'medium',
    defaultType: config?.defaultType || 'support',
    extractTicketNumbers: config?.extractTicketNumbers ?? true,
    subjectPrefixToRemove: config?.subjectPrefixToRemove || '',
    enableConversationTracking: config?.enableConversationTracking ?? true,
    autoReopenTickets: config?.autoReopenTickets ?? true,
    conversationLookbackDays: config?.conversationLookbackDays || 30,
    autoCreateContacts: config?.autoCreateContacts ?? true,
    businessHoursOnly: config?.businessHoursOnly ?? false,
    businessHoursStart: config?.businessHoursStart || '09:00',
    businessHoursEnd: config?.businessHoursEnd || '17:00'
  });
  
  const [users, setUsers] = useState([]);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="email-config-modal">
        <div className="modal-header">
          <h2>Email-to-Ticket Configuration</h2>
          <p className="subtitle">Configure how incoming emails create and update tickets</p>
        </div>
        
        <div className="config-sections">
          {/* Auto-Creation Settings */}
          <section className="config-section">
            <h3>Automatic Ticket Creation</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.autoCreateTickets}
                  onChange={(e) => setFormData({...formData, autoCreateTickets: e.target.checked})}
                />
                Automatically create tickets from incoming emails
              </label>
            </div>
            
            {formData.autoCreateTickets && (
              <>
                <div className="form-group">
                  <label>Default Assignee</label>
                  <select
                    value={formData.defaultAssigneeId}
                    onChange={(e) => setFormData({...formData, defaultAssigneeId: e.target.value})}
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Default Priority</label>
                    <select
                      value={formData.defaultPriority}
                      onChange={(e) => setFormData({...formData, defaultPriority: e.target.value})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Default Type</label>
                    <select
                      value={formData.defaultType}
                      onChange={(e) => setFormData({...formData, defaultType: e.target.value})}
                    >
                      <option value="support">Support</option>
                      <option value="bug">Bug</option>
                      <option value="feature_request">Feature Request</option>
                      <option value="question">Question</option>
                      <option value="task">Task</option>
                      <option value="incident">Incident</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </section>
          
          {/* Email Processing Rules */}
          <section className="config-section">
            <h3>Email Processing Rules</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.extractTicketNumbers}
                  onChange={(e) => setFormData({...formData, extractTicketNumbers: e.target.checked})}
                />
                Extract ticket numbers from subject lines (for replies)
              </label>
              <p className="help-text">
                Automatically link email replies to existing tickets when ticket numbers are found in subject
              </p>
            </div>
            
            <div className="form-group">
              <label>Remove Subject Prefixes</label>
              <input
                type="text"
                value={formData.subjectPrefixToRemove}
                onChange={(e) => setFormData({...formData, subjectPrefixToRemove: e.target.value})}
                placeholder="e.g., FW:, RE:, [EXTERNAL]"
              />
              <p className="help-text">
                Comma-separated list of prefixes to remove from subject lines
              </p>
            </div>
          </section>
          
          {/* Conversation Tracking */}
          <section className="config-section">
            <h3>Conversation Tracking</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.enableConversationTracking}
                  onChange={(e) => setFormData({...formData, enableConversationTracking: e.target.checked})}
                />
                Enable email conversation tracking
              </label>
              <p className="help-text">
                Automatically link email replies to existing tickets using email headers and subject analysis
              </p>
            </div>
            
            {formData.enableConversationTracking && (
              <>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.autoReopenTickets}
                      onChange={(e) => setFormData({...formData, autoReopenTickets: e.target.checked})}
                    />
                    Automatically reopen closed/resolved tickets when receiving new emails
                  </label>
                  <p className="help-text">
                    When a customer replies to a closed ticket, automatically set status back to "open"
                  </p>
                </div>
                
                <div className="form-group">
                  <label>Conversation Lookback Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.conversationLookbackDays}
                    onChange={(e) => setFormData({...formData, conversationLookbackDays: parseInt(e.target.value)})}
                  />
                  <p className="help-text">
                    How many days to look back when searching for related tickets from the same contact
                  </p>
                </div>
              </>
            )}
          </section>
          
          {/* Contact Management */}
          <section className="config-section">
            <h3>Contact Management</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.autoCreateContacts}
                  onChange={(e) => setFormData({...formData, autoCreateContacts: e.target.checked})}
                />
                Automatically create contacts from unknown email senders
              </label>
            </div>
          </section>
          
          {/* Business Hours */}
          <section className="config-section">
            <h3>Business Hours Processing</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.businessHoursOnly}
                  onChange={(e) => setFormData({...formData, businessHoursOnly: e.target.checked})}
                />
                Only process emails during business hours
              </label>
            </div>
            
            {formData.businessHoursOnly && (
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={formData.businessHoursStart}
                    onChange={(e) => setFormData({...formData, businessHoursStart: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={formData.businessHoursEnd}
                    onChange={(e) => setFormData({...formData, businessHoursEnd: e.target.value})}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
        
        <div className="modal-footer">
          <div className="footer-info">
            <p>
              <strong>Note:</strong> These settings only apply to automatic ticket creation from emails.
              Manual ticket creation is not affected.
            </p>
          </div>
          <div className="footer-actions">
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button onClick={() => onSave(formData)} className="save-btn">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
```

### **Phase 4: Enhanced Email Features (Week 4)**

#### **4.1 Enhanced Email Service with Send-From Selection**
```javascript
class EmailService {
  static async sendEmail(company, emailData, sendFromEmail = null) {
    // Use specified send-from email or company default
    const fromEmail = sendFromEmail || company.defaultSendFromEmail || company.ms365EmailFrom;
    
    // Validate that the fromEmail is in available mailboxes
    const availableEmails = company.availableMailboxes?.map(m => m.email) || [company.ms365EmailFrom];
    if (!availableEmails.includes(fromEmail)) {
      throw new Error(`Send-from email ${fromEmail} is not configured for this company`);
    }
    
    // ... existing email sending logic ...
    // Send email using the specified fromEmail
    await graphClient.api(`/users/${fromEmail}/sendMail`).post(mail);
    
    return {
      success: true,
      message: 'Email sent successfully',
      sentFrom: fromEmail,
      timestamp: new Date().toISOString()
    };
  }
}
```

#### **4.2 Enhanced Email API Endpoint**
```javascript
// Updated send-email endpoint
router.post('/:id/send-email', protect, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const { to, subject, htmlContent, sendFrom } = req.body; // Added sendFrom
    
    // Security check
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const company = await Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }
    
    // Send email with optional send-from
    const emailResult = await EmailService.sendEmail(company, {
      to, subject, htmlContent
    }, sendFrom);
    
    res.json(emailResult);
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send email'
    });
  }
});
```

#### **4.3 API Endpoints for Configuration**
```javascript
// New routes for email configuration
router.get('/:id/email-config', protect, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const config = await EmailConfiguration.findOne({
      where: { companyId }
    });
    
    if (!config) {
      // Create default configuration
      const defaultConfig = await EmailConfiguration.create({
        companyId,
        autoCreateTickets: true,
        defaultPriority: 'medium',
        defaultType: 'support',
        extractTicketNumbers: true,
        autoCreateContacts: true,
        businessHoursOnly: false
      });
      return res.json(defaultConfig);
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching email configuration:', error);
    res.status(500).json({ message: 'Failed to load configuration' });
  }
});

router.put('/:id/email-config', protect, authorize('Administrator'), async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const configData = req.body;
    
    if (req.user.companyId !== companyId) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const [config, created] = await EmailConfiguration.upsert({
      ...configData,
      companyId
    });
    
    res.json(config);
  } catch (error) {
    console.error('Error saving email configuration:', error);
    res.status(500).json({ message: 'Failed to save configuration' });
  }
});
```

### **Phase 5: Polish & Documentation (Week 5)**

#### **5.1 Comprehensive Error Handling**
- [ ] Add email processing error recovery
- [ ] Implement webhook subscription renewal
- [ ] Handle Microsoft 365 API rate limits
- [ ] Add user-friendly error messages

#### **5.2 Activity Logging**
- [ ] Log all email processing activities
- [ ] Track webhook subscription status
- [ ] Monitor email sending success rates
- [ ] Create admin reporting dashboard

#### **5.3 Performance Optimization**
- [ ] Optimize email processing queue
- [ ] Add caching for configuration data
- [ ] Implement batch processing for high volumes
- [ ] Database query optimization

---

## 🎯 **Success Criteria by Phase**

### **Phase 1 Success (Core Infrastructure):**
- [ ] Webhook endpoint receiving Microsoft Graph notifications
- [ ] Email-to-ticket creation with conversation tracking working
- [ ] Database schema supporting configuration and threading
- [ ] Email processing queue operational
- [ ] Automatic ticket reopening on new emails functional

### **Phase 2 Success (Email Configuration UI):**
- [ ] Dedicated Email Configuration widget operational
- [ ] Full-page email configuration accessible
- [ ] Mailbox discovery and management working
- [ ] Webhook subscription status visible

### **Phase 3 Success (Tickets Integration):**
- [ ] Email-to-ticket configuration accessible from UnifiedTicketsWidget
- [ ] Modal allows complete ticket creation and conversation tracking configuration
- [ ] Settings persist and apply to email processing
- [ ] Admin-only access properly enforced
- [ ] Conversation tracking settings working as expected

### **Phase 4 Success (Enhanced Features):**
- [ ] Send-from mailbox selection in all email forms
- [ ] Multiple mailboxes properly configured and active
- [ ] Email processing respects all configuration settings
- [ ] Real-time status monitoring operational

### **Phase 5 Success (Production Ready):**
- [ ] Comprehensive error handling and recovery
- [ ] Complete activity logging and monitoring
- [ ] Performance optimized for production use
- [ ] User documentation and training complete

---

## 🔒 **Security Considerations**

### **Authentication & Authorization**
- **Webhook Validation**: Verify `clientState` token in all webhook requests
- **IP Restrictions**: Whitelist Microsoft Graph IP ranges
- **Rate Limiting**: Implement proper rate limiting on webhook endpoints
- **Secret Management**: Secure storage of webhook validation tokens

### **Data Protection**
- **Email Content Security**: Encrypt stored email content
- **PII Handling**: Proper handling of personal information in emails
- **Audit Logging**: Track all email processing activities
- **Retention Policies**: Implement email data retention rules

### **Microsoft 365 Permissions**
```javascript
// Required Graph API permissions
const requiredPermissions = [
  'Mail.Read',           // Read emails
  'Mail.ReadWrite',      // Mark emails as processed
  'Mail.Send',           // Send emails from mailboxes
  'User.Read.All'        // Read user information
];
```

---

## 📊 **Monitoring & Analytics**

### **Key Metrics to Track**
- Email processing success rate
- Average ticket creation time
- Webhook subscription health
- Send-from usage statistics
- Email volume by mailbox

### **Dashboard Components**
- Real-time email processing status
- Daily/weekly ticket creation stats
- Failed processing alerts
- Subscription renewal reminders
- Mailbox performance metrics

---

## 🚀 **Technical Implementation Notes**

### **Microsoft 365 Graph API Considerations**
- **Subscription Limits**: Maximum 1000 active subscriptions per mailbox
- **Expiration**: Subscriptions expire after 3 days and need renewal
- **Validation**: Webhook endpoint must echo validation token
- **RBAC**: Use Role-Based Access Control for Applications (2025 approach)

### **Shared Mailbox Discovery**
- **No Direct API**: Microsoft Graph doesn't provide direct shared mailbox listing
- **PowerShell Integration**: Use Exchange Online PowerShell for discovery
- **User Enumeration**: Fallback method using mailboxSettings endpoint

### **Email Threading & Conversation Tracking**
- **Message-ID Headers**: Track conversation threads using internetMessageId
- **In-Reply-To**: Handle email replies using inReplyTo header
- **References Header**: Support full email thread tracking
- **Subject Parsing**: Extract ticket numbers from subject lines (e.g., [TICKET-123])
- **Subject Similarity**: Match related emails using content similarity analysis
- **Contact-Based Linking**: Link emails from same contact within configurable timeframe
- **Automatic Reopening**: Change ticket status from closed/resolved to open on new emails
- **Multiple Detection Methods**: 4-tier approach for finding related tickets:
  1. Email headers (In-Reply-To, References)
  2. Ticket number extraction from subject
  3. Subject similarity analysis
  4. Recent ticket lookup by contact

---

## 📋 **Implementation Checklist**

### **Week 1: Foundation**
- [ ] Create EmailConfiguration model and migration with conversation tracking fields
- [ ] Create EmailProcessing model with threading support (internetMessageId, inReplyTo, references)
- [ ] Set up webhook infrastructure
- [ ] Implement enhanced email processing with conversation tracking
- [ ] Create email-to-ticket service with automatic ticket reopening

### **Week 2: Email Configuration UI**
- [ ] Build EmailConfigurationWidget
- [ ] Create Email Configuration page
- [ ] Implement mailbox management
- [ ] Add webhook subscription handling

### **Week 3: Tickets Integration**
- [ ] Add configuration modal to UnifiedTicketsWidget
- [ ] Implement email-to-ticket settings with conversation tracking options
- [ ] Create configuration persistence
- [ ] Add admin access controls
- [ ] Test conversation tracking and ticket reopening functionality

### **Week 4: Enhanced Features**
- [ ] Add send-from selection to email forms
- [ ] Implement multi-mailbox support
- [ ] Create status monitoring
- [ ] Add comprehensive testing

### **Week 5: Production Readiness**
- [ ] Implement error handling
- [ ] Add activity logging
- [ ] Optimize performance
- [ ] Create documentation

---

This plan provides a comprehensive roadmap for implementing email-to-ticket functionality with shared mailbox support and flexible send-from options, organized into clear phases with dedicated UI components for different aspects of email configuration.