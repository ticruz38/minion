<script lang="ts">
  import { onMount } from 'svelte';
  import MinionAvatar3D from './MinionAvatar3D.svelte';

  interface Minion {
    id: string;
    name: string;
    tagline: string;
    description: string;
    features: string[];
    color: string;
    stats: { label: string; value: number }[];
  }

  const minions: Minion[] = [
    {
      id: 'accountant',
      name: 'The Accountant',
      tagline: 'Your books, perfectly balanced',
      description: 'Handles invoicing, expense tracking, tax prep, and financial reports.',
      features: ['Invoicing', 'Expense Tracking', 'Tax Reports', 'Bank Reconciliation'],
      color: '#10b981',
      stats: [
        { label: 'Accuracy', value: 98 },
        { label: 'Speed', value: 85 },
        { label: 'Detail', value: 95 }
      ]
    },
    {
      id: 'realtor',
      name: 'The Real Estate Scout',
      tagline: 'Never miss a good deal',
      description: 'Scans listings 24/7, alerts you to opportunities, tracks market trends.',
      features: ['Listing Alerts', 'Market Analysis', 'Property Database', 'Lead Tracking'],
      color: '#f59e0b',
      stats: [
        { label: 'Speed', value: 95 },
        { label: 'Coverage', value: 90 },
        { label: 'Insight', value: 88 }
      ]
    },
    {
      id: 'analyst',
      name: 'The Financial Analyst',
      tagline: 'Data-driven decisions',
      description: 'Monitors markets, analyzes portfolios, generates reports.',
      features: ['Portfolio Tracking', 'Market Alerts', 'Risk Analysis', 'Report Generation'],
      color: '#8b5cf6',
      stats: [
        { label: 'Analysis', value: 98 },
        { label: 'Prediction', value: 85 },
        { label: 'Depth', value: 92 }
      ]
    },
    {
      id: 'restaurant',
      name: 'The Restaurant Secretary',
      tagline: 'Your virtual maître d\'',
      description: 'Takes reservations, manages orders, coordinates with kitchen.',
      features: ['Table Booking', 'Order Taking', 'Customer Chat', 'Staff Coordination'],
      color: '#ef4444',
      stats: [
        { label: 'Service', value: 96 },
        { label: 'Speed', value: 92 },
        { label: 'Charm', value: 94 }
      ]
    },
    {
      id: 'scheduler',
      name: 'The Schedule Master',
      tagline: 'Your calendar, optimized',
      description: 'Manages appointments, finds optimal meeting times, sends reminders.',
      features: ['Smart Scheduling', 'Conflict Resolution', 'Auto Reminders', 'Time Blocking'],
      color: '#06b6d4',
      stats: [
        { label: 'Efficiency', value: 97 },
        { label: 'Flexibility', value: 88 },
        { label: 'Reliability', value: 99 }
      ]
    },
    {
      id: 'support',
      name: 'The Support Agent',
      tagline: 'Always on, always helpful',
      description: 'Answers customer queries, routes complex issues, maintains FAQs.',
      features: ['24/7 Response', 'Ticket Routing', 'FAQ Management', 'Escalation'],
      color: '#ec4899',
      stats: [
        { label: 'Response', value: 99 },
        { label: 'Knowledge', value: 90 },
        { label: 'Empathy', value: 95 }
      ]
    }
  ];

  let selectedIndex = 0;
  let hoveredIndex = -1;
  let isAnimating = false;
  let showStats = false;
  let touchStartX = 0;
  let touchEndX = 0;

  $: selectedMinion = minions[selectedIndex];

  function selectMinion(index: number) {
    if (isAnimating || index === selectedIndex) return;
    isAnimating = true;
    showStats = false;
    
    setTimeout(() => {
      selectedIndex = index;
      setTimeout(() => {
        showStats = true;
        isAnimating = false;
      }, 300);
    }, 150);
  }

  function hireMinion() {
    const event = new CustomEvent('hireMinion', { detail: selectedMinion });
    window.dispatchEvent(event);
  }

  // Touch/Swipe handlers for mobile
  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.changedTouches[0].screenX;
  }

  function handleTouchEnd(e: TouchEvent) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left - next
        const nextIndex = selectedIndex === minions.length - 1 ? 0 : selectedIndex + 1;
        selectMinion(nextIndex);
      } else {
        // Swipe right - previous
        const prevIndex = selectedIndex === 0 ? minions.length - 1 : selectedIndex - 1;
        selectMinion(prevIndex);
      }
    }
  }

  onMount(() => {
    // Entrance animation
    setTimeout(() => {
      showStats = true;
    }, 800);

    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = selectedIndex === 0 ? minions.length - 1 : selectedIndex - 1;
          selectMinion(prevIndex);
          break;
        case 'ArrowRight':
        case ' ': // Space also works
          e.preventDefault();
          const nextIndex = selectedIndex === minions.length - 1 ? 0 : selectedIndex + 1;
          selectMinion(nextIndex);
          break;
        case 'Enter':
          e.preventDefault();
          hireMinion();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
</script>

<div class="character-selector">
  <!-- Background Effects -->
  <div class="bg-grid"></div>
  <div class="bg-glow" style="--glow-color: {selectedMinion.color}"></div>
  
  <!-- Header -->
  <div class="selector-header">
    <div class="header-badge">⚡ AI-Powered Assistants</div>
    <h1 class="selector-title">
      Choose Your <span class="gradient-text">Minion</span>
    </h1>
    <p class="selector-subtitle">Select an AI agent to learn more and hire them</p>
  </div>

  <!-- Main Selection Area -->
  <div class="selector-main">
    <!-- Character Carousel -->
    <div 
      class="character-carousel"
      on:touchstart={handleTouchStart}
      on:touchend={handleTouchEnd}
    >
      <!-- Mobile: Show dots for navigation -->
      <div class="carousel-dots mobile-only">
        {#each minions as _, i}
          <button 
            class="dot"
            class:active={i === selectedIndex}
            style="--dot-color: {minions[i].color}"
            on:click={() => selectMinion(i)}
            aria-label="Select {minions[i].name}"
          />
        {/each}
      </div>

      <!-- Desktop: 3D Carousel -->
      <div class="carousel-3d desktop-only">
        {#each minions as minion, i}
          {@const isActive = i === selectedIndex}
          {@const isHovered = i === hoveredIndex}
          {@const isAdjacent = Math.abs(i - selectedIndex) === 1}
          {@const isFar = Math.abs(i - selectedIndex) > 1}
          
          <button
            class="character-slot"
            class:active={isActive}
            class:adjacent={isAdjacent}
            class:far={isFar}
            class:left={i < selectedIndex}
            class:right={i > selectedIndex}
            style="--slot-index: {i}; --minion-color: {minion.color}"
            on:click={() => selectMinion(i)}
            on:mouseenter={() => hoveredIndex = i}
            on:mouseleave={() => hoveredIndex = -1}
            aria-label="Select {minion.name}"
          >
            <div class="slot-frame" style="border-color: {minion.color}">
              <MinionAvatar3D 
                minionId={minion.id} 
                color={minion.color}
                isHovered={isHovered}
                isSelected={isActive}
              />
            </div>
            
            {#if isActive}
              <div class="selection-indicator">
                <div class="indicator-line"></div>
                <span class="indicator-text">SELECTED</span>
              </div>
            {/if}
          </button>
        {/each}
      </div>

      <!-- Mobile: Single Large Avatar -->
      <div class="mobile-avatar mobile-only">
        <div class="mobile-avatar-frame" style="--avatar-color: {selectedMinion.color}">
          <MinionAvatar3D 
            minionId={selectedMinion.id} 
            color={selectedMinion.color}
            isHovered={false}
            isSelected={true}
          />
        </div>
        
        <!-- Mobile Swipe Hints -->
        <div class="swipe-hint">
          <span class="swipe-arrow">←</span>
          <span class="swipe-text">Swipe</span>
          <span class="swipe-arrow">→</span>
        </div>
      </div>

      <!-- Mobile: Thumbnail Strip -->
      <div class="mobile-thumbnails mobile-only">
        {#each minions as minion, i}
          <button
            class="thumbnail"
            class:active={i === selectedIndex}
            style="--thumb-color: {minion.color}"
            on:click={() => selectMinion(i)}
            aria-label="Select {minion.name}"
          >
            <div class="thumb-avatar" style="background: {minion.color}20">
              <span class="thumb-emoji">{minion.id === 'accountant' ? '📊' : minion.id === 'realtor' ? '🏠' : minion.id === 'analyst' ? '📈' : minion.id === 'restaurant' ? '🍽️' : minion.id === 'scheduler' ? '📅' : '💬'}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Character Info Panel -->
    <div class="info-panel" class:visible={!isAnimating} style="--panel-color: {selectedMinion.color}">
      <div class="panel-header">
        <div class="class-icon" style="background: {selectedMinion.color}">
          {selectedIndex + 1}
        </div>
        <div class="class-info">
          <h2 class="minion-name">{selectedMinion.name}</h2>
          <p class="minion-class" style="color: {selectedMinion.color}">{selectedMinion.tagline}</p>
        </div>
      </div>

      <p class="minion-description">{selectedMinion.description}</p>

      <!-- Stats -->
      <div class="stats-container" class:show={showStats}>
        <h3 class="stats-title">Stats</h3>
        {#each selectedMinion.stats as stat}
          <div class="stat-row">
            <span class="stat-label">{stat.label}</span>
            <div class="stat-bar">
              <div 
                class="stat-fill" 
                style="width: {stat.value}%; background: {selectedMinion.color}"
              ></div>
            </div>
            <span class="stat-value">{stat.value}</span>
          </div>
        {/each}
      </div>

      <!-- Abilities -->
      <div class="abilities-container">
        <h3 class="abilities-title">Abilities</h3>
        <div class="abilities-grid">
          {#each selectedMinion.features as feature, i}
            <div class="ability-tag" style="border-color: {selectedMinion.color}40">
              <span class="ability-icon" style="color: {selectedMinion.color}">◆</span>
              <span>{feature}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Hire Button -->
      <button class="hire-button" on:click={hireMinion} style="--btn-color: {selectedMinion.color}">
        <span class="btn-text">HIRE {selectedMinion.name.toUpperCase()}</span>
        <span class="btn-glow"></span>
      </button>
    </div>
  </div>

  <!-- Navigation Hints (Desktop) -->
  <div class="nav-hints desktop-only">
    <div class="hint">
      <span class="hint-key">←</span>
      <span class="hint-key">→</span>
      <span>Navigate</span>
    </div>
    <div class="hint">
      <span class="hint-key">ENTER</span>
      <span>Hire</span>
    </div>
  </div>
</div>

<style>
  .character-selector {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    position: relative;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* Background Effects */
  .bg-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse at center, black 40%, transparent 70%);
  }

  .bg-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 800px;
    background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
    opacity: 0.15;
    filter: blur(100px);
    pointer-events: none;
    transition: opacity 0.5s ease;
  }

  /* Header */
  .selector-header {
    text-align: center;
    margin-bottom: 3rem;
    z-index: 10;
  }

  .header-badge {
    display: inline-block;
    padding: 0.5rem 1.25rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    font-size: 0.875rem;
    color: rgba(255,255,255,0.6);
    margin-bottom: 1.5rem;
    backdrop-filter: blur(10px);
  }

  .selector-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
    color: white;
  }

  .gradient-text {
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .selector-subtitle {
    font-size: 1.125rem;
    color: rgba(255,255,255,0.5);
  }

  /* Main Layout */
  .selector-main {
    display: flex;
    align-items: center;
    gap: 4rem;
    width: 100%;
    max-width: 1400px;
    z-index: 10;
  }

  /* Character Carousel */
  .character-carousel {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
    min-height: 400px;
  }

  /* Desktop 3D Carousel */
  .carousel-3d {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    height: 400px;
    perspective: 1000px;
  }

  .character-slot {
    position: absolute;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .slot-frame {
    border-radius: 28px;
    border: 2px solid transparent;
    padding: 4px;
    transition: all 0.3s ease;
  }

  .character-slot:hover .slot-frame {
    border-color: currentColor;
    box-shadow: 0 0 30px currentColor;
  }

  /* Position states */
  .character-slot.active {
    transform: translateX(0) scale(1.2);
    z-index: 100;
  }

  .character-slot.adjacent.left {
    transform: translateX(-320px) scale(0.75) rotateY(25deg);
    opacity: 0.6;
    filter: brightness(0.7);
  }

  .character-slot.adjacent.right {
    transform: translateX(320px) scale(0.75) rotateY(-25deg);
    opacity: 0.6;
    filter: brightness(0.7);
  }

  .character-slot.far.left {
    transform: translateX(-500px) scale(0.5);
    opacity: 0.2;
    filter: brightness(0.5);
  }

  .character-slot.far.right {
    transform: translateX(500px) scale(0.5);
    opacity: 0.2;
    filter: brightness(0.5);
  }

  .selection-indicator {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .indicator-line {
    width: 2px;
    height: 20px;
    background: var(--minion-color);
    animation: line-pulse 1.5s ease-in-out infinite;
  }

  .indicator-text {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: var(--minion-color);
  }

  @keyframes line-pulse {
    0%, 100% { opacity: 1; height: 20px; }
    50% { opacity: 0.5; height: 12px; }
  }

  /* Mobile Styles */
  .mobile-only {
    display: none !important;
  }

  .desktop-only {
    display: flex !important;
  }

  /* Mobile Dots Navigation */
  .carousel-dots {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    z-index: 20;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    border: none;
    padding: 0;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .dot.active {
    background: var(--dot-color);
    box-shadow: 0 0 10px var(--dot-color);
    width: 24px;
    border-radius: 4px;
  }

  /* Mobile Avatar */
  .mobile-avatar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .mobile-avatar-frame {
    border-radius: 24px;
    border: 2px solid var(--avatar-color);
    padding: 3px;
    box-shadow: 0 0 40px var(--avatar-color);
    animation: mobile-glow 2s ease-in-out infinite;
  }

  @keyframes mobile-glow {
    0%, 100% { box-shadow: 0 0 40px var(--avatar-color); }
    50% { box-shadow: 0 0 60px var(--avatar-color), 0 0 80px var(--avatar-color); }
  }

  .swipe-hint {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: rgba(255,255,255,0.4);
    font-size: 0.875rem;
    animation: swipe-hint-pulse 2s ease-in-out infinite;
  }

  @keyframes swipe-hint-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .swipe-arrow {
    font-size: 1.25rem;
  }

  /* Mobile Thumbnails */
  .mobile-thumbnails {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.5rem;
    padding: 0.5rem;
    background: rgba(255,255,255,0.03);
    border-radius: 16px;
    overflow-x: auto;
    max-width: 100%;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .mobile-thumbnails::-webkit-scrollbar {
    display: none;
  }

  .thumbnail {
    flex-shrink: 0;
    background: none;
    border: 2px solid transparent;
    border-radius: 12px;
    padding: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .thumbnail.active {
    border-color: var(--thumb-color);
    box-shadow: 0 0 15px var(--thumb-color);
  }

  .thumb-avatar {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumb-emoji {
    font-size: 1.5rem;
  }

  /* Info Panel */
  .info-panel {
    width: 400px;
    background: rgba(20, 20, 30, 0.8);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    padding: 2rem;
    opacity: 0;
    transform: translateX(50px);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .info-panel.visible {
    opacity: 1;
    transform: translateX(0);
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .class-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.25rem;
    color: white;
    box-shadow: 0 0 20px currentColor;
  }

  .class-info {
    flex: 1;
  }

  .minion-name {
    font-size: 1.5rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.25rem;
  }

  .minion-class {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .minion-description {
    color: rgba(255,255,255,0.6);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  /* Stats */
  .stats-container {
    margin-bottom: 1.5rem;
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.4s ease;
  }

  .stats-container.show {
    opacity: 1;
    transform: translateY(0);
  }

  .stats-title, .abilities-title {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.4);
    margin-bottom: 0.75rem;
    text-transform: uppercase;
  }

  .stat-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .stat-label {
    width: 70px;
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.7);
  }

  .stat-bar {
    flex: 1;
    height: 6px;
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .stat-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.8s ease;
  }

  .stat-value {
    width: 30px;
    text-align: right;
    font-size: 0.8125rem;
    font-weight: 700;
    color: white;
  }

  /* Abilities */
  .abilities-container {
    margin-bottom: 1.5rem;
  }

  .abilities-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .ability-tag {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid;
    border-radius: 8px;
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.8);
  }

  .ability-icon {
    font-size: 0.5rem;
  }

  /* Hire Button */
  .hire-button {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, var(--btn-color) 0%, transparent 100%);
    background-size: 200% 100%;
    border: 2px solid var(--btn-color);
    border-radius: 12px;
    color: white;
    font-weight: 700;
    font-size: 0.9375rem;
    letter-spacing: 0.05em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .hire-button:hover {
    background-position: 100% 0;
    box-shadow: 0 0 30px var(--btn-color);
    transform: translateY(-2px);
  }

  .btn-glow {
    position: absolute;
    inset: -2px;
    background: var(--btn-color);
    opacity: 0;
    filter: blur(20px);
    transition: opacity 0.3s ease;
    z-index: -1;
  }

  .hire-button:hover .btn-glow {
    opacity: 0.5;
  }

  /* Navigation Hints */
  .nav-hints {
    display: flex;
    gap: 2rem;
    margin-top: 3rem;
    z-index: 10;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.4);
  }

  .hint-key {
    padding: 0.25rem 0.5rem;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.75rem;
  }

  /* Responsive */
  @media (max-width: 1100px) {
    .selector-main {
      flex-direction: column;
      gap: 2rem;
    }

    .info-panel {
      width: 100%;
      max-width: 500px;
      transform: translateY(30px);
    }

    .info-panel.visible {
      transform: translateY(0);
    }

    .carousel-3d {
      height: 320px;
    }

    .character-slot.adjacent.left {
      transform: translateX(-200px) scale(0.6) rotateY(25deg);
    }

    .character-slot.adjacent.right {
      transform: translateX(200px) scale(0.6) rotateY(-25deg);
    }

    .character-slot.far.left,
    .character-slot.far.right {
      display: none;
    }
  }

  /* Mobile Breakpoint */
  @media (max-width: 768px) {
    .character-selector {
      padding: 1rem;
      min-height: auto;
    }

    .selector-header {
      margin-bottom: 1.5rem;
    }

    .selector-title {
      font-size: 1.75rem;
    }

    .selector-subtitle {
      font-size: 0.9375rem;
    }

    .mobile-only {
      display: flex !important;
    }

    .desktop-only {
      display: none !important;
    }

    .character-carousel {
      min-height: auto;
      gap: 1rem;
    }

    .mobile-avatar-frame {
      transform: scale(0.75);
    }

    .info-panel {
      padding: 1.5rem;
      max-width: 100%;
    }

    .panel-header {
      flex-direction: column;
      text-align: center;
      gap: 0.75rem;
    }

    .class-icon {
      width: 40px;
      height: 40px;
      font-size: 1rem;
    }

    .minion-name {
      font-size: 1.25rem;
    }

    .abilities-grid {
      grid-template-columns: 1fr;
    }

    .nav-hints {
      margin-top: 1.5rem;
    }
  }

  @media (max-width: 400px) {
    .selector-title {
      font-size: 1.5rem;
    }

    .info-panel {
      padding: 1.25rem;
    }

    .stat-label {
      width: 60px;
      font-size: 0.75rem;
    }

    .stat-value {
      font-size: 0.75rem;
    }
  }
</style>
