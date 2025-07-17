# Microsoft Graph Permissions for Mailbox Discovery

## Current Permissions (What you already have)
✅ `Mail.Read` - Read emails  
✅ `Mail.ReadWrite` - Access mailboxes  
✅ `User.Read.All` - Read user information  
✅ `Directory.Read.All` - Read directory data

## Additional Permissions Needed for Mailbox Discovery

### 🔴 **REQUIRED - Missing Permissions:**

#### 1. **MailboxSettings.ReadWrite**
- **Purpose**: Access mailbox settings and permissions
- **Used for**: Checking if user can send from specific mailboxes
- **API Calls**: `/users/{email}/mailboxSettings`

#### 2. **User.ReadWrite.All** (upgrade from User.Read.All)
- **Purpose**: Read user properties including mailbox access
- **Used for**: Enumerating users and checking mailbox permissions
- **API Calls**: `/users` with mailbox property access

### 🟡 **RECOMMENDED - For Enhanced Discovery:**

#### 3. **Mail.Send.Shared**
- **Purpose**: Send emails on behalf of shared mailboxes
- **Used for**: Discovering shared mailboxes user has send-as permissions for
- **API Calls**: Testing send capabilities for shared mailboxes

#### 4. **Directory.ReadWrite.All** (upgrade from Directory.Read.All)
- **Purpose**: Better organization enumeration
- **Used for**: More comprehensive mailbox discovery in the organization

## How to Add These Permissions

### Step 1: Azure Portal
1. Go to **Azure Portal** → **Azure Active Directory** → **App registrations**
2. Find your app registration
3. Click **API permissions**

### Step 2: Add Permissions
1. Click **Add a permission**
2. Select **Microsoft Graph**
3. Choose **Application permissions**
4. Add:
   - ✅ `MailboxSettings.ReadWrite`
   - ✅ `User.ReadWrite.All`
   - 🟡 `Mail.Send.Shared` (optional)
   - 🟡 `Directory.ReadWrite.All` (optional)

### Step 3: Grant Admin Consent
**CRITICAL:** Click **Grant admin consent for [Your Organization]**

## Expected Behavior After Adding Permissions

### ✅ With New Permissions:
- Stefan will see: `stefan.grozdanovski@svnikolaturs.mk`, `info@svnikolaturs.mk`, `support@svnikolaturs.mk`, etc.
- Dynamic discovery of all mailboxes Stefan has send-as permissions for
- Real-time permission checking

### ❌ Without New Permissions:
- Limited to basic user mailbox only
- Cannot discover shared mailboxes
- Cannot check send-as permissions

## Testing the Permissions

After adding permissions, test with:
```
GET /api/companies/1/mailboxes
```

The response should include multiple mailboxes Stefan can send from, not just the default one.

## Alternative: Simplified Discovery (if permissions are restricted)

If you cannot get the additional permissions, we can implement a simplified version that:
1. Uses the user's primary mailbox
2. Tests a predefined list of common mailboxes (info@, support@, etc.)
3. Only shows mailboxes that actually work

Let me know if you need the simplified version!

## Current Status

**Issue**: The dropdown only shows `booking@svnikolaturs.mk` because:
1. ❌ Missing `MailboxSettings.ReadWrite` permission
2. ❌ Cannot discover shared mailboxes Stefan has access to
3. ❌ Cannot check send-as permissions for other mailboxes

**Solution**: Add the required permissions above, then Stefan will see all mailboxes he can send from.