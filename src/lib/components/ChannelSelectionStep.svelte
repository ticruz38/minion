<script lang="ts" context="module">
  // Channel types - exported from module context
  export type ChannelType = 'telegram' | 'discord' | 'whatsapp';

  export interface ChannelSelection {
    telegram: boolean;
    discord: boolean;
    whatsapp: boolean;
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  // Props
  export let isTesting = false;

  // Selected channels (bindable)
  export let selectedChannels: ChannelSelection = {
    telegram: false,
    discord: false,
    whatsapp: false
  };

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: ChannelSelection;
  }>();

  // Channel definitions with metadata
  const channels: { id: ChannelType; name: string; icon: string; description: string; color: string }[] = [
    {
      id: 'telegram',
      name: 'Telegram',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.498a2.255 2.255 0 0 0-.106 4.053l3.995 1.689 1.69 3.995a2.255 2.255 0 0 0 4.053-.106l6.498-16.5a2.242 2.242 0 0 0-1.608-3.044z"/><path d="m9.5 14.5 5-5"/></svg>`,
      description: 'Connect your Telegram bot via BotFather',
      color: '#0088cc'
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 9a5 5 0 0 0-5-5h-2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V9z"/><path d="M8 11v2"/><path d="M16 11v2"/><path d="M12 11v2"/></svg>`,
      description: 'Integrate with Discord servers and DMs',
      color: '#5865f2'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M9.5 13.5c.5 1 1.5 1 2.5 1s2-.5 2.5-1"/></svg>`,
      description: 'WhatsApp Business API integration',
      color: '#25d366'
    }
  ];

  // Computed: number of selected channels
  $: selectedCount = Object.values(selectedChannels).filter(Boolean).length;

  // Computed: at least one channel is selected
  $: isValid = selectedCount > 0;

  // Toggle channel selection
  function toggleChannel(channelId: ChannelType) {
    selectedChannels = {
      ...selectedChannels,
      [channelId]: !selectedChannels[channelId]
    };
    dispatch('change', selectedChannels);
  }

  // Handle card click (toggle selection)
  function handleCardClick(channelId: ChannelType) {
    toggleChannel(channelId);
  }

  // Handle checkbox click (prevent event bubbling)
  function handleCheckboxClick(e: MouseEvent, channelId: ChannelType) {
    e.stopPropagation();
    toggleChannel(channelId);
  }

  // Handle keyboard navigation
  function handleKeyDown(e: KeyboardEvent, channelId: ChannelType) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleChannel(channelId);
    }
  }
</script>

<div class="channel-selection-step" data-testid="channel-selection-step">
  <div class="step-header">
    <h3 class="step-title">Select Channels</h3>
    <p class="step-description">
      Choose which messaging platforms your bot will connect to. You can select multiple channels.
    </p>
  </div>

  <!-- Channel Grid -->
  <div class="channel-grid" role="group" aria-label="Select messaging channels">
    {#each channels as channel (channel.id)}
      <div
        class="channel-card"
        class:selected={selectedChannels[channel.id]}
        class:unselected={!selectedChannels[channel.id]}
        on:click={() => handleCardClick(channel.id)}
        on:keydown={(e) => handleKeyDown(e, channel.id)}
        role="checkbox"
        aria-checked={selectedChannels[channel.id]}
        aria-label={`${channel.name} - ${channel.description}`}
        tabindex="0"
        style="--channel-color: {channel.color}"
        transition:fade={{ duration: isTesting ? 0 : 150 }}
        data-testid="channel-card-{channel.id}"
      >
        <!-- Checkbox -->
        <div class="card-checkbox" aria-hidden="true">
          <div class="checkbox-box" class:checked={selectedChannels[channel.id]}>
            {#if selectedChannels[channel.id]}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            {/if}
          </div>
        </div>

        <!-- Icon -->
        <div class="card-icon" style="color: {channel.color}">
          {@html channel.icon}
        </div>

        <!-- Content -->
        <div class="card-content">
          <span class="card-name">{channel.name}</span>
          <span class="card-description">{channel.description}</span>
        </div>
      </div>
    {/each}
  </div>

  <!-- Selection Summary -->
  <div class="selection-summary" class:has-selection={selectedCount > 0}>
    <div class="summary-icon" aria-hidden="true">
      {#if selectedCount === 0}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      {:else}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      {/if}
    </div>
    <span class="summary-text" data-testid="selection-summary">
      {#if selectedCount === 0}
        Select at least one channel to continue
      {:else if selectedCount === 1}
        Selected: 1 channel
      {:else}
        Selected: {selectedCount} channels
      {/if}
    </span>
    {#if selectedCount > 0}
      <span class="summary-chips" aria-label="Selected channels">
        {#each channels.filter(c => selectedChannels[c.id]) as channel}
          <span class="channel-chip" style="--chip-color: {channel.color}">
            {channel.name}
          </span>
        {/each}
      </span>
    {/if}
  </div>

  <!-- Validation Message -->
  {#if selectedCount === 0}
    <div class="validation-message" role="alert" transition:fade={{ duration: isTesting ? 0 : 150 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      Please select at least one messaging channel
    </div>
  {/if}
</div>

<style>
  .channel-selection-step {
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

  /* Channel Grid */
  .channel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  /* Channel Card */
  .channel-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    padding: 1.5rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .channel-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }

  .channel-card:focus {
    outline: none;
    border-color: var(--channel-color, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .channel-card.selected {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--channel-color, #6366f1);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--channel-color, #6366f1);
  }

  .channel-card.selected:hover {
    border-color: var(--channel-color, #6366f1);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--channel-color, #6366f1), 0 0 20px var(--channel-color, #6366f1);
  }

  /* Checkbox */
  .card-checkbox {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
  }

  .checkbox-box {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .checkbox-box.checked {
    background: var(--channel-color, #6366f1);
    border-color: var(--channel-color, #6366f1);
    color: white;
  }

  .channel-card.selected .checkbox-box {
    border-color: var(--channel-color, #6366f1);
  }

  /* Card Icon */
  .card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    transition: all 0.2s ease;
  }

  .channel-card:hover .card-icon {
    background: rgba(255, 255, 255, 0.08);
    transform: scale(1.05);
  }

  .channel-card.selected .card-icon {
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 20px var(--channel-color, #6366f1);
  }

  /* Card Content */
  .card-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-name {
    font-size: 1rem;
    font-weight: 600;
    color: white;
  }

  .card-description {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }

  /* Selection Summary */
  .selection-summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    flex-wrap: wrap;
  }

  .selection-summary.has-selection {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
  }

  .summary-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.5);
  }

  .selection-summary.has-selection .summary-icon {
    color: #10b981;
  }

  .summary-text {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 500;
  }

  .selection-summary.has-selection .summary-text {
    color: #10b981;
  }

  .summary-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .channel-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    background: var(--chip-color, #6366f1);
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 100px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Validation Message */
  .validation-message {
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

  /* Tablet - 2 columns */
  @media (max-width: 768px) {
    .channel-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .channel-card {
      padding: 1.25rem 0.75rem;
    }

    .card-icon {
      width: 56px;
      height: 56px;
    }

    .card-name {
      font-size: 0.9375rem;
    }

    .card-description {
      font-size: 0.6875rem;
    }

    .selection-summary {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .summary-chips {
      margin-left: 0;
      width: 100%;
    }
  }

  /* Mobile - 1 column */
  @media (max-width: 480px) {
    .channel-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }

    .channel-card {
      flex-direction: row;
      text-align: left;
      padding: 1rem;
      gap: 1rem;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .card-content {
      flex: 1;
    }

    .card-checkbox {
      position: static;
      order: -1;
    }

    .checkbox-box {
      width: 20px;
      height: 20px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .channel-card,
    .checkbox-box,
    .card-icon {
      transition: none !important;
    }

    .channel-card:hover {
      transform: none;
    }
  }
</style>
