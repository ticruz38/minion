<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import MinionAvatar3D from './MinionAvatar3D.svelte';
  import ChannelSelectionStep from './ChannelSelectionStep.svelte';
  import TelegramConfigForm from './TelegramConfigForm.svelte';
  import DiscordConfigForm from './DiscordConfigForm.svelte';
  import WhatsAppConfigForm from './WhatsAppConfigForm.svelte';
  import SecurityConfigStep from './SecurityConfigStep.svelte';
  import ReviewStep from './ReviewStep.svelte';
  import VMProgressModal from './VMProgressModal.svelte';
  import type { ChannelSelection } from './ChannelSelectionStep.svelte';
  import type { TelegramConfig } from './TelegramConfigForm.svelte';
  import type { DiscordConfig } from './DiscordConfigForm.svelte';
  import type { WhatsAppConfig } from './WhatsAppConfigForm.svelte';
  import type { SecuritySummary } from './SecurityConfigStep.svelte';
  import type { ReviewData, ChannelConfigs } from './ReviewStep.svelte';

  // Props
  export let isOpen = false;
  export let selectedMinion: { id: string; name: string; color: string } | null = null;
  
  // Disable animations during testing
  $: isTesting = typeof window !== 'undefined' && (window as { __TESTING__?: boolean }).__TESTING__ === true;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    success: { botName: string; vmId?: string };
  }>();

  // Step tracking - 5 steps: Name -> Channels -> Config -> Security -> Review
  let currentStep = 1;
  const totalSteps = 5;
  const stepTitles = ['Name', 'Channels', 'Configure', 'Security', 'Review'];

  // Track if form is dirty (has any user input)
  let isDirty = false;
  let showConfirmClose = false;
  let modalElement: HTMLDivElement;

  // Command ID for Redis correlation (UUID v4)
  let commandId = '';

  // Step 1: Bot Name
  let botName = '';
  let botNameTouched = false;
  const BOT_NAME_MIN_LENGTH = 3;
  const BOT_NAME_MAX_LENGTH = 30;
  const BOT_NAME_REGEX = /^[a-zA-Z0-9-]+$/;

  // Step 2: Channel Selection
  let selectedChannels: ChannelSelection = {
    telegram: false,
    discord: false,
    whatsapp: false
  };

  // Step 3: Channel Configurations
  let telegramConfig: TelegramConfig = {
    token: '',
    dmPolicy: 'pairing',
    allowedUsers: []
  };
  let discordConfig: DiscordConfig = {
    token: '',
    dmPolicy: 'pairing',
    allowedUsers: []
  };
  let whatsappConfig: WhatsAppConfig = {
    phoneNumber: '',
    apiKey: '',
    webhookUrl: '',
    dmPolicy: 'pairing',
    allowedUsers: []
  };

  // Track validity of each channel config
  let telegramValid = false;
  let discordValid = false;
  let whatsappValid = false;

  // Step 4: Security is automatically derived from configs

  // Step 5: Review and Launch
  let isLaunching = false;
  let launchError = '';
  let userBalance = 500; // Mock balance - would come from user profile

  // VM Progress Modal state
  let showProgressModal = false;
  let progressModalComponent: VMProgressModal;

  // Credit constants
  const HOURLY_RATE = 95;

  // Check if form has any data
  $: isDirty = botName !== '' || 
               selectedChannels.telegram || 
               selectedChannels.discord || 
               selectedChannels.whatsapp ||
               telegramConfig.token !== '' ||
               discordConfig.token !== '' ||
               whatsappConfig.phoneNumber !== '';

  // Step 1 validation
  $: botNameError = botNameTouched || botName.length > 0 ? validateBotName(botName) : '';
  $: isStep1Valid = botName.length >= BOT_NAME_MIN_LENGTH && 
                    botName.length <= BOT_NAME_MAX_LENGTH && 
                    BOT_NAME_REGEX.test(botName);

  // Step 2 validation
  $: isStep2Valid = selectedChannels.telegram || selectedChannels.discord || selectedChannels.whatsapp;

  // Step 3 validation - all selected channels must be valid
  $: isStep3Valid = (!selectedChannels.telegram || telegramValid) &&
                    (!selectedChannels.discord || discordValid) &&
                    (!selectedChannels.whatsapp || whatsappValid);

  // Step 4 is always valid (it's a review step)
  $: isStep4Valid = true;

  // Step 5 - can proceed to launch
  $: isStep5Valid = !isLaunching;

  // Build security config for Step 4
  $: securityConfig = buildSecurityConfig(selectedChannels, telegramConfig, discordConfig, whatsappConfig);

  // Build review data for Step 5
  $: reviewData = buildReviewData(botName, selectedChannels, telegramConfig, discordConfig, whatsappConfig);

  // Generate UUID v4
  function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function validateBotName(name: string): string {
    if (name.length === 0) return '';
    if (name.length < BOT_NAME_MIN_LENGTH) return `Bot name must be at least ${BOT_NAME_MIN_LENGTH} characters`;
    if (name.length > BOT_NAME_MAX_LENGTH) return `Bot name must be no more than ${BOT_NAME_MAX_LENGTH} characters`;
    if (!BOT_NAME_REGEX.test(name)) return 'Only letters, numbers, and hyphens allowed';
    return '';
  }

  function handleBotNameInput(e: Event) {
    const input = e.target as HTMLInputElement;
    botName = input.value;
    botNameTouched = true;
  }

  function buildSecurityConfig(
    channels: ChannelSelection,
    telegram: TelegramConfig,
    discord: DiscordConfig,
    whatsapp: WhatsAppConfig
  ): SecuritySummary {
    const config: SecuritySummary = { channels: [] };

    if (channels.telegram) {
      config.channels.push({
        channelId: 'telegram',
        channelName: 'Telegram',
        dmPolicy: telegram.dmPolicy,
        allowedUsers: telegram.allowedUsers,
        color: '#0088cc',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-16.5 6.498a2.255 2.255 0 0 0-.106 4.053l3.995 1.689 1.69 3.995a2.255 2.255 0 0 0 4.053-.106l6.498-16.5a2.242 2.242 0 0 0-1.608-3.044z"/><path d="m9.5 14.5 5-5"/></svg>'
      });
    }

    if (channels.discord) {
      config.channels.push({
        channelId: 'discord',
        channelName: 'Discord',
        dmPolicy: discord.dmPolicy,
        allowedUsers: discord.allowedUsers,
        color: '#5865f2',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 9a5 5 0 0 0-5-5h-2a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h2a5 5 0 0 0 5-5V9z"/><path d="M8 11v2"/><path d="M16 11v2"/><path d="M12 11v2"/></svg>'
      });
    }

    if (channels.whatsapp) {
      config.channels.push({
        channelId: 'whatsapp',
        channelName: 'WhatsApp',
        dmPolicy: whatsapp.dmPolicy,
        allowedUsers: whatsapp.allowedUsers,
        color: '#25d366',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z"/><path d="M9.5 13.5c.5 1 1.5 1 2.5 1s2-.5 2.5-1"/></svg>'
      });
    }

    return config;
  }

  function buildReviewData(
    name: string,
    channels: ChannelSelection,
    telegram: TelegramConfig,
    discord: DiscordConfig,
    whatsapp: WhatsAppConfig
  ): ReviewData {
    const channelConfigs: ChannelConfigs = {};

    if (channels.telegram) {
      channelConfigs.telegram = {
        token: telegram.token,
        dmPolicy: telegram.dmPolicy,
        allowedUsers: telegram.allowedUsers
      };
    }

    if (channels.discord) {
      channelConfigs.discord = {
        token: discord.token,
        dmPolicy: discord.dmPolicy,
        allowedUsers: discord.allowedUsers
      };
    }

    if (channels.whatsapp) {
      channelConfigs.whatsapp = {
        phoneNumber: whatsapp.phoneNumber,
        apiKey: whatsapp.apiKey,
        webhookUrl: whatsapp.webhookUrl || undefined,
        dmPolicy: whatsapp.dmPolicy,
        allowedUsers: whatsapp.allowedUsers
      };
    }

    return {
      botName: name,
      channels: channelConfigs
    };
  }

  function goToNextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
    }
  }

  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  function handleChannelSelectionChange(event: CustomEvent<ChannelSelection>) {
    selectedChannels = event.detail;
  }

  function handleTelegramConfigChange(event: CustomEvent<TelegramConfig>) {
    telegramConfig = event.detail;
  }

  function handleTelegramValid(event: CustomEvent<boolean>) {
    telegramValid = event.detail;
  }

  function handleDiscordConfigChange(event: CustomEvent<DiscordConfig>) {
    discordConfig = event.detail;
  }

  function handleDiscordValid(event: CustomEvent<boolean>) {
    discordValid = event.detail;
  }

  function handleWhatsAppConfigChange(event: CustomEvent<WhatsAppConfig>) {
    whatsappConfig = event.detail;
  }

  function handleWhatsAppValid(event: CustomEvent<boolean>) {
    whatsappValid = event.detail;
  }

  async function handleLaunch() {
    if (!selectedMinion) return;
    
    isLaunching = true;
    launchError = '';

    // Generate command ID for Redis correlation
    commandId = generateUUID();
    
    // Show progress modal
    showProgressModal = true;

    // Build the request body
    const requestBody: {
      id: string;
      name: string;
      minionId: string;
      channels: Record<string, unknown>;
    } = {
      id: commandId,
      name: botName,
      minionId: selectedMinion.id,
      channels: {}
    };

    // Add selected channels
    if (selectedChannels.telegram) {
      requestBody.channels.telegram = {
        enabled: true,
        token: telegramConfig.token,
        dmPolicy: telegramConfig.dmPolicy,
        allowedUsers: telegramConfig.allowedUsers.length > 0 ? telegramConfig.allowedUsers : undefined
      };
    }

    if (selectedChannels.discord) {
      requestBody.channels.discord = {
        enabled: true,
        token: discordConfig.token,
        dmPolicy: discordConfig.dmPolicy,
        allowedUsers: discordConfig.allowedUsers.length > 0 ? discordConfig.allowedUsers : undefined
      };
    }

    if (selectedChannels.whatsapp) {
      requestBody.channels.whatsapp = {
        enabled: true,
        phoneNumber: whatsappConfig.phoneNumber,
        apiKey: whatsappConfig.apiKey,
        webhookUrl: whatsappConfig.webhookUrl || undefined,
        dmPolicy: whatsappConfig.dmPolicy,
        allowedUsers: whatsappConfig.allowedUsers.length > 0 ? whatsappConfig.allowedUsers : undefined
      };
    }

    try {
      const response = await fetch('/api/vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Update progress modal with acknowledged status
        progressModalComponent?.updateStatus({
          status: 'acknowledged',
          message: 'Request received by backend'
        });

        // Start polling for status updates (in real implementation, this would use WebSocket or SSE)
        // For now, simulate the flow
        setTimeout(() => {
          progressModalComponent?.updateStatus({
            status: 'creating',
            message: 'Creating your bot VM...'
          });
        }, 1500);

        // Simulate success (in production, this would come from Redis/SSE)
        setTimeout(() => {
          progressModalComponent?.updateStatus({
            status: 'success',
            vmId: result.commandId || commandId,
            connectionInfo: {
              ...(selectedChannels.telegram && { telegram: { botUsername: `${botName.toLowerCase()}_bot` } }),
              ...(selectedChannels.discord && { discord: { botUsername: botName } }),
              ...(selectedChannels.whatsapp && { whatsapp: { phoneNumber: whatsappConfig.phoneNumber } })
            }
          });
        }, 3500);
      } else {
        launchError = result.message || 'Failed to launch bot. Please try again.';
        progressModalComponent?.updateStatus({
          status: 'error',
          error: {
            code: 'LAUNCH_FAILED',
            message: launchError
          }
        });
      }
    } catch (error) {
      launchError = 'Network error. Please check your connection and try again.';
      progressModalComponent?.updateStatus({
        status: 'error',
        error: {
          code: 'NETWORK_ERROR',
          message: launchError
        }
      });
    } finally {
      isLaunching = false;
    }
  }

  function handleProgressSuccess(event: CustomEvent<{ vmId?: string; connectionInfo?: unknown }>) {
    const { vmId } = event.detail;
    
    // Dispatch success to parent
    dispatch('success', { botName, vmId });
    
    // Close modals and reset
    showProgressModal = false;
    closeModal();
  }

  function handleProgressError() {
    // Keep progress modal open to show error state
    // User can retry or cancel from the modal
  }

  function handleProgressRetry() {
    // Retry the launch
    showProgressModal = false;
    progressModalComponent?.reset();
    handleLaunch();
  }

  function handleProgressClose() {
    showProgressModal = false;
    progressModalComponent?.reset();
  }

  // Handle escape key
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen && !showProgressModal) {
      handleCloseAttempt();
    }
  }

  // Handle close attempt - check if confirmation needed
  function handleCloseAttempt() {
    if (isDirty && !showConfirmClose) {
      showConfirmClose = true;
    } else {
      closeModal();
    }
  }

  // Close modal and reset state
  function closeModal() {
    dispatch('close');
    showConfirmClose = false;
    // Reset form data when modal closes
    setTimeout(() => {
      resetForm();
    }, 300);
  }

  // Reset all form state
  function resetForm() {
    currentStep = 1;
    botName = '';
    botNameTouched = false;
    selectedChannels = {
      telegram: false,
      discord: false,
      whatsapp: false
    };
    telegramConfig = {
      token: '',
      dmPolicy: 'pairing',
      allowedUsers: []
    };
    discordConfig = {
      token: '',
      dmPolicy: 'pairing',
      allowedUsers: []
    };
    whatsappConfig = {
      phoneNumber: '',
      apiKey: '',
      webhookUrl: '',
      dmPolicy: 'pairing',
      allowedUsers: []
    };
    telegramValid = false;
    discordValid = false;
    whatsappValid = false;
    commandId = '';
    launchError = '';
    isLaunching = false;
  }

  // Handle backdrop click
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === modalElement) {
      handleCloseAttempt();
    }
  }

  // Confirm close (discard changes)
  function confirmClose() {
    showConfirmClose = false;
    closeModal();
  }

  // Cancel close (stay on modal)
  function cancelClose() {
    showConfirmClose = false;
  }

  // Watch for modal open to generate command ID
  $: if (isOpen && !commandId) {
    commandId = generateUUID();
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div 
    class="modal-overlay"
    bind:this={modalElement}
    on:click={handleBackdropClick}
    transition:fade={{ duration: isTesting ? 0 : 200 }}
    data-testid="modal-overlay"
  >
    <div 
      class="modal-container"
      transition:scale={{ 
        duration: isTesting ? 0 : 300, 
        start: 0.95, 
        easing: cubicOut 
      }}
      data-testid="modal-container"
    >
      <!-- Header -->
      <div class="modal-header" style="--minion-color: {selectedMinion?.color || '#6366f1'}">
        <div class="header-content">
          <h2 class="modal-title">Create Your Bot</h2>
          <p class="modal-subtitle">
            {#if selectedMinion}
              Hiring <span class="minion-name" style="color: {selectedMinion.color}">{selectedMinion.name}</span>
            {:else}
              Configure your AI assistant
            {/if}
          </p>
        </div>
        <button 
          class="close-button" 
          on:click={handleCloseAttempt}
          aria-label="Close modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Content Area -->
      <div class="modal-content">
        {#if selectedMinion}
          <div class="minion-preview">
            <div class="avatar-container" style="--avatar-color: {selectedMinion.color}">
              <MinionAvatar3D 
                minionId={selectedMinion.id} 
                color={selectedMinion.color}
                isHovered={false}
                isSelected={true}
              />
            </div>
            <div class="minion-info">
              <span class="minion-role">{selectedMinion.name}</span>
              <span class="minion-role-description">AI Assistant</span>
            </div>
          </div>
        {/if}

        <!-- Step Content -->
        <div class="step-content" data-testid="step-content">
          {#if currentStep === 1}
            <!-- Step 1: Name Your Bot -->
            <div class="step-form" in:fade={{ duration: isTesting ? 0 : 200 }}>
              <h3 class="step-title">Name Your Bot</h3>
              <p class="step-description">
                Give your {selectedMinion?.name || 'bot'} a memorable name that you'll use to interact with it.
              </p>

              <div class="form-group">
                <label for="bot-name" class="form-label">
                  Bot Name
                  <span class="required">*</span>
                </label>
                <div class="input-wrapper" class:error={botNameError !== ''} class:valid={isStep1Valid}>
                  <input
                    type="text"
                    id="bot-name"
                    class="form-input"
                    placeholder="e.g., my-awesome-bot"
                    value={botName}
                    on:input={handleBotNameInput}
                    maxlength={BOT_NAME_MAX_LENGTH}
                    autocomplete="off"
                  />
                  {#if isStep1Valid}
                    <span class="input-icon valid-icon">✓</span>
                  {/if}
                </div>
                <div class="input-meta">
                  <span class="char-count" class:near-limit={botName.length > BOT_NAME_MAX_LENGTH - 5}>
                    {botName.length}/{BOT_NAME_MAX_LENGTH}
                  </span>
                </div>
                {#if botNameError}
                  <span class="error-message" transition:fade={{ duration: isTesting ? 0 : 150 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {botNameError}
                  </span>
                {/if}
                <span class="help-text">
                  Use only letters, numbers, and hyphens. 3-30 characters.
                </span>
              </div>
            </div>
          {:else if currentStep === 2}
            <!-- Step 2: Channel Selection -->
            <div class="step-form" in:fade={{ duration: isTesting ? 0 : 200 }}>
              <ChannelSelectionStep 
                bind:selectedChannels
                isTesting={isTesting}
                on:change={handleChannelSelectionChange}
              />
            </div>
          {:else if currentStep === 3}
            <!-- Step 3: Channel Configuration -->
            <div class="step-form channel-config-step" in:fade={{ duration: isTesting ? 0 : 200 }}>
              <h3 class="step-title">Configure Channels</h3>
              <p class="step-description">
                Enter the credentials and security settings for each selected channel.
              </p>

              <div class="channel-forms">
                {#if selectedChannels.telegram}
                  <div class="channel-form-section">
                    <TelegramConfigForm 
                      bind:config={telegramConfig}
                      isTesting={isTesting}
                      on:change={handleTelegramConfigChange}
                      on:valid={handleTelegramValid}
                    />
                  </div>
                {/if}

                {#if selectedChannels.discord}
                  <div class="channel-form-section">
                    <DiscordConfigForm 
                      bind:config={discordConfig}
                      isTesting={isTesting}
                      on:change={handleDiscordConfigChange}
                      on:valid={handleDiscordValid}
                    />
                  </div>
                {/if}

                {#if selectedChannels.whatsapp}
                  <div class="channel-form-section">
                    <WhatsAppConfigForm 
                      bind:config={whatsappConfig}
                      isTesting={isTesting}
                      on:change={handleWhatsAppConfigChange}
                      on:valid={handleWhatsAppValid}
                    />
                  </div>
                {/if}
              </div>
            </div>
          {:else if currentStep === 4}
            <!-- Step 4: Security Configuration -->
            <div class="step-form" in:fade={{ duration: isTesting ? 0 : 200 }}>
              <SecurityConfigStep 
                {securityConfig}
                isTesting={isTesting}
              />
            </div>
          {:else if currentStep === 5}
            <!-- Step 5: Review and Launch -->
            <div class="step-form" in:fade={{ duration: isTesting ? 0 : 200 }}>
              <ReviewStep 
                {reviewData}
                {selectedMinion}
                {isLaunching}
                {launchError}
                {userBalance}
                isTesting={isTesting}
                on:launch={handleLaunch}
              />
            </div>
          {/if}
        </div>

        <!-- Step Indicator -->
        <div class="step-indicator-container">
          <div class="step-indicator">
            {#each Array(totalSteps) as _, i}
              <div class="step-dot-wrapper">
                <button
                  class="step-dot" 
                  class:active={currentStep === i + 1}
                  class:completed={currentStep > i + 1}
                  on:click={() => { if (currentStep > i + 1) currentStep = i + 1; }}
                  disabled={currentStep <= i + 1}
                  aria-label="Go to step {i + 1}"
                ></button>
                {#if i < totalSteps - 1}
                  <span class="step-line-segment" class:completed={currentStep > i + 1}></span>
                {/if}
              </div>
            {/each}
          </div>
          <div class="step-labels">
            {#each stepTitles as title, i}
              <span class="step-label" class:active={currentStep === i + 1} class:completed={currentStep > i + 1}>
                {title}
              </span>
            {/each}
          </div>
          <span class="step-text">Step {currentStep} of {totalSteps}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer" data-testid="modal-footer">
        {#if currentStep > 1}
          <button 
            class="btn btn-secondary" 
            on:click={goToPreviousStep}
            disabled={isLaunching}
            data-testid="back-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        {:else}
          <button 
            class="btn btn-secondary" 
            on:click={handleCloseAttempt} 
            disabled={isLaunching}
            data-testid="cancel-button"
          >
            Cancel
          </button>
        {/if}
        
        {#if currentStep === 5}
          <!-- Launch button on Review step -->
          <button 
            class="btn btn-primary btn-launch" 
            style="--btn-color: {selectedMinion?.color || '#6366f1'}"
            on:click={handleLaunch}
            disabled={isLaunching || !isStep5Valid}
            data-testid="launch-button"
          >
            {#if isLaunching}
              <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
              </svg>
              Launching...
            {:else}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13"></path>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
              Launch Bot
            {/if}
          </button>
        {:else}
          <!-- Next button for Steps 1-4 -->
          <button 
            class="btn btn-primary" 
            style="--btn-color: {selectedMinion?.color || '#6366f1'}"
            on:click={goToNextStep}
            disabled={
              (currentStep === 1 && !isStep1Valid) || 
              (currentStep === 2 && !isStep2Valid) ||
              (currentStep === 3 && !isStep3Valid) ||
              (currentStep === 4 && !isStep4Valid)
            }
            data-testid="next-button"
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        {/if}
      </div>
    </div>

    <!-- Confirmation Dialog -->
    {#if showConfirmClose}
      <div 
        class="confirm-dialog-overlay"
        transition:fade={{ duration: isTesting ? 0 : 150 }}
        data-testid="confirm-dialog"
      >
        <div 
          class="confirm-dialog"
          transition:scale={{ duration: isTesting ? 0 : 200, start: 0.95 }}
        >
          <div class="confirm-icon">⚠️</div>
          <h3 class="confirm-title">Discard Changes?</h3>
          <p class="confirm-text">You have unsaved changes. Are you sure you want to close?</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" on:click={cancelClose} data-testid="keep-editing-button">
              Keep Editing
            </button>
            <button class="btn btn-danger" on:click={confirmClose} data-testid="discard-button">
              Discard
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- VM Progress Modal -->
<VMProgressModal
  bind:this={progressModalComponent}
  isOpen={showProgressModal}
  {commandId}
  minionColor={selectedMinion?.color || '#6366f1'}
  isTesting={isTesting}
  on:close={handleProgressClose}
  on:retry={handleProgressRetry}
  on:success={handleProgressSuccess}
/>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    background: linear-gradient(180deg, #1a1a25 0%, #12121a 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    box-shadow: 
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* Header */
  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    position: relative;
  }

  .modal-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--minion-color, #6366f1), transparent);
    opacity: 0.5;
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.25rem 0;
  }

  .modal-subtitle {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  .minion-name {
    font-weight: 600;
  }

  .close-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border-color: rgba(255, 255, 255, 0.2);
  }

  /* Content */
  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .minion-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .avatar-container {
    width: 120px;
    height: 120px;
    border-radius: 20px;
    border: 2px solid var(--avatar-color);
    padding: 4px;
    box-shadow: 0 0 30px var(--avatar-color);
  }

  .minion-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .minion-role {
    font-size: 1rem;
    font-weight: 600;
    color: var(--minion-color, #6366f1);
  }

  .minion-role-description {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Step Content */
  .step-content {
    flex: 1;
  }

  .step-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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

  /* Channel Config Step */
  .channel-config-step .channel-forms {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .channel-form-section {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
  }

  /* Form Styles */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .required {
    color: #ef4444;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .form-input {
    width: 100%;
    padding: 0.875rem 1rem;
    padding-right: 2.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--minion-color, #6366f1);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .input-wrapper.error .form-input {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  .input-wrapper.valid .form-input {
    border-color: #10b981;
  }

  .input-icon {
    position: absolute;
    right: 1rem;
    font-size: 1rem;
  }

  .valid-icon {
    color: #10b981;
    font-weight: 700;
  }

  .input-meta {
    display: flex;
    justify-content: flex-end;
  }

  .char-count {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    transition: color 0.2s ease;
  }

  .char-count.near-limit {
    color: #f59e0b;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.625rem 0.875rem;
    border-radius: 8px;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .help-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.4);
  }

  /* Step Indicator */
  .step-indicator-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .step-indicator {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .step-dot-wrapper {
    display: flex;
    align-items: center;
  }

  .step-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .step-dot.active {
    background: var(--minion-color, #6366f1);
    box-shadow: 0 0 10px var(--minion-color, #6366f1);
    transform: scale(1.2);
  }

  .step-dot.completed {
    background: #10b981;
    cursor: pointer;
  }

  .step-dot:disabled {
    cursor: default;
  }

  .step-line-segment {
    width: 30px;
    height: 2px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 0.5rem;
    transition: all 0.3s ease;
  }

  .step-line-segment.completed {
    background: #10b981;
  }

  .step-labels {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 400px;
    padding: 0 0.5rem;
  }

  .step-label {
    font-size: 0.6875rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.2s ease;
  }

  .step-label.active {
    color: var(--minion-color, #6366f1);
    font-weight: 600;
  }

  .step-label.completed {
    color: #10b981;
  }

  .step-text {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Buttons */
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--btn-color, #6366f1) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 2px solid var(--btn-color, #6366f1);
    color: white;
    margin-left: auto;
  }

  .btn-primary:hover:not(:disabled) {
    background-position: 100% 0;
    box-shadow: 0 0 20px var(--btn-color, #6366f1);
    transform: translateY(-1px);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    color: #ef4444;
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.7);
  }

  .btn-launch {
    min-width: 140px;
    justify-content: center;
  }

  /* Confirmation Dialog */
  .confirm-dialog-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
  }

  .confirm-dialog {
    background: #1a1a25;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 2rem;
    text-align: center;
    max-width: 360px;
    margin: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  }

  .confirm-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .confirm-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.5rem 0;
  }

  .confirm-text {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
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

  /* Scrollbar */
  .modal-content::-webkit-scrollbar {
    width: 6px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  /* Mobile */
  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0;
    }

    .modal-container {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
      height: 100vh;
    }

    .modal-header {
      padding: 1.25rem 1rem 1rem;
      position: sticky;
      top: 0;
      background: linear-gradient(180deg, #1a1a25 0%, #12121a 100%);
      z-index: 10;
    }

    .modal-title {
      font-size: 1.25rem;
    }

    .modal-content {
      padding: 1rem;
    }

    .avatar-container {
      width: 100px;
      height: 100px;
    }

    .step-title {
      font-size: 1.125rem;
    }

    .step-labels {
      display: none;
    }

    .step-line-segment {
      width: 20px;
    }

    .modal-footer {
      padding: 1rem;
      position: sticky;
      bottom: 0;
      background: inherit;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn {
      flex: 1;
      padding: 0.875rem 1.5rem;
      justify-content: center;
    }

    .btn:disabled {
      opacity: 0.5;
    }

    .form-input {
      font-size: 16px;
    }
  }

  /* Tablet */
  @media (max-width: 1024px) and (min-width: 769px) {
    .modal-container {
      max-width: 580px;
      border-radius: 20px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .modal-overlay,
    .modal-container,
    .step-form,
    .error-message,
    .confirm-dialog-overlay,
    .confirm-dialog {
      animation: none !important;
      transition: none !important;
    }
  }
</style>
