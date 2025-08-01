# Microsoft Graph Permissions Fix

## Issue
Getting "Insufficient privileges to complete the operation" when trying to create webhook subscriptions for email-to-ticket functionality.

## Root Cause
The Azure AD application needs specific **Application permissions** (not Delegated permissions) and they must be granted admin consent.

## Required Permissions

### For Email-to-Ticket Webhook Subscriptions:
1. **Mail.Read** (Application permission) - Read emails
2. **Mail.ReadWrite** (Application permission) - Access mailboxes  
3. **User.Read.All** (Application permission) - Read user profiles
4. **Directory.Read.All** (Application permission) - Read directory data

### Additional Permissions That May Be Required:
5. **Mail.ReadBasic.All** (Application permission) - Basic mail reading
6. **Subscription.ReadWrite.All** (Application permission) - **CRITICAL for webhooks**
7. **Application.ReadWrite.All** (Application permission) - For app permissions
8. **Directory.ReadWrite.All** (Application permission) - Write directory data

## Step-by-Step Fix

### 1. Azure AD App Registration Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your app registration (the one with the Client ID you're using)
4. Click on **API permissions**

### 2. Add Application Permissions

1. Click **Add a permission**
2. Select **Microsoft Graph**
3. Choose **Application permissions** (NOT Delegated permissions)
4. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `User.Read.All`
   - `Directory.Read.All`

### 3. Grant Admin Consent

**CRITICAL:** After adding the permissions, you MUST click **Grant admin consent for [Your Organization]**

Without admin consent, the permissions won't work even if they're added.

### 4. Verify Application Type

Make sure your app is configured as:
- **Application type**: Web application
- **Authentication**: Has a client secret (not just certificates)
- **Supported account types**: Choose appropriate option for your organization

### 5. Test the Fix

Use the diagnostic endpoint to test:
```
POST /api/email-to-ticket/configurations/:id/test-permissions
```

This will tell you exactly which permissions are working and which are failing.

## Troubleshooting Authorization_RequestDenied Error

### Step 1: Verify Application Registration Type
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Find your app and click on it
3. Check **Authentication** tab:
   - Should have **Platform configurations** set up
   - **Supported account types** should be appropriate for your organization
4. Check **Certificates & secrets** tab:
   - Ensure client secret is not expired
   - Note the exact Client ID and Secret you're using

### Step 2: Verify Permissions Are Application Type
1. Go to **API permissions** tab
2. **CRITICAL CHECK:** Each permission should show:
   - **Type**: Application (NOT Delegated)
   - **Admin consent required**: Yes
   - **Status**: Granted for [Your Organization]

### Step 3: Grant Admin Consent Properly
1. In **API permissions** tab, click **Grant admin consent for [Your Organization]**
2. **Important:** This button must be clicked AFTER adding all permissions
3. Look for green checkmarks next to each permission
4. If you see red X marks, admin consent failed

### Step 4: Check Service Principal in Enterprise Applications
1. Go to **Azure Active Directory** → **Enterprise applications**
2. Search for your app name
3. Click on it → **Permissions** tab
4. Verify the permissions are listed here too
5. If not found, the app registration might have issues

### Step 5: Verify Tenant and User Configuration
1. **Tenant ID**: Must be the correct tenant where the user mailbox exists
2. **User Email**: Must be a valid user in the same tenant
3. **User License**: User must have Exchange Online license

### Step 6: Check Token Scopes (Run the Test)
Run the test endpoint and check the logs for:
```
[EMAIL-TO-TICKET] Token payload: {
  roles: [...], // Should list your granted permissions
  aud: "https://graph.microsoft.com",
  appid: "your-client-id"
}
```

## Common Issues

### "Authorization_RequestDenied" Error
- **Most Common**: Admin consent not properly granted
- **Check**: Permissions are Application type, not Delegated
- **Verify**: All permissions show green checkmarks in Azure portal
- **Solution**: Re-grant admin consent after ensuring all permissions are added

### "Insufficient privileges" Error
- Usually means missing **Application permissions** or missing **admin consent**
- Check that you added **Application permissions**, not **Delegated permissions**
- Verify admin consent was granted

### "Forbidden" Error
- App might not have the correct permissions
- Client ID/Secret/Tenant ID might be incorrect
- App might be disabled or deleted

### "Invalid client" Error
- Client secret might be expired
- Client ID might be wrong
- Tenant ID might be incorrect

## Expected Log Output After Fix

After fixing permissions, you should see:
```
[EMAIL-TO-TICKET] Authentication successful
[EMAIL-TO-TICKET] User access successful: [User Name]
[EMAIL-TO-TICKET] Messages access successful, found X messages
[EMAIL-TO-TICKET] Subscription permissions successful, found X subscriptions
[EMAIL-TO-TICKET] Subscription created successfully: [subscription-id]
```

## Additional Notes

- The app uses **Client Credentials flow** (service-to-service authentication)
- This requires **Application permissions** with **admin consent**
- **Delegated permissions** won't work for this use case
- The webhook endpoint must be accessible from the internet for Microsoft Graph to validate it

## Troubleshooting Commands

Test specific API calls:
```bash
# Test user access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://graph.microsoft.com/v1.0/users/user@domain.com"

# Test messages access  
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://graph.microsoft.com/v1.0/users/user@domain.com/messages"

# Test subscription permissions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://graph.microsoft.com/v1.0/subscriptions"
```