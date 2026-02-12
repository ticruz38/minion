<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { minions, type Minion } from '$lib/minions-data';
  import MinionAvatar3D from './MinionAvatar3D.svelte';
  import VMProgressModal from './VMProgressModal.svelte';

  export let minion: Minion;
  export let isOpen = false;

  const dispatch = createEventDispatcher<{
    close: void;
    success: { botName: string; vmId?: string };
  }>();

  // Form state
  let step: 'info' | 'name' | 'channel' | 'config' | 'review' | 'progress' = 'info';
  
  // Helper for progress bar states
  $: isPostChannel = step === 'review' || step === 'progress';
  $: isChannelOrLater = step === 'channel' || step === 'config' || step === 'review' || step === 'progress';
  let botName = '';
  let selectedChannel: 'whatsapp' | 'telegram' | 'discord' | null = null;
  let phoneNumber = '';
  let isLaunching = false;
  let createdBotId = '';
  let progressModalComponent: VMProgressModal;
  let launchError = '';

  // Validation
  $: isNameValid = botName.length >= 3 && botName.length <= 30 && /^[a-zA-Z0-9-]+$/.test(botName);
  $: isPhoneValid = selectedChannel === 'whatsapp' ? phoneNumber.length >= 8 : true;
  $: canLaunch = isNameValid && selectedChannel && isPhoneValid;

  function handleClose() {
    if (step === 'progress') return; // Don't close during progress
    resetForm();
    dispatch('close');
  }

  function resetForm() {
    step = 'info';
    botName = '';
    selectedChannel = null;
    phoneNumber = '';
    isLaunching = false;
    createdBotId = '';
    launchError = '';
  }

  function goToStep(newStep: typeof step) {
    step = newStep;
  }

  function selectChannel(channel: typeof selectedChannel) {
    selectedChannel = channel;
    step = 'config';
  }

  async function handleLaunch() {
    if (!canLaunch || !selectedChannel) return;
    
    isLaunching = true;
    step = 'progress';
    launchError = '';

    const requestBody = {
      name: botName,
      team_id: 'default',
      minionId: minion.id,
      channels: {
        [selectedChannel]: {
          enabled: true,
          ...(selectedChannel === 'whatsapp' ? { phoneNumber } : {}),
          dmPolicy: 'open',
          allowedUsers: []
        }
      }
    };

    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        createdBotId = result.bot_id;
      } else {
        launchError = result.message || 'Failed to launch';
        progressModalComponent?.updateStatus({
          status: 'error',
          error: { code: 'LAUNCH_FAILED', message: launchError }
        });
      }
    } catch (error) {
      launchError = 'Network error';
      progressModalComponent?.updateStatus({
        status: 'error',
        error: { code: 'NETWORK_ERROR', message: launchError }
      });
    } finally {
      isLaunching = false;
    }
  }

  function handleProgressSuccess(event: CustomEvent<{ vmId?: string }>) {
    dispatch('success', { botName, vmId: event.detail.vmId });
    setTimeout(() => {
      resetForm();
      dispatch('close');
    }, 500);
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case 'whatsapp':
        return '📱';
      case 'telegram':
        return '✈️';
      case 'discord':
        return '🎮';
      default:
        return '💬';
    }
  }

  function getChannelName(channel: string) {
    switch (channel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'telegram':
        return 'Telegram';
      case 'discord':
        return 'Discord';
      default:
        return channel;
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="backdrop"
    on:click={handleClose}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Card that expands from the minion card position -->
  <div 
    class="hire-card"
    class:expanded={step !== 'info'}
    style="--minion-color: {minion.color}"
    transition:scale={{ duration: 300, start: 0.9, easing: cubicOut }}
  >
    <!-- Close button -->
    <button class="close-btn" on:click={handleClose}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <!-- Progress bar (shows when not on info step) -->
    {#if step !== 'info' && step !== 'progress'}
      <div class="progress-bar">
        <div class="progress-step" class:active={step === 'name'}></div>
        <div class="progress-line" class:active={step !== 'name'}></div>
        <div class="progress-step" class:active={isChannelOrLater}></div>
        <div class="progress-line" class:active={isPostChannel}></div>
        <div class="progress-step" class:active={isPostChannel}></div>
      </div>
    {/if}

    <!-- Avatar Section (always visible) -->
    <div class="avatar-section">
      <div class="avatar-container">
        <MinionAvatar3D 
          minionId={minion.id}
          color={minion.color}
          isHovered={false}
          isSelected={true}
        />
      </div>
      <div class="avatar-info">
        <h2 class="minion-name">{minion.name}</h2>
        <p class="minion-role">{minion.role}</p>
      </div>
    </div>

    <!-- Content Section -->
    <div class="content-section">
      {#if step === 'info'}
        <!-- Info Step - Initial view matching the detail card -->
        <div class="step-content" in:fade={{ duration: 200 }}>
          <p class="description">{minion.description}</p>
          
          <div class="tags-row">
            {#each minion.tags.slice(0, 3) as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>

          <div class="skills-preview">
            <span class="skills-label">Top Skills</span>
            <div class="skills-list">
              {#each minion.skills.slice(0, 4) as skill}
                <div class="skill-pill" style="--priority-color: {skill.priority === 'P0' ? '#7BA38F' : skill.priority === 'P1' ? '#D4A853' : '#9AA5B1'}">
                  {skill.name}
                </div>
              {/each}
            </div>
          </div>

          <button class="btn btn-primary btn-large hire-btn" on:click={() => goToStep('name')}>
            Hire {minion.name}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

      {:else if step === 'name'}
        <!-- Name Step -->
        <div class="step-content" in:fly={{ y: 20, duration: 200 }}>
          <h3 class="step-title">What should we call your minion?</h3>
          <p class="step-desc">This is how they'll appear in your contacts</p>
          
          <div class="input-group">
            <input 
              type="text" 
              class="form-input"
              placeholder="e.g., {minion.name}Bot"
              bind:value={botName}
              maxlength="30"
            />
            <span class="char-count">{botName.length}/30</span>
          </div>
          
          {#if botName && !isNameValid}
            <span class="error-text">Use 3-30 letters, numbers, or hyphens</span>
          {/if}

          <div class="btn-row">
            <button class="btn btn-ghost" on:click={() => goToStep('info')}>Back</button>
            <button class="btn btn-primary" disabled={!isNameValid} on:click={() => goToStep('channel')}>
              Continue
            </button>
          </div>
        </div>

      {:else if step === 'channel'}
        <!-- Channel Selection -->
        <div class="step-content" in:fly={{ y: 20, duration: 200 }}>
          <h3 class="step-title">Where should {botName || minion.name} live?</h3>
          <p class="step-desc">Choose your messaging app</p>
          
          <div class="channel-grid">
            <button class="channel-option" on:click={() => selectChannel('whatsapp')}>
              <span class="channel-icon">📱</span>
              <span class="channel-name">WhatsApp</span>
              <span class="channel-desc">Most popular</span>
            </button>
            <button class="channel-option" on:click={() => selectChannel('telegram')}>
              <span class="channel-icon">✈️</span>
              <span class="channel-name">Telegram</span>
              <span class="channel-desc">Fast & secure</span>
            </button>
            <button class="channel-option" on:click={() => selectChannel('discord')}>
              <span class="channel-icon">🎮</span>
              <span class="channel-name">Discord</span>
              <span class="channel-desc">For teams</span>
            </button>
          </div>

          <div class="btn-row">
            <button class="btn btn-ghost" on:click={() => goToStep('name')}>Back</button>
          </div>
        </div>

      {:else if step === 'config'}
        <!-- Config Step -->
        <div class="step-content" in:fly={{ y: 20, duration: 200 }}>
          <h3 class="step-title">Connect to {getChannelName(selectedChannel || '')}</h3>
          
          {#if selectedChannel === 'whatsapp'}
            <div class="config-form">
              <p class="step-desc">Enter your phone number to receive the connection link</p>
              <div class="input-group">
                <input 
                  type="tel" 
                  class="form-input"
                  placeholder="+1 234 567 8900"
                  bind:value={phoneNumber}
                />
              </div>
              <p class="help-text">We'll send you a WhatsApp message with setup instructions</p>
            </div>
          {:else}
            <div class="config-form">
              <p class="step-desc">Ready to connect! Click below to get your bot token.</p>
              <div class="token-hint">
                <span>You'll get a link via {getChannelName(selectedChannel || '')}</span>
              </div>
            </div>
          {/if}

          <div class="btn-row">
            <button class="btn btn-ghost" on:click={() => goToStep('channel')}>Back</button>
            <button class="btn btn-primary" disabled={!isPhoneValid} on:click={() => goToStep('review')}>
              Continue
            </button>
          </div>
        </div>

      {:else if step === 'review'}
        <!-- Review Step -->
        <div class="step-content" in:fly={{ y: 20, duration: 200 }}>
          <h3 class="step-title">Ready to hire?</h3>
          
          <div class="review-card">
            <div class="review-row">
              <span class="review-label">Name</span>
              <span class="review-value">{botName}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Type</span>
              <span class="review-value">{minion.name} ({minion.role})</span>
            </div>
            <div class="review-row">
              <span class="review-label">Channel</span>
              <span class="review-value">{getChannelIcon(selectedChannel || '')} {getChannelName(selectedChannel || '')}</span>
            </div>
            {#if selectedChannel === 'whatsapp'}
              <div class="review-row">
                <span class="review-label">Phone</span>
                <span class="review-value">{phoneNumber}</span>
              </div>
            {/if}
          </div>

          <div class="time-estimate">
            <span class="time-icon">⚡</span>
            <span>In your contacts in ~60 seconds</span>
          </div>

          <div class="btn-row">
            <button class="btn btn-ghost" on:click={() => goToStep('config')}>Back</button>
            <button class="btn btn-primary btn-large" disabled={!canLaunch || isLaunching} on:click={handleLaunch}>
              {#if isLaunching}
                <span class="spinner"></span>
                Hiring...
              {:else}
                Hire {botName}
              {/if}
            </button>
          </div>
        </div>

      {:else if step === 'progress'}
        <!-- Progress Step -->
        <div class="step-content">
          <VMProgressModal
            bind:this={progressModalComponent}
            botName={botName}
            botId={createdBotId}
            isOpen={true}
            on:success={handleProgressSuccess}
          />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
  }

  .hire-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 420px;
    max-width: 90vw;
    max-height: 90vh;
    background: #1a1512;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    overflow: hidden;
    z-index: 101;
    display: flex;
    flex-direction: column;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .hire-card.expanded {
    width: 480px;
  }

  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(247, 245, 240, 0.6);
    cursor: pointer;
    z-index: 10;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #F7F5F0;
  }

  /* Progress Bar */
  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    padding: 0 2rem;
    gap: 0.25rem;
  }

  .progress-step {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s;
  }

  .progress-step.active {
    background: var(--minion-color, #D4A853);
    box-shadow: 0 0 8px var(--minion-color, #D4A853);
  }

  .progress-line {
    flex: 1;
    height: 2px;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.3s;
  }

  .progress-line.active {
    background: var(--minion-color, #D4A853);
  }

  /* Avatar Section */
  .avatar-section {
    padding: 2rem 2rem 1rem;
    text-align: center;
    background: linear-gradient(180deg, rgba(212, 168, 83, 0.05) 0%, transparent 100%);
  }

  .avatar-container {
    width: 120px;
    height: 120px;
    margin: 0 auto 1rem;
    border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), transparent);
  }

  .minion-name {
    font-size: 1.75rem;
    font-weight: 700;
    color: #F7F5F0;
    margin: 0;
    font-family: 'Space Grotesk', sans-serif;
  }

  .minion-role {
    font-size: 0.9375rem;
    color: var(--minion-color, #D4A853);
    margin: 0.25rem 0 0;
  }

  /* Content Section */
  .content-section {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.5rem 1.5rem;
  }

  .step-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .step-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #F7F5F0;
    margin: 0;
  }

  .step-desc {
    font-size: 0.875rem;
    color: rgba(247, 245, 240, 0.5);
    margin: 0;
  }

  .description {
    font-size: 0.9375rem;
    color: rgba(247, 245, 240, 0.7);
    line-height: 1.6;
    margin: 0;
  }

  /* Tags */
  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag {
    padding: 0.25rem 0.75rem;
    background: rgba(212, 168, 83, 0.1);
    border: 1px solid rgba(212, 168, 83, 0.2);
    border-radius: 100px;
    font-size: 0.75rem;
    color: #D4A853;
  }

  /* Skills Preview */
  .skills-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skills-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: rgba(247, 245, 240, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .skill-pill {
    padding: 0.375rem 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-left: 3px solid var(--priority-color, #9AA5B1);
    border-radius: 8px;
    font-size: 0.8125rem;
    color: rgba(247, 245, 240, 0.8);
  }

  /* Input */
  .input-group {
    position: relative;
  }

  .form-input {
    width: 100%;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #F7F5F0;
    font-size: 1rem;
    outline: none;
    transition: all 0.2s;
  }

  .form-input:focus {
    border-color: var(--minion-color, #D4A853);
    background: rgba(255, 255, 255, 0.08);
  }

  .form-input::placeholder {
    color: rgba(247, 245, 240, 0.3);
  }

  .char-count {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: rgba(247, 245, 240, 0.4);
  }

  .error-text {
    font-size: 0.8125rem;
    color: #ef4444;
  }

  .help-text {
    font-size: 0.8125rem;
    color: rgba(247, 245, 240, 0.4);
  }

  /* Channel Grid */
  .channel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .channel-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 1rem 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .channel-option:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--minion-color, #D4A853);
    transform: translateY(-2px);
  }

  .channel-icon {
    font-size: 1.75rem;
  }

  .channel-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #F7F5F0;
  }

  .channel-desc {
    font-size: 0.6875rem;
    color: rgba(247, 245, 240, 0.4);
  }

  /* Config Form */
  .config-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .token-hint {
    padding: 1rem;
    background: rgba(123, 163, 143, 0.1);
    border: 1px solid rgba(123, 163, 143, 0.2);
    border-radius: 12px;
    text-align: center;
    font-size: 0.875rem;
    color: #7BA38F;
  }

  /* Review Card */
  .review-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .review-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .review-label {
    font-size: 0.8125rem;
    color: rgba(247, 245, 240, 0.5);
  }

  .review-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: #F7F5F0;
  }

  .time-estimate {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgba(212, 168, 83, 0.1);
    border-radius: 10px;
    font-size: 0.875rem;
    color: #D4A853;
  }

  .time-icon {
    font-size: 1rem;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
    color: #0f0c0a;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212, 168, 83, 0.4);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-ghost {
    background: transparent;
    color: rgba(247, 245, 240, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .btn-ghost:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #F7F5F0;
  }

  .btn-large {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .hire-btn {
    margin-top: 0.5rem;
  }

  .btn-row {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  .btn-row .btn {
    flex: 1;
  }

  /* Spinner */
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Responsive */
  @media (max-width: 480px) {
    .hire-card {
      width: 100%;
      max-width: none;
      border-radius: 20px 20px 0 0;
      top: auto;
      bottom: 0;
      transform: translate(-50%, 0);
      max-height: 85vh;
    }

    .channel-grid {
      grid-template-columns: 1fr;
    }

    .channel-option {
      flex-direction: row;
      padding: 0.875rem 1rem;
    }
  }
</style>
