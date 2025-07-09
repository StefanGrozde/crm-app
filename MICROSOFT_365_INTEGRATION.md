# Microsoft 365 Email Integration

This document explains how to set up Microsoft 365 email integration for your CRM system, allowing you to send emails directly from the CRM using your company's Microsoft 365 account.

## Overview

The CRM system now supports Microsoft 365 email integration, which allows:
- Sending emails directly from the CRM interface
- Using your company's Microsoft 365 email address as the sender
- Professional email templates and formatting
- BCC functionality for tracking
- Company-specific email configurations

## Prerequisites

Before setting up Microsoft 365 integration, you need:

1. **Microsoft 365 Business Account**: A valid Microsoft 365 subscription
2. **Azure App Registration**: An application registered in Azure Active Directory
3. **Admin Access**: Administrator access to your Microsoft 365 tenant

## Step-by-Step Setup

### 1. Create Azure App Registration

1. Go to the [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: Your CRM Email Integration (or any descriptive name)
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Leave blank for now
5. Click **Register**

### 2. Configure App Permissions

1. In your new app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions**
5. Search for and add these permissions:
   - `Mail.Send` - Send emails on behalf of users
   - `User.Read.All` - Read user information (for testing)
6. Click **Add permissions**
7. Click **Grant admin consent** (requires admin privileges)

### 3. Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and choose expiration
4. **Important**: Copy the secret value immediately - you won't be able to see it again
5. Save this value securely

### 4. Get Required Information

From your app registration, collect these values:

- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page
- **Client Secret**: The value you just created (step 3)

### 5. Configure Email User

1. In Microsoft 365 Admin Center, go to **Users** > **Active users**
2. Find the user account that will send emails
3. Ensure the account has a valid email address
4. Note: This account must be granted the Mail.Send permission (done in step 2)

## CRM Configuration

### For Company Administrators

1. **Navigate to Company Settings**:
   - Go to your CRM dashboard
   - Click on your profile/company settings
   - Select "Edit Company Details"

2. **Enable Email Functionality**:
   - Check the "Enable Email Functionality" checkbox
   - Fill in the Microsoft 365 configuration fields:
     - **Client ID**: Your Azure App Registration Client ID
     - **Client Secret**: Your Azure App Registration Client Secret
     - **Tenant ID**: Your Azure App Registration Tenant ID
     - **From Email Address**: The email address that will send emails

3. **Test Configuration**:
   - Click "Test Configuration" to verify your settings
   - If successful, you'll see a green success message
   - If there are errors, check your configuration and permissions

4. **Send Test Email**:
   - Enter a test email address
   - Click "Send Test" to verify email sending works
   - Check the recipient's inbox for the test email

### For Regular Users

Once email is configured by your administrator:

1. **Send Emails**: Use the EmailSender component throughout the CRM
2. **Email Templates**: Use HTML formatting in email content
3. **BCC Support**: Add BCC recipients when needed

## Security Considerations

### Data Protection

- **Client Secrets**: Store securely and rotate regularly
- **Access Control**: Only administrators can configure email settings
- **Audit Trail**: All email sending is logged in the system

### Best Practices

1. **Use Dedicated Service Account**: Create a specific user account for CRM emails
2. **Regular Secret Rotation**: Update client secrets periodically
3. **Monitor Usage**: Check email sending logs regularly
4. **Backup Configuration**: Keep a secure copy of your configuration

## Troubleshooting

### Common Issues

#### "Failed to acquire access token"
- **Cause**: Invalid Client ID, Client Secret, or Tenant ID
- **Solution**: Double-check your Azure App Registration credentials

#### "User not found" error
- **Cause**: The "From Email Address" doesn't exist or lacks permissions
- **Solution**: Verify the email address exists and has Mail.Send permissions

#### "Insufficient privileges" error
- **Cause**: App registration lacks required permissions
- **Solution**: Grant Mail.Send and User.Read.All permissions in Azure

#### "Configuration test failed"
- **Cause**: One or more configuration fields are missing
- **Solution**: Ensure all required fields are filled in

### Testing Steps

1. **Verify Azure Configuration**:
   - Check app registration permissions
   - Confirm client secret is valid
   - Verify tenant ID is correct

2. **Test in CRM**:
   - Use "Test Configuration" button
   - Send test email to yourself
   - Check email delivery and formatting

3. **Check Logs**:
   - Review browser console for errors
   - Check server logs for detailed error messages

## API Reference

### Email Service Endpoints

#### Test Email Configuration
```
POST /api/companies/:id/test-email-config
Authorization: Required (Admin only)
```

#### Send Test Email
```
POST /api/companies/:id/send-test-email
Body: { testEmailAddress: "test@example.com" }
Authorization: Required (Admin only)
```

#### Send Email
```
POST /api/companies/:id/send-email
Body: {
  to: "recipient@example.com",
  subject: "Email Subject",
  htmlContent: "<p>Email content</p>",
  bcc: ["bcc@example.com"],
  attachments: []
}
Authorization: Required (Company member)
```

### Email Service Methods

#### `EmailService.sendEmail(company, emailData)`
Sends an email using the company's Microsoft 365 configuration.

**Parameters:**
- `company`: Company object with MS365 configuration
- `emailData`: Object containing email details

**Returns:** Promise with success/error result

#### `EmailService.testEmailConfiguration(company)`
Tests the company's Microsoft 365 email configuration.

**Parameters:**
- `company`: Company object with MS365 configuration

**Returns:** Promise with test result

## Support

If you encounter issues with Microsoft 365 integration:

1. **Check this documentation** for common solutions
2. **Verify Azure configuration** using the troubleshooting steps
3. **Contact your system administrator** for company-specific issues
4. **Review server logs** for detailed error information

## Updates and Maintenance

### Regular Maintenance Tasks

1. **Client Secret Rotation**: Update secrets every 90 days
2. **Permission Review**: Regularly review app permissions
3. **User Account Management**: Monitor email sending user accounts
4. **Log Review**: Check email sending logs for issues

### Version Updates

The Microsoft 365 integration will be updated with:
- New Microsoft Graph API features
- Enhanced security measures
- Improved error handling
- Additional email templates

Stay updated with the latest CRM releases for the newest features and security improvements. 