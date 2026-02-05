<script lang="ts">
  import { onMount } from 'svelte';
  import CharacterSelector from '$lib/components/CharacterSelector.svelte';

  let showSelector = false;
  let hiringMinion: { name: string; color: string } | null = null;

  onMount(() => {
    // Check for hire event from CharacterSelector
    window.addEventListener('hireMinion', ((e: CustomEvent) => {
      hiringMinion = e.detail;
      // Scroll to connect section or show modal
      document.getElementById('connect')?.scrollIntoView({ behavior: 'smooth' });
    }) as EventListener);

    // Entrance animation
    setTimeout(() => {
      showSelector = true;
    }, 300);
  });

  function scrollToSelector() {
    document.getElementById('character-select')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="page">
  <!-- Hero -->
  <section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-grid"></div>
    
    <div class="hero-content">
      <div class="badge">
        <span class="badge-pulse"></span>
        🤖 AI-Powered Workforce
      </div>
      
      <h1 class="hero-title">
        Your Army of<br />
        <span class="gradient-text">Digital Minions</span>
      </h1>
      
      <p class="hero-subtitle">
        Hire specialized AI agents that live in your cloud, integrate with your tools,
        and communicate via WhatsApp or Telegram.
      </p>
      
      <div class="hero-cta">
        <button class="btn btn-primary" on:click={scrollToSelector}>
          <span class="btn-icon">🎮</span>
          Choose Your Minion
        </button>
        <button class="btn btn-secondary" on:click={() => alert('Demo coming soon!')}>
          See It In Action
        </button>
      </div>
      
      <div class="hero-trust">
        <div class="trust-badge">
          <span class="trust-icon">🔒</span>
          <span>Your data stays in your cloud</span>
        </div>
        <div class="trust-badge">
          <span class="trust-icon">⚡</span>
          <span>5-minute setup</span>
        </div>
        <div class="trust-badge">
          <span class="trust-icon">💬</span>
          <span>WhatsApp & Telegram</span>
        </div>
      </div>
    </div>

    <!-- Scroll Indicator -->
    <div class="scroll-indicator" on:click={scrollToSelector} role="button" tabindex="0">
      <div class="mouse">
        <div class="wheel"></div>
      </div>
      <span>Scroll to select</span>
    </div>
  </section>

  <!-- Character Selector Section -->
  <section id="character-select" class="selector-section">
    <CharacterSelector />
  </section>

  <!-- How It Works -->
  <section id="how-it-works" class="how-it-works">
    <div class="section-bg-glow"></div>
    
    <div class="container">
      <div class="section-header">
        <span class="section-label">How It Works</span>
        <h2 class="section-title">
          Deploy in <span class="gradient-text">3 Steps</span>
        </h2>
      </div>

      <div class="steps-grid">
        <div class="step-card">
          <div class="step-number">01</div>
          <div class="step-icon">🎯</div>
          <h3>Pick Your Minion</h3>
          <p>Choose from 6 specialized AI agents, each trained for specific tasks.</p>
          <div class="step-line"></div>
        </div>

        <div class="step-card">
          <div class="step-number">02</div>
          <div class="step-icon">🔗</div>
          <h3>Connect Your Tools</h3>
          <p>Link Google Workspace, Microsoft 365, or any API your Minion needs.</p>
          <div class="step-line"></div>
        </div>

        <div class="step-card">
          <div class="step-number">03</div>
          <div class="step-icon">💬</div>
          <h3>Chat & Command</h3>
          <p>Delegate tasks via WhatsApp or Telegram. Your Minion works 24/7.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Connect Section -->
  <section id="connect" class="connect-section">
    <div class="container">
      <div class="connect-card">
        <div class="connect-visual">
          <div class="floating-icons">
            <div class="float-icon" style="--delay: 0s">📧</div>
            <div class="float-icon" style="--delay: 0.5s">📊</div>
            <div class="float-icon" style="--delay: 1s">📅</div>
            <div class="float-icon" style="--delay: 1.5s">📱</div>
          </div>
        </div>
        
        <div class="connect-content">
          <h2>Ready to deploy your Minion?</h2>
          <p>Connect with us to get early access and set up your first AI agent.</p>
          
          {#if hiringMinion}
            <div class="selected-minion" style="--minion-color: {hiringMinion.color}">
              <span>You selected:</span>
              <strong>{hiringMinion.name}</strong>
            </div>
          {/if}
          
          <div class="connect-buttons">
            <a href="mailto:hello@nuts.cash" class="btn btn-primary btn-large">
              Get Early Access
            </a>
            <a href="https://github.com/ticruz38/minion" target="_blank" class="btn btn-secondary btn-large">
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand">
          <span class="brand-logo">🤖</span>
          <span class="brand-name">Minion</span>
        </div>
        <p class="footer-tagline">AI agents that work for you</p>
      </div>
      <div class="footer-bottom">
        <p>© 2025 Minion. Built with 💜 by Nuts.Cash</p>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #0a0a0f;
    color: #f1f5f9;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .page {
    min-height: 100vh;
    background: #0a0a0f;
  }

  /* Hero Section */
  .hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 2rem;
    text-align: center;
    overflow: hidden;
  }

  .hero-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1000px;
    height: 1000px;
    background: radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%);
    filter: blur(100px);
    pointer-events: none;
  }

  .hero-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 70%);
  }

  .hero-content {
    position: relative;
    z-index: 10;
    max-width: 800px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1.25rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    font-size: 0.875rem;
    color: rgba(255,255,255,0.7);
    margin-bottom: 2rem;
    backdrop-filter: blur(10px);
    position: relative;
  }

  .badge-pulse {
    width: 8px;
    height: 8px;
    background: #22d3ee;
    border-radius: 50%;
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 1; box-shadow: 0 0 10px #22d3ee; }
    50% { opacity: 0.5; box-shadow: 0 0 20px #22d3ee; }
  }

  .hero-title {
    font-size: clamp(3rem, 7vw, 5rem);
    font-weight: 800;
    margin-bottom: 1.5rem;
    letter-spacing: -0.03em;
    line-height: 1.1;
    color: white;
  }

  .gradient-text {
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 50%, #10b981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    background-size: 200% auto;
    animation: gradient-shift 3s ease infinite;
  }

  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }

  .hero-subtitle {
    font-size: 1.25rem;
    color: rgba(255,255,255,0.5);
    margin-bottom: 2.5rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.6;
  }

  .hero-cta {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 3rem;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
  }

  .btn-icon {
    font-size: 1.25rem;
  }

  .btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
    color: white;
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
  }

  .btn-secondary {
    background: rgba(255,255,255,0.05);
    color: white;
    border: 1px solid rgba(255,255,255,0.2);
  }

  .btn-secondary:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.4);
  }

  .btn-large {
    padding: 1.25rem 2.5rem;
    font-size: 1.125rem;
  }

  .hero-trust {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .trust-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    font-size: 0.875rem;
    color: rgba(255,255,255,0.6);
  }

  .trust-icon {
    font-size: 1rem;
  }

  /* Scroll Indicator */
  .scroll-indicator {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: rgba(255,255,255,0.4);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .scroll-indicator:hover {
    color: rgba(255,255,255,0.7);
  }

  .mouse {
    width: 24px;
    height: 40px;
    border: 2px solid currentColor;
    border-radius: 12px;
    position: relative;
  }

  .wheel {
    width: 4px;
    height: 8px;
    background: currentColor;
    border-radius: 2px;
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    animation: scroll-wheel 2s ease-in-out infinite;
  }

  @keyframes scroll-wheel {
    0%, 100% { opacity: 1; top: 6px; }
    50% { opacity: 0.3; top: 18px; }
  }

  /* Selector Section */
  .selector-section {
    min-height: 100vh;
    background: linear-gradient(180deg, #0a0a0f 0%, #111118 50%, #0a0a0f 100%);
  }

  /* How It Works */
  .how-it-works {
    padding: 8rem 2rem;
    position: relative;
    background: #0a0a0f;
  }

  .section-bg-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 60%);
    filter: blur(100px);
    pointer-events: none;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    z-index: 10;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-label {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: rgba(255,255,255,0.5);
    margin-bottom: 1rem;
  }

  .section-title {
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 800;
    color: white;
  }

  .steps-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
  }

  .step-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    padding: 2.5rem;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
  }

  .step-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.15);
    transform: translateY(-4px);
  }

  .step-number {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    font-size: 0.75rem;
    font-weight: 800;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.1em;
  }

  .step-icon {
    font-size: 3rem;
    margin-bottom: 1.5rem;
  }

  .step-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    color: white;
    margin-bottom: 0.75rem;
  }

  .step-card p {
    color: rgba(255,255,255,0.5);
    line-height: 1.6;
  }

  .step-line {
    position: absolute;
    top: 50%;
    right: -2rem;
    width: 2rem;
    height: 2px;
    background: linear-gradient(90deg, rgba(255,255,255,0.2), transparent);
    display: none;
  }

  .step-card:not(:last-child) .step-line {
    display: block;
  }

  /* Connect Section */
  .connect-section {
    padding: 6rem 2rem;
    background: linear-gradient(180deg, #0a0a0f 0%, #111118 100%);
  }

  .connect-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 32px;
    padding: 4rem;
    display: flex;
    align-items: center;
    gap: 4rem;
    position: relative;
    overflow: hidden;
  }

  .connect-visual {
    flex: 1;
    position: relative;
    height: 200px;
  }

  .floating-icons {
    position: absolute;
    inset: 0;
  }

  .float-icon {
    position: absolute;
    font-size: 3rem;
    animation: float 3s ease-in-out infinite;
    animation-delay: var(--delay);
  }

  .float-icon:nth-child(1) { top: 10%; left: 10%; }
  .float-icon:nth-child(2) { top: 20%; right: 20%; }
  .float-icon:nth-child(3) { bottom: 20%; left: 30%; }
  .float-icon:nth-child(4) { bottom: 10%; right: 10%; }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }

  .connect-content {
    flex: 1;
  }

  .connect-content h2 {
    font-size: 2rem;
    font-weight: 800;
    color: white;
    margin-bottom: 1rem;
  }

  .connect-content p {
    color: rgba(255,255,255,0.5);
    margin-bottom: 1.5rem;
    font-size: 1.125rem;
  }

  .selected-minion {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--minion-color);
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .selected-minion span {
    color: rgba(255,255,255,0.6);
  }

  .selected-minion strong {
    color: var(--minion-color);
    font-weight: 700;
  }

  .connect-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  /* Footer */
  .footer {
    padding: 4rem 2rem 2rem;
    background: #0a0a0f;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .footer-content {
    text-align: center;
    margin-bottom: 3rem;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .brand-logo {
    font-size: 2rem;
  }

  .brand-name {
    font-size: 1.5rem;
    font-weight: 800;
    background: linear-gradient(135deg, #6366f1 0%, #22d3ee 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .footer-tagline {
    color: rgba(255,255,255,0.4);
    font-size: 1rem;
  }

  .footer-bottom {
    text-align: center;
    padding-top: 2rem;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .footer-bottom p {
    color: rgba(255,255,255,0.3);
    font-size: 0.875rem;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .steps-grid {
      grid-template-columns: 1fr;
    }

    .step-line {
      display: none !important;
    }

    .connect-card {
      flex-direction: column;
      padding: 2rem;
      text-align: center;
    }

    .connect-visual {
      width: 100%;
    }

    .hero-trust {
      flex-direction: column;
      align-items: center;
    }
  }
</style>
