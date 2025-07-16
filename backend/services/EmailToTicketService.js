const { Client } = require('@microsoft/microsoft-graph-client');
const msal = require('@azure/msal-node');
const EmailConfiguration = require('../models/EmailConfiguration');
const EmailProcessing = require('../models/EmailProcessing');
const Ticket = require('../models/Ticket');
const TicketComment = require('../models/TicketComment');
const Contact = require('../models/Contact');
const Company = require('../models/Company');

// Set up model associations
EmailConfiguration.belongsTo(Company, { foreignKey: 'companyId' });
EmailProcessing.belongsTo(EmailConfiguration, { foreignKey: 'emailConfigId' });
EmailProcessing.belongsTo(Company, { foreignKey: 'companyId' });
EmailProcessing.belongsTo(Ticket, { foreignKey: 'ticketId', required: false });
EmailProcessing.belongsTo(Contact, { foreignKey: 'contactId', required: false });
Ticket.hasMany(TicketComment, { foreignKey: 'ticketId' });
TicketComment.belongsTo(Ticket, { foreignKey: 'ticketId' });

class EmailToTicketService {
  /**
   * Process an email webhook notification from Microsoft Graph
   * @param {Object} notification - Webhook notification data
   * @param {string} subscriptionId - Webhook subscription ID
   * @returns {Promise<Object>} - Processing result
   */
  static async processEmailWebhook(notification, subscriptionId) {
    try {
      console.log('[EMAIL-TO-TICKET] Processing webhook notification:', notification);

      // Find email configuration by subscription ID
      const emailConfig = await EmailConfiguration.findOne({
        where: { webhookSubscriptionId: subscriptionId, isActive: true },
        include: [{ model: Company }]
      });

      if (!emailConfig) {
        console.log('[EMAIL-TO-TICKET] No active email configuration found for subscription:', subscriptionId);
        return { success: false, message: 'Email configuration not found' };
      }

      // Get the company for Microsoft Graph authentication
      const company = emailConfig.Company;
      if (!company.emailEnabled) {
        console.log('[EMAIL-TO-TICKET] Email not enabled for company:', company.name);
        return { success: false, message: 'Email not enabled for company' };
      }

      // Process the notification directly (it's already a single notification object)
      const result = await this.processEmailNotification(notification, emailConfig, company);
      
      return { success: true, result };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error processing webhook:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Process a single email notification
   * @param {Object} notification - Single notification item
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Processing result
   */
  static async processEmailNotification(notification, emailConfig, company) {
    try {
      const { resource, resourceData } = notification;
      
      // Extract message ID from either resourceData.id or resource path
      let messageId;
      if (resourceData && resourceData.id) {
        messageId = resourceData.id;
      } else if (resource && resource.includes('/messages/')) {
        messageId = resource.split('/messages/')[1];
      } else {
        console.error('[EMAIL-TO-TICKET] Cannot extract message ID from notification:', notification);
        return { success: false, message: 'Cannot extract message ID from notification' };
      }

      console.log('[EMAIL-TO-TICKET] Processing message ID:', messageId);

      // Check if we've already processed this message
      const existingProcessing = await EmailProcessing.findOne({
        where: { messageId, companyId: company.id }
      });

      if (existingProcessing && existingProcessing.isProcessingComplete()) {
        console.log('[EMAIL-TO-TICKET] Message already processed:', messageId);
        return { success: true, message: 'Message already processed', messageId };
      }

      // Get email details from Microsoft Graph
      const emailDetails = await this.getEmailDetails(messageId, emailConfig.emailAddress, company);
      if (!emailDetails) {
        console.log('[EMAIL-TO-TICKET] Failed to get email details:', messageId);
        return { success: false, message: 'Failed to get email details', messageId };
      }

      // Create or update email processing record
      let emailProcessing = existingProcessing || await EmailProcessing.create({
        companyId: company.id,
        emailConfigId: emailConfig.id,
        messageId,
        internetMessageId: emailDetails.internetMessageId,
        conversationId: emailDetails.conversationId,
        fromEmail: emailDetails.from.emailAddress.address,
        fromName: emailDetails.from.emailAddress.name,
        subject: emailDetails.subject,
        receivedDateTime: new Date(emailDetails.receivedDateTime),
        inReplyTo: emailDetails.inReplyTo,
        emailReferences: emailDetails.references,
        emailBody: emailDetails.body,
        isHtml: emailDetails.isHtml,
        webhookData: notification,
        processingStatus: 'pending'
      });

      // Mark as processing
      await emailProcessing.markAsProcessing();

      // Process the email
      const processingResult = await this.processEmail(emailDetails, emailConfig, company, emailProcessing);

      // Update processing record with result
      if (processingResult.success) {
        await emailProcessing.markAsCompleted(
          processingResult.ticketId,
          processingResult.contactId,
          processingResult.actionTaken
        );
      } else {
        await emailProcessing.markAsFailed(processingResult.message);
      }

      return processingResult;

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error processing notification:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get email details from Microsoft Graph
   * @param {string} messageId - Message ID
   * @param {string} emailAddress - Email address
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Email details
   */
  static async getEmailDetails(messageId, emailAddress, company) {
    try {
      // Configure MSAL for Microsoft Graph authentication
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Acquire token
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Get email details
      const message = await graphClient
        .api(`/users/${emailAddress}/messages/${messageId}`)
        .select('subject,from,receivedDateTime,body,internetMessageId,conversationId,internetMessageHeaders')
        .get();

      // Extract email headers for conversation threading
      const headers = message.internetMessageHeaders || [];
      const inReplyTo = headers.find(h => h.name.toLowerCase() === 'in-reply-to')?.value;
      const references = headers.find(h => h.name.toLowerCase() === 'references')?.value;

      return {
        ...message,
        inReplyTo,
        references,
        body: message.body.content,
        isHtml: message.body.contentType === 'html'
      };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error getting email details:', error);
      return null;
    }
  }

  /**
   * Process email and create ticket or comment
   * @param {Object} emailDetails - Email details from Graph API
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @param {Object} emailProcessing - Email processing record
   * @returns {Promise<Object>} - Processing result
   */
  static async processEmail(emailDetails, emailConfig, company, emailProcessing) {
    try {
      const { from, subject, body, inReplyTo, references } = emailDetails;
      const senderEmail = from.emailAddress.address;
      const senderName = from.emailAddress.name;

      // Check if sender should be ignored
      if (emailConfig.ignoredSenders.includes(senderEmail)) {
        return { success: true, message: 'Sender ignored', actionTaken: 'ignored' };
      }

      // Check if this is an internal email (same domain)
      if (!emailConfig.createTicketsForInternalEmails) {
        const companyDomain = company.email?.split('@')[1];
        const senderDomain = senderEmail.split('@')[1];
        if (companyDomain && senderDomain === companyDomain) {
          return { success: true, message: 'Internal email ignored', actionTaken: 'ignored' };
        }
      }

      // Find or create contact
      const contact = await this.findOrCreateContact(senderEmail, senderName, company.id, emailConfig);
      if (!contact && emailConfig.requireContactMatch) {
        return { success: false, message: 'Contact not found and auto-creation disabled' };
      }

      // Check if this is a reply to an existing ticket
      const parentTicket = await this.findParentTicket(inReplyTo, references, company.id);
      
      if (parentTicket) {
        // This is a reply - add as comment and potentially reopen ticket
        const result = await this.handleTicketReply(parentTicket, emailDetails, contact, emailConfig, emailProcessing);
        return result;
      } else {
        // This is a new email - create new ticket
        const result = await this.createNewTicket(emailDetails, contact, emailConfig, company);
        return result;
      }

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error processing email:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Find or create contact for email sender
   * @param {string} email - Sender email
   * @param {string} name - Sender name
   * @param {number} companyId - Company ID
   * @param {Object} emailConfig - Email configuration
   * @returns {Promise<Object>} - Contact object or null
   */
  static async findOrCreateContact(email, name, companyId, emailConfig) {
    try {
      // Try to find existing contact
      let contact = await Contact.findOne({
        where: { email, companyId }
      });

      if (!contact && emailConfig.autoCreateContacts) {
        // Create new contact
        const [firstName, ...lastNameParts] = (name || email.split('@')[0]).split(' ');
        const lastName = lastNameParts.join(' ');

        contact = await Contact.create({
          firstName: firstName || email.split('@')[0],
          lastName: lastName || '',
          email,
          status: 'prospect',
          source: 'email',
          companyId,
          createdBy: emailConfig.defaultAssignedTo || 1 // System user
        });

        console.log('[EMAIL-TO-TICKET] Created new contact:', contact.id);
      }

      return contact;

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error finding/creating contact:', error);
      return null;
    }
  }

  /**
   * Find parent ticket based on email headers
   * @param {string} inReplyTo - In-Reply-To header
   * @param {string} references - References header
   * @param {number} companyId - Company ID
   * @returns {Promise<Object>} - Parent ticket or null
   */
  static async findParentTicket(inReplyTo, references, companyId) {
    try {
      if (!inReplyTo && !references) return null;

      // Search for existing email processing records with matching message IDs
      const searchIds = [];
      if (inReplyTo) searchIds.push(inReplyTo);
      if (references) {
        const refIds = references.split(/\s+/).filter(id => id.trim());
        searchIds.push(...refIds);
      }

      if (searchIds.length === 0) return null;

      // Find email processing record with matching internet message ID
      const emailProcessing = await EmailProcessing.findOne({
        where: {
          internetMessageId: searchIds,
          companyId,
          ticketId: { [require('sequelize').Op.ne]: null }
        },
        include: [{ model: Ticket }]
      });

      if (emailProcessing?.Ticket) {
        return emailProcessing.Ticket;
      }

      // Alternative: search for ticket with matching ID in description or comments
      // This is a fallback for edge cases
      const tickets = await Ticket.findAll({
        where: { companyId },
        include: [{ model: TicketComment }]
      });

      for (const ticket of tickets) {
        const ticketText = `${ticket.description} ${ticket.TicketComments?.map(c => c.comment).join(' ')}`;
        if (searchIds.some(id => ticketText.includes(id))) {
          return ticket;
        }
      }

      return null;

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error finding parent ticket:', error);
      return null;
    }
  }

  /**
   * Handle reply to existing ticket
   * @param {Object} parentTicket - Parent ticket
   * @param {Object} emailDetails - Email details
   * @param {Object} contact - Contact object
   * @param {Object} emailConfig - Email configuration
   * @param {Object} emailProcessing - Email processing record
   * @returns {Promise<Object>} - Processing result
   */
  static async handleTicketReply(parentTicket, emailDetails, contact, emailConfig, emailProcessing) {
    try {
      // Add comment to existing ticket
      const comment = await TicketComment.create({
        ticketId: parentTicket.id,
        userId: contact ? contact.createdBy : (emailConfig.defaultAssignedTo || 1),
        comment: `Email from ${emailDetails.from.emailAddress.name} (${emailDetails.from.emailAddress.address}):\n\n${emailDetails.body}`,
        isInternal: false
      });

      // Check if ticket should be reopened
      let actionTaken = 'comment_added';
      if (parentTicket.status === 'closed' || parentTicket.status === 'resolved') {
        // Check for auto-resolve keywords
        const hasResolveKeywords = emailConfig.autoResolveKeywords?.some(keyword => 
          emailDetails.subject.toLowerCase().includes(keyword.toLowerCase()) ||
          emailDetails.body.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasResolveKeywords) {
          await parentTicket.update({ status: 'open' });
          actionTaken = 'ticket_reopened';
        }
      }

      // Update email processing record
      emailProcessing.parentTicketId = parentTicket.id;
      await emailProcessing.save();

      return {
        success: true,
        message: `${actionTaken === 'ticket_reopened' ? 'Ticket reopened and comment added' : 'Comment added to ticket'}`,
        ticketId: parentTicket.id,
        contactId: contact?.id,
        actionTaken
      };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error handling ticket reply:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create new ticket from email
   * @param {Object} emailDetails - Email details
   * @param {Object} contact - Contact object
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Processing result
   */
  static async createNewTicket(emailDetails, contact, emailConfig, company) {
    try {
      // Prepare ticket title
      let title = emailDetails.subject;
      if (emailConfig.subjectPrefix) {
        title = `${emailConfig.subjectPrefix} ${title}`;
      }

      // Create ticket
      const ticket = await Ticket.create({
        title,
        description: `Email from ${emailDetails.from.emailAddress.name} (${emailDetails.from.emailAddress.address}):\n\n${emailDetails.body}`,
        status: 'open',
        priority: emailConfig.defaultTicketPriority,
        type: emailConfig.defaultTicketType,
        companyId: company.id,
        contactId: contact?.id,
        assignedTo: emailConfig.defaultAssignedTo,
        createdBy: emailConfig.defaultAssignedTo || 1, // System user
        tags: ['email', 'auto-created']
      });

      return {
        success: true,
        message: 'Ticket created successfully',
        ticketId: ticket.id,
        contactId: contact?.id,
        actionTaken: 'ticket_created'
      };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error creating ticket:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Test Microsoft Graph permissions and access
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Test result
   */
  static async testGraphPermissions(emailConfig, company) {
    try {
      const testResults = {
        authentication: false,
        userAccess: false,
        messagesAccess: false,
        subscriptionPermissions: false,
        subscriptionCreation: false,
        errors: []
      };

      console.log('[EMAIL-TO-TICKET] Testing Microsoft Graph permissions...');

      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Test 1: Authentication
      console.log('[EMAIL-TO-TICKET] Testing authentication...');
      try {
        const authResponse = await cca.acquireTokenByClientCredential({
          scopes: ['https://graph.microsoft.com/.default'],
        });

        if (authResponse?.accessToken) {
          testResults.authentication = true;
          console.log('[EMAIL-TO-TICKET] Authentication successful');
        } else {
          testResults.errors.push('Failed to acquire access token');
        }
      } catch (authError) {
        testResults.errors.push(`Authentication failed: ${authError.message}`);
        console.error('[EMAIL-TO-TICKET] Authentication error:', authError);
      }

      if (!testResults.authentication) {
        return testResults;
      }

      // Get the access token for detailed analysis
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      // Decode and log token information (for debugging)
      try {
        const tokenParts = authResponse.accessToken.split('.');
        const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('[EMAIL-TO-TICKET] Token payload:', {
          aud: tokenPayload.aud,
          iss: tokenPayload.iss,
          roles: tokenPayload.roles || 'No roles found',
          scp: tokenPayload.scp || 'No scopes found',
          appid: tokenPayload.appid,
          tenant: tokenPayload.tid
        });
      } catch (tokenError) {
        console.error('[EMAIL-TO-TICKET] Error decoding token:', tokenError);
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Test 1.5: Check what permissions we actually have
      console.log('[EMAIL-TO-TICKET] Checking granted permissions...');
      try {
        // Try to get service principal info to see granted permissions
        const servicePrincipal = await graphClient.api(`/servicePrincipals?$filter=appId eq '${company.ms365ClientId}'`).get();
        if (servicePrincipal.value.length > 0) {
          console.log('[EMAIL-TO-TICKET] Service principal found:', servicePrincipal.value[0].displayName);
          
          // Get OAuth2 permission grants
          const grants = await graphClient.api(`/servicePrincipals/${servicePrincipal.value[0].id}/oauth2PermissionGrants`).get();
          console.log('[EMAIL-TO-TICKET] OAuth2 permission grants:', grants.value.length);
          
          // Get app role assignments
          const appRoles = await graphClient.api(`/servicePrincipals/${servicePrincipal.value[0].id}/appRoleAssignments`).get();
          console.log('[EMAIL-TO-TICKET] App role assignments:', appRoles.value.length);
          
          for (const role of appRoles.value) {
            console.log('[EMAIL-TO-TICKET] App role:', role.appRoleId, role.principalDisplayName);
          }
        }
      } catch (spError) {
        console.error('[EMAIL-TO-TICKET] Error checking service principal permissions:', spError);
        testResults.errors.push(`Permission check failed: ${spError.message}`);
      }

      // Test 2: User access
      console.log('[EMAIL-TO-TICKET] Testing user access...');
      try {
        const userInfo = await graphClient.api(`/users/${emailConfig.emailAddress}`).get();
        testResults.userAccess = true;
        console.log('[EMAIL-TO-TICKET] User access successful:', userInfo.displayName);
      } catch (userError) {
        testResults.errors.push(`User access failed: ${userError.message}`);
        console.error('[EMAIL-TO-TICKET] User access error:', userError);
        console.error('[EMAIL-TO-TICKET] User access error details:', {
          code: userError.code,
          statusCode: userError.statusCode,
          message: userError.message,
          body: userError.body
        });
      }

      // Test 3: Messages access
      console.log('[EMAIL-TO-TICKET] Testing messages access...');
      try {
        const messages = await graphClient.api(`/users/${emailConfig.emailAddress}/messages`).top(1).get();
        testResults.messagesAccess = true;
        console.log('[EMAIL-TO-TICKET] Messages access successful, found', messages.value.length, 'messages');
      } catch (messagesError) {
        testResults.errors.push(`Messages access failed: ${messagesError.message}`);
        console.error('[EMAIL-TO-TICKET] Messages access error:', messagesError);
      }

      // Test 4: Subscription permissions (try to list existing subscriptions)
      console.log('[EMAIL-TO-TICKET] Testing subscription permissions...');
      try {
        const subscriptions = await graphClient.api('/subscriptions').get();
        testResults.subscriptionPermissions = true;
        console.log('[EMAIL-TO-TICKET] Subscription permissions successful, found', subscriptions.value.length, 'subscriptions');
      } catch (subscriptionError) {
        testResults.errors.push(`Subscription permissions failed: ${subscriptionError.message}`);
        console.error('[EMAIL-TO-TICKET] Subscription permissions error:', subscriptionError);
        console.error('[EMAIL-TO-TICKET] Subscription error details:', {
          code: subscriptionError.code,
          statusCode: subscriptionError.statusCode,
          message: subscriptionError.message,
          body: subscriptionError.body
        });
      }

      // Test 5: Try to create a test subscription (but don't save it)
      console.log('[EMAIL-TO-TICKET] Testing subscription creation permissions...');
      try {
        const testSubscriptionPayload = {
          changeType: 'created',
          notificationUrl: 'https://webhook.site/test-webhook-url', // Dummy URL for testing
          resource: `/users/${emailConfig.emailAddress}/messages`,
          expirationDateTime: new Date(Date.now() + 60 * 1000).toISOString(), // 1 minute expiration
          clientState: 'test-client-state'
        };

        console.log('[EMAIL-TO-TICKET] Test subscription payload:', JSON.stringify(testSubscriptionPayload, null, 2));
        
        // Try to create the subscription
        const testSubscription = await graphClient.api('/subscriptions').post(testSubscriptionPayload);
        console.log('[EMAIL-TO-TICKET] Test subscription created successfully:', testSubscription.id);
        
        // Clean up by deleting the test subscription
        try {
          await graphClient.api(`/subscriptions/${testSubscription.id}`).delete();
          console.log('[EMAIL-TO-TICKET] Test subscription deleted successfully');
        } catch (deleteError) {
          console.warn('[EMAIL-TO-TICKET] Could not delete test subscription:', deleteError);
        }
        
        testResults.subscriptionCreation = true;
        
      } catch (createError) {
        testResults.subscriptionCreation = false;
        testResults.errors.push(`Subscription creation failed: ${createError.message}`);
        console.error('[EMAIL-TO-TICKET] Subscription creation error:', createError);
        console.error('[EMAIL-TO-TICKET] Subscription creation error details:', {
          code: createError.code,
          statusCode: createError.statusCode,
          message: createError.message,
          body: createError.body
        });
      }

      return testResults;

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error testing permissions:', error);
      return { 
        authentication: false, 
        userAccess: false, 
        messagesAccess: false, 
        subscriptionPermissions: false,
        subscriptionCreation: false,
        errors: [error.message] 
      };
    }
  }

  /**
   * Create Microsoft Graph webhook subscription
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @param {string} notificationUrl - Webhook notification URL
   * @returns {Promise<Object>} - Subscription result
   */
  static async createWebhookSubscription(emailConfig, company, notificationUrl) {
    try {
      console.log('[EMAIL-TO-TICKET] Creating webhook subscription...');
      console.log('[EMAIL-TO-TICKET] Company ID:', company.id);
      console.log('[EMAIL-TO-TICKET] Email Config ID:', emailConfig.id);
      console.log('[EMAIL-TO-TICKET] Email Address:', emailConfig.emailAddress);
      console.log('[EMAIL-TO-TICKET] Notification URL:', notificationUrl);
      console.log('[EMAIL-TO-TICKET] MS365 Client ID:', company.ms365ClientId ? 'Present' : 'Missing');
      console.log('[EMAIL-TO-TICKET] MS365 Tenant ID:', company.ms365TenantId ? 'Present' : 'Missing');
      console.log('[EMAIL-TO-TICKET] MS365 Client Secret:', company.ms365ClientSecret ? 'Present' : 'Missing');

      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Acquire token
      console.log('[EMAIL-TO-TICKET] Acquiring access token...');
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      console.log('[EMAIL-TO-TICKET] Access token acquired successfully');

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // First, let's test if we can access the user's mailbox
      console.log('[EMAIL-TO-TICKET] Testing access to user mailbox...');
      try {
        const userInfo = await graphClient.api(`/users/${emailConfig.emailAddress}`).get();
        console.log('[EMAIL-TO-TICKET] User info retrieved successfully:', userInfo.displayName);
      } catch (userError) {
        console.error('[EMAIL-TO-TICKET] Error accessing user mailbox:', userError);
        throw new Error(`Cannot access user mailbox: ${userError.message}`);
      }

      // Test if we can access messages
      console.log('[EMAIL-TO-TICKET] Testing access to messages...');
      try {
        const messages = await graphClient.api(`/users/${emailConfig.emailAddress}/messages`).top(1).get();
        console.log('[EMAIL-TO-TICKET] Messages access successful, found', messages.value.length, 'messages');
      } catch (messagesError) {
        console.error('[EMAIL-TO-TICKET] Error accessing messages:', messagesError);
        throw new Error(`Cannot access messages: ${messagesError.message}`);
      }

      // Create subscription
      console.log('[EMAIL-TO-TICKET] Creating subscription...');
      const subscriptionPayload = {
        changeType: 'created',
        notificationUrl,
        resource: `/users/${emailConfig.emailAddress}/messages`,
        expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // 4230 minutes (max for messages)
        clientState: `${company.id}-${emailConfig.id}` // For validation
      };

      console.log('[EMAIL-TO-TICKET] Subscription payload:', JSON.stringify(subscriptionPayload, null, 2));

      const subscription = await graphClient.api('/subscriptions').post(subscriptionPayload);

      console.log('[EMAIL-TO-TICKET] Subscription created successfully:', subscription.id);

      // Update email configuration
      await emailConfig.update({
        webhookSubscriptionId: subscription.id,
        webhookExpirationDateTime: new Date(subscription.expirationDateTime),
        webhookNotificationUrl: notificationUrl
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error creating webhook subscription:', error);
      console.error('[EMAIL-TO-TICKET] Error details:', error.code, error.message);
      if (error.body) {
        console.error('[EMAIL-TO-TICKET] Error body:', error.body);
      }
      return { success: false, message: error.message };
    }
  }

  /**
   * Renew Microsoft Graph webhook subscription
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Renewal result
   */
  static async renewWebhookSubscription(emailConfig, company) {
    try {
      if (!emailConfig.webhookSubscriptionId) {
        throw new Error('No subscription ID found');
      }

      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Acquire token
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Renew subscription
      const newExpirationDateTime = new Date(Date.now() + 4230 * 60 * 1000).toISOString();
      await graphClient.api(`/subscriptions/${emailConfig.webhookSubscriptionId}`).patch({
        expirationDateTime: newExpirationDateTime
      });

      // Update email configuration
      await emailConfig.update({
        webhookExpirationDateTime: new Date(newExpirationDateTime)
      });

      return { success: true, message: 'Subscription renewed successfully' };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error renewing webhook subscription:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete Microsoft Graph webhook subscription
   * @param {Object} emailConfig - Email configuration
   * @param {Object} company - Company object
   * @returns {Promise<Object>} - Deletion result
   */
  static async deleteWebhookSubscription(emailConfig, company) {
    try {
      if (!emailConfig.webhookSubscriptionId) {
        return { success: true, message: 'No subscription to delete' };
      }

      // Configure MSAL
      const msalConfig = {
        auth: {
          clientId: company.ms365ClientId,
          authority: `https://login.microsoftonline.com/${company.ms365TenantId}`,
          clientSecret: company.ms365ClientSecret,
        },
      };

      const cca = new msal.ConfidentialClientApplication(msalConfig);

      // Acquire token
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Delete subscription
      await graphClient.api(`/subscriptions/${emailConfig.webhookSubscriptionId}`).delete();

      // Update email configuration
      await emailConfig.update({
        webhookSubscriptionId: null,
        webhookExpirationDateTime: null,
        webhookNotificationUrl: null
      });

      return { success: true, message: 'Subscription deleted successfully' };

    } catch (error) {
      console.error('[EMAIL-TO-TICKET] Error deleting webhook subscription:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = EmailToTicketService;