<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type Status = 'processing' | 'success' | 'error' | 'timeout';

  let status: Status = 'processing';
  let message = 'Connecting your account...';
  let details = '';

  const statusConfig = {
    processing: {
      icon: '⏳',
      title: 'Connecting your account...',
      color: '#6366f1'
    },
    success: {
      icon: '✅',
      title: 'Account connected!',
      color: '#10b981'
    },
    error: {
      icon: '❌',
      title: 'Connection failed',
      color: '#ef4444'
    },
    timeout: {
      icon: '⏰',
      title: 'Connection timed out',
      color: '#f59e0b'
    }
  };

  onMount(async () => {
    const code = $page.url.searchParams.get('code');
    const state = $page.url.searchParams.get('state');
    const error = $page.url.searchParams.get('error');
    const errorDescription = $page.url.searchParams.get('error_description');

    // If user denied or error occurred
    if (error) {
      status = 'error';
      message = `Authorization failed: ${error}`;
      details = errorDescription || 'Please try again or contact support.';
      await notifyBackend({ success: false, state, error, errorDescription });
      return;
    }

    // Missing required params
    if (!code || !state) {
      status = 'error';
      message = 'Invalid request';
      details = 'Missing required parameters. Please try again.';
      return;
    }

    try {
      // Send auth code to backend
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });

      const result = await response.json();

      if (result.success) {
        status = 'success';
        message = 'Your Google account has been connected successfully!';
        details = 'You can now close this page and return to your chat.';
      } else {
        status = 'error';
        message = result.message || 'Failed to connect account';
        details = result.details || 'Please try again or contact support.';
      }
    } catch (err) {
      status = 'error';
      message = 'Connection error';
      details = 'Unable to reach the server. Please try again.';
    }

    // Notify backend even on error so minion can clean up
    if (status !== 'success') {
      await notifyBackend({ success: false, state, error: message });
    }
  });

  async function notifyBackend(data: Record<string, unknown>) {
    try {
      await fetch('/api/auth/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch {
      // Silent fail - backend might be down
    }
  }

  function closeWindow() {
    if (window.opener) {
      window.close();
    } else {
      // If not opened as popup, redirect to home
      window.location.href = '/';
    }
  }
</script>

<svelte:head>
  <title>Account Connection | Minion</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="callback-page" style="--status-color: {statusConfig[status].color}">
  <div class="card">
    <div class="icon" style="color: {statusConfig[status].color}">
      {statusConfig[status].icon}
    </div>
    
    <h1>{statusConfig[status].title}</h1>
    
    <p class="message">{message}</p>
    
    {#if details}
      <p class="details">{details}</p>
    {/if}

    {#if status !== 'processing'}
      <button class="btn btn-primary" on:click={closeWindow}>
        {window.opener ? 'Close Window' : 'Go Home'}
      </button>
    {/if}

    {#if status === 'success'}
      <div class="minion-message">
        <span class="minion-icon">🤖</span>
        <p>Your Minion will message you shortly!</p>
      </div>
    {/if}
  </div>

  <footer>
    <p>Powered by <span class="brand">Minion</span></p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
    font-family: system-ui, -apple-system, sans-serif;
  }

  .callback-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
  }

  .card {
    background: rgba(26, 26, 37, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 3rem;
    max-width: 420px;
    width: 100%;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  h1 {
    color: #f1f5f9;
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
  }

  .message {
    color: #94a3b8;
    font-size: 1.125rem;
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
  }

  .details {
    color: #64748b;
    font-size: 0.9375rem;
    margin: 0 0 2rem 0;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
    width: 100%;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
  }

  .minion-message {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .minion-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 0.75rem;
  }

  .minion-message p {
    color: #64748b;
    font-size: 0.9375rem;
    margin: 0;
  }

  footer {
    margin-top: 2rem;
    color: #64748b;
    font-size: 0.875rem;
  }

  .brand {
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }
</style>
