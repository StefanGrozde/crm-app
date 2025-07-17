const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch'); // Required polyfill for the Graph client

class EmailService {
  /**
   * Send email using Microsoft 365 Graph API
   * @param {Object} company - Company object with MS365 configuration
   * @param {Object} emailData - Email data object
   * @param {string} emailData.to - Recipient email address
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.htmlContent - HTML content of the email
   * @param {Array} emailData.bcc - BCC recipients (optional)
   * @param {Array} emailData.attachments - Email attachments (optional)
   * @param {string} emailData.sendFrom - Send from mailbox (optional, defaults to company.ms365EmailFrom)
   * @param {string} emailData.ticketNumber - Ticket number to include in subject (optional)
   * @returns {Promise<Object>} - Result of email sending
   */
  static async sendEmail(company, emailData) {
    try {
      // Validate company has email configuration
      if (!company.emailEnabled) {
        throw new Error('Email functionality is not enabled for this company');
      }

      if (!company.ms365ClientId || !company.ms365ClientSecret || !company.ms365TenantId || !company.ms365EmailFrom) {
        throw new Error('Microsoft 365 email configuration is incomplete');
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

      if (!authResponse || !authResponse.accessToken) {
        throw new Error('Failed to acquire access token from Microsoft 365');
      }

      // Initialize Graph client
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Prepare email subject with ticket number if provided
      let subject = emailData.subject;
      if (emailData.ticketNumber) {
        // Only add ticket number if it's not already in the subject
        if (!subject.includes(emailData.ticketNumber)) {
          subject = `[${emailData.ticketNumber}] ${subject}`;
        }
      }

      // Prepare email message
      const mail = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: emailData.htmlContent,
          },
          toRecipients: [
            {
              emailAddress: {
                address: emailData.to,
              },
            },
          ],
        },
      };

      // Add BCC recipients if provided
      if (emailData.bcc && emailData.bcc.length > 0) {
        mail.message.bccRecipients = emailData.bcc.map(email => ({
          emailAddress: {
            address: email,
          },
        }));
      }

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        mail.message.attachments = emailData.attachments;
      }

      // Determine which mailbox to send from
      const sendFromEmail = emailData.sendFrom || company.ms365EmailFrom;
      console.log('[EMAIL SERVICE] Sending email from:', sendFromEmail);

      // Send email
      await graphClient.api(`/users/${sendFromEmail}/sendMail`).post(mail);

      return {
        success: true,
        message: 'Email sent successfully',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      console.error('[EMAIL SERVICE] Error sending email:', error);
      
      // Handle specific Microsoft Graph errors
      let errorMessage = 'Failed to send email';
      if (error.body) {
        try {
          const errorBody = JSON.parse(error.body);
          errorMessage = errorBody.error_description || errorBody.error?.message || errorMessage;
        } catch (parseError) {
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Simple test that only validates token acquisition
   * @param {Object} company - Company object with MS365 configuration
   * @returns {Promise<Object>} - Test result
   */
  static async testTokenAcquisition(company) {
    try {
      // Validate configuration
      if (!company.ms365ClientId || !company.ms365ClientSecret || !company.ms365TenantId || !company.ms365EmailFrom) {
        return {
          success: false,
          message: 'Incomplete Microsoft 365 configuration. Please fill in all required fields.',
        };
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

      // Test token acquisition only
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse || !authResponse.accessToken) {
        return {
          success: false,
          message: 'Failed to acquire access token. Please check your Client ID, Client Secret, and Tenant ID.',
        };
      }

      return {
        success: true,
        message: 'Token acquisition successful. Your Microsoft 365 credentials are valid.',
      };

    } catch (error) {
      console.error('[EMAIL SERVICE] Token acquisition test error:', error);
      
      let errorMessage = 'Token acquisition failed';
      
      if (error.errorCode === 'invalid_client') {
        errorMessage = 'Invalid client credentials. Please check your Client ID and Client Secret.';
      } else if (error.errorCode === 'unauthorized_client') {
        errorMessage = 'Unauthorized client. Please check your Azure App Registration configuration.';
      } else if (error.errorCode === 'invalid_tenant') {
        errorMessage = 'Invalid tenant ID. Please check your Tenant ID.';
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Test Microsoft 365 email configuration
   * @param {Object} company - Company object with MS365 configuration
   * @returns {Promise<Object>} - Test result
   */
  static async testEmailConfiguration(company) {
    try {
      // Validate configuration
      if (!company.ms365ClientId || !company.ms365ClientSecret || !company.ms365TenantId || !company.ms365EmailFrom) {
        return {
          success: false,
          message: 'Incomplete Microsoft 365 configuration. Please fill in all required fields.',
        };
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

      // Test token acquisition
      const authResponse = await cca.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResponse || !authResponse.accessToken) {
        return {
          success: false,
          message: 'Failed to acquire access token. Please check your Client ID, Client Secret, and Tenant ID.',
        };
      }

      // Test Graph API connection - only test token validity, don't try to read user info
      const graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResponse.accessToken);
        },
      });

      // Test that we can make a basic API call (this will validate the token)
      // We'll try to get the current user's info, but if it fails due to permissions, that's OK
      try {
        await graphClient.api('/me').get();
        console.log('[EMAIL SERVICE] User info read successful');
      } catch (userError) {
        // If we can't read user info, that's fine - we only need Mail.Send permission
        console.log('[EMAIL SERVICE] User info read failed (expected if only Mail.Send permission):', userError.message);
        
        // Check if it's a permission error
        if (userError.statusCode === 403) {
          console.log('[EMAIL SERVICE] Permission error - this is expected if only Mail.Send permission is granted');
        }
      }

      return {
        success: true,
        message: 'Microsoft 365 configuration is valid. Token acquired successfully. You can now send emails.',
      };

    } catch (error) {
      console.error('[EMAIL SERVICE] Configuration test error:', error);
      
      let errorMessage = 'Configuration test failed';
      
      // Handle specific error types
      if (error.statusCode === 403) {
        errorMessage = 'Permission denied. Please ensure your Azure App Registration has the correct permissions (Mail.Send and User.Read.All).';
      } else if (error.statusCode === 401) {
        errorMessage = 'Authentication failed. Please check your Client ID, Client Secret, and Tenant ID.';
      } else if (error.body) {
        try {
          const errorBody = JSON.parse(error.body);
          errorMessage = errorBody.error_description || errorBody.error?.message || errorMessage;
        } catch (parseError) {
          errorMessage = error.message || errorMessage;
        }
      } else {
        errorMessage = error.message || errorMessage;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  }

  /**
   * Send email related to a ticket (automatically includes ticket number in subject)
   * @param {Object} company - Company object with MS365 configuration
   * @param {Object} emailData - Email data object
   * @param {Object} ticket - Ticket object (optional)
   * @returns {Promise<Object>} - Result of email sending
   */
  static async sendTicketEmail(company, emailData, ticket = null) {
    try {
      // If ticket is provided, automatically add ticket number to subject
      if (ticket && ticket.ticketNumber) {
        emailData.ticketNumber = ticket.ticketNumber;
      }

      return await this.sendEmail(company, emailData);
    } catch (error) {
      console.error('[EMAIL SERVICE] Error sending ticket email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send ticket email',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate a sample email template
   * @param {Object} data - Data to populate the template
   * @returns {string} - HTML email content
   */
  static generateSampleEmail(data) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sample Email</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                  <td style="padding: 20px 0;">
                      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
                          <tr>
                              <td align="center" style="background-color: #0077b6; padding: 20px 0;">
                                  <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Sample Email</h1>
                              </td>
                          </tr>
                          <tr>
                              <td style="padding: 30px;">
                                  <h2 style="color: #333333; margin-top: 0;">Hello!</h2>
                                  <p style="color: #333333; line-height: 1.6;">
                                      This is a sample email sent from your CRM system using Microsoft 365 integration.
                                  </p>
                                  <p style="color: #333333; line-height: 1.6;">
                                      <strong>Company:</strong> ${data.companyName || 'Your Company'}<br>
                                      <strong>Sent at:</strong> ${new Date().toLocaleString()}
                                  </p>
                                  <p style="color: #333333; line-height: 1.6;">
                                      If you received this email, your Microsoft 365 email configuration is working correctly!
                                  </p>
                              </td>
                          </tr>
                          <tr>
                              <td align="center" style="background-color: #f8f8f8; padding: 20px; color: #777777; font-size: 12px;">
                                  <p style="margin: 0;">&copy; ${new Date().getFullYear()} Your CRM System. All rights reserved.</p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `;
  }
}

module.exports = EmailService; 