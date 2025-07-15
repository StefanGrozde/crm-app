# Facebook Messenger Integration Plan

## Session Context
- User wants to integrate Facebook Messenger into the CRM app
- User is creating a new app on developers.facebook.com
- Need to set up backend routes and provide webhook configuration

## Facebook App Configuration Requirements

### Callback URLs Needed:
1. **Webhook URL**: `https://backend.svnikolaturs.mk/api/messenger/webhook`
2. **Privacy Policy URL**: `https://crm.svnikolaturs.mk/privacy-policy`
3. **Terms of Service URL**: `https://crm.svnikolaturs.mk/terms-of-service`

### Verify Token:
- **Used**: `CRM_FACEBOOK_WEBHOOK_VERIFY_TOKEN_2024`
- This is configured in environment variables and Facebook webhook configuration

## Implementation Progress

### 1. Create Facebook Messenger webhook routes ✅ COMPLETED
- File: `/backend/routes/messengerRoutes.js` (CREATED)
- GET `/api/messenger/webhook` - Webhook verification (WORKING)
- POST `/api/messenger/webhook` - Receive messages/events (IMPLEMENTED)
- Added debugging logs for troubleshooting

### 2. Configure backend routing ✅ COMPLETED
- Added messenger routes to `/backend/index.js` 
- Routes available at `/api/messenger/*`
- Fixed CORS issue that was blocking Facebook webhook requests

### 3. Environment variables configured ✅ COMPLETED
Required backend `.env` variables:
```
FB_VERIFY_TOKEN=CRM_FACEBOOK_WEBHOOK_VERIFY_TOKEN_2024
FB_APP_SECRET=your_app_secret_here
FB_PAGE_ACCESS_TOKEN=your_page_access_token_here
```

### 4. Webhook verification ✅ COMPLETED
- Facebook webhook verification successful
- Webhook URL verified: `https://backend.svnikolaturs.mk/api/messenger/webhook`
- CORS configuration updated to allow Facebook webhook requests

## Current Status
✅ **Backend webhook routes implemented and verified**
✅ **Facebook webhook verification working**
⏳ **Next: Configure access tokens and permissions**

## Facebook App Configuration - Next Steps

### Required Webhook Fields:
**Essential (minimum setup):**
- `messages` - Receive incoming text messages and attachments
- `messaging_postbacks` - Handle button clicks and structured interactions

**Recommended (for better functionality):**
- `messaging_optins` - Track user opt-ins
- `messaging_deliveries` - Message delivery confirmations
- `messaging_reads` - Read receipts

### Required Access Tokens:
1. **Page Access Token** (Critical)
   - Environment Variable: `FB_PAGE_ACCESS_TOKEN`
   - Purpose: Send messages to users
   - Get from: Facebook App → Messenger → Settings → Access Tokens

2. **App Secret** (Already have)
   - Environment Variable: `FB_APP_SECRET`
   - Purpose: Verify webhook signatures
   - Location: App Dashboard → Settings → Basic → App Secret

### Required Permissions:
1. **pages_messaging** (Essential)
   - Purpose: Send and receive messages through Facebook Page
   - Required for: All messaging functionality

2. **pages_show_list** (Usually auto-granted)
   - Purpose: Access to Facebook Pages list
   - Required for: Page selection during setup

## Next Session Tasks:
1. **Get Page Access Token** from Facebook Developer Console
2. **Add pages_messaging permission** to the app
3. **Configure FB_PAGE_ACCESS_TOKEN** environment variable
4. **Test message sending functionality**
5. **Set up webhook fields subscription** (messages, messaging_postbacks)
6. **Test end-to-end message flow**

## Implementation Files Created:
- `/backend/routes/messengerRoutes.js` - Main webhook handling
- Modified `/backend/index.js` - Added messenger routes and fixed CORS

## Testing Status:
- ✅ Webhook verification working
- ✅ Facebook can reach the webhook endpoint
- ⏳ Message sending/receiving (pending access tokens)

## Notes:
- Facebook requires HTTPS for all webhook URLs ✅
- Webhook verification must respond within 20 seconds ✅
- Page access tokens needed for sending messages ⏳
- CORS configuration fixed for webhook endpoints ✅
- For production: App Review required for pages_messaging permission