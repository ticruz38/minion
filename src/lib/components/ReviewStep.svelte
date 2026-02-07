<script lang="ts" context="module">
  // Review step types - exported from module context
  export type DMPolicy = 'pairing' | 'allowlist' | 'open';
  export type ChannelType = 'telegram' | 'discord' | 'whatsapp';

  export interface TelegramChannelConfig {
    token: string;
    dmPolicy: DMPolicy;
    allowedUsers: string[];
  }

  export interface DiscordChannelConfig {
    token: string;
    dmPolicy: DMPolicy;
    allowedUsers: string[];
  }

  export interface WhatsAppChannelConfig {
    phoneNumber: string;
    apiKey: string;
    webhookUrl?: string;
    dmPolicy: DMPolicy;
    allowedUsers: string[];
  }

  export interface ChannelConfigs {
    telegram?: TelegramChannelConfig;
    discord?: DiscordChannelConfig;
    whatsapp?: WhatsAppChannelConfig;
  }

  export interface ReviewData {
    botName: string;
    channels: ChannelConfigs;
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  // Props
  export let isTesting = false;
  export let reviewData: ReviewData = {
    botName: '',
    channels: {}
  };
  export let selectedMinion: { id: string; name: string; color: string } | null = null;
  export let isLaunching = false;
  export let launchError = '';
  export let userBalance = 500; // Mock balance - would come from user profile

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    launch: void;
  }>();

  // Credit constants
  const HOURLY_RATE = 95;

  // Computed values
  $: estimatedHours = Math.floor(userBalance / HOURLY_RATE);
  $: isLowBalance = userBalance < HOURLY_RATE * 2;

  // Get selected channel IDs
  $: selectedChannelIds = Object.entries(reviewData.channels)
    .filter(([, config]) => config !== undefined)
    .map(([id]) => id as ChannelType);

  // Channel metadata for display
  const channelMeta: Record<ChannelType, { name: string; color: string; icon: string; credentialLabel: string }> = {
    telegram: {
      name: 'Telegram',
      color: '#0088cc',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.498a2.255 2.255 0 0 0-.106 4.053l3.995 1.689 1.69 3.995a2.255 2.255 0 0 0 4.053-.106l6.498-16.5a2.242 2.242 0 0 0-1.608-3.044z"/><path d="m9.5 14.5 5-5"/></svg>',
      credentialLabel: 'Bot Token'
    },
    discord: {
      name: 'Discord',
      color: '#5865f2',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 9a5 5 0 0 0-5-5h-2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V9z"/><path d="M8 11v2"/><path d="M16 11v2"/><path d="M12 11v2"/></svg>',
      credentialLabel: 'Bot Token'
    },
    whatsapp: {
      name: 'WhatsApp',
      color: '#25d366',
      icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M9.5 13.5c.5 1 1.5 1 2.5 1s2-.5 2.5-1"/></svg>',
      credentialLabel: 'Phone Number'
    }
  };

  // dmPolicy display info
  const dmPolicyInfo: Record<DMPolicy, { label: string; icon: string; color: string }> = {
    pairing: { label: 'Pairing Mode', icon: '🔒', color: '#10b981' },
    allowlist: { label: 'Allowlist', icon: '📋', color: '#3b82f6' },
    open: { label: 'Open Access', icon: '🌐', color: '#f59e0b' }
  };

  // Mask credentials for display
  function maskCredential(value: string, type: 'token' | 'phone' | 'apiKey'): string {
    if (!value || value.length < 8) return '••••••••';
    
    if (type === 'token') {
      // Show last 4 characters for tokens
      return '••••••••' + value.slice(-4);
    } else if (type === 'phone') {
      // Show last 4 digits for phone numbers
      return value.slice(0, -4).replace(/./g, '•') + value.slice(-4);
    } else if (type === 'apiKey') {
      // Show first 4 and last 4 for API keys
      return value.slice(0, 4) + '••••••••' + value.slice(-4);
    }
    return '••••••••';
  }

  // Get credential display for a channel
  function getCredentialDisplay(channelId: ChannelType, config: ChannelConfigs[ChannelType]): string {
    if (!config) return '';
    
    if (channelId === 'telegram') {
      const telegramConfig = config as TelegramChannelConfig;
      return maskCredential(telegramConfig.token, 'token');
    } else if (channelId === 'discord') {
      const discordConfig = config as DiscordChannelConfig;
      return maskCredential(discordConfig.token, 'token');
    } else if (channelId === 'whatsapp') {
      const whatsappConfig = config as WhatsAppChannelConfig;
      return maskCredential(whatsappConfig.phoneNumber, 'phone');
    }
    return '';
  }

  // Get credential label for a channel
  function getCredentialLabel(channelId: ChannelType): string {
    return channelMeta[channelId].credentialLabel;
  }

  function handleLaunch() {
    dispatch('launch');
  }
</script>

<div class="review-step" data-testid="review-step">
  <div class="step-header">
    <h3 class="step-title">Review and Launch</h3>
    <p class="step-description">
      Review your configuration before launching your {selectedMinion?.name || 'bot'}.
    </p>
  </div>

  <!-- Bot Name Summary -->
  <div class="bot-name-section">
    <span class="section-label">Bot Name</span>
    <span class="bot-name-value">{reviewData.botName}</span>
  </div>

  <!-- Selected Channels Summary -->
  <div class="channels-section">
    <span class="section-label">Connected Channels ({selectedChannelIds.length})</span>
    <div class="channel-cards">
      {#each selectedChannelIds as channelId (channelId)}
        {@const meta = channelMeta[channelId]}
        {@const config = reviewData.channels[channelId]}
        {@const policy = config?.dmPolicy || 'pairing'}
        {@const policyInfo = dmPolicyInfo[policy]}
        <div 
          class="channel-card" 
          style="--channel-color: {meta.color}"
          data-testid="channel-summary-{channelId}"
        >
          <div class="card-header">
            <div class="channel-icon" style="color: {meta.color}">
              {@html meta.icon}
            </div>
            <div class="channel-info">
              <span class="channel-name">{meta.name}</span>
              <span class="channel-policy" style="--policy-color: {policyInfo.color}">
                <span class="policy-icon">{policyInfo.icon}</span>
                {policyInfo.label}
              </span>
            </div>
          </div>
          
          <div class="card-credentials">
            <span class="credential-label">{getCredentialLabel(channelId)}</span>
            <span class="credential-value" data-testid="masked-credential-{channelId}">
              {getCredentialDisplay(channelId, config)}
            </span>
          </div>

          {#if config?.allowedUsers && config.allowedUsers.length > 0}
            <div class="card-allowlist">
              <span class="allowlist-label">Allowed Users</span>
              <span class="allowlist-count">{config.allowedUsers.length} user{config.allowedUsers.length !== 1 ? 's' : ''}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Credit Cost Breakdown -->
  <div class="credits-section">
    <span class="section-label">💰 Credit Usage</span>
    <div class="credits-card">
      <div class="credits-row">
        <span class="credits-label">Hourly Rate</span>
        <span class="credits-value">{HOURLY_RATE} credits/hour</span>
      </div>
      <div class="credits-row">
        <span class="credits-label">Your Balance</span>
        <span class="credits-value" class:low-balance={isLowBalance}>{userBalance} credits</span>
      </div>
      <div class="credits-divider"></div>
      <div class="credits-row total">
        <span class="credits-label">Estimated Runtime</span>
        <span class="credits-value">~{estimatedHours} hours</span>
      </div>
    </div>
    
    {#if isLowBalance}
      <div class="warning-banner" transition:fade={{ duration: isTesting ? 0 : 200 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span>Low balance! You have less than 2 hours of runtime remaining.</span>
      </div>
    {/if}
  </div>

  <!-- Launch Error -->
  {#if launchError}
    <div class="launch-error" transition:fade={{ duration: isTesting ? 0 : 150 }} data-testid="launch-error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      {launchError}
    </div>
  {/if}

  <!-- Launch Button -->
  <button 
    class="launch-button"
    style="--btn-color: {selectedMinion?.color || '#6366f1'}"
    on:click={handleLaunch}
    disabled={isLaunching}
    data-testid="launch-button"
  >
    {#if isLaunching}
      <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
      </svg>
      Launching...
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13"></path>
        <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
      </svg>
      Launch Bot
    {/if}
  </button>
</div>

<style>
  .review-step {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .step-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .step-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  .step-description {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  /* Section Labels */
  .section-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Bot Name Section */
  .bot-name-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .bot-name-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: white;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  /* Channels Section */
  .channels-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .channel-cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .channel-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 3px solid var(--channel-color, #6366f1);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .channel-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    border-left-color: var(--channel-color, #6366f1);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
  }

  .channel-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    flex-shrink: 0;
  }

  .channel-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .channel-name {
    font-size: 1rem;
    font-weight: 600;
    color: white;
  }

  .channel-policy {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--policy-color, #6366f1);
    font-weight: 500;
  }

  .policy-icon {
    font-size: 0.875rem;
  }

  .card-credentials {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .credential-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .credential-value {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.05em;
  }

  .card-allowlist {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .allowlist-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .allowlist-count {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    background: rgba(255, 255, 255, 0.08);
    padding: 0.25rem 0.625rem;
    border-radius: 100px;
    font-weight: 500;
  }

  /* Credits Section */
  .credits-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .credits-card {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .credits-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .credits-row.total {
    padding-top: 0.625rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.1);
  }

  .credits-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .credits-value {
    font-size: 0.875rem;
    color: white;
    font-weight: 500;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .credits-value.low-balance {
    color: #f59e0b;
  }

  .credits-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
  }

  /* Warning Banner */
  .warning-banner {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 10px;
    color: #f59e0b;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .warning-banner svg {
    flex-shrink: 0;
  }

  /* Launch Error */
  .launch-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.75rem 1rem;
    border-radius: 10px;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* Launch Button */
  .launch-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, var(--btn-color, #6366f1) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 2px solid var(--btn-color, #6366f1);
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 0.5rem;
  }

  .launch-button:hover:not(:disabled) {
    background-position: 100% 0;
    box-shadow: 0 0 20px var(--btn-color, #6366f1);
    transform: translateY(-1px);
  }

  .launch-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  /* Spinner Animation */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .review-step {
      gap: 1.25rem;
    }

    .channel-card {
      padding: 0.875rem;
    }

    .channel-icon {
      width: 36px;
      height: 36px;
    }

    .credits-card {
      padding: 0.875rem;
    }

    .launch-button {
      padding: 0.875rem 1.5rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .channel-card,
    .launch-button {
      transition: none !important;
    }

    .launch-button:hover:not(:disabled) {
      transform: none;
    }

    .spinner {
      animation: none;
    }
  }
</style>
