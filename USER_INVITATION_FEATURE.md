# User Invitation Feature

## Overview

The User Invitation feature allows administrators to generate secure invitation URLs for new users to join their company. This provides a secure and controlled way to onboard new team members without requiring manual user creation.

## Features

### For Administrators

1. **Generate Invitation URLs**: Create invitation links for new users with specific roles
2. **Manage Invitations**: View all pending and used invitations
3. **Role Assignment**: Assign specific roles to invited users
4. **Expiration Management**: Invitations automatically expire after 7 days
5. **Invitation Tracking**: Monitor which invitations have been used

### For Invited Users

1. **Secure Registration**: Complete registration using invitation token
2. **Role Assignment**: Automatically assigned the role specified in the invitation
3. **Company Association**: Automatically added to the correct company
4. **Self-Service**: Complete registration without admin intervention

## Technical Implementation

### Database Schema

The feature uses a new `user_invitations` table with the following structure:

```sql
CREATE TABLE user_invitations (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Sales Representative',
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Backend API Endpoints

#### Generate Invitation
- **POST** `/api/invitations`
- **Access**: Admin only
- **Body**: `{ email, role }`
- **Response**: `{ invitation: { id, email, role, expiresAt, invitationUrl } }`

#### Get Invitation Details
- **GET** `/api/invitations/:token`
- **Access**: Public
- **Response**: `{ invitation: { id, email, role, expiresAt, company } }`

#### Complete Registration
- **POST** `/api/invitations/:token/complete`
- **Access**: Public
- **Body**: `{ username, password }`
- **Response**: `{ message, user }`

#### List Invitations (Admin)
- **GET** `/api/invitations`
- **Access**: Admin only
- **Response**: `{ invitations: [...] }`

#### Delete Invitation (Admin)
- **DELETE** `/api/invitations/:id`
- **Access**: Admin only

### Frontend Components

#### UsersWidget
- Enhanced with "Invite" button
- Modal for generating invitations
- Copy-to-clipboard functionality for invitation URLs

#### InvitationsWidget
- Dedicated widget for managing invitations
- View all invitations with status
- Delete unused invitations
- Generate new invitations

#### InviteRegistration
- Public page for completing registration
- Form validation
- Success/error handling

### Security Features

1. **Token Generation**: Cryptographically secure random tokens
2. **Expiration**: 7-day automatic expiration
3. **Single Use**: Invitations can only be used once
4. **Company Isolation**: Invitations are company-specific
5. **Role Validation**: Only valid roles can be assigned

## Usage Workflow

### Admin Workflow

1. Navigate to Users widget or Invitations widget
2. Click "Invite" or "New Invitation"
3. Enter email and select role
4. Generate invitation
5. Copy invitation URL and send to user
6. Monitor invitation status

### User Workflow

1. Receive invitation URL from admin
2. Click invitation link
3. Complete registration form (username, password)
4. Account is created with specified role
5. Redirected to login page
6. Login with new credentials

## Configuration

### Environment Variables

```bash
# Frontend URL for generating invitation links
FRONTEND_URL=https://your-app-domain.com
```

### Database Migration

Run the migration script to create the required table:

```bash
cd backend
node scripts/run-migration.js
```

## Widget Configuration

The invitation widgets are configured in `frontend/src/config/widgetConfig.js`:

```javascript
'invitations-widget': {
    ...DEFAULT_WIDGET_CONFIG,
    renderMode: 'lazy',
    autoReload: false,
    showLoadingSpinner: true,
}
```

## Error Handling

### Common Error Scenarios

1. **Expired Invitation**: User tries to use expired invitation
2. **Already Used**: User tries to use invitation that was already used
3. **Invalid Token**: User tries to use non-existent invitation token
4. **Duplicate Email**: Admin tries to invite user with existing email
5. **Duplicate Username**: User tries to register with existing username

### Error Messages

- "Invitation has expired"
- "Invitation has already been used"
- "Invitation not found"
- "User with this email already exists"
- "Username already exists"

## Future Enhancements

1. **Email Notifications**: Send invitation emails automatically
2. **Bulk Invitations**: Invite multiple users at once
3. **Custom Expiration**: Allow admins to set custom expiration times
4. **Invitation Templates**: Customizable invitation messages
5. **Analytics**: Track invitation usage and conversion rates

## Troubleshooting

### Common Issues

1. **Invitation URL not working**: Check if invitation has expired or been used
2. **User can't register**: Verify invitation token is valid and not expired
3. **Role not assigned**: Check if role is valid in the system
4. **Company not found**: Ensure company exists and is active

### Debug Steps

1. Check invitation status in admin panel
2. Verify invitation token in database
3. Check user creation logs
4. Validate company and role associations 