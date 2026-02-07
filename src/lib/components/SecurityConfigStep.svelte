<script lang="ts" context="module">
  // Security configuration types - exported from module context
  export type DMPolicy = 'pairing' | 'allowlist' | 'open';
  export type ChannelType = 'telegram' | 'discord' | 'whatsapp';

  export interface ChannelSecurityConfig {
    channelId: ChannelType;
    channelName: string;
    dmPolicy: DMPolicy;
    allowedUsers: string[];
    color: string;
    icon: string;
  }

  export interface SecuritySummary {
    channels: ChannelSecurityConfig[];
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  // Props
  export let isTesting = false;

  // Security configuration for selected channels
  export let securityConfig: SecuritySummary = {
    channels: []
  };

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: SecuritySummary;
  }>();

  // dmPolicy definitions with descriptions
  const dmPolicyInfo: Record<DMPolicy, { title: string; description: string; icon: string; color: string }> = {
    pairing: {
      title: 'Pairing Mode',
      description: 'Users must enter a pairing code to access the bot. This is the most secure option.',
      icon: '🔒',
      color: '#10b981'
    },
    allowlist: {
      title: 'Allowlist',
      description: 'Only specified users/numbers can access the bot. Good for private deployments.',
      icon: '📋',
      color: '#3b82f6'
    },
    open: {
      title: 'Open Access',
      description: 'Anyone can message the bot. Use with caution as this may result in unexpected usage.',
      icon: '🌐',
      color: '#f59e0b'
    }
  };

  // Channel metadata for display
  const channelMeta: Record<ChannelType, { name: string; color: string; icon: string }> = {
    telegram: {
      name: 'Telegram',
      color: '#0088cc',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.498a2.255 2.255 0 0 0-.106 4.053l3.995 1.689 1.69 3.995a2.255 2.255 0 0 0 4.053-.106l6.498-16.5a2.242 2.242 0 0 0-1.608-3.044z"/><path d="m9.5 14.5 5-5"/></svg>'
    },
    discord: {
      name: 'Discord',
      color: '#5865f2',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 9a5 5 0 0 0-5-5h-2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V9z"/><path d="M8 11v2"/><path d="M16 11v2"/><path d="M12 11v2"/></svg>'
    },
    whatsapp: {
      name: 'WhatsApp',
      color: '#25d366',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M9.5 13.5c.5 1 1.5 1 2.5 1s2-.5 2.5-1"/></svg>'
    }
  };

  // Get policy badge color
  function getPolicyColor(policy: DMPolicy): string {
    return dmPolicyInfo[policy].color;
  }

  // Get policy icon
  function getPolicyIcon(policy: DMPolicy): string {
    return dmPolicyInfo[policy].icon;
  }

  // Get policy title
  function getPolicyTitle(policy: DMPolicy): string {
    return dmPolicyInfo[policy].title;
  }

  // Check if any channel uses pairing mode
  $: hasPairingMode = securityConfig.channels.some(ch => ch.dmPolicy === 'pairing');

  // Check if any channel uses allowlist mode
  $: hasAllowlistMode = securityConfig.channels.some(ch => ch.dmPolicy === 'allowlist');

  // Check if any channel uses open mode
  $: hasOpenMode = securityConfig.channels.some(ch => ch.dmPolicy === 'open');
</script>

<div class="security-config-step" data-testid="security-config-step">
  <div class="step-header">
    <h3 class="step-title">Security Configuration</h3>
    <p class="step-description">
      Review your security settings before launching your bot.
    </p>
  </div>

  <!-- Selected Channels Summary -->
  <div class="channels-summary" data-testid="channels-summary">
    <h4 class="summary-title">Selected Channels</h4>
    <div class="channel-list">
      {#each securityConfig.channels as channel (channel.channelId)}
        <div class="channel-item" style="--channel-color: {channelMeta[channel.channelId].color}">
          <div class="channel-icon" style="color: {channelMeta[channel.channelId].color}">
            {@html channelMeta[channel.channelId].icon}
          </div>
          <div class="channel-details">
            <span class="channel-name">{channelMeta[channel.channelId].name}</span>
            <span class="channel-policy" style="--policy-color: {getPolicyColor(channel.dmPolicy)}">
              <span class="policy-icon">{getPolicyIcon(channel.dmPolicy)}</span>
              {getPolicyTitle(channel.dmPolicy)}
            </span>
          </div>
          {#if channel.dmPolicy === 'allowlist' && channel.allowedUsers.length > 0}
            <div class="allowlist-count">
              {channel.allowedUsers.length} user{channel.allowedUsers.length !== 1 ? 's' : ''}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Security Mode Explanations -->
  <div class="security-explanations">
    <h4 class="explanations-title">Security Mode Details</h4>
    
    <!-- Pairing Mode Info (if used) -->
    {#if hasPairingMode}
      <div class="info-box pairing-info" transition:fade={{ duration: isTesting ? 0 : 150 }}>
        <div class="info-icon">🔒</div>
        <div class="info-content">
          <p class="info-title">Pairing Mode</p>
          <p class="info-text">
            Users will need to enter a pairing code before they can interact with your bot. 
            This is the <strong>recommended security setting</strong> as it provides the best balance 
            of security and convenience.
          </p>
        </div>
      </div>
    {/if}

    <!-- Allowlist Mode Info (if used) -->
    {#if hasAllowlistMode}
      <div class="info-box allowlist-info" transition:fade={{ duration: isTesting ? 0 : 150 }}>
        <div class="info-icon">📋</div>
        <div class="info-content">
          <p class="info-title">Allowlist Mode</p>
          <p class="info-text">
            Only specified users can access your bot. This is ideal for private deployments 
            where you know exactly who should have access.
          </p>
        </div>
      </div>
    {/if}

    <!-- Open Mode Warning (if used) -->
    {#if hasOpenMode}
      <div class="warning-box open-warning" transition:fade={{ duration: isTesting ? 0 : 150 }}>
        <div class="warning-icon">⚠️</div>
        <div class="warning-content">
          <p class="warning-title">Open Access Mode</p>
          <p class="warning-text">
            Anyone can message your bot without any authentication. This may result in 
            unexpected usage and credit consumption. Use with caution.
          </p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Security Best Practices -->
  <div class="security-tips">
    <h4 class="tips-title">💡 Security Tips</h4>
    <ul class="tips-list">
      <li>Regularly review who has access to your bot</li>
      <li>Use strong, unique passcodes for pairing mode</li>
      <li>Monitor your bot's usage to detect any unauthorized access</li>
      <li>Consider starting with Pairing mode and switching to Allowlist once you know your users</li>
    </ul>
  </div>
</div>

<style>
  .security-config-step {
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

  /* Channels Summary */
  .channels-summary {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .summary-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  .channel-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .channel-item {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 3px solid var(--channel-color, #6366f1);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .channel-item:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    border-left-color: var(--channel-color, #6366f1);
  }

  .channel-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    flex-shrink: 0;
  }

  .channel-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .channel-name {
    font-size: 0.9375rem;
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

  .allowlist-count {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.08);
    padding: 0.25rem 0.625rem;
    border-radius: 100px;
    font-weight: 500;
  }

  /* Security Explanations */
  .security-explanations {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .explanations-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  /* Info Box */
  .info-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 12px;
  }

  .info-box.allowlist-info {
    background: rgba(59, 130, 246, 0.08);
    border-color: rgba(59, 130, 246, 0.2);
  }

  .info-icon {
    font-size: 1.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .info-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .info-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  /* Warning Box */
  .warning-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 12px;
  }

  .warning-icon {
    font-size: 1.25rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .warning-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .warning-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .warning-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  /* Security Tips */
  .security-tips {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .tips-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  .tips-list {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
  }

  .tips-list li {
    margin-bottom: 0.375rem;
  }

  .tips-list li:last-child {
    margin-bottom: 0;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .channel-item {
      flex-wrap: wrap;
    }

    .allowlist-count {
      margin-left: auto;
    }

    .security-tips {
      padding: 0.875rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .channel-item {
      transition: none !important;
    }
  }
</style>
