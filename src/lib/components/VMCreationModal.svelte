<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import MinionAvatar3D from './MinionAvatar3D.svelte';

  // Props
  export let isOpen = false;
  export let selectedMinion: { id: string; name: string; color: string } | null = null;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    success: void;
  }>();

  // Step tracking
  let currentStep = 1;
  const totalSteps = 4;

  // Track if form is dirty (has any user input)
  let isDirty = false;
  let showConfirmClose = false;
  let modalElement: HTMLDivElement;

  // Track form data for each step
  let formData = {
    botName: '',
    telegramToken: '',
    passcode: ''
  };

  // Validation state for Step 1
  let botNameError = '';
  let botNameTouched = false;

  // Bot name validation
  const BOT_NAME_MIN_LENGTH = 3;
  const BOT_NAME_MAX_LENGTH = 30;
  const BOT_NAME_REGEX = /^[a-zA-Z0-9-]+$/;

  // Validation state for Step 2
  let tokenError = '';
  let tokenTouched = false;
  let showToken = false;

  // Telegram token validation pattern: digits:alphanumeric
  const TOKEN_REGEX = /^\d+:[a-zA-Z0-9_-]+$/;

  // Validation state for Step 3
  let passcodeError = '';
  let passcodeTouched = false;
  let showPasscode = false;

  // Passcode validation constants
  const PASSCODE_MIN_LENGTH = 4;
  const PASSCODE_MAX_LENGTH = 20;

  // Step 4 state
  let isLaunching = false;
  let launchError = '';
  let showReviewPasscode = false;
  
  // Credit constants (mock data - in real app, fetch from API)
  const HOURLY_RATE = 95;
  let userBalance = 500; // Mock balance - would come from user profile
  
  // Check if balance is low (< 2 hours runtime)
  $: estimatedHours = Math.floor(userBalance / HOURLY_RATE);
  $: isLowBalance = userBalance < HOURLY_RATE * 2;

  // Check if form has any data
  $: isDirty = formData.botName !== '' || formData.telegramToken !== '' || formData.passcode !== '';

  // Real-time bot name validation
  $: {
    if (botNameTouched || formData.botName.length > 0) {
      botNameError = validateBotName(formData.botName);
    } else {
      botNameError = '';
    }
  }

  // Check if Step 1 is valid
  $: isStep1Valid = formData.botName.length >= BOT_NAME_MIN_LENGTH && 
                    formData.botName.length <= BOT_NAME_MAX_LENGTH && 
                    BOT_NAME_REGEX.test(formData.botName);

  // Real-time token validation
  $: {
    if (tokenTouched || formData.telegramToken.length > 0) {
      tokenError = validateToken(formData.telegramToken);
    } else {
      tokenError = '';
    }
  }

  // Check if Step 2 is valid
  $: isStep2Valid = TOKEN_REGEX.test(formData.telegramToken);

  // Real-time passcode validation
  $: {
    if (passcodeTouched || formData.passcode.length > 0) {
      passcodeError = validatePasscode(formData.passcode);
    } else {
      passcodeError = '';
    }
  }

  // Check if Step 3 is valid
  $: isStep3Valid = formData.passcode.length >= PASSCODE_MIN_LENGTH && 
                    formData.passcode.length <= PASSCODE_MAX_LENGTH;

  function validateBotName(name: string): string {
    if (name.length === 0) {
      return '';
    }
    if (name.length < BOT_NAME_MIN_LENGTH) {
      return `Bot name must be at least ${BOT_NAME_MIN_LENGTH} characters`;
    }
    if (name.length > BOT_NAME_MAX_LENGTH) {
      return `Bot name must be no more than ${BOT_NAME_MAX_LENGTH} characters`;
    }
    if (!BOT_NAME_REGEX.test(name)) {
      return 'Only letters, numbers, and hyphens allowed';
    }
    return '';
  }

  function handleBotNameInput(e: Event) {
    const input = e.target as HTMLInputElement;
    formData.botName = input.value;
    botNameTouched = true;
  }

  function handleTokenInput(e: Event) {
    const input = e.target as HTMLInputElement;
    formData.telegramToken = input.value;
    tokenTouched = true;
  }

  function toggleTokenVisibility() {
    showToken = !showToken;
  }

  function validateToken(token: string): string {
    if (token.length === 0) {
      return '';
    }
    if (!TOKEN_REGEX.test(token)) {
      return 'Token format should be: numbers:letters (e.g., 123456:ABC-DEF123)';
    }
    return '';
  }

  function handlePasscodeInput(e: Event) {
    const input = e.target as HTMLInputElement;
    formData.passcode = input.value;
    passcodeTouched = true;
  }

  function togglePasscodeVisibility() {
    showPasscode = !showPasscode;
  }

  function generateRandomPasscode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    formData.passcode = result;
    passcodeTouched = true;
  }

  function validatePasscode(passcode: string): string {
    if (passcode.length === 0) {
      return '';
    }
    if (passcode.length < PASSCODE_MIN_LENGTH) {
      return `Passcode must be at least ${PASSCODE_MIN_LENGTH} characters`;
    }
    if (passcode.length > PASSCODE_MAX_LENGTH) {
      return `Passcode must be no more than ${PASSCODE_MAX_LENGTH} characters`;
    }
    return '';
  }

  function goToNextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
    }
  }

  function toggleReviewPasscodeVisibility() {
    showReviewPasscode = !showReviewPasscode;
  }

  async function handleLaunch() {
    if (!selectedMinion) return;
    
    isLaunching = true;
    launchError = '';
    
    try {
      const response = await fetch('/api/vms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.botName,
          token: formData.telegramToken,
          passcode: formData.passcode,
          minionId: selectedMinion.id
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        dispatch('success');
        closeModal();
      } else {
        launchError = result.message || 'Failed to launch bot. Please try again.';
      }
    } catch (error) {
      launchError = 'Network error. Please check your connection and try again.';
    } finally {
      isLaunching = false;
    }
  }

  function goToPreviousStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }

  // Handle escape key
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
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
      formData = { botName: '', telegramToken: '', passcode: '' };
      currentStep = 1;
      botNameTouched = false;
      botNameError = '';
    }, 300);
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
    transition:fade={{ duration: 200 }}
  >
    <div 
      class="modal-container"
      transition:scale={{ 
        duration: 300, 
        start: 0.95, 
        easing: cubicOut 
      }}
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
        <div class="step-content">
          {#if currentStep === 1}
            <!-- Step 1: Name Your Bot -->
            <div class="step-form" in:fade={{ duration: 200 }}>
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
                    value={formData.botName}
                    on:input={handleBotNameInput}
                    maxlength={BOT_NAME_MAX_LENGTH}
                    autocomplete="off"
                  />
                  {#if isStep1Valid}
                    <span class="input-icon valid-icon">✓</span>
                  {/if}
                </div>
                <div class="input-meta">
                  <span class="char-count" class:near-limit={formData.botName.length > BOT_NAME_MAX_LENGTH - 5}>
                    {formData.botName.length}/{BOT_NAME_MAX_LENGTH}
                  </span>
                </div>
                {#if botNameError}
                  <span class="error-message" transition:fade={{ duration: 150 }}>
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
            <!-- Step 2: Telegram Configuration -->
            <div class="step-form" in:fade={{ duration: 200 }}>
              <h3 class="step-title">Connect Telegram</h3>
              <p class="step-description">
                Enter your Telegram bot token to enable messaging. Get one from @BotFather if you haven't already.
              </p>

              <div class="form-group">
                <label for="telegram-token" class="form-label">
                  Bot Token
                  <span class="required">*</span>
                </label>
                <div class="input-wrapper" class:error={tokenError !== ''} class:valid={isStep2Valid}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    id="telegram-token"
                    class="form-input"
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={formData.telegramToken}
                    on:input={handleTokenInput}
                    autocomplete="off"
                  />
                  <button
                    type="button"
                    class="visibility-toggle"
                    on:click={toggleTokenVisibility}
                    aria-label={showToken ? 'Hide token' : 'Show token'}
                  >
                    {#if showToken}
                      <!-- Eye-off icon -->
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    {:else}
                      <!-- Eye icon -->
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    {/if}
                  </button>
                </div>
                {#if tokenError}
                  <span class="error-message" transition:fade={{ duration: 150 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {tokenError}
                  </span>
                {/if}
                <div class="help-box">
                  <div class="help-box-icon">💡</div>
                  <div class="help-box-content">
                    <p class="help-box-title">Don't have a bot token?</p>
                    <p class="help-box-text">
                      Message <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" class="help-link">@BotFather</a> on Telegram and send <code>/newbot</code> to create one.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          {:else if currentStep === 3}
            <!-- Step 3: Security Passcode -->
            <div class="step-form" in:fade={{ duration: 200 }}>
              <h3 class="step-title">Security Passcode</h3>
              <p class="step-description">
                Set a passcode that users must send to your bot before they can access it.
              </p>

              <div class="form-group">
                <label for="passcode" class="form-label">
                  Bot Passcode
                  <span class="required">*</span>
                </label>
                <div class="input-wrapper passcode-wrapper" class:error={passcodeError !== ''} class:valid={isStep3Valid}>
                  <input
                    type={showPasscode ? 'text' : 'password'}
                    id="passcode"
                    class="form-input"
                    placeholder="Enter a secure passcode"
                    value={formData.passcode}
                    on:input={handlePasscodeInput}
                    maxlength={PASSCODE_MAX_LENGTH}
                    autocomplete="off"
                  />
                  <button
                    type="button"
                    class="visibility-toggle passcode-visibility-toggle"
                    on:click={togglePasscodeVisibility}
                    aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  >
                    {#if showPasscode}
                      <!-- Eye-off icon -->
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    {:else}
                      <!-- Eye icon -->
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    {/if}
                  </button>
                  <button
                    type="button"
                    class="generate-passcode-btn"
                    on:click={generateRandomPasscode}
                    aria-label="Generate random passcode"
                    title="Generate random passcode"
                  >
                    <!-- Dice icon -->
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"></circle>
                      <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"></circle>
                      <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"></circle>
                      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"></circle>
                    </svg>
                  </button>
                </div>
                <div class="input-meta">
                  <span class="char-count" class:near-limit={formData.passcode.length > PASSCODE_MAX_LENGTH - 3}>
                    {formData.passcode.length}/{PASSCODE_MAX_LENGTH}
                  </span>
                </div>
                {#if passcodeError}
                  <span class="error-message" transition:fade={{ duration: 150 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    {passcodeError}
                  </span>
                {/if}
                <div class="help-box security-help-box">
                  <div class="help-box-icon">🔒</div>
                  <div class="help-box-content">
                    <p class="help-box-title">Why do I need a passcode?</p>
                    <p class="help-box-text">
                      Users must message this passcode to your bot before they can access it. This prevents unauthorized access.
                    </p>
                  </div>
                </div>
                <span class="help-text">
                  Use {PASSCODE_MIN_LENGTH}-{PASSCODE_MAX_LENGTH} characters. Click the dice icon to generate a random passcode.
                </span>
              </div>
            </div>
          {:else if currentStep === 4}
            <!-- Step 4: Review and Launch -->
            <div class="step-form" in:fade={{ duration: 200 }}>
              <h3 class="step-title">Review and Launch</h3>
              <p class="step-description">
                Review your configuration before launching your {selectedMinion?.name || 'bot'}.
              </p>

              <!-- Configuration Summary Card -->
              <div class="summary-card">
                <div class="summary-header">
                  {#if selectedMinion}
                    <div class="summary-avatar">
                      <MinionAvatar3D 
                        minionId={selectedMinion.id} 
                        color={selectedMinion.color}
                        isHovered={false}
                        isSelected={true}
                      />
                    </div>
                    <div class="summary-minion-info">
                      <span class="summary-minion-name" style="color: {selectedMinion.color}">{selectedMinion.name}</span>
                      <span class="summary-minion-role">AI Assistant</span>
                    </div>
                  {/if}
                </div>
                
                <div class="summary-divider"></div>
                
                <div class="summary-details">
                  <div class="summary-row">
                    <span class="summary-label">Bot Name</span>
                    <span class="summary-value">{formData.botName}</span>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">Telegram</span>
                    <span class="summary-value status-connected">● Connected</span>
                  </div>
                  <div class="summary-row">
                    <span class="summary-label">Passcode</span>
                    <div class="summary-passcode">
                      <span class="summary-value passcode-value">
                        {showReviewPasscode ? formData.passcode : '•'.repeat(formData.passcode.length)}
                      </span>
                      <button
                        type="button"
                        class="passcode-toggle"
                        on:click={toggleReviewPasscodeVisibility}
                        aria-label={showReviewPasscode ? 'Hide passcode' : 'Show passcode'}
                      >
                        {#if showReviewPasscode}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        {:else}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        {/if}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Credit Cost Breakdown -->
              <div class="credits-section">
                <h4 class="credits-title">💰 Credit Usage</h4>
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
                  <div class="warning-banner" transition:fade={{ duration: 200 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span>Low balance! You have less than 2 hours of runtime remaining.</span>
                  </div>
                {/if}
              </div>

              <!-- Error Message -->
              {#if launchError}
                <div class="launch-error" transition:fade={{ duration: 150 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  {launchError}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Step Indicator -->
        <div class="step-indicator-container">
          <div class="step-indicator">
            {#each Array(totalSteps) as _, i}
              <div class="step-dot-wrapper">
                <span 
                  class="step-dot" 
                  class:active={currentStep === i + 1}
                  class:completed={currentStep > i + 1}
                ></span>
                {#if i < totalSteps - 1}
                  <span class="step-line-segment" class:completed={currentStep > i + 1}></span>
                {/if}
              </div>
            {/each}
          </div>
          <span class="step-text">Step {currentStep} of {totalSteps}</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        {#if currentStep > 1}
          <button 
            class="btn btn-secondary" 
            on:click={goToPreviousStep}
            disabled={isLaunching}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        {:else}
          <button class="btn btn-secondary" on:click={handleCloseAttempt} disabled={isLaunching}>
            Cancel
          </button>
        {/if}
        
        {#if currentStep === 4}
          <!-- Launch Bot button for Step 4 -->
          <button 
            class="btn btn-primary btn-launch" 
            style="--btn-color: {selectedMinion?.color || '#6366f1'}"
            on:click={handleLaunch}
            disabled={isLaunching}
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
          <!-- Next button for Steps 1-3 -->
          <button 
            class="btn btn-primary" 
            style="--btn-color: {selectedMinion?.color || '#6366f1'}"
            on:click={goToNextStep}
            disabled={(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid) || (currentStep === 3 && !isStep3Valid)}
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
        transition:fade={{ duration: 150 }}
      >
        <div 
          class="confirm-dialog"
          transition:scale={{ duration: 200, start: 0.95 }}
        >
          <div class="confirm-icon">⚠️</div>
          <h3 class="confirm-title">Discard Changes?</h3>
          <p class="confirm-text">You have unsaved changes. Are you sure you want to close?</p>
          <div class="confirm-actions">
            <button class="btn btn-secondary" on:click={cancelClose}>
              Keep Editing
            </button>
            <button class="btn btn-danger" on:click={confirmClose}>
              Discard
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

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
    max-width: 600px;
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
    width: 36px;
    height: 36px;
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

  /* Visibility Toggle Button */
  .visibility-toggle {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 0.375rem;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .visibility-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .visibility-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  /* Passcode Input with Generate Button */
  .passcode-wrapper .form-input {
    padding-right: 5.5rem;
  }

  .passcode-visibility-toggle {
    right: 3rem;
  }

  .generate-passcode-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: linear-gradient(135deg, var(--minion-color, #6366f1) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 1px solid var(--minion-color, #6366f1);
    border-radius: 8px;
    padding: 0.375rem;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .generate-passcode-btn:hover {
    background-position: 100% 0;
    box-shadow: 0 0 10px var(--minion-color, #6366f1);
  }

  .generate-passcode-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
  }

  .security-help-box {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
  }

  /* Help Box */
  .help-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 12px;
    margin-top: 0.5rem;
  }

  .help-box-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .help-box-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .help-box-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  .help-box-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
    line-height: 1.5;
  }

  .help-link {
    color: var(--minion-color, #6366f1);
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .help-link:hover {
    text-decoration: underline;
    opacity: 0.9;
  }

  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
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
    transition: all 0.3s ease;
  }

  .step-dot.active {
    background: var(--minion-color, #6366f1);
    box-shadow: 0 0 10px var(--minion-color, #6366f1);
    transform: scale(1.2);
  }

  .step-dot.completed {
    background: #10b981;
  }

  .step-line-segment {
    width: 40px;
    height: 2px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 0.5rem;
    transition: all 0.3s ease;
  }

  .step-line-segment.completed {
    background: #10b981;
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

  /* Summary Card */
  .summary-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .summary-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .summary-avatar {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .summary-minion-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .summary-minion-name {
    font-size: 1.125rem;
    font-weight: 700;
  }

  .summary-minion-role {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .summary-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
  }

  .summary-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .summary-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .summary-value {
    font-size: 0.9375rem;
    color: white;
    font-weight: 500;
  }

  .status-connected {
    color: #10b981;
  }

  .summary-passcode {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .passcode-value {
    font-family: 'Monaco', 'Menlo', monospace;
    letter-spacing: 0.1em;
  }

  .passcode-toggle {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 0.25rem;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .passcode-toggle:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  /* Credits Section */
  .credits-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .credits-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }

  .credits-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
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
  .btn-launch {
    min-width: 140px;
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

    .step-line-segment {
      width: 30px;
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
      font-size: 16px; /* Prevents zoom on iOS */
    }

    .summary-card {
      padding: 1rem;
    }

    .summary-avatar {
      width: 50px;
      height: 50px;
    }

    .summary-minion-name {
      font-size: 1rem;
    }

    .credits-card {
      padding: 0.875rem;
    }

    .warning-banner {
      font-size: 0.75rem;
    }
  }

  /* Tablet */
  @media (max-width: 1024px) and (min-width: 769px) {
    .modal-container {
      max-width: 500px;
    }
  }
</style>
