<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fade, scale } from 'svelte/transition';
  import ScrollStory3D from '$lib/components/ScrollStory3D.svelte';
  import StoryOverlay from '$lib/components/StoryOverlay.svelte';
  import MinionHireCard from '$lib/components/MinionHireCard.svelte';
  import { minions } from '$lib/minions-data';

  // Story state
  let currentPhase = 'INTRO';
  let phaseProgress = 0;
  let scrollProgress = 0;
  
  // Modal state
  let hiringMinion: { id: string; name: string; color: string } | null = null;
  let isModalOpen = false;
  let showToast = false;
  let toastMessage = '';

  function handlePhaseChange(event: CustomEvent<{ phase: string; progress: number; scrollProgress: number }>) {
    currentPhase = event.detail.phase;
    phaseProgress = event.detail.progress;
    scrollProgress = event.detail.scrollProgress ?? 0;
  }

  function handleHire() {
    // Default to Benny (Accountant) for the story
    const minion = minions[0];
    hiringMinion = {
      id: minion.id,
      name: minion.name,
      color: minion.color
    };
    isModalOpen = true;
  }

  function handleModalSuccess() {
    showToast = true;
    toastMessage = `${hiringMinion?.name} is being deployed!`;
    setTimeout(() => showToast = false, 5000);
    isModalOpen = false;
    hiringMinion = null;
  }

  function handleModalClose() {
    isModalOpen = false;
    hiringMinion = null;
  }
</script>

<svelte:head>
  <title>Minion | Your AI Workforce</title>
  <meta name="description" content="Deploy an army of AI assistants that work 24/7 in your cloud." />
  <style>
    /* Prevent default scroll behavior - we're handling it in 3D */
    body {
      overflow: hidden;
      height: 100vh;
    }
  </style>
</svelte:head>

<div class="page">
  <!-- Fixed Navigation -->
  <nav class="nav" class:hidden={currentPhase === 'CTA' && phaseProgress > 0.5}>
    <a href="/" class="logo">
      <span class="logo-icon">🤖</span>
      <span class="logo-text">Minion</span>
    </a>
    <div class="nav-links">
      <a href="/minions" class="nav-link">Browse Minions</a>
      <a href="/team/default" class="nav-link">My Team</a>
    </div>
  </nav>

  <!-- 3D Scroll Story Scene -->
  <ScrollStory3D on:phaseChange={handlePhaseChange} />

  <!-- HTML Overlay -->
  <StoryOverlay phase={currentPhase} progress={phaseProgress} {scrollProgress} />

  <!-- Quick actions (visible in certain phases) -->
  {#if currentPhase === 'CAPABILITY_1' || currentPhase === 'CAPABILITY_2' || currentPhase === 'CAPABILITY_3'}
    <div class="floating-actions" transition:fade={{ duration: 300 }}>
      <button class="action-btn" on:click={() => goto('/minions')}>
        <span>See All Features</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  {/if}
</div>

<!-- Minion Hire Card -->
{#if isModalOpen && hiringMinion}
  {@const minionData = minions.find(m => m.id === hiringMinion?.id)}
  {#if minionData}
    <MinionHireCard 
      minion={minionData}
      isOpen={isModalOpen}
      on:close={handleModalClose}
      on:success={handleModalSuccess}
    />
  {/if}
{/if}

<!-- Toast Notification -->
{#if showToast}
  <div class="toast" transition:scale={{ duration: 300, start: 0.9 }}>
    <span class="toast-icon">✓</span>
    <p>{toastMessage}</p>
  </div>
{/if}

<style>
  :global(body) {
    background: #0f0c0a;
    color: #F7F5F0;
    margin: 0;
    overflow: hidden;
  }

  .page {
    position: fixed;
    inset: 0;
    background: #0f0c0a;
  }

  /* Navigation */
  .nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 3rem;
    background: linear-gradient(to bottom, rgba(15, 12, 10, 0.9), transparent);
    backdrop-filter: blur(10px);
    transition: opacity 0.5s, transform 0.5s;
  }

  .nav.hidden {
    opacity: 0;
    transform: translateY(-100%);
    pointer-events: none;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .logo-icon {
    font-size: 1.75rem;
  }

  .logo-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: #F7F5F0;
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: -0.02em;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-link {
    color: rgba(247, 245, 240, 0.7);
    font-size: 0.9375rem;
    font-weight: 500;
    transition: color 0.2s;
    text-decoration: none;
  }

  .nav-link:hover {
    color: #F7F5F0;
  }

  /* Floating Actions */
  .floating-actions {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    z-index: 50;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 100px;
    color: #F7F5F0;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    backdrop-filter: blur(10px);
  }

  .action-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
  }

  /* Toast */
  .toast {
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
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    z-index: 2000;
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
  }

  .toast p {
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .nav {
      padding: 1rem 1.5rem;
    }

    .nav-links {
      display: none;
    }

    .floating-actions {
      bottom: 1.5rem;
      right: 1.5rem;
      left: 1.5rem;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
