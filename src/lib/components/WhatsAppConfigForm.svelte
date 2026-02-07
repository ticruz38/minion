<script lang="ts" context="module">
  // WhatsApp configuration types - exported from module context
  export type DMPolicy = 'pairing' | 'allowlist' | 'open';

  export interface WhatsAppConfig {
    phoneNumber: string;
    apiKey: string;
    webhookUrl: string;
    dmPolicy: DMPolicy;
    allowedUsers: string[];
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';

  // Props
  export let isTesting = false;

  // Form data (bindable)
  export let config: WhatsAppConfig = {
    phoneNumber: '',
    apiKey: '',
    webhookUrl: '',
    dmPolicy: 'pairing',
    allowedUsers: []
  };

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    change: WhatsAppConfig;
    valid: boolean;
  }>();

  // Local state
  let showApiKey = false;
  let phoneTouched = false;
  let apiKeyTouched = false;
  let allowedUsersInput = '';

  // E.164 phone validation: + followed by 10-15 digits
  const PHONE_REGEX = /^\+[1-9]\d{9,14}$/;

  // API key validation: alphanumeric and common special chars
  const API_KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

  // dmPolicy options
  const dmPolicyOptions: { value: DMPolicy; label: string; description: string }[] = [
    {
      value: 'pairing',
      label: 'Pairing Mode',
      description: 'Users must enter a pairing code to access the bot'
    },
    {
      value: 'allowlist',
      label: 'Allowlist',
      description: 'Only specified phone numbers can access the bot'
    },
    {
      value: 'open',
      label: 'Open Access',
      description: 'Anyone can message the bot (not recommended)'
    }
  ];

  // Phone validation
  $: phoneError = validatePhone(config.phoneNumber, phoneTouched);

  // API key validation
  $: apiKeyError = validateApiKey(config.apiKey, apiKeyTouched);

  // Check if form is valid
  $: isValid = PHONE_REGEX.test(config.phoneNumber) && 
               API_KEY_REGEX.test(config.apiKey) && 
               config.apiKey.length > 0;

  // Update allowed users array when input changes
  $: {
    const users = allowedUsersInput
      .split(/[\n,]/)
      .map(u => u.trim().replace(/\s/g, ''))
      .filter(u => u.length > 0);
    config.allowedUsers = users;
    dispatchChange();
  }

  // Dispatch change and validity events
  function dispatchChange() {
    dispatch('change', config);
    dispatch('valid', isValid);
  }

  function validatePhone(phone: string, touched: boolean): string {
    if (!touched && phone.length === 0) {
      return '';
    }
    if (phone.length === 0) {
      return 'Phone number is required';
    }
    if (!phone.startsWith('+')) {
      return 'Phone number must start with + (E.164 format)';
    }
    if (!PHONE_REGEX.test(phone)) {
      return 'Invalid format. Use E.164: +1234567890 (10-15 digits after +)';
    }
    return '';
  }

  function validateApiKey(apiKey: string, touched: boolean): string {
    if (!touched && apiKey.length === 0) {
      return '';
    }
    if (apiKey.length === 0) {
      return 'API key is required';
    }
    if (!API_KEY_REGEX.test(apiKey)) {
      return 'API key contains invalid characters';
    }
    return '';
  }

  function handlePhoneInput(e: Event) {
    const input = e.target as HTMLInputElement;
    config = { ...config, phoneNumber: input.value };
    phoneTouched = true;
    dispatchChange();
  }

  function handleApiKeyInput(e: Event) {
    const input = e.target as HTMLInputElement;
    config = { ...config, apiKey: input.value };
    apiKeyTouched = true;
    dispatchChange();
  }

  function handleWebhookInput(e: Event) {
    const input = e.target as HTMLInputElement;
    config = { ...config, webhookUrl: input.value };
    dispatchChange();
  }

  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }

  function handleDMPolicyChange(policy: DMPolicy) {
    config = { ...config, dmPolicy: policy };
    dispatchChange();
  }

  function handleAllowedUsersInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    allowedUsersInput = textarea.value;
  }
</script>

<div class="whatsapp-config-form" data-testid="whatsapp-config-form">
  <div class="form-header">
    <h3 class="form-title">WhatsApp Configuration</h3>
    <p class="form-description">
      Configure your WhatsApp Business API settings and security policies.
    </p>
  </div>

  <!-- Phone Number Input -->
  <div class="form-group">
    <label for="whatsapp-phone" class="form-label">
      Phone Number
      <span class="required">*</span>
    </label>
    <div class="input-wrapper" class:error={phoneError !== ''} class:valid={PHONE_REGEX.test(config.phoneNumber)}>
      <input
        type="text"
        id="whatsapp-phone"
        class="form-input"
        placeholder="+1234567890"
        value={config.phoneNumber}
        on:input={handlePhoneInput}
        autocomplete="off"
        data-testid="whatsapp-phone-input"
      />
      {#if PHONE_REGEX.test(config.phoneNumber)}
        <span class="input-icon valid-icon" aria-hidden="true">✓</span>
      {/if}
    </div>
    {#if phoneError}
      <span class="error-message" transition:fade={{ duration: isTesting ? 0 : 150 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {phoneError}
      </span>
    {/if}
    <span class="help-text">
      Enter your WhatsApp Business phone number in E.164 format (e.g., +14155238886)
    </span>
  </div>

  <!-- API Key Input -->
  <div class="form-group">
    <label for="whatsapp-api-key" class="form-label">
      API Key
      <span class="required">*</span>
    </label>
    <div class="input-wrapper" class:error={apiKeyError !== ''} class:valid={API_KEY_REGEX.test(config.apiKey) && config.apiKey.length > 0}>
      <input
        type={showApiKey ? 'text' : 'password'}
        id="whatsapp-api-key"
        class="form-input"
        placeholder="your_api_key_here"
        value={config.apiKey}
        on:input={handleApiKeyInput}
        autocomplete="off"
        data-testid="whatsapp-api-key-input"
      />
      <button
        type="button"
        class="visibility-toggle"
        on:click={toggleApiKeyVisibility}
        aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
        data-testid="api-key-visibility-toggle"
      >
        {#if showApiKey}
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
      {#if API_KEY_REGEX.test(config.apiKey) && config.apiKey.length > 0}
        <span class="input-icon valid-icon" aria-hidden="true">✓</span>
      {/if}
    </div>
    {#if apiKeyError}
      <span class="error-message" transition:fade={{ duration: isTesting ? 0 : 150 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        {apiKeyError}
      </span>
    {/if}
  </div>

  <!-- Webhook URL Input (Optional) -->
  <div class="form-group">
    <label for="whatsapp-webhook" class="form-label">
      Webhook URL
      <span class="optional">(optional)</span>
    </label>
    <div class="input-wrapper">
      <input
        type="text"
        id="whatsapp-webhook"
        class="form-input"
        placeholder="https://your-server.com/webhook"
        value={config.webhookUrl}
        on:input={handleWebhookInput}
        autocomplete="off"
        data-testid="whatsapp-webhook-input"
      />
    </div>
    <span class="help-text">
      Optional webhook URL for receiving message events. If not provided, we'll handle polling automatically.
    </span>
  </div>

  <!-- Help Box -->
  <div class="help-box">
    <div class="help-box-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </div>
    <div class="help-box-content">
      <p class="help-box-title">Need WhatsApp Business API access?</p>
      <p class="help-box-text">
        Sign up at the <a href="https://business.whatsapp.com/products/business-platform" target="_blank" rel="noopener noreferrer" class="help-link">WhatsApp Business Platform</a> to get your phone number and API credentials.
      </p>
    </div>
  </div>

  <!-- DM Policy Selection -->
  <div class="form-group">
    <span class="form-label">Security Policy</span>
    <div class="policy-options" role="radiogroup" aria-label="Select security policy">
      {#each dmPolicyOptions as option}
        <button
          type="button"
          class="policy-option"
          class:selected={config.dmPolicy === option.value}
          on:click={() => handleDMPolicyChange(option.value)}
          role="radio"
          aria-checked={config.dmPolicy === option.value}
          data-testid="dm-policy-{option.value}"
        >
          <div class="policy-radio">
            <div class="radio-circle" class:checked={config.dmPolicy === option.value}>
              {#if config.dmPolicy === option.value}
                <div class="radio-dot"></div>
              {/if}
            </div>
          </div>
          <div class="policy-content">
            <span class="policy-label">{option.label}</span>
            <span class="policy-description">{option.description}</span>
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Pairing Mode Info Box -->
  {#if config.dmPolicy === 'pairing'}
    <div class="info-box pairing-info" transition:fade={{ duration: isTesting ? 0 : 150 }}>
      <div class="info-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </div>
      <div class="info-content">
        <p class="info-title">🔒 Pairing Mode Active</p>
        <p class="info-text">
          Users will need to enter a pairing code before they can interact with your bot. This is the recommended security setting.
        </p>
      </div>
    </div>
  {/if}

  <!-- Allowed Users Input (only for allowlist mode) -->
  {#if config.dmPolicy === 'allowlist'}
    <div class="form-group" transition:fade={{ duration: isTesting ? 0 : 150 }}>
      <label for="allowed-users" class="form-label">
        Allowed Phone Numbers
        <span class="optional">(optional)</span>
      </label>
      <textarea
        id="allowed-users"
        class="form-textarea"
        placeholder="+1234567890&#10;+441234567890&#10;+919876543210"
        value={allowedUsersInput}
        on:input={handleAllowedUsersInput}
        rows="4"
        data-testid="allowed-users-input"
      ></textarea>
      <span class="help-text">
        Enter phone numbers in E.164 format, separated by commas or new lines.
      </span>
      {#if config.allowedUsers.length > 0}
        <div class="user-chips" transition:fade={{ duration: isTesting ? 0 : 150 }}>
          {#each config.allowedUsers as phone}
            <span class="user-chip">{phone}</span>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Open Mode Warning -->
  {#if config.dmPolicy === 'open'}
    <div class="warning-box" transition:fade={{ duration: isTesting ? 0 : 150 }}>
      <div class="warning-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <div class="warning-content">
        <p class="warning-title">⚠️ Open Access Warning</p>
        <p class="warning-text">
          Anyone with your phone number can message your bot. This may result in unexpected usage and credit consumption.
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .whatsapp-config-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin: 0;
  }

  .form-description {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  /* Form Group */
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

  .optional {
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
    font-size: 0.8rem;
  }

  /* Input Styles */
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .form-input {
    width: 100%;
    padding: 0.875rem 1rem;
    padding-right: 3rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-size: 1rem;
    transition: all 0.2s ease;
    font-family: monospace;
  }

  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-input:focus {
    outline: none;
    border-color: #25d366;
    background: rgba(255, 255, 255, 0.08);
  }

  .input-wrapper.valid .form-input {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.05);
  }

  .input-wrapper.error .form-input {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.05);
  }

  /* Visibility Toggle */
  .visibility-toggle {
    position: absolute;
    right: 0.75rem;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .visibility-toggle:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  /* Valid Icon */
  .input-icon {
    position: absolute;
    right: 3rem;
    color: #10b981;
    font-weight: 700;
  }

  /* Error Message */
  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #ef4444;
  }

  /* Help Box */
  .help-box {
    display: flex;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(37, 211, 102, 0.08);
    border: 1px solid rgba(37, 211, 102, 0.2);
    border-radius: 12px;
    margin-top: 0.5rem;
  }

  .help-box-icon {
    display: flex;
    align-items: flex-start;
    color: #25d366;
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
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .help-box-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.4;
  }

  .help-link {
    color: #25d366;
    font-weight: 600;
    text-decoration: underline;
    transition: opacity 0.2s ease;
  }

  .help-link:hover {
    opacity: 0.8;
  }

  /* Help text */
  .help-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
  }

  /* Policy Options */
  .policy-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .policy-option {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .policy-option:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .policy-option.selected {
    background: rgba(37, 211, 102, 0.08);
    border-color: #25d366;
  }

  .policy-option:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 211, 102, 0.1);
  }

  .policy-radio {
    flex-shrink: 0;
    padding-top: 0.125rem;
  }

  .radio-circle {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .policy-option.selected .radio-circle {
    border-color: #25d366;
  }

  .radio-circle.checked {
    background: #25d366;
  }

  .radio-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
  }

  .policy-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .policy-label {
    font-size: 0.9375rem;
    font-weight: 600;
    color: white;
  }

  .policy-option.selected .policy-label {
    color: #25d366;
  }

  .policy-description {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
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

  .info-icon {
    display: flex;
    align-items: flex-start;
    color: #10b981;
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
    line-height: 1.4;
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
    display: flex;
    align-items: flex-start;
    color: #f59e0b;
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
    line-height: 1.4;
  }

  /* Textarea */
  .form-textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-size: 0.9375rem;
    transition: all 0.2s ease;
    resize: vertical;
    min-height: 100px;
    font-family: inherit;
  }

  .form-textarea::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-textarea:focus {
    outline: none;
    border-color: #25d366;
    background: rgba(255, 255, 255, 0.08);
  }

  /* User Chips */
  .user-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .user-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.75rem;
    background: rgba(37, 211, 102, 0.2);
    color: #25d366;
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 100px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .form-input,
    .form-textarea,
    .policy-option,
    .visibility-toggle {
      transition: none !important;
    }
  }
</style>
