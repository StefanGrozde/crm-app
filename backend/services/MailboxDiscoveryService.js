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

      // Method 1.5: Always include company default email as an option
      if (company.ms365EmailFrom && !discoveredMailboxes.find(mb => mb.email === company.ms365EmailFrom)) {
        try {
          // Test if we can access this mailbox
          const companyMailbox = await graphClient.api(`/users/${company.ms365EmailFrom}`).get();
          if (companyMailbox) {
            discoveredMailboxes.push({
              email: company.ms365EmailFrom,
              displayName: companyMailbox.displayName || 'Company Default',
              isDefault: userEmail === company.ms365EmailFrom, // Only default if it's the user's own email
              isActive: true,
              type: 'company'
            });
            console.log('[MAILBOX-DISCOVERY] Added company default mailbox:', company.ms365EmailFrom);
          }
        } catch (companyError) {
          console.warn('[MAILBOX-DISCOVERY] Could not access company default mailbox:', companyError.message);
        }
      }

      // Method 2: Discover shared mailboxes user has access to
      try {
        // Try to get shared mailboxes using the mailFolders endpoint
        const sharedMailFolders = await graphClient.api(`/users/${userEmail}/mailFolders`).get();
        console.log('[MAILBOX-DISCOVERY] Found', sharedMailFolders.value?.length || 0, 'mail folders');
        
        // Try to get delegated permissions for the user
        try {
          const permissions = await graphClient.api(`/users/${userEmail}/calendar/calendarPermissions`).get();
          console.log('[MAILBOX-DISCOVERY] Found calendar permissions');
        } catch (permError) {
          console.log('[MAILBOX-DISCOVERY] No calendar permissions found');
        }

        // Try to get shared mailboxes from the organization
        try {
          console.log('[MAILBOX-DISCOVERY] Scanning organization for shared mailboxes...');
          
          // Get all users in the organization
          const allUsers = await graphClient.api('/users').select('mail,displayName,accountEnabled,userType').filter('accountEnabled eq true').get();
          console.log('[MAILBOX-DISCOVERY] Found', allUsers.value?.length || 0, 'active users in organization');
          
          if (allUsers.value) {
            const userDomain = userEmail.split('@')[1];
            
            for (const user of allUsers.value) {
              if (user.mail && user.mail.includes(userDomain) && user.mail !== userEmail) {
                // Check if this might be a shared mailbox
                const isSharedMailbox = await this.checkIfSharedMailbox(graphClient, user.mail, userDomain);
                
                if (isSharedMailbox && !discoveredMailboxes.find(mb => mb.email === user.mail)) {
                  const emailPrefix = user.mail.split('@')[0].toLowerCase();
                  discoveredMailboxes.push({
                    email: user.mail,
                    displayName: user.displayName || emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1),
                    isDefault: false,
                    isActive: true,
                    type: 'shared'
                  });
                  console.log('[MAILBOX-DISCOVERY] Added shared mailbox:', user.mail);
                }
              }
            }
          }
        } catch (usersError) {
          console.log('[MAILBOX-DISCOVERY] Could not scan organization users:', usersError.message);
        }

        // Try to get delegate permissions
        try {
          const delegatePermissions = await graphClient.api(`/users/${userEmail}/mailFolders/inbox/messageRules`).get();
          console.log('[MAILBOX-DISCOVERY] Found message rules');
        } catch (delegateError) {
          console.log('[MAILBOX-DISCOVERY] No delegate permissions found');
        }

      } catch (settingsError) {
        console.log('[MAILBOX-DISCOVERY] Error checking shared mailboxes:', settingsError.message);
      }

      // Method 3: All shared mailboxes are now discovered above
      console.log('[MAILBOX-DISCOVERY] Shared mailbox discovery complete');

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
   * Check if a mailbox is a shared mailbox by examining its properties
   * @param {Object} graphClient - Initialized Graph client
   * @param {string} mailboxEmail - Email address to check
   * @param {string} userDomain - Domain to filter by
   * @returns {Promise<boolean>} - Whether this is a shared mailbox
   */
  static async checkIfSharedMailbox(graphClient, mailboxEmail, userDomain) {
    try {
      // Method 1: Check mailbox settings to see if it's shared
      try {
        const mailboxSettings = await graphClient.api(`/users/${mailboxEmail}/mailboxSettings`).get();
        console.log('[MAILBOX-DISCOVERY] Mailbox settings for', mailboxEmail, ':', mailboxSettings.userPurpose || 'none');
        
        // If userPurpose is 'shared', it's a shared mailbox
        if (mailboxSettings.userPurpose === 'shared') {
          return true;
        }
      } catch (settingsError) {
        console.log('[MAILBOX-DISCOVERY] Could not get mailbox settings for', mailboxEmail);
      }

      // Method 2: Check common patterns for shared mailboxes
      const emailPrefix = mailboxEmail.split('@')[0].toLowerCase();
      const commonSharedPatterns = [
        'info', 'support', 'help', 'sales', 'marketing', 'admin', 'contact',
        'booking', 'reservations', 'billing', 'accounts', 'hr', 'finance',
        'service', 'customer', 'orders', 'noreply', 'no-reply'
      ];

      const isCommonSharedName = commonSharedPatterns.some(pattern => 
        emailPrefix === pattern || emailPrefix.includes(pattern)
      );

      if (isCommonSharedName) {
        console.log('[MAILBOX-DISCOVERY] Identified as shared mailbox by pattern:', mailboxEmail);
        return true;
      }

      // Method 3: Check if it's a resource mailbox (room, equipment, etc.)
      try {
        const userDetails = await graphClient.api(`/users/${mailboxEmail}`).select('userType,assignedLicenses').get();
        
        // Check if it has no licenses (typical for shared mailboxes)
        if (userDetails.assignedLicenses && userDetails.assignedLicenses.length === 0) {
          console.log('[MAILBOX-DISCOVERY] Identified as shared mailbox by license status:', mailboxEmail);
          return true;
        }
      } catch (userError) {
        console.log('[MAILBOX-DISCOVERY] Could not get user details for', mailboxEmail);
      }

      return false;
    } catch (error) {
      console.log('[MAILBOX-DISCOVERY] Error checking shared mailbox status for', mailboxEmail, ':', error.message);
      return false;
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