<script lang="ts" context="module">
  // Progress modal types - exported from module context
  export type VMProgressStatus = 'idle' | 'acknowledged' | 'creating' | 'success' | 'error';

  export interface VMConnectionInfo {
    telegram?: { botUsername: string };
    discord?: { botUsername: string };
    whatsapp?: { phoneNumber: string };
  }

  export interface VMProgressData {
    status: VMProgressStatus;
    message?: string;
    vmId?: string;
    connectionInfo?: VMConnectionInfo;
    error?: {
      code: string;
      message: string;
    };
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  // Props
  export let isOpen = false;
  export let commandId = ''; // For external reference - parent can read this value
  export let botId = ''; // Bot ID for SSE connection
  export let minionColor = '#6366f1';
  export let isTesting = false;
  export let botName = ''; // Bot name to display

  // Internal state
  let progressData: VMProgressData = {
    status: 'idle'
  };
  let progressPercent = 0;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  let modalElement: HTMLDivElement;
  let eventSource: EventSource | null = null;

  // Event dispatcher
  const dispatch = createEventDispatcher<{
    close: void;
    retry: void;
    success: { vmId?: string; connectionInfo?: VMConnectionInfo };
  }>();

  // Progress steps with labels and percentages
  const progressSteps = [
    { status: 'idle', label: 'Initializing...', percent: 5 },
    { status: 'acknowledged', label: 'Request acknowledged...', percent: 25 },
    { status: 'creating', label: 'Creating your bot...', percent: 60 },
    { status: 'success', label: 'Bot created successfully!', percent: 100 },
    { status: 'error', label: 'Creation failed', percent: 100 }
  ];

  // Current step info
  $: currentStep = progressSteps.find(s => s.status === progressData.status) || progressSteps[0];
  
  // Animate progress bar
  $: targetPercent = currentStep.percent;
  $: {
    if (progressPercent < targetPercent) {
      const diff = targetPercent - progressPercent;
      progressPercent += Math.max(1, Math.floor(diff / 10));
    }
  }

  // Simulate progress animation when in creating state
  function startProgressAnimation() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
      if (progressData.status === 'creating' && progressPercent < 90) {
        progressPercent = Math.min(90, progressPercent + 2);
      }
    }, 500);
  }

  // Connect to SSE endpoint for real-time updates
  function connectSSE() {
    if (!botId || typeof window === 'undefined') return;

    // Close existing connection if any
    closeSSE();

    const sseUrl = `/api/bots/${botId}/events`;
    console.log(`[VMProgressModal] Connecting to SSE: ${sseUrl}`);

    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('[VMProgressModal] SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[VMProgressModal] SSE message received:', data);

        // Map SSE event to progress data
        switch (data.status) {
          case 'ACKNOWLEDGED':
            updateStatus({
              status: 'acknowledged',
              message: data.message || 'Request acknowledged by backend'
            });
            break;
          case 'SUCCESS':
            updateStatus({
              status: 'success',
              vmId: data.data?.vmId || botId,
              connectionInfo: data.data?.connectionInfo,
              message: data.message || 'Bot created successfully'
            });
            closeSSE(); // Close connection on success
            break;
          case 'ERROR':
            updateStatus({
              status: 'error',
              error: data.error || { code: 'UNKNOWN_ERROR', message: data.message || 'Unknown error' }
            });
            closeSSE(); // Close connection on error
            break;
        }
      } catch (err) {
        console.error('[VMProgressModal] Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[VMProgressModal] SSE error:', err);
      // Only show error if we haven't already reached a terminal state
      if (progressData.status !== 'success' && progressData.status !== 'error') {
        updateStatus({
          status: 'error',
          error: { code: 'SSE_ERROR', message: 'Lost connection to server' }
        });
      }
      closeSSE();
    };
  }

  // Close SSE connection
  function closeSSE() {
    if (eventSource) {
      console.log('[VMProgressModal] Closing SSE connection');
      eventSource.close();
      eventSource = null;
    }
  }

  function stopProgressAnimation() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
  }

  // Handle status updates (called by parent when Redis events received)
  export function updateStatus(data: VMProgressData) {
    progressData = data;
    
    switch (data.status) {
      case 'acknowledged':
        progressPercent = 25;
        startProgressAnimation();
        break;
      case 'creating':
        if (progressPercent < 40) progressPercent = 40;
        startProgressAnimation();
        break;
      case 'success':
        stopProgressAnimation();
        progressPercent = 100;
        // Auto-close after showing success for 3 seconds
        setTimeout(() => {
          dispatch('success', { 
            vmId: data.vmId, 
            connectionInfo: data.connectionInfo 
          });
        }, 2500);
        break;
      case 'error':
        stopProgressAnimation();
        progressPercent = 100;
        break;
    }
  }

  // Reset modal state
  export function reset() {
    stopProgressAnimation();
    progressData = { status: 'idle' };
    progressPercent = 0;
  }

  function handleRetry() {
    dispatch('retry');
  }

  function handleClose() {
    dispatch('close');
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === modalElement) {
      // Only allow closing on error or success states
      if (progressData.status === 'error' || progressData.status === 'success') {
        handleClose();
      }
    }
  }

  // Handle escape key
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      // Only allow closing on error or success states
      if (progressData.status === 'error' || progressData.status === 'success') {
        handleClose();
      }
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    // Connect to SSE when modal opens with a botId
    if (isOpen && botId) {
      connectSSE();
    }
  });

  onDestroy(() => {
    stopProgressAnimation();
    closeSSE();
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  // Watch for modal open/close and botId changes
  $: if (isOpen && botId && typeof window !== 'undefined') {
    connectSSE();
  } else if (!isOpen) {
    closeSSE();
  }

  // Get status icon based on current state
  function getStatusIcon(): string {
    switch (progressData.status) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'creating':
        return '⚙️';
      case 'acknowledged':
        return '📡';
      default:
        return '⏳';
    }
  }

  // Copy to clipboard
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div 
    class="modal-overlay"
    bind:this={modalElement}
    on:click={handleBackdropClick}
    transition:fade={{ duration: isTesting ? 0 : 200 }}
    data-testid="vm-progress-modal-overlay"
  >
    <div 
      class="modal-container"
      style="--minion-color: {minionColor}"
      transition:scale={{ 
        duration: isTesting ? 0 : 300, 
        start: 0.95, 
        easing: cubicOut 
      }}
      data-testid="vm-progress-modal"
    >
        <!-- Header -->
      <div class="modal-header">
        <div class="status-icon" aria-hidden="true">
          {#if progressData.status === 'success'}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          {:else if progressData.status === 'error'}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          {:else}
            <div class="spinner-icon" style="color: {minionColor}">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
              </svg>
            </div>
          {/if}
        </div>
        
        <h2 class="modal-title">
          {#if progressData.status === 'success'}
            Bot Created!
          {:else if progressData.status === 'error'}
            Creation Failed
          {:else}
            Creating Your Bot
          {/if}
        </h2>
        
        <p class="modal-subtitle">
          {#if progressData.status === 'success'}
            Your bot is ready to use
          {:else if progressData.status === 'error'}
            {progressData.error?.message || 'Something went wrong'}
          {:else}
            {currentStep.label}
          {/if}
        </p>
      </div>

      <!-- Progress Content -->
      <div class="modal-content">
        {#if progressData.status !== 'error' && progressData.status !== 'success'}
          <!-- Progress Bar -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div 
                class="progress-bar" 
                style="width: {progressPercent}%; background: linear-gradient(90deg, {minionColor}, {minionColor}aa)"
              ></div>
            </div>
            <div class="progress-meta">
              <span class="progress-status">{currentStep.label}</span>
              <span class="progress-percent">{progressPercent}%</span>
            </div>
          </div>

          <!-- Status Messages -->
          {#if true}
            {@const status = progressData.status}
            <div class="status-messages" data-testid="status-messages">
              <div class="status-item" class:active={status === 'idle' || status === 'acknowledged'}>
                <span class="status-dot" style="background: {status !== 'idle' ? '#10b981' : minionColor}"></span>
                <span class="status-label">Request sent</span>
              </div>
              <div class="status-item" class:active={status === 'acknowledged' || status === 'creating'}>
                <span class="status-dot" style="background: {status === 'creating' ? '#10b981' : status === 'acknowledged' ? minionColor : 'rgba(255,255,255,0.2)'}"></span>
                <span class="status-label">Request acknowledged</span>
              </div>
              <div class="status-item" class:active={status === 'creating'}>
                <span class="status-dot" style="background: {status === 'creating' ? minionColor : 'rgba(255,255,255,0.2)'}"></span>
                <span class="status-label">Creating bot</span>
              </div>
              <div class="status-item">
                <span class="status-dot" style="background: rgba(255,255,255,0.2)"></span>
                <span class="status-label">Ready!</span>
              </div>
            </div>
          {/if}
        {:else}
          <!-- Success or Error Content - use type guards for proper narrowing -->
          {#if progressData.status === 'success'}
            <div class="success-content" transition:fade={{ duration: isTesting ? 0 : 200 }}>
              <div class="success-message">
                <span class="success-icon">🎉</span>
                <p>Your bot has been successfully created and is now running!</p>
              </div>

              {#if progressData.connectionInfo}
                <div class="connection-info">
                  <h4 class="connection-title">Connection Details</h4>
                  
                  {#if progressData.connectionInfo.telegram}
                    <div class="connection-item">
                      <span class="connection-label">Telegram</span>
                      <span class="connection-value">@{progressData.connectionInfo.telegram.botUsername}</span>
                      <button 
                        class="copy-btn" 
                        on:click={() => copyToClipboard(progressData.connectionInfo?.telegram?.botUsername || '')}
                        title="Copy username"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  {/if}

                  {#if progressData.connectionInfo.discord}
                    <div class="connection-item">
                      <span class="connection-label">Discord</span>
                      <span class="connection-value">{progressData.connectionInfo.discord.botUsername}</span>
                    </div>
                  {/if}

                  {#if progressData.connectionInfo.whatsapp}
                    <div class="connection-item">
                      <span class="connection-label">WhatsApp</span>
                      <span class="connection-value">{progressData.connectionInfo.whatsapp.phoneNumber}</span>
                    </div>
                  {/if}

                  {#if progressData.vmId}
                    <div class="connection-item vm-id-item">
                      <span class="connection-label">VM ID</span>
                      <span class="connection-value vm-id">{progressData.vmId}</span>
                      <button 
                        class="copy-btn" 
                        on:click={() => copyToClipboard(progressData.vmId || '')}
                        title="Copy VM ID"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  {/if}
                </div>
              {/if}

              <p class="closing-hint">This window will close automatically...</p>
            </div>
          {:else if progressData.status === 'error'}
            <!-- Error Content -->
            <div class="error-content" transition:fade={{ duration: isTesting ? 0 : 200 }}>
              <div class="error-message">
                <span class="error-icon">⚠️</span>
                <p>{progressData.error?.message || 'Failed to create your bot. Please try again.'}</p>
              </div>

              {#if progressData.error?.code}
                <div class="error-code">
                  <span class="error-code-label">Error Code:</span>
                  <code>{progressData.error.code}</code>
                </div>
              {/if}

              <div class="error-suggestions">
                <h4>Suggestions:</h4>
                <ul>
                  <li>Check that your bot tokens are valid and correctly formatted</li>
                  <li>Ensure your API keys have the necessary permissions</li>
                  <li>Verify your internet connection</li>
                  <li>Try again in a few moments</li>
                </ul>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        {#if progressData.status === 'error'}
          <button 
            class="btn btn-secondary" 
            on:click={handleClose}
            data-testid="close-button"
          >
            Cancel
          </button>
          <button 
            class="btn btn-primary" 
            on:click={handleRetry}
            style="--btn-color: {minionColor}"
            data-testid="retry-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Try Again
          </button>
        {:else if progressData.status === 'success'}
          <button 
            class="btn btn-primary btn-full" 
            on:click={handleClose}
            style="--btn-color: {minionColor}"
            data-testid="done-button"
          >
            Done
          </button>
        {:else}
          <!-- Processing state - show disabled button -->
          <button 
            class="btn btn-primary btn-full" 
            disabled
            style="--btn-color: {minionColor}"
          >
            <svg class="spinner-small" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"></circle>
            </svg>
            Processing...
          </button>
        {/if}
      </div>
    </div>
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
    z-index: 1100;
    padding: 1rem;
  }

  .modal-container {
    width: 100%;
    max-width: 500px;
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
    flex-direction: column;
    align-items: center;
    padding: 2rem 1.5rem 1.5rem;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .status-icon {
    margin-bottom: 1rem;
  }

  .spinner-icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .modal-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin: 0 0 0.5rem 0;
  }

  .modal-subtitle {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  /* Content */
  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  /* Progress Section */
  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .progress-bar-container {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .progress-status {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .progress-percent {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  /* Status Messages */
  .status-messages {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    transition: all 0.2s ease;
  }

  .status-item.active {
    background: rgba(255, 255, 255, 0.06);
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    transition: background 0.3s ease;
  }

  .status-label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .status-item.active .status-label {
    color: white;
    font-weight: 500;
  }

  /* Success Content */
  .success-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 12px;
  }

  .success-icon {
    font-size: 2rem;
  }

  .success-message p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9375rem;
  }

  .connection-info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .connection-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .connection-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
  }

  .connection-label {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    min-width: 80px;
  }

  .connection-value {
    font-size: 0.9375rem;
    color: white;
    font-weight: 500;
    flex: 1;
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .vm-id {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .copy-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .closing-hint {
    text-align: center;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }

  /* Error Content */
  .error-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 12px;
  }

  .error-icon {
    font-size: 2rem;
  }

  .error-message p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9375rem;
  }

  .error-code {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }

  .error-code-label {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .error-code code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.8125rem;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
  }

  .error-suggestions {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .error-suggestions h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 0.75rem 0;
  }

  .error-suggestions ul {
    margin: 0;
    padding-left: 1.25rem;
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.6;
  }

  .error-suggestions li {
    margin-bottom: 0.375rem;
  }

  .error-suggestions li:last-child {
    margin-bottom: 0;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.5rem 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }

  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    border-radius: 12px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--btn-color, #6366f1) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 2px solid var(--btn-color, #6366f1);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-position: 100% 0;
    box-shadow: 0 0 20px var(--btn-color, #6366f1);
    transform: translateY(-1px);
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

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    transform: none !important;
  }

  .btn-full {
    flex: 1;
  }

  .spinner-small {
    animation: spin 1s linear infinite;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .modal-container {
      max-height: 95vh;
      border-radius: 20px;
    }

    .modal-header {
      padding: 1.5rem 1rem 1rem;
    }

    .modal-content {
      padding: 1rem;
    }

    .modal-footer {
      padding: 1rem;
    }

    .connection-item {
      flex-wrap: wrap;
    }

    .connection-value {
      order: 3;
      width: 100%;
      margin-top: 0.25rem;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .spinner-icon,
    .spinner-small {
      animation: none !important;
    }

    .progress-bar {
      transition: none !important;
    }

    .btn {
      transition: none !important;
    }

    .btn:hover:not(:disabled) {
      transform: none !important;
    }
  }
</style>
