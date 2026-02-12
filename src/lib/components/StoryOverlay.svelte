<script lang="ts">
  export let phase = 'INTRO';
  export let progress = 0;
  export let scrollProgress = 0; // 0-1 actual scroll position

  const phases = {
    INTRO: {
      title: 'Meet Your New Assistant',
      subtitle: 'No login. No setup. Just hire.',
      description: 'Pick a minion, add them to WhatsApp or Telegram, and start working. No account, no password, no waiting — they are in your contacts in 60 seconds.',
    },
    WAKE_UP: {
      title: 'They Wake Up Ready',
      subtitle: 'No apps. No signup.',
      description: 'Your minion joins as a contact in your existing chat app. No downloads, no registration, no friction — just message them and they get to work.',
    },
    CAPABILITY_1: {
      title: 'Reads Everything',
      subtitle: 'Connected to your world',
      description: 'Forward an email, share a document, or just tell them what you need. They understand context and get to work immediately.',
    },
    CAPABILITY_2: {
      title: 'Organize & Track',
      subtitle: 'Just send, they handle the rest',
      description: 'Snap a receipt, forward an invoice, or drop a spreadsheet. They categorize, sync to QuickBooks, and keep everything tidy.',
    },
    CAPABILITY_3: {
      title: 'Responds & Acts',
      subtitle: 'Text them, they deliver',
      description: '"Schedule a meeting with John" — done. "Remind me Friday" — set. Your minion handles the busywork, right from your chat.',
    },
    SUMMARY: {
      title: 'Your Team, One Dashboard',
      subtitle: 'Chat with them anywhere, manage them here',
      description: 'Hire multiple minions for different jobs. Message each in your app, manage all from this dashboard. Simple.',
    },
    CTA: {
      title: 'Ready to Hire?',
      subtitle: '60 seconds. No signup required.',
      description: 'Choose your minion, pick WhatsApp or Telegram, done. They appear in your contacts and start working immediately. No account needed.',
    },
  };

  $: currentPhase = phases[phase as keyof typeof phases] || phases.INTRO;
  
  // Show initial CTA only when not scrolled
  $: showInitialCTA = scrollProgress < 0.05;
  
  // Calculate phase index (0-6)
  $: phaseIndex = ['INTRO', 'WAKE_UP', 'CAPABILITY_1', 'CAPABILITY_2', 'CAPABILITY_3', 'SUMMARY', 'CTA'].indexOf(phase);
  
  // Determine which content to show based on phase
  $: showCapability1 = phase === 'CAPABILITY_1';
  $: showCapability2 = phase === 'CAPABILITY_2';
  $: showCapability3 = phase === 'CAPABILITY_3';
  $: showSummary = phase === 'SUMMARY';
  $: showCTA = phase === 'CTA';
</script>

<div class="story-overlay" class:dim={phase.startsWith('CAPABILITY')}>
  <!-- All phase content pre-rendered, animated via CSS transforms -->
  <div class="content-wrapper">
    <!-- Phase 0: INTRO -->
    <div 
      class="phase-content"
      class:active={phase === 'INTRO'}
      style="transform: translateY(calc(-50% + {phaseIndex === 0 ? 0 : phaseIndex > 0 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'INTRO' ? 1 : 0};"
    >
      <span class="phase-label">{phases.INTRO.subtitle}</span>
      <h1 class="title">{phases.INTRO.title}</h1>
      <p class="description">{phases.INTRO.description}</p>
    </div>

    <!-- Phase 1: WAKE_UP -->
    <div 
      class="phase-content"
      class:active={phase === 'WAKE_UP'}
      style="transform: translateY(calc(-50% + {phaseIndex === 1 ? 0 : phaseIndex > 1 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'WAKE_UP' ? 1 : 0};"
    >
      <span class="phase-label">{phases.WAKE_UP.subtitle}</span>
      <h1 class="title">{phases.WAKE_UP.title}</h1>
      <p class="description">{phases.WAKE_UP.description}</p>
    </div>

    <!-- Phase 2: CAPABILITY_1 -->
    <div 
      class="phase-content"
      class:active={phase === 'CAPABILITY_1'}
      style="transform: translateY(calc(-50% + {phaseIndex === 2 ? 0 : phaseIndex > 2 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'CAPABILITY_1' ? 1 : 0};"
    >
      <span class="phase-label">{phases.CAPABILITY_1.subtitle}</span>
      <h1 class="title">{phases.CAPABILITY_1.title}</h1>
      <p class="description">{phases.CAPABILITY_1.description}</p>
      
      <div class="showcase-container" class:visible={phase === 'CAPABILITY_1'}>
        <div class="capability-showcase">
          <div class="chat-app-preview">
            <div class="chat-header">
              <span class="chat-avatar benny">🤖</span>
              <div class="chat-info">
                <span class="chat-name">Benny (Accountant)</span>
                <span class="chat-status">online</span>
              </div>
            </div>
            <div class="chat-messages">
              <div class="msg-bubble user-msg">
                <span class="msg-text">Forward this invoice to quickbooks please</span>
                <span class="msg-time">9:42 AM</span>
              </div>
              <div class="msg-bubble bot-msg">
                <span class="msg-text">Got it! Processing the invoice now.</span>
                <span class="msg-time">9:42 AM ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 3: CAPABILITY_2 -->
    <div 
      class="phase-content"
      class:active={phase === 'CAPABILITY_2'}
      style="transform: translateY(calc(-50% + {phaseIndex === 3 ? 0 : phaseIndex > 3 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'CAPABILITY_2' ? 1 : 0};"
    >
      <span class="phase-label">{phases.CAPABILITY_2.subtitle}</span>
      <h1 class="title">{phases.CAPABILITY_2.title}</h1>
      <p class="description">{phases.CAPABILITY_2.description}</p>
      
      <div class="showcase-container" class:visible={phase === 'CAPABILITY_2'}>
        <div class="capability-showcase">
          <div class="chat-app-preview">
            <div class="chat-header">
              <span class="chat-avatar benny">🤖</span>
              <div class="chat-info">
                <span class="chat-name">Benny (Accountant)</span>
                <span class="chat-status">online</span>
              </div>
            </div>
            <div class="chat-messages">
              <div class="image-attachment">
                <div class="image-thumb">📄 receipt.jpg</div>
              </div>
              <div class="msg-bubble bot-msg">
                <span class="msg-text">Receipt scanned! $47.50 for Office Supplies. Added to QuickBooks under "Operating Expenses".</span>
                <span class="msg-time">2:15 PM ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 4: CAPABILITY_3 -->
    <div 
      class="phase-content"
      class:active={phase === 'CAPABILITY_3'}
      style="transform: translateY(calc(-50% + {phaseIndex === 4 ? 0 : phaseIndex > 4 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'CAPABILITY_3' ? 1 : 0};"
    >
      <span class="phase-label">{phases.CAPABILITY_3.subtitle}</span>
      <h1 class="title">{phases.CAPABILITY_3.title}</h1>
      <p class="description">{phases.CAPABILITY_3.description}</p>
      
      <div class="showcase-container" class:visible={phase === 'CAPABILITY_3'}>
        <div class="capability-showcase">
          <div class="chat-app-preview">
            <div class="chat-header">
              <span class="chat-avatar terry">📅</span>
              <div class="chat-info">
                <span class="chat-name">Terry (Scheduler)</span>
                <span class="chat-status">online</span>
              </div>
            </div>
            <div class="chat-messages">
              <div class="msg-bubble user-msg">
                <span class="msg-text">Find time with John next week</span>
                <span class="msg-time">3:20 PM</span>
              </div>
              <div class="msg-bubble bot-msg">
                <span class="msg-text">Found 3 slots: Tue 2pm, Wed 10am, Thu 4pm. Want me to send the invite for Tuesday?</span>
                <span class="msg-time">3:20 PM ✓</span>
              </div>
              <div class="msg-bubble user-msg short">
                <span class="msg-text">Yes please</span>
              </div>
              <div class="msg-bubble bot-msg">
                <span class="msg-text">Done! Invite sent to John. 📅 Tuesday 2pm - Project Sync</span>
                <span class="msg-time">3:21 PM ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phase 5: SUMMARY -->
    <div 
      class="phase-content"
      class:active={phase === 'SUMMARY'}
      style="transform: translateY(calc(-50% + {phaseIndex === 5 ? 0 : phaseIndex > 5 ? -100 : 100}vh)) translateZ(0); opacity: {phase === 'SUMMARY' ? 1 : 0};"
    >
      <span class="phase-label">{phases.SUMMARY.subtitle}</span>
      <h1 class="title">{phases.SUMMARY.title}</h1>
      <p class="description">{phases.SUMMARY.description}</p>
      
      <div class="showcase-container" class:visible={phase === 'SUMMARY'}>
        <div class="app-grid">
          <div class="app-item">
            <span class="app-icon whatsapp">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.13 1.58 5.929L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </span>
            <span class="app-name">WhatsApp</span>
          </div>
          <div class="app-item">
            <span class="app-icon telegram">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221c.104-.002.322.023.464.139a.506.506 0 01.172.326c.016.092.036.305.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </span>
            <span class="app-name">Telegram</span>
          </div>
          <div class="app-item">
            <span class="app-icon discord">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </span>
            <span class="app-name">Discord</span>
          </div>
          <div class="app-item">
            <span class="app-icon slack">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 012.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/></svg>
            </span>
            <span class="app-name">Slack</span>
          </div>
        </div>
        <p class="app-hint">Your minions live wherever you chat</p>
      </div>
    </div>

    <!-- Phase 6: CTA -->
    <div 
      class="phase-content"
      class:active={phase === 'CTA'}
      style="transform: translateY(calc(-50% + {phaseIndex === 6 ? 0 : 100}vh)) translateZ(0); opacity: {phase === 'CTA' ? 1 : 0};"
    >
      <span class="phase-label">{phases.CTA.subtitle}</span>
      <h1 class="title">{phases.CTA.title}</h1>
      <p class="description">{phases.CTA.description}</p>
    </div>
  </div>

  <!-- CTA Container - independent of phase content -->
  <div class="cta-container">
    {#if showInitialCTA}
      <div class="initial-cta">
        <a href="/minions" class="btn btn-primary btn-large">
          Hire a Minion — No Signup
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
        <span class="hint">In your contacts in 60 seconds</span>
      </div>
    {/if}

    {#if showCTA}
      <div class="final-cta">
        <a href="/minions" class="btn btn-primary btn-large">
          Hire Now — No Account Needed
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
        <a href="/minions" class="btn btn-ghost">
          Browse 15 Minions →
        </a>
      </div>
    {/if}
  </div>

  <!-- Scroll indicator - only at very start -->
  {#if scrollProgress < 0.02}
    <div class="scroll-hint">
      <span>Scroll to explore</span>
      <div class="mouse">
        <div class="wheel"></div>
      </div>
    </div>
  {/if}

  <!-- Progress dots -->
  <div class="progress-dots">
    {#each ['INTRO', 'WAKE_UP', 'CAPABILITY_1', 'CAPABILITY_2', 'CAPABILITY_3', 'SUMMARY', 'CTA'] as p, i}
      {@const phaseList = ['INTRO', 'WAKE_UP', 'CAPABILITY_1', 'CAPABILITY_2', 'CAPABILITY_3', 'SUMMARY', 'CTA']}
      {@const currentIdx = phaseList.indexOf(phase)}
      <div 
        class="dot" 
        class:active={phase === p} 
        class:completed={i < currentIdx}
      ></div>
    {/each}
  </div>
</div>

<style>
  .story-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 2rem 4rem;
    pointer-events: none;
    transition: background 0.5s ease;
    overflow: hidden;
  }

  .story-overlay.dim {
    background: rgba(15, 12, 10, 0.15);
  }

  .content-wrapper {
    position: relative;
    max-width: 520px;
    pointer-events: auto;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .phase-content {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
    transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.4s ease;
    will-change: transform, opacity;
  }

  .phase-content.active {
    pointer-events: auto;
  }

  .phase-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #D4A853;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
  }

  .title {
    font-size: clamp(2.5rem, 5vw, 4rem);
    font-weight: 700;
    color: #F7F5F0;
    margin: 0 0 1rem;
    line-height: 1.1;
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: -0.02em;
  }

  .description {
    font-size: 1.125rem;
    color: rgba(247, 245, 240, 0.7);
    line-height: 1.6;
    margin: 0 0 1.5rem;
  }

  /* Showcase container */
  .showcase-container {
    min-height: 120px;
    opacity: 0;
    transform: scale(0.9);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    transition-delay: 0.1s;
  }

  .showcase-container.visible {
    opacity: 1;
    transform: scale(1);
  }

  /* Capability showcases */
  .capability-showcase {
    transform-origin: left center;
  }

  .message-preview {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 1.25rem;
    backdrop-filter: blur(20px);
  }

  .message-bubble {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sender {
    font-size: 0.75rem;
    color: rgba(247, 245, 240, 0.5);
  }

  .subject {
    font-weight: 600;
    color: #F7F5F0;
  }

  .snippet {
    font-size: 0.875rem;
    color: rgba(247, 245, 240, 0.6);
    font-style: italic;
  }

  .message-arrow {
    font-size: 1.5rem;
    color: #D4A853;
  }

  .minion-response {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(123, 163, 143, 0.25);
    border-radius: 100px;
  }

  .mini-avatar {
    font-size: 1.25rem;
  }

  .status {
    font-size: 0.875rem;
    color: #7BA38F;
    font-weight: 500;
  }

  /* Invoice flow */
  .invoice-flow {
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 1.25rem;
    backdrop-filter: blur(20px);
  }

  .doc-icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #7A9EB8;
  }

  .amount {
    font-size: 0.875rem;
    font-weight: 600;
    color: #F7F5F0;
    font-family: 'JetBrains Mono', monospace;
  }

  .processing-dots {
    display: flex;
    gap: 0.25rem;
  }

  .processing-dots span {
    width: 8px;
    height: 8px;
    background: #D4A853;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
  }

  .processing-dots span:nth-child(1) { animation-delay: -0.32s; }
  .processing-dots span:nth-child(2) { animation-delay: -0.16s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
  }

  .category-tag {
    padding: 0.5rem 1rem;
    background: rgba(212, 168, 83, 0.2);
    border: 1px solid rgba(212, 168, 83, 0.4);
    border-radius: 100px;
    font-size: 0.875rem;
    color: #D4A853;
  }

  /* Chat preview */
  .chat-preview {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 400px;
  }

  .chat-bubble {
    padding: 1rem 1.25rem;
    border-radius: 16px;
    font-size: 0.9375rem;
    line-height: 1.5;
    max-width: 85%;
  }

  .chat-bubble.user {
    background: rgba(255, 255, 255, 0.12);
    color: rgba(247, 245, 240, 0.9);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  .chat-bubble.bot {
    background: rgba(123, 163, 143, 0.25);
    color: #F7F5F0;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .bot-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }

  /* Chat App Preview */
  .chat-app-preview {
    background: rgba(20, 20, 25, 0.95);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    max-width: 360px;
    backdrop-filter: blur(20px);
  }

  .chat-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .chat-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: linear-gradient(135deg, #7BA38F 0%, #5A8F7B 100%);
  }

  .chat-avatar.benny {
    background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
  }

  .chat-avatar.terry {
    background: linear-gradient(135deg, #7A9EB8 0%, #5D8AA8 100%);
  }

  .chat-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .chat-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #F7F5F0;
  }

  .chat-status {
    font-size: 0.75rem;
    color: #7BA38F;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .chat-status::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #7BA38F;
    border-radius: 50%;
  }

  .chat-messages {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .msg-bubble {
    max-width: 85%;
    padding: 0.625rem 0.875rem;
    border-radius: 14px;
    font-size: 0.875rem;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .msg-bubble.user-msg {
    align-self: flex-end;
    background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
    color: #0f0c0a;
    border-bottom-right-radius: 4px;
  }

  .msg-bubble.user-msg.short {
    align-self: flex-end;
    width: fit-content;
  }

  .msg-bubble.bot-msg {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.1);
    color: #F7F5F0;
    border-bottom-left-radius: 4px;
  }

  .msg-text {
    font-weight: 500;
  }

  .msg-time {
    font-size: 0.6875rem;
    opacity: 0.7;
    align-self: flex-end;
  }

  .image-attachment {
    align-self: flex-end;
    max-width: 70%;
  }

  .image-thumb {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: rgba(247, 245, 240, 0.8);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* App Grid */
  .app-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .app-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.2s ease;
  }

  .app-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .app-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    padding: 8px;
  }

  .app-icon svg {
    width: 100%;
    height: 100%;
  }

  .app-icon.whatsapp {
    color: #25D366;
    background: rgba(37, 211, 102, 0.15);
  }

  .app-icon.telegram {
    color: #0088CC;
    background: rgba(0, 136, 204, 0.15);
  }

  .app-icon.discord {
    color: #5865F2;
    background: rgba(88, 101, 242, 0.15);
  }

  .app-icon.slack {
    color: #E01E5A;
    background: rgba(224, 30, 90, 0.15);
  }

  .app-name {
    font-size: 0.75rem;
    color: rgba(247, 245, 240, 0.8);
    font-weight: 500;
  }

  .app-hint {
    text-align: center;
    font-size: 0.875rem;
    color: rgba(247, 245, 240, 0.5);
    margin: 0;
  }

  /* CTA Container */
  .cta-container {
    position: fixed;
    bottom: max(2rem, 10vh);
    left: 4rem;
    pointer-events: auto;
    z-index: 20;
  }

  .initial-cta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    animation: fadeScale 0.4s ease;
  }

  @keyframes fadeScale {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .initial-cta .hint {
    font-size: 0.875rem;
    color: rgba(247, 245, 240, 0.5);
    margin-left: 0.5rem;
  }

  .final-cta {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: fadeScale 0.4s ease;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    border: none;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, #D4A853 0%, #C9963C 100%);
    color: #0f0c0a;
    box-shadow: 0 4px 20px rgba(212, 168, 83, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(212, 168, 83, 0.5);
  }

  .btn-large {
    padding: 1.125rem 2.5rem;
    font-size: 1.0625rem;
  }

  .btn-ghost {
    background: transparent;
    color: rgba(247, 245, 240, 0.7);
    border: 1px solid rgba(247, 245, 240, 0.2);
    padding: 0.875rem 1.5rem;
  }

  .btn-ghost:hover {
    background: rgba(247, 245, 240, 0.05);
    color: #F7F5F0;
    border-color: rgba(247, 245, 240, 0.3);
  }

  /* Scroll hint */
  .scroll-hint {
    position: absolute;
    bottom: 3rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    color: rgba(247, 245, 240, 0.4);
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
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

  /* Progress dots */
  .progress-dots {
    position: absolute;
    right: 2rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .dot.active {
    background: #D4A853;
    transform: scale(1.5);
    box-shadow: 0 0 10px rgba(212, 168, 83, 0.5);
  }

  .dot.completed {
    background: rgba(212, 168, 83, 0.5);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .story-overlay {
      padding: 1.5rem;
      justify-content: center;
      padding-bottom: 2rem;
    }

    .content-wrapper {
      max-width: 100%;
      max-height: 70vh;
      background: rgba(15, 12, 10, 0.7);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 1.5rem;
      margin: 0 -0.5rem;
    }

    .cta-container {
      left: 1.5rem;
      right: 1.5rem;
      bottom: max(1.5rem, 8vh);
    }

    .feature-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .app-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .app-item {
      padding: 0.75rem 0.5rem;
    }

    .chat-app-preview {
      max-width: 100%;
    }

    .title {
      font-size: 2rem;
    }

    .description {
      font-size: 1rem;
    }

    .progress-dots {
      display: none;
    }

    .initial-cta,
    .final-cta {
      align-items: stretch;
    }

    .btn {
      width: 100%;
    }
  }
</style>
