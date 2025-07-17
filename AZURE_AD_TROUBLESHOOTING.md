# Azure AD Permissions Troubleshooting

## Issue: Can't Add Permissions or Grant Admin Consent

### 🔍 **Troubleshooting Steps**

#### 1. **Check Your Role**
- Go to **Azure Portal** → **Azure Active Directory** → **Users**
- Find your user: `stefan.grozdanovski@svnikolaturs.mk`
- Check **Directory role**: Should be **Global Administrator** or **Application Administrator**

#### 2. **Clear Browser Cache/Session**
```bash
# Try these in order:
1. Clear browser cache and cookies for portal.azure.com
2. Use incognito/private browsing mode
3. Try a different browser
4. Sign out completely and sign back in
```

#### 3. **Check App Registration Owner**
- Go to **App registrations** → Your app → **Owners**
- Make sure `stefan.grozdanovski@svnikolaturs.mk` is listed as an owner
- If not, ask another admin to add you as owner

#### 4. **Try PowerShell Method**
If the portal doesn't work, try Azure PowerShell:

```powershell
# Install Azure AD module if needed
Install-Module AzureAD

# Connect to Azure AD
Connect-AzureAD

# Get your app
$app = Get-AzureADApplication -Filter "DisplayName eq 'YourAppName'"

# Add required permissions
# You'll need the permission IDs for Microsoft Graph
```

### 🛠 **Alternative Solution: Simplified Mailbox Discovery**

Since you're having permission issues, I'll create a simplified version that works with your current permissions.

## Option A: Manual Mailbox Configuration

Add a simple UI to manually configure mailboxes that Stefan has access to:

1. **Company Settings Page** - Add mailbox management section
2. **Manual Entry** - Admin can add mailboxes: info@, support@, booking@
3. **Test Access** - Button to test if user can actually send from each mailbox
4. **User-Specific** - Each user can configure their own accessible mailboxes

## Option B: Smart Fallback Discovery

Use current permissions to try common mailboxes:

1. **User's Primary Mailbox** - Always include stefan.grozdanovski@svnikolaturs.mk
2. **Test Common Mailboxes** - Try info@, support@, help@, sales@ etc.
3. **Send Test** - For each mailbox, try a test API call to see if it works
4. **Cache Results** - Save working mailboxes to avoid repeated checks

Would you like me to implement Option A or B?