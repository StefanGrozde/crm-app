# Facebook Messenger Integration Plan

## Session Context
- User wants to integrate Facebook Messenger into the CRM app
- User is creating a new app on developers.facebook.com
- Need to set up backend routes and provide webhook configuration

## Facebook App Configuration Requirements

### Callback URLs Needed:
1. **Webhook URL**: `https://backend.svnikolaturs.mk/api/facebook/webhook`
2. **OAuth Redirect URI**: `https://backend.svnikolaturs.mk/api/facebook/auth/callback`
3. **Privacy Policy URL**: `https://crm.svnikolaturs.mk/privacy-policy`
4. **Terms of Service URL**: `https://crm.svnikolaturs.mk/terms-of-service`

### Verify Token:
- **Recommended**: `CRM_FACEBOOK_WEBHOOK_VERIFY_TOKEN_2024`
- This will be used in environment variables and Facebook webhook configuration

## Implementation Tasks

### 1. Create Facebook Messenger webhook routes ⏳
- File: `/backend/routes/facebookRoutes.js`
- GET `/api/facebook/webhook` - Webhook verification
- POST `/api/facebook/webhook` - Receive messages/events

### 2. Set up Facebook authentication routes ⏳
- OAuth callback handler
- App authentication flow
- Token management

### 3. Configure environment variables ⏳
Add to backend `.env`:
```
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_VERIFY_TOKEN=CRM_FACEBOOK_WEBHOOK_VERIFY_TOKEN_2024
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
```

### 4. Test Facebook webhook verification ⏳
- Verify webhook responds correctly to Facebook's verification challenge
- Test message receiving functionality

## Implementation Priority:
1. **High**: Webhook routes for message handling
2. **High**: Environment variable configuration  
3. **Medium**: OAuth authentication routes
4. **Medium**: Message processing and CRM integration

## Next Session Actions:
1. Create `/backend/routes/facebookRoutes.js`
2. Set up webhook verification with verify token
3. Add Facebook routes to main app
4. Configure environment variables
5. Test webhook verification process

## Notes:
- Facebook requires HTTPS for all webhook URLs
- Webhook verification must respond within 20 seconds
- Page access tokens needed for sending messages
- Consider rate limiting for webhook endpoints