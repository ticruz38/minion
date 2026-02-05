# OAuth Flow for Minion Authentication

This document describes how Google OAuth works in the Minion platform for authenticating users via chat (WhatsApp/Telegram).

## Architecture Overview

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   User      │◄───────►│   Minion    │◄───────►│   Chat      │
│  (Human)    │         │   (VM)      │         │ (WhatsApp/  │
└──────┬──────┘         └──────┬──────┘         │  Telegram)  │
       │                       └────────────────►└─────────────┘
       │                           Sends OAuth URL
       │
       │ Click OAuth URL
       ▼
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Google    │◄───────►│  Callback   │◄───────►│   Minion    │
│   OAuth     │         │    Page     │         │   Platform  │
└─────────────┘         └──────┬──────┘         └──────┬──────┘
                               │                        ▲
                               │ POST /api/auth/callback│
                               │ (exchange code)        │
                               │                        │
                               │ GET /api/auth/callback │
                               │ (poll for status)      │
                               └────────────────────────┘
```

## Flow Steps

### 1. Minion Requests Auth URL

When a minion needs to access a user's Google services:

```typescript
// Minion calls the platform API
const response = await fetch('https://minion-platform.com/api/auth/init', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer MINION_API_KEY' },
  body: JSON.stringify({
    minionId: 'accountant-bot-001',
    chatId: 'user-whatsapp-123456',
    chatPlatform: 'whatsapp',
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  })
});

const { state, authUrl, expiresIn } = await response.json();
```

### 2. Minion Shares URL with User

The minion sends a message to the user via their chat platform:

> **Minion (via WhatsApp):**
> 
> To access your Google Calendar, I need permission. Please click this link:
> 
> 🔗 [Connect Google Account](https://accounts.google.com/o/oauth2/v2/auth?...)
> 
> This link expires in 5 minutes.

### 3. User Authenticates with Google

1. User clicks the link
2. Google shows consent screen
3. User approves requested permissions
4. Google redirects to callback page with `code` and `state`

### 4. Callback Page Handles Redirect

The `/auth/callback` page:
1. Receives `code` and `state` from Google
2. POSTs to `/api/auth/callback` to exchange code for tokens
3. Shows success/error message to user
4. User closes page

### 5. Minion Detects Completion

The minion polls the status endpoint until auth completes:

```typescript
// Minion polls every 2 seconds
const checkStatus = async () => {
  const response = await fetch(
    `https://minion-platform.com/api/auth/callback?state=${state}`
  );
  const { status, userInfo, error } = await response.json();
  
  if (status === 'completed') {
    // Auth successful! Store tokens and notify user
    console.log(`User ${userInfo.email} authenticated`);
    return { success: true, userInfo };
  }
  
  if (status === 'failed') {
    return { success: false, error };
  }
  
  // Still pending, poll again
  setTimeout(checkStatus, 2000);
};
```

### 6. Minion Notifies User

> **Minion (via WhatsApp):**
> 
> ✅ Your Google account (john@example.com) has been connected!
> 
> I can now access your calendar. What would you like me to do?

## API Endpoints

### POST `/api/auth/init`

**Request:**
```json
{
  "minionId": "accountant-bot-001",
  "chatId": "user-whatsapp-123456",
  "chatPlatform": "whatsapp",
  "scopes": ["https://www.googleapis.com/auth/calendar"]
}
```

**Response:**
```json
{
  "success": true,
  "state": "a1b2c3d4e5f6...",
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "expiresIn": 300
}
```

### POST `/api/auth/callback`

Called by the callback page. Exchanges OAuth code for tokens.

**Request:**
```json
{
  "code": "4/0Adeu...",
  "state": "a1b2c3d4e5f6..."
}
```

### GET `/api/auth/callback?state=xxx`

Poll endpoint for minions to check auth status.

**Response (pending):**
```json
{
  "status": "pending"
}
```

**Response (completed):**
```json
{
  "status": "completed",
  "userInfo": {
    "email": "john@example.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

## State Parameter Security

The `state` parameter serves multiple purposes:

1. **CSRF Protection**: Prevents cross-site request forgery attacks
2. **Session Linking**: Links the OAuth flow to a specific chat user/minion
3. **Expiration**: Sessions expire after 5 minutes to prevent replay attacks

## Token Storage

Tokens are stored in the auth session temporarily. After successful auth:

1. **Minion retrieves tokens** via polling
2. **Minion stores tokens securely** in its own environment (encrypted at rest)
3. **Platform session is cleared** after retrieval or expiration

**Never:**
- Store tokens in the platform's memory longer than necessary
- Log tokens to console
- Send tokens to the chat platform

## Environment Variables

Required for production:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Platform
PUBLIC_BASE_URL=https://minion-platform.com
```

## Scopes by Minion Type

Different minions need different permissions:

| Minion | Scopes |
|--------|--------|
| Accountant | `calendar`, `drive`, `gmail.readonly` |
| Real Estate | `drive`, `sheets` |
| Restaurant | `calendar`, `gmail.send` |
| Schedule Master | `calendar` |

Minions should request minimal scopes needed for their function.

## Error Handling

### User Denies Permission

Callback page shows error, minion receives `status: 'failed'` with error details.

### Timeout

If user doesn't complete auth within 5 minutes, session expires. Minion should handle timeout gracefully and offer to retry.

### Token Refresh

Access tokens expire in 1 hour. Minions should use the `refresh_token` to get new access tokens:

```typescript
const refreshToken = async (refreshToken: string) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  return response.json();
};
```

## Future Improvements

1. **Webhook instead of polling**: Platform could call minion webhook when auth completes
2. **Redis for sessions**: Replace in-memory Map with Redis for scalability
3. **Token encryption**: Encrypt tokens before storing in minion environment
4. **User consent dashboard**: Let users see and revoke minion access
