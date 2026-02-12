<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { fade, scale, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  
  interface Bot {
    bot_id: string;
    vm_id: string;
    team_id: string;
    status: 'running' | 'stopped' | 'error' | string;
    config: {
      name: string;
      channels: {
        telegram?: { enabled: boolean };
        discord?: { enabled: boolean };
        whatsapp?: { enabled: boolean };
      };
    };
    profiles: string[];
    created_at: string;
    credits?: string;
    credits_updated_at?: string;
    hasTelegram: boolean;
    hasDiscord: boolean;
    hasWhatsApp: boolean;
    displayName: string;
    minionType: string;
  }
  
  interface Team {
    team_id: string;
    name: string;
    credits: number;
  }
  
  interface Stats {
    totalBots: number;
    runningBots: number;
    stoppedBots: number;
    errorBots: number;
  }
  
  // Minion colors mapping - muted pastels
  const minionColors: Record<string, string> = {
    accountant: '#7BA38F',
    secretary: '#7A9EB8',
    trader: '#A69060',
    realtor: '#C9A227',
    analyst: '#8B7BA3',
    restaurant: '#C17A5C',
    support: '#B87A9E',
    'content-creator': '#C97A7A',
    'invoice-chaser': '#A69060',
    'receipt-tracker': '#6BA090',
    researcher: '#6B8BA3',
    'email-handler': '#7AA3B8',
    'gift-guru': '#9E7AB8',
    'meal-planner': '#7BA38F',
    handyman: '#B8A67A',
    'trip-planner': '#B87A9E',
  };
  
  const minionNames: Record<string, string> = {
    accountant: 'Benny',
    secretary: 'Terry',
    trader: 'Troy',
    realtor: 'Owen',
    analyst: 'Barry',
    restaurant: 'Sergio',
    support: 'Tim',
    'content-creator': 'Casey',
    'invoice-chaser': 'Chase',
    'receipt-tracker': 'Rex',
    researcher: 'Russ',
    'email-handler': 'Ian',
    'gift-guru': 'Gigi',
    'meal-planner': 'Chip',
    handyman: 'Hank',
    'trip-planner': 'Tina',
  };
  
  $: teamId = $page.params.id;
  
  let team: Team | null = null;
  let bots: Bot[] = [];
  let stats: Stats = { totalBots: 0, runningBots: 0, stoppedBots: 0, errorBots: 0 };
  let loading = true;
  let error = '';
  
  let actionInProgress: Record<string, boolean> = {};
  let showAddCredits = false;
  let creditsToAdd = 100;
  let addingCredits = false;
  
  let showToast = false;
  let toastMessage = '';
  let toastType: 'success' | 'error' = 'success';
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;
  
  onMount(() => {
    loadTeamData();
  });
  
  async function loadTeamData() {
    loading = true;
    error = '';
    
    try {
      const response = await fetch(`/api/team/${teamId}`);
      const data = await response.json();
      
      if (data.success) {
        team = data.team;
        bots = data.bots;
        stats = data.stats;
      } else {
        error = data.message || 'Failed to load team data';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Network error';
    } finally {
      loading = false;
    }
  }
  
  function showNotification(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastMessage = message;
    toastType = type;
    showToast = true;
    
    toastTimeout = setTimeout(() => {
      showToast = false;
    }, 5000);
  }
  
  async function handleStartBot(botId: string) {
    actionInProgress = { ...actionInProgress, [botId]: true };
    
    try {
      const response = await fetch(`/api/bots/${botId}/start`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Bot started successfully');
        await loadTeamData();
      } else {
        showNotification(data.message || 'Failed to start bot', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    } finally {
      actionInProgress = { ...actionInProgress, [botId]: false };
    }
  }
  
  async function handleStopBot(botId: string) {
    actionInProgress = { ...actionInProgress, [botId]: true };
    
    try {
      const response = await fetch(`/api/bots/${botId}/stop`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Bot stopped successfully');
        await loadTeamData();
      } else {
        showNotification(data.message || 'Failed to stop bot', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    } finally {
      actionInProgress = { ...actionInProgress, [botId]: false };
    }
  }
  
  async function handleDeleteBot(botId: string) {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }
    
    actionInProgress = { ...actionInProgress, [botId]: true };
    
    try {
      const response = await fetch(`/api/bots/${botId}/delete`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        showNotification('Bot deleted successfully');
        await loadTeamData();
      } else {
        showNotification(data.message || 'Failed to delete bot', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    } finally {
      actionInProgress = { ...actionInProgress, [botId]: false };
    }
  }
  
  async function handleAddCredits() {
    if (creditsToAdd <= 0) return;
    
    addingCredits = true;
    
    try {
      const response = await fetch(`/api/team/${teamId}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: creditsToAdd })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (team) team.credits = data.new_balance;
        showNotification(`Added ${creditsToAdd} credits`);
        showAddCredits = false;
        creditsToAdd = 100;
      } else {
        showNotification(data.message || 'Failed to add credits', 'error');
      }
    } catch (err) {
      showNotification('Network error', 'error');
    } finally {
      addingCredits = false;
    }
  }
  
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'running': return '#7BA38F';
      case 'stopped': return '#C9A227';
      case 'error': return '#C17A5C';
      default: return '#9AA5B1';
    }
  }
  
  function getMinionColor(type: string): string {
    return minionColors[type] || '#6B7B8C';
  }
  
  function getMinionName(type: string): string {
    return minionNames[type] || type;
  }
</script>

<svelte:head>
  <title>{team?.name || 'Team'} | Minion Dashboard</title>
</svelte:head>

<div class="page">
  <!-- Header -->
  <header class="header">
    <div class="header-content">
      <a href="/" class="brand">
        <span class="brand-logo">🤖</span>
        <span class="brand-name">Minion</span>
      </a>
      <a href="/" class="btn btn-ghost">← Back to Home</a>
    </div>
  </header>

  <main class="main">
    {#if loading}
      <div class="loading-state" in:fade>
        <div class="spinner"></div>
        <p>Loading team dashboard...</p>
      </div>
    {:else if error}
      <div class="error-state" in:fade>
        <div class="error-icon">⚠️</div>
        <h2>Failed to Load</h2>
        <p>{error}</p>
        <button class="btn btn-primary" on:click={loadTeamData}>Retry</button>
      </div>
    {:else if team}
      <!-- Team Header -->
      <div class="team-header" in:fade>
        <div class="team-info">
          <h1 class="team-name">{team.name}</h1>
          <span class="team-id">Team ID: {team.team_id}</span>
        </div>
        
        <div class="credits-card">
          <div class="credits-info">
            <span class="credits-label">Available Credits</span>
            <span class="credits-value">{team.credits.toLocaleString()}</span>
          </div>
          <button class="btn btn-primary" on:click={() => showAddCredits = true}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Credits
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid" in:fade={{ delay: 100 }}>
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(107, 123, 140, 0.1); color: #6B7B8C;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{stats.totalBots}</span>
            <span class="stat-label">Total Bots</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(123, 163, 143, 0.15); color: #5C8A73;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{stats.runningBots}</span>
            <span class="stat-label">Running</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(201, 162, 39, 0.15); color: #A88220;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{stats.stoppedBots}</span>
            <span class="stat-label">Stopped</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: rgba(193, 122, 92, 0.15); color: #A66042;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stat-info">
            <span class="stat-value">{stats.errorBots}</span>
            <span class="stat-label">Errors</span>
          </div>
        </div>
      </div>

      <!-- Bots Section -->
      <div class="bots-section" in:fade={{ delay: 200 }}>
        <div class="section-header">
          <h2>Your Bots</h2>
          <a href="/minions" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Hire New Bot
          </a>
        </div>

        {#if bots.length === 0}
          <div class="empty-state">
            <div class="empty-icon">🤖</div>
            <h3>No Bots Yet</h3>
            <p>Get started by hiring your first AI assistant</p>
            <a href="/minions" class="btn btn-primary">Browse Minions</a>
          </div>
        {:else}
          <div class="bots-list">
            {#each bots as bot (bot.bot_id)}
              <div class="bot-card" transition:slide={{ duration: 300 }}>
                <div class="bot-header">
                  <div class="bot-identity">
                    <div 
                      class="minion-avatar" 
                      style="background: {getMinionColor(bot.minionType)}15; color: {getMinionColor(bot.minionType)}; border-color: {getMinionColor(bot.minionType)}40"
                    >
                      {getMinionName(bot.minionType).charAt(0)}
                    </div>
                    <div class="bot-details">
                      <h3 class="bot-name">{bot.displayName}</h3>
                      <span class="bot-type">{getMinionName(bot.minionType)} • {bot.minionType}</span>
                    </div>
                  </div>
                  
                  <div class="bot-status">
                    <span class="status-badge" style="--status-color: {getStatusColor(bot.status)}">
                      <span class="status-dot"></span>
                      {bot.status}
                    </span>
                  </div>
                </div>

                <div class="bot-meta">
                  <div class="meta-item">
                    <span class="meta-label">Bot ID</span>
                    <span class="meta-value">{bot.bot_id}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">VM</span>
                    <span class="meta-value">{bot.vm_id}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">Created</span>
                    <span class="meta-value">{formatDate(bot.created_at)}</span>
                  </div>
                  {#if bot.credits}
                    <div class="meta-item credits">
                      <span class="meta-label">Credits</span>
                      <span class="meta-value credits-value">{parseInt(bot.credits, 10).toLocaleString()}</span>
                    </div>
                  {/if}
                </div>

                <div class="bot-channels">
                  <span class="channels-label">Channels:</span>
                  <div class="channel-tags">
                    {#if bot.hasTelegram}
                      <span class="channel-tag telegram">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.498a2.255 2.255 0 0 0-.106 4.053l3.995 1.689 1.69 3.995a2.255 2.255 0 0 0 4.053-.106l6.498-16.5a2.242 2.242 0 0 0-1.608-3.044z"/>
                        </svg>
                        Telegram
                      </span>
                    {/if}
                    {#if bot.hasDiscord}
                      <span class="channel-tag discord">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M18 9a5 5 0 0 0-5-5h-2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V9z"/>
                          <path d="M8 11v2"/><path d="M16 11v2"/><path d="M12 11v2"/>
                        </svg>
                        Discord
                      </span>
                    {/if}
                    {#if bot.hasWhatsApp}
                      <span class="channel-tag whatsapp">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/>
                        </svg>
                        WhatsApp
                      </span>
                    {/if}
                    {#if !bot.hasTelegram && !bot.hasDiscord && !bot.hasWhatsApp}
                      <span class="channel-tag none">No channels</span>
                    {/if}
                  </div>
                </div>

                <div class="bot-actions">
                  {#if bot.status === 'running'}
                    <button 
                      class="btn btn-secondary"
                      on:click={() => handleStopBot(bot.bot_id)}
                      disabled={actionInProgress[bot.bot_id]}
                    >
                      {#if actionInProgress[bot.bot_id]}
                        <span class="spinner-sm"></span>
                      {:else}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="6" y="4" width="4" height="16"></rect>
                          <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                      {/if}
                      Stop
                    </button>
                  {:else}
                    <button 
                      class="btn btn-primary"
                      on:click={() => handleStartBot(bot.bot_id)}
                      disabled={actionInProgress[bot.bot_id]}
                    >
                      {#if actionInProgress[bot.bot_id]}
                        <span class="spinner-sm"></span>
                      {:else}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      {/if}
                      Start
                    </button>
                  {/if}
                  
                  <button 
                    class="btn btn-danger"
                    on:click={() => handleDeleteBot(bot.bot_id)}
                    disabled={actionInProgress[bot.bot_id]}
                  >
                    {#if actionInProgress[bot.bot_id]}
                      <span class="spinner-sm"></span>
                    {:else}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    {/if}
                    Delete
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<!-- Add Credits Modal -->
{#if showAddCredits}
  <div 
    class="modal-overlay"
    on:click|self={() => showAddCredits = false}
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="modal-container"
      transition:scale={{ duration: 300, start: 0.95, easing: cubicOut }}
    >
      <div class="modal-header">
        <h3>Add Credits</h3>
        <button class="close-btn" on:click={() => showAddCredits = false}>×</button>
      </div>
      
      <div class="modal-body">
        <p class="modal-description">
          Add credits to your team account. Credits are used to run your bots.
        </p>
        
        <div class="credits-presets">
          {#each [100, 500, 1000, 5000] as amount}
            <button 
              class="preset-btn"
              class:active={creditsToAdd === amount}
              on:click={() => creditsToAdd = amount}
            >
              {amount.toLocaleString()}
            </button>
          {/each}
        </div>
        
        <div class="form-group">
          <label for="custom-amount">Custom Amount</label>
          <input 
            type="number" 
            id="custom-amount"
            class="form-input"
            bind:value={creditsToAdd}
            min="1"
            max="100000"
          />
        </div>
        
        <div class="credit-info">
          <div class="info-row">
            <span>Current Balance</span>
            <span>{team?.credits.toLocaleString() || 0}</span>
          </div>
          <div class="info-row total">
            <span>New Balance</span>
            <span>{((team?.credits || 0) + creditsToAdd).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={() => showAddCredits = false}>
          Cancel
        </button>
        <button 
          class="btn btn-primary"
          on:click={handleAddCredits}
          disabled={addingCredits || creditsToAdd <= 0}
        >
          {#if addingCredits}
            <span class="spinner-sm"></span>
            Adding...
          {:else}
            Add {creditsToAdd.toLocaleString()} Credits
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if showToast}
  <div 
    class="toast-notification"
    class:error={toastType === 'error'}
    transition:scale={{ duration: 300, start: 0.9 }}
  >
    <div class="toast-icon">{toastType === 'success' ? '✓' : '⚠'}</div>
    <p>{toastMessage}</p>
  </div>
{/if}

<style>
  :global(body) {
    background: #F7F5F0;
    color: #2C3E50;
  }

  .page {
    min-height: 100vh;
    background: #F7F5F0;
  }

  /* Header */
  .header {
    background: #FAF9F6;
    border-bottom: 1px solid #E5E1D8;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
  }

  .brand-logo {
    font-size: 1.5rem;
  }

  .brand-name {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2C3E50;
    font-family: 'Space Grotesk', sans-serif;
  }

  /* Main Content */
  .main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* Loading & Error States */
  .loading-state,
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    gap: 1rem;
    color: #5A6B7C;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #E5E1D8;
    border-top-color: #D4A853;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner-sm {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-state h2 {
    color: #2C3E50;
  }

  /* Team Header */
  .team-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .team-name {
    font-size: 2rem;
    font-weight: 700;
    color: #2C3E50;
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
  }

  .team-id {
    font-size: 0.875rem;
    color: #9AA5B1;
    font-family: 'JetBrains Mono', monospace;
  }

  .credits-card {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background: #FAF9F6;
    border: 1px solid #E5E1D8;
    border-radius: 16px;
    padding: 1rem 1.5rem;
  }

  .credits-info {
    display: flex;
    flex-direction: column;
  }

  .credits-label {
    font-size: 0.75rem;
    color: #9AA5B1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .credits-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2C3E50;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-card {
    background: #FAF9F6;
    border: 1px solid #E5E1D8;
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #2C3E50;
  }

  .stat-label {
    font-size: 0.875rem;
    color: #9AA5B1;
  }

  /* Bots Section */
  .bots-section {
    background: #FAF9F6;
    border: 1px solid #E5E1D8;
    border-radius: 20px;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #2C3E50;
    margin: 0;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h3 {
    font-size: 1.25rem;
    color: #2C3E50;
    margin: 0 0 0.5rem;
  }

  .empty-state p {
    color: #9AA5B1;
    margin: 0 0 1.5rem;
  }

  /* Bots List */
  .bots-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .bot-card {
    background: #FFFFFF;
    border: 1px solid #E5E1D8;
    border-radius: 16px;
    padding: 1.25rem;
    transition: all 0.2s ease;
  }

  .bot-card:hover {
    box-shadow: 0 4px 12px rgba(44, 62, 80, 0.08);
    border-color: #D4C4A8;
  }

  .bot-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .bot-identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .minion-avatar {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 2px solid;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
  }

  .bot-details {
    display: flex;
    flex-direction: column;
  }

  .bot-name {
    font-size: 1rem;
    font-weight: 600;
    color: #2C3E50;
    margin: 0;
  }

  .bot-type {
    font-size: 0.75rem;
    color: #9AA5B1;
  }

  .status-badge {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid #E5E1D8;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;
    color: var(--status-color);
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-color);
  }

  .bot-meta {
    display: flex;
    gap: 1.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #F7F5F0;
    border-radius: 10px;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .meta-label {
    font-size: 0.625rem;
    color: #9AA5B1;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .meta-value {
    font-size: 0.75rem;
    color: #5A6B7C;
    font-family: 'JetBrains Mono', monospace;
  }

  .meta-item.credits .meta-label {
    color: #7A9EB8;
  }

  .meta-value.credits-value {
    color: #7A9EB8;
    font-weight: 600;
  }

  .bot-channels {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .channels-label {
    font-size: 0.75rem;
    color: #9AA5B1;
  }

  .channel-tags {
    display: flex;
    gap: 0.5rem;
  }

  .channel-tag {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .channel-tag.telegram {
    background: rgba(122, 158, 184, 0.12);
    color: #5A7E98;
  }

  .channel-tag.discord {
    background: rgba(139, 123, 163, 0.12);
    color: #6B5B83;
  }

  .channel-tag.whatsapp {
    background: rgba(123, 163, 143, 0.12);
    color: #5C8A73;
  }

  .channel-tag.none {
    background: rgba(154, 165, 177, 0.12);
    color: #9AA5B1;
  }

  .bot-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
    color: #2C3E50;
    box-shadow: 0 4px 14px rgba(212, 168, 83, 0.3);
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(212, 168, 83, 0.4);
  }

  .btn-secondary {
    background: #F7F5F0;
    color: #5A6B7C;
    border: 1.5px solid #E5E1D8;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #F0EDE6;
    border-color: #D4C4A8;
    color: #2C3E50;
  }

  .btn-danger {
    background: rgba(193, 122, 92, 0.1);
    color: #C17A5C;
    border: 1.5px solid rgba(193, 122, 92, 0.2);
  }

  .btn-danger:hover:not(:disabled) {
    background: rgba(193, 122, 92, 0.2);
    border-color: rgba(193, 122, 92, 0.3);
  }

  .btn-ghost {
    background: transparent;
    color: #5A6B7C;
    padding: 0.5rem 0.75rem;
  }

  .btn-ghost:hover {
    color: #2C3E50;
    background: rgba(0,0,0,0.03);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(44, 62, 80, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    width: 100%;
    max-width: 420px;
    background: #FAF9F6;
    border: 1px solid #E5E1D8;
    border-radius: 20px;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-bottom: 1px solid #E5E1D8;
  }

  .modal-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #2C3E50;
    margin: 0;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F7F5F0;
    border: 1px solid #E5E1D8;
    border-radius: 8px;
    color: #9AA5B1;
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #F0EDE6;
    color: #5A6B7C;
  }

  .modal-body {
    padding: 1.25rem;
  }

  .modal-description {
    color: #5A6B7C;
    font-size: 0.875rem;
    margin: 0 0 1.25rem;
    line-height: 1.5;
  }

  .credits-presets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .preset-btn {
    padding: 0.75rem;
    background: #F7F5F0;
    border: 1px solid #E5E1D8;
    border-radius: 10px;
    color: #5A6B7C;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .preset-btn:hover,
  .preset-btn.active {
    background: rgba(212, 168, 83, 0.15);
    border-color: #D4A853;
    color: #2C3E50;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.75rem;
    color: #9AA5B1;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: #FFFFFF;
    border: 1px solid #E5E1D8;
    border-radius: 10px;
    color: #2C3E50;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }

  .form-input:focus {
    border-color: #D4A853;
    box-shadow: 0 0 0 3px rgba(212, 168, 83, 0.1);
  }

  .credit-info {
    background: #F7F5F0;
    border-radius: 10px;
    padding: 1rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #5A6B7C;
    margin-bottom: 0.5rem;
  }

  .info-row.total {
    font-weight: 600;
    color: #2C3E50;
    padding-top: 0.5rem;
    border-top: 1px solid #E5E1D8;
    margin-top: 0.5rem;
    margin-bottom: 0;
  }

  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1.25rem;
    border-top: 1px solid #E5E1D8;
    background: #FFFFFF;
  }

  .modal-footer .btn {
    flex: 1;
  }

  /* Toast */
  .toast-notification {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    background: #7BA38F;
    border-radius: 12px;
    color: white;
    font-weight: 500;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    z-index: 2000;
  }

  .toast-notification.error {
    background: #C17A5C;
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    font-weight: 700;
  }

  .toast-notification p {
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 600px) {
    .main {
      padding: 1rem;
    }

    .team-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .credits-card {
      width: 100%;
      justify-content: space-between;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }

    .bot-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .bot-meta {
      flex-wrap: wrap;
    }

    .bot-channels {
      flex-direction: column;
      align-items: flex-start;
    }

    .credits-presets {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
