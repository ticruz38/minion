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

  // Check if form has any data
  $: isDirty = formData.botName !== '' || formData.telegramToken !== '' || formData.passcode !== '';

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
          </div>
        {/if}

        <div class="placeholder-content">
          <p class="placeholder-text">Multi-step form coming in next stories...</p>
          <div class="step-indicator">
            <span class="step-dot active"></span>
            <span class="step-dot"></span>
            <span class="step-dot"></span>
            <span class="step-dot"></span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCloseAttempt}>
          Cancel
        </button>
        <button 
          class="btn btn-primary" 
          style="--btn-color: {selectedMinion?.color || '#6366f1'}"
          on:click={() => dispatch('success')}
        >
          Continue
        </button>
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
    justify-content: center;
    padding: 1rem 0;
  }

  .avatar-container {
    width: 160px;
    height: 160px;
    border-radius: 20px;
    border: 2px solid var(--avatar-color);
    padding: 4px;
    box-shadow: 0 0 40px var(--avatar-color);
  }

  .placeholder-content {
    text-align: center;
    padding: 2rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 16px;
  }

  .placeholder-text {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.9375rem;
    margin: 0 0 1.5rem 0;
  }

  .step-indicator {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }

  .step-dot.active {
    background: var(--minion-color, #6366f1);
    box-shadow: 0 0 10px var(--minion-color, #6366f1);
    width: 24px;
    border-radius: 4px;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    justify-content: flex-end;
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
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--btn-color, #6366f1) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 2px solid var(--btn-color, #6366f1);
    color: white;
  }

  .btn-primary:hover {
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
      width: 120px;
      height: 120px;
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
    }
  }

  /* Tablet */
  @media (max-width: 1024px) and (min-width: 769px) {
    .modal-container {
      max-width: 500px;
    }
  }
</style>
