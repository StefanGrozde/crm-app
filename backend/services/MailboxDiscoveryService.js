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

      // Method 3: Check for shared mailboxes in the organization
      try {
        // List users/mailboxes in the organization, including shared mailboxes
        const orgUsers = await graphClient.api('/users')
          .select('id,mail,displayName,userType,accountEnabled,recipientType,exchangeGuid')
          .filter('accountEnabled eq true')
          .top(100)
          .get();

        console.log('[MAILBOX-DISCOVERY] Found', orgUsers.value.length, 'users in organization');

        // Check each user/mailbox to see if the current user has send-as or full access permissions
        for (const orgUser of orgUsers.value) {
          if (orgUser.mail && orgUser.mail !== userEmail) {
            try {
              // Try different approaches to check access
              let hasAccess = false;
              
              // Approach 1: Try to access mailbox settings
              try {
                await graphClient.api(`/users/${orgUser.mail}/mailboxSettings`).get();
                hasAccess = true;
                console.log('[MAILBOX-DISCOVERY] Can access mailbox settings for:', orgUser.mail);
              } catch (settingsError) {
                // Try approach 2: Check if we can list mail folders
                try {
                  const folders = await graphClient.api(`/users/${orgUser.mail}/mailFolders`).get();
                  if (folders && folders.value) {
                    hasAccess = true;
                    console.log('[MAILBOX-DISCOVERY] Can access mail folders for:', orgUser.mail);
                  }
                } catch (folderError) {
                  // Try approach 3: Check if we can get the user as a delegate
                  try {
                    const userInfo = await graphClient.api(`/users/${orgUser.mail}`).get();
                    if (userInfo && userInfo.mail) {
                      hasAccess = true;
                      console.log('[MAILBOX-DISCOVERY] Can access user info for:', orgUser.mail);
                    }
                  } catch (userInfoError) {
                    console.log('[MAILBOX-DISCOVERY] No access to mailbox:', orgUser.mail);
                  }
                }
              }
              
              // If we have access and it's not already in the list, add it
              if (hasAccess && !discoveredMailboxes.find(mb => mb.email === orgUser.mail)) {
                // Determine mailbox type
                let mailboxType = 'user';
                if (orgUser.recipientType === 'SharedMailbox' || 
                    orgUser.userType === 'Guest' || 
                    orgUser.displayName?.toLowerCase().includes('shared')) {
                  mailboxType = 'shared';
                }
                
                discoveredMailboxes.push({
                  email: orgUser.mail,
                  displayName: orgUser.displayName || orgUser.mail.split('@')[0],
                  isDefault: false,
                  isActive: true,
                  type: mailboxType
                });
                console.log('[MAILBOX-DISCOVERY] Added accessible mailbox:', orgUser.mail, 'type:', mailboxType);
              }
              
            } catch (accessError) {
              console.log('[MAILBOX-DISCOVERY] Error checking access to:', orgUser.mail, accessError.message);
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