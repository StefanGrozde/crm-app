const { Client } = require('@microsoft/microsoft-graph-client');
const msal = require('@azure/msal-node');

class MailboxDiscoveryService {
  /**
   * Discover available mailboxes that the user has access to
   * @param {Object} company - Company object with MS365 credentials
   * @param {string} userEmail - Email of the user to check permissions for
   * @returns {Promise<Array>} - Array of available mailboxes
   */
  static async discoverUserMailboxes(company, userEmail) {
    try {
      console.log('[MAILBOX-DISCOVERY] Discovering mailboxes for user:', userEmail);

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

      const discoveredMailboxes = [];

      // Method 1: Check user's own mailbox
      try {
        const userMailbox = await graphClient.api(`/users/${userEmail}`).get();
        if (userMailbox && userMailbox.mail) {
          discoveredMailboxes.push({
            email: userMailbox.mail,
            displayName: userMailbox.displayName || 'Personal',
            isDefault: true,
            isActive: true,
            type: 'user'
          });
          console.log('[MAILBOX-DISCOVERY] Added user mailbox:', userMailbox.mail);
        }
      } catch (userError) {
        console.warn('[MAILBOX-DISCOVERY] Could not access user mailbox:', userError.message);
      }

      // Method 2: Discover shared mailboxes user has access to
      try {
        // Get mailboxes user has permission to send from
        const mailboxSettings = await graphClient.api(`/users/${userEmail}/mailboxSettings`).get();
        
        if (mailboxSettings && mailboxSettings.delegateMeetingMessageDeliveryOptions) {
          console.log('[MAILBOX-DISCOVERY] Found mailbox settings');
        }
      } catch (settingsError) {
        console.log('[MAILBOX-DISCOVERY] No special mailbox settings found');
      }

      // Method 3: Check for shared mailboxes in the organization
      try {
        // List users/mailboxes in the organization that might be shared mailboxes
        const orgUsers = await graphClient.api('/users')
          .select('id,mail,displayName,userType,accountEnabled')
          .filter('accountEnabled eq true')
          .top(100)
          .get();

        console.log('[MAILBOX-DISCOVERY] Found', orgUsers.value.length, 'users in organization');

        for (const orgUser of orgUsers.value) {
          if (orgUser.mail && orgUser.mail !== userEmail) {
            // Check if user has send-as permissions for this mailbox
            try {
              await graphClient.api(`/users/${orgUser.mail}/mailboxSettings`).get();
              
              // If we can access it, add it to the list
              if (!discoveredMailboxes.find(mb => mb.email === orgUser.mail)) {
                discoveredMailboxes.push({
                  email: orgUser.mail,
                  displayName: orgUser.displayName || orgUser.mail.split('@')[0],
                  isDefault: false,
                  isActive: true,
                  type: orgUser.userType === 'Member' ? 'shared' : 'user'
                });
                console.log('[MAILBOX-DISCOVERY] Added accessible mailbox:', orgUser.mail);
              }
            } catch (accessError) {
              // User doesn't have access to this mailbox, skip it
              console.log('[MAILBOX-DISCOVERY] No access to mailbox:', orgUser.mail);
            }
          }
        }
      } catch (orgError) {
        console.warn('[MAILBOX-DISCOVERY] Could not enumerate organization mailboxes:', orgError.message);
      }

      // Method 4: Check specific well-known mailboxes for the domain
      const userDomain = userEmail.split('@')[1];
      const wellKnownMailboxes = [
        'info',
        'support', 
        'help',
        'sales',
        'marketing',
        'admin',
        'contact',
        'booking',
        'reservations'
      ];

      for (const prefix of wellKnownMailboxes) {
        const testEmail = `${prefix}@${userDomain}`;
        if (!discoveredMailboxes.find(mb => mb.email === testEmail)) {
          try {
            // Try to get mailbox settings to see if it exists and is accessible
            await graphClient.api(`/users/${testEmail}/mailboxSettings`).get();
            
            discoveredMailboxes.push({
              email: testEmail,
              displayName: prefix.charAt(0).toUpperCase() + prefix.slice(1),
              isDefault: false,
              isActive: true,
              type: 'shared'
            });
            console.log('[MAILBOX-DISCOVERY] Added well-known mailbox:', testEmail);
          } catch (testError) {
            // Mailbox doesn't exist or user doesn't have access
            console.log('[MAILBOX-DISCOVERY] Well-known mailbox not accessible:', testEmail);
          }
        }
      }

      console.log('[MAILBOX-DISCOVERY] Discovery complete. Found', discoveredMailboxes.length, 'mailboxes');
      return discoveredMailboxes;

    } catch (error) {
      console.error('[MAILBOX-DISCOVERY] Error discovering mailboxes:', error);
      
      // Fallback: return user's own email if we have it
      if (userEmail) {
        return [{
          email: userEmail,
          displayName: 'Personal',
          isDefault: true,
          isActive: true,
          type: 'user'
        }];
      }
      
      return [];
    }
  }

  /**
   * Test send-as permissions for a specific mailbox
   * @param {Object} company - Company object with MS365 credentials
   * @param {string} userEmail - Email of the user
   * @param {string} testMailbox - Mailbox to test access for
   * @returns {Promise<boolean>} - Whether user can send as this mailbox
   */
  static async testSendAsPermissions(company, userEmail, testMailbox) {
    try {
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
        return false;
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Try to access the mailbox settings
      await graphClient.api(`/users/${testMailbox}/mailboxSettings`).get();
      
      return true;
    } catch (error) {
      console.log('[MAILBOX-DISCOVERY] No send-as permission for', testMailbox, ':', error.message);
      return false;
    }
  }
}

module.exports = MailboxDiscoveryService;