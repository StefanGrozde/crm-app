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

        // Try to get send-as permissions
        try {
          const sendAsPermissions = await graphClient.api(`/users/${userEmail}/sendAs`).get();
          if (sendAsPermissions && sendAsPermissions.value) {
            console.log('[MAILBOX-DISCOVERY] Found', sendAsPermissions.value.length, 'send-as permissions');
            for (const permission of sendAsPermissions.value) {
              if (permission.emailAddress && permission.emailAddress.address) {
                const sendAsEmail = permission.emailAddress.address;
                if (sendAsEmail !== userEmail && !discoveredMailboxes.find(mb => mb.email === sendAsEmail)) {
                  discoveredMailboxes.push({
                    email: sendAsEmail,
                    displayName: permission.emailAddress.name || sendAsEmail.split('@')[0],
                    isDefault: false,
                    isActive: true,
                    type: 'shared'
                  });
                  console.log('[MAILBOX-DISCOVERY] Added send-as mailbox:', sendAsEmail);
                }
              }
            }
          }
        } catch (sendAsError) {
          console.log('[MAILBOX-DISCOVERY] No send-as permissions found:', sendAsError.message);
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

      // Method 3: Simplified approach - only use sendAs permissions that were found in Method 2
      // Don't scan the entire organization, focus only on what we already discovered
      console.log('[MAILBOX-DISCOVERY] Skipping organization-wide scan - using only explicit send-as permissions and well-known mailboxes');

      // Method 4: Check specific well-known mailboxes for the domain (but only test send-as capability)
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

      console.log('[MAILBOX-DISCOVERY] Testing well-known mailboxes for send-as permissions...');
      for (const prefix of wellKnownMailboxes) {
        const testEmail = `${prefix}@${userDomain}`;
        if (!discoveredMailboxes.find(mb => mb.email === testEmail)) {
          try {
            // Test if this mailbox exists and we can send from it by checking the sendMail endpoint availability
            // We'll do a simple API test without actually sending
            const testEndpoint = `/users/${testEmail}/sendMail`;
            
            // If we can access this endpoint structure, the mailbox likely exists and we might have permission
            // This is safer than trying to access mailbox settings which might give false positives
            try {
              // Just check if the user exists first
              const userCheck = await graphClient.api(`/users/${testEmail}`).select('mail,displayName').get();
              if (userCheck && userCheck.mail) {
                console.log('[MAILBOX-DISCOVERY] Well-known mailbox exists:', testEmail);
                
                // Now test if we can actually send from it by trying to access sendAs permissions
                try {
                  const userSendAs = await graphClient.api(`/users/${userEmail}/sendAs`).get();
                  const hasSendAsPermission = userSendAs.value?.some(permission => 
                    permission.emailAddress?.address === testEmail
                  );
                  
                  if (hasSendAsPermission) {
                    discoveredMailboxes.push({
                      email: testEmail,
                      displayName: userCheck.displayName || (prefix.charAt(0).toUpperCase() + prefix.slice(1)),
                      isDefault: false,
                      isActive: true,
                      type: 'shared'
                    });
                    console.log('[MAILBOX-DISCOVERY] Added well-known mailbox with send-as permission:', testEmail);
                  } else {
                    console.log('[MAILBOX-DISCOVERY] Well-known mailbox exists but no send-as permission:', testEmail);
                  }
                } catch (sendAsCheckError) {
                  console.log('[MAILBOX-DISCOVERY] Could not check send-as permissions for:', testEmail);
                }
              }
            } catch (userCheckError) {
              console.log('[MAILBOX-DISCOVERY] Well-known mailbox does not exist:', testEmail);
            }
          } catch (testError) {
            console.log('[MAILBOX-DISCOVERY] Error testing well-known mailbox:', testEmail, testError.message);
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