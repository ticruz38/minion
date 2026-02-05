# PRD: Minion Google OAuth Integration

## Introduction

Enable minions (AI agent VMs) to authenticate users via Google OAuth through a seamless chat-based flow. Users receive OAuth links via WhatsApp/Telegram, click to authorize, and the minion automatically receives tokens to access Google services (Calendar, Drive, Gmail, etc.) on their behalf.

This eliminates the complexity of OAuth for end users while maintaining security by keeping tokens in the minion's isolated environment, not on the platform.

## Goals

- Allow minions to request Google OAuth URLs for users via chat
- Provide a branded callback page that handles OAuth redirects
- Enable minions to poll for authentication status and retrieve tokens
- Support multiple Google scopes per minion type (Calendar, Drive, etc.)
- Keep client secrets secure (only platform knows them, not minions)
- Support both real Google OAuth and demo mode for testing

## User Stories

### US-001: Minion requests OAuth URL
**Description:** As a minion VM, I want to request an OAuth URL so I can share it with a user via chat.

**Acceptance Criteria:**
- [ ] Minion can POST to `/api/auth/init` with `minionId`, `chatId`, `chatPlatform`
- [ ] API returns `authUrl`, `state`, and `expiresIn` (5 minutes)
- [ ] Session is created and tracked in memory (Redis in production)
- [ ] Minion receives 400 error for missing/invalid parameters
- [ ] Typecheck passes

### US-002: User clicks OAuth link and authorizes
**Description:** As a user, I want to click a link in chat and authorize Google access without technical complexity.

**Acceptance Criteria:**
- [ ] Link opens Google consent screen with requested scopes
- [ ] User sees "Minion Platform" as the requesting app
- [ ] After clicking "Allow", user is redirected to `/auth/callback`
- [ ] If user clicks "Deny", callback page shows friendly error message
- [ ] State parameter validates to prevent CSRF attacks
- [ ] Typecheck passes

### US-003: Callback page exchanges code for tokens
**Description:** As the platform, I want to securely exchange the OAuth code for tokens.

**Acceptance Criteria:**
- [ ] Callback page reads `code` and `state` from URL
- [ ] POSTs to `/api/auth/callback` to exchange code
- [ ] Platform exchanges code with Google using client secret
- [ ] Tokens and user info (email, name) stored in session
- [ ] Page shows success UI with user email
- [ ] Page shows error UI if exchange fails
- [ ] Typecheck passes
- [ ] Verify UI in browser (success and error states)

### US-004: Minion retrieves tokens via polling
**Description:** As a minion VM, I want to poll for auth completion so I can get tokens and start working.

**Acceptance Criteria:**
- [ ] Minion can GET `/api/auth/callback?state=xxx` to check status
- [ ] Returns `{ status: 'pending' }` until user completes auth
- [ ] Returns `{ status: 'completed', userInfo: {...} }` when done
- [ ] Returns `{ status: 'failed', error: '...' }` on failure
- [ ] Minion can poll every 2 seconds until completion
- [ ] Session expires after 5 minutes if not completed
- [ ] Typecheck passes

### US-005: Minion stores tokens securely
**Description:** As a minion VM, I want to store tokens in my isolated environment.

**Acceptance Criteria:**
- [ ] Minion receives tokens via polling endpoint
- [ ] Tokens never appear in chat messages
- [ ] Minion stores tokens encrypted at rest (implementation TBD in minion)
- [ ] Platform clears session after minion retrieves tokens
- [ ] Tokens include `access_token`, `refresh_token`, `expires_in`

### US-006: Support demo mode without Google credentials
**Description:** As a developer, I want to test the flow without real Google OAuth.

**Acceptance Criteria:**
- [ ] If `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` missing, use demo mode
- [ ] Demo mode simulates successful token exchange
- [ ] Demo returns mock tokens and user info
- [ ] Flow is identical from minion perspective
- [ ] Console logs indicate demo mode is active

## Functional Requirements

- FR-1: **Session Management**: Auth sessions stored with 5-minute TTL, auto-cleanup of expired sessions
- FR-2: **State Parameter**: Cryptographically secure 64-char hex state for CSRF protection and session linking
- FR-3: **Scope Support**: Minions can request specific Google scopes (Calendar, Drive, Gmail, etc.)
- FR-4: **Multi-Platform**: Support both WhatsApp and Telegram chat platforms
- FR-5: **Error Handling**: Graceful handling of user denial, timeouts, and token exchange failures
- FR-6: **Polling Protocol**: Minions poll every 2 seconds, exponential backoff recommended after 10 attempts
- FR-7: **Token Security**: Platform never logs tokens, sessions auto-delete after retrieval or timeout
- FR-8: **Environment Config**: OAuth credentials via env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_BASE_URL`)

## API Reference

### POST /api/auth/init
Initialize OAuth flow for a minion.

**Request:**
```json
{
  "minionId": "accountant-bot-001",
  "chatId": "whatsapp:+1234567890",
  "chatPlatform": "whatsapp",
  "scopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.readonly"
  ]
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

### POST /api/auth/callback
Exchange OAuth code for tokens (called by callback page).

**Request:**
```json
{
  "code": "4/0Adeu...",
  "state": "a1b2c3d4e5f6..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account connected",
  "email": "john@example.com"
}
```

### GET /api/auth/callback?state=xxx
Poll for auth status (called by minion).

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

## Non-Goals (Out of Scope)

- Microsoft/Azure AD OAuth (future feature)
- Token refresh logic (minion handles this)
- Revoking Google access (user does this in Google Account)
- Multiple Google accounts per user (one per auth flow)
- Webhook push to minions (polling only for v1)
- User dashboard to view/revoke minion access (future)

## Technical Architecture

### Components

1. **Auth Session Store** (`src/lib/server/auth.ts`)
   - In-memory Map with TTL (use Redis in production)
   - Functions: `createAuthSession`, `getAuthSession`, `completeAuthSession`, `failAuthSession`

2. **OAuth Init API** (`src/routes/api/auth/init/+server.ts`)
   - Validates minion request
   - Generates state parameter
   - Builds Google OAuth URL

3. **OAuth Callback API** (`src/routes/api/auth/callback/+server.ts`)
   - POST: Exchanges code for tokens with Google
   - GET: Returns session status for polling

4. **Callback Page** (`src/routes/auth/callback/+page.svelte`)
   - Standalone page (not using main layout)
   - Handles success/error states
   - Auto-closes or shows "Close Window" button

### Data Flow

```
Minion ──POST /api/auth/init──► Platform
  │                              │
  │◄── authUrl + state ──────────┤
  │                              │
  └──► Shares URL in chat ──────► User
                                   │
                                   ▼
                              Clicks link
                                   │
                                   ▼
                              Google OAuth
                                   │
                                   ▼
                              Redirect to /auth/callback
                                   │
                                   ▼
                              Exchanges code ──► Platform
                                   │
                                   ▼
                              Shows success UI
                                   │
Minion ◄──GET /api/auth/callback───┤ (polling)
  │
  ◄── status: 'completed' + userInfo
  │
  └──► Stores tokens, starts working
```

## Security Considerations

- **Client Secret**: Never exposed to minions or client-side code
- **State Parameter**: Prevents CSRF, links flow to specific chat session
- **Session TTL**: 5-minute expiry prevents replay attacks
- **HTTPS Only**: OAuth requires HTTPS in production
- **Scope Limiting**: Minions request minimal scopes needed
- **Token Handling**: Platform never logs tokens, minion retrieves via secure polling

## Environment Variables

```bash
# Required for production
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
PUBLIC_BASE_URL=https://minion-platform.com

# Optional (defaults shown)
# PORT=5173
# NODE_ENV=production
```

## Scopes by Minion Type

| Minion | Recommended Scopes |
|--------|-------------------|
| Accountant | `calendar`, `drive`, `gmail.readonly` |
| Real Estate | `drive`, `spreadsheets` |
| Restaurant | `calendar`, `gmail.send` |
| Schedule Master | `calendar` |
| Financial Analyst | `drive.readonly` |

## Success Metrics

- User completes OAuth flow in under 30 seconds
- Minion receives tokens within 5 seconds of user authorization
- Zero token leaks to chat platforms or logs
- Demo mode allows full testing without Google credentials

## Open Questions

1. Should we add webhook support so platform pushes to minion instead of polling?
2. Do we need rate limiting on auth init endpoint?
3. Should we support refreshing tokens via platform API?
4. How do we handle token storage encryption in minion VMs?

## Implementation Notes for Backend Team

### Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs needed (Calendar, Drive, Gmail, etc.)
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `https://your-domain.com/auth/callback`
7. Copy Client ID and Secret to environment variables

### Minion Integration Example

```typescript
// Minion VM code
async function requestGoogleAuth(userPhone: string) {
  // 1. Request OAuth URL from platform
  const init = await fetch('https://minion-platform.com/api/auth/init', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MINION_API_KEY}` },
    body: JSON.stringify({
      minionId: MINION_ID,
      chatId: userPhone,
      chatPlatform: 'whatsapp',
      scopes: ['https://www.googleapis.com/auth/calendar']
    })
  });
  
  const { state, authUrl } = await init.json();
  
  // 2. Send URL to user via WhatsApp
  await whatsapp.sendMessage(userPhone, 
    `Connect your Google Calendar: ${authUrl}`);
  
  // 3. Poll for completion
  const tokens = await pollForTokens(state);
  
  // 4. Store tokens securely
  await secureStorage.set(`tokens:${userPhone}`, tokens);
  
  // 5. Confirm to user
  await whatsapp.sendMessage(userPhone, 
    `✅ Connected! I can now access your calendar.`);
}

async function pollForTokens(state: string, maxAttempts = 150) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `https://minion-platform.com/api/auth/callback?state=${state}`
    );
    const data = await res.json();
    
    if (data.status === 'completed') {
      return data; // Contains userInfo
    }
    
    if (data.status === 'failed') {
      throw new Error(data.error);
    }
    
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Auth timeout');
}
```

### Testing the Flow

1. Start dev server: `npm run dev`
2. Without Google credentials: System runs in demo mode
3. Simulate minion request: `curl -X POST http://localhost:5173/api/auth/init ...`
4. Open returned `authUrl` in browser
5. Complete flow (simulated in demo mode)
6. Poll endpoint returns completed status

---

**Status:** Implemented ✓  
**Next Steps:** Backend team to integrate minion polling, setup Google Cloud credentials for production
