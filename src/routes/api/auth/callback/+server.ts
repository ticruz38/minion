import { json, type RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { getAuthSession, completeAuthSession, failAuthSession } from '$lib/server/auth';

/**
 * POST /api/auth/callback
 * 
 * Exchanges OAuth code for tokens and stores session.
 * Called by the callback page after user authorizes.
 */
export const POST: RequestHandler = async ({ request, fetch }) => {
  try {
    const { code, state } = await request.json();

    if (!code || !state) {
      throw error(400, 'Missing code or state');
    }

    // Verify this state exists (was created by a minion)
    const session = getAuthSession(state);
    if (!session) {
      throw error(400, 'Invalid or expired session');
    }

    // Exchange code for tokens with Google
    // NOTE: In production, these should be environment variables
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
    const REDIRECT_URI = `${process.env.PUBLIC_BASE_URL || 'http://localhost:5173'}/auth/callback`;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      // For demo/development - simulate success
      console.log('[Auth] Demo mode - simulating token exchange');
      
      completeAuthSession(state, {
        tokens: {
          access_token: 'demo_token_' + Date.now(),
          refresh_token: 'demo_refresh_' + Date.now(),
          expires_in: 3600
        },
        userInfo: {
          email: 'user@example.com',
          name: 'Demo User'
        }
      });

      return json({ 
        success: true, 
        message: 'Account connected (demo mode)',
        access_token: 'demo_token_' + Date.now(),
        refresh_token: 'demo_refresh_' + Date.now(),
        expires_in: 3600
      });
    }

    // Real token exchange with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.error_description || 'Token exchange failed');
    }

    const tokenData = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    const userInfo = await userResponse.json();

    // Store completed session
    completeAuthSession(state, {
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      },
      userInfo: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      }
    });

    return json({ 
      success: true, 
      message: 'Account connected',
      email: userInfo.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });

  } catch (err) {
    console.error('[Auth Callback Error]', err);
    
    return json({
      success: false,
      message: err instanceof Error ? err.message : 'Authentication failed'
    }, { status: 500 });
  }
};

/**
 * GET /api/auth/callback?state=xxx
 * 
 * For minions to check if auth is complete (polling endpoint).
 * Minions poll this until they get a completed/failed status.
 */
export const GET: RequestHandler = async ({ url }) => {
  const state = url.searchParams.get('state');
  
  if (!state) {
    throw error(400, 'Missing state parameter');
  }

  const session = getAuthSession(state);
  
  if (!session) {
    throw error(404, 'Session not found or expired');
  }

  // Return session status (minion will poll until completed/failed)
  // Include tokens if session is completed
  const response: Record<string, unknown> = {
    status: session.status,
    userInfo: session.userInfo,
    error: session.error
  };

  if (session.status === 'completed' && session.tokens) {
    response.access_token = session.tokens.access_token;
    response.refresh_token = session.tokens.refresh_token;
    response.expires_in = session.tokens.expires_in;
  }

  return json(response);
};
