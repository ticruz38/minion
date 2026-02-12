<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import * as THREE from 'three';
  import { minions } from '$lib/minions-data';

  const dispatch = createEventDispatcher();

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let animationId: number;
  let scrollProgress = 0;
  let targetScrollProgress = 0;
  
  // Scene objects
  let heroRobot: THREE.Group;
  let messageBubbles: THREE.Group[] = [];
  let appIcons: THREE.Group[] = [];
  let particles: THREE.Points;
  let lightingRig: THREE.Group;
  
  // Story phases (0-1 scroll progress)
  const PHASES = {
    INTRO: { start: 0, end: 0.15 },        // Robot idle, hero text
    WAKE_UP: { start: 0.15, end: 0.25 },   // Robot wakes, looks at camera
    CAPABILITY_1: { start: 0.25, end: 0.4 }, // "I can read your emails"
    CAPABILITY_2: { start: 0.4, end: 0.55 }, // "Organize your invoices"
    CAPABILITY_3: { start: 0.55, end: 0.7 }, // "Answer messages"
    SUMMARY: { start: 0.7, end: 0.85 },    // All features, robot ready
    CTA: { start: 0.85, end: 1 },          // Call to action
  };

  onMount(() => {
    if (typeof window === 'undefined') return;
    initScene();
    animate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('wheel', handleScroll, { passive: false });
    
    // Touch events for mobile
    let touchStart = 0;
    window.addEventListener('touchstart', (e) => touchStart = e.touches[0].clientY);
    window.addEventListener('touchmove', (e) => {
      const delta = touchStart - e.touches[0].clientY;
      handleScroll({ deltaY: delta, preventDefault: () => {} } as WheelEvent);
      touchStart = e.touches[0].clientY;
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wheel', handleScroll);
    };
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      container?.removeChild(renderer.domElement);
    }
  });

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0c0a);
    scene.fog = new THREE.FogExp2(0x0f0c0a, 0.02);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    lightingRig = new THREE.Group();
    
    const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.2);
    lightingRig.add(ambientLight);

    const mainLight = new THREE.SpotLight(0xffa94d, 2);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    lightingRig.add(mainLight);

    const fillLight = new THREE.PointLight(0xc9a227, 0.8);
    fillLight.position.set(-5, 2, 5);
    lightingRig.add(fillLight);

    const rimLight = new THREE.SpotLight(0xff6b35, 1.5);
    rimLight.position.set(0, 5, -5);
    rimLight.lookAt(0, 0, 0);
    lightingRig.add(rimLight);

    scene.add(lightingRig);

    // Create hero robot (Benny the Accountant)
    heroRobot = createRobot(0x7BA38F, true);
    heroRobot.position.set(4.5, -1, 0);
    heroRobot.scale.set(1.2, 1.2, 1.2);
    scene.add(heroRobot);

    // Create floating UI elements
    createFloatingUI();

    // Create particles
    createParticles();

    // Dispatch initial phase
    dispatch('phaseChange', { phase: 'INTRO', progress: 0, scrollProgress: 0 });
  }

  function createRobot(color: number, isHero = false) {
    const group = new THREE.Group();
    
    const robotColor = new THREE.Color(color);
    
    // Body (rounded cube)
    const bodyGeo = new THREE.BoxGeometry(1.4, 1.2, 1, 4, 4, 4);
    const positions = bodyGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2];
      const len = Math.sqrt(x*x + y*y + z*z);
      if (len > 0) {
        const factor = 0.9 + 0.1 * (1 / len);
        positions[i] *= factor;
        positions[i + 1] *= factor;
        positions[i + 2] *= factor;
      }
    }
    bodyGeo.computeVertexNormals();
    
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: robotColor,
      metalness: 0.4,
      roughness: 0.3,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Face screen
    const faceGeo = new THREE.PlaneGeometry(1, 0.6);
    const faceMat = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      metalness: 0.95,
      roughness: 0.05,
      clearcoat: 1,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.51;
    face.position.y = 0.1;
    group.add(face);

    // Eyes (glowing)
    const eyeGeo = new THREE.SphereGeometry(0.1, 32, 32);
    const eyeMat = new THREE.MeshBasicMaterial({ 
      color: 0xffd4a3,
      toneMapped: false 
    });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 0.1, 0.55);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 0.1, 0.55);
    group.add(rightEye);

    // Eye glow
    const glowGeo = new THREE.SphereGeometry(0.15, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffd4a3,
      transparent: true,
      opacity: 0.3,
      toneMapped: false
    });
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.copy(leftEye.position);
    group.add(leftGlow);
    const rightGlow = new THREE.Mesh(glowGeo, glowMat);
    rightGlow.position.copy(rightEye.position);
    group.add(rightGlow);

    // Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5);
    const antennaMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.1 
    });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.y = 0.85;
    group.add(antenna);

    // Antenna ball
    const ballGeo = new THREE.SphereGeometry(0.1, 32, 32);
    const ballMat = new THREE.MeshBasicMaterial({ 
      color: robotColor,
      toneMapped: false 
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.y = 1.1;
    group.add(ball);

    // Glasses (hidden initially, shown on scroll)
    const glassesGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
    const lensGeo = new THREE.TorusGeometry(0.18, 0.025, 12, 24);
    const leftLens = new THREE.Mesh(lensGeo, frameMat);
    leftLens.position.set(-0.25, 0.1, 0.58);
    glassesGroup.add(leftLens);
    const rightLens = leftLens.clone();
    rightLens.position.set(0.25, 0.1, 0.58);
    glassesGroup.add(rightLens);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.02), frameMat);
    bridge.position.set(0, 0.1, 0.58);
    glassesGroup.add(bridge);
    glassesGroup.visible = false;
    group.add(glassesGroup);

    // Bowtie (hidden initially)
    const bowtieGroup = new THREE.Group();
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xD4A853 });
    const leftWing = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 32), bowMat);
    leftWing.rotation.z = Math.PI / 2;
    leftWing.position.set(-0.15, -0.3, 0.55);
    bowtieGroup.add(leftWing);
    const rightWing = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 32), bowMat);
    rightWing.rotation.z = -Math.PI / 2;
    rightWing.position.set(0.15, -0.3, 0.55);
    bowtieGroup.add(rightWing);
    const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.08), bowMat);
    bowCenter.position.set(0, -0.3, 0.58);
    bowtieGroup.add(bowCenter);
    bowtieGroup.visible = false;
    group.add(bowtieGroup);

    // Store references for animation
    (group as any).userData = {
      body,
      face,
      leftEye,
      rightEye,
      leftGlow,
      rightGlow,
      antenna,
      ball,
      glasses: glassesGroup,
      bowtie: bowtieGroup,
      baseY: -1,
    };

    return group;
  }

  function createChatBubbleTexture(text: string, subtext: string = '', isUser: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, 512, 200);
    
    // Rounded rectangle path for bubble
    const x = 0, y = 0, width = 512, height = 180, radius = 24;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    // Chat bubble tail
    ctx.lineTo(x + 40, y + height);
    ctx.lineTo(x + 20, y + height + 20);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    // Fill with dark translucent background (bot message style)
    if (isUser) {
      // User message - mustard gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#D4A853');
      gradient.addColorStop(1, '#C9963C');
      ctx.fillStyle = gradient;
    } else {
      // Bot message - dark translucent
      ctx.fillStyle = 'rgba(40, 38, 35, 0.95)';
    }
    ctx.fill();
    
    // Border
    ctx.strokeStyle = isUser ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Text color
    ctx.fillStyle = isUser ? '#0f0c0a' : '#F7F5F0';
    ctx.font = 'bold 32px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(text, 30, 70);
    
    if (subtext) {
      ctx.fillStyle = isUser ? 'rgba(15,12,10,0.7)' : 'rgba(247,245,240,0.6)';
      ctx.font = '22px Inter, sans-serif';
      ctx.fillText(subtext, 30, 110);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  function createFloatingUI() {
    // Chat bubble content - styled like Terry scheduler in StoryOverlay
    const bubbleContents = [
      { text: 'New invoice received', subtext: 'From: Acme Corp • $1,250', isUser: false },
      { text: 'Meeting reminder', subtext: 'Project sync in 15 min', isUser: true },
      { text: 'Expense report ready', subtext: 'March 2025 • 12 items', isUser: false },
    ];

    // Create 3 message bubbles as chat-style planes
    bubbleContents.forEach((content, i) => {
      const bubbleGroup = new THREE.Group();
      
      // Create chat bubble texture
      const textTexture = createChatBubbleTexture(content.text, content.subtext, content.isUser);
      
      // Aspect ratio of texture is 512x200 = 2.56:1
      const width = 2.8;
      const height = width / 2.56;
      
      const bubbleGeo = new THREE.PlaneGeometry(width, height);
      const bubbleMat = new THREE.MeshBasicMaterial({ 
        map: textTexture, 
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide
      });
      
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      bubble.castShadow = true;
      bubbleGroup.add(bubble);
      
      // Position - staggered layout
      const xOffset = i % 2 === 0 ? 3.5 : 4.2;
      bubbleGroup.position.set(xOffset, 0.8 - i * 1.2, -1.5 - i * 0.3);
      bubbleGroup.scale.set(0, 0, 0);
      
      (bubbleGroup as any).userData = { 
        index: i, 
        originalPos: bubbleGroup.position.clone(),
        bubble,
        textPlane: bubble
      };
      messageBubbles.push(bubbleGroup);
      scene.add(bubbleGroup);
    })

    // App icons with SVG icons rendered to canvas
    const iconConfigs = [
      { 
        color: '#25D366', 
        name: 'WhatsApp',
        draw: (ctx: CanvasRenderingContext2D, size: number) => {
          // WhatsApp icon - speech bubble with phone
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          // Outer bubble
          ctx.arc(size/2, size/2, size*0.35, 0, Math.PI * 2);
          ctx.fill();
          // Inner details
          ctx.fillStyle = '#25D366';
          ctx.beginPath();
          ctx.arc(size/2, size/2, size*0.28, 0, Math.PI * 2);
          ctx.fill();
          // Phone icon
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(size/2, size/2, size*0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      },
      { 
        color: '#0088CC', 
        name: 'Telegram',
        draw: (ctx: CanvasRenderingContext2D, size: number) => {
          // Telegram icon - paper plane
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(size*0.75, size*0.25);
          ctx.lineTo(size*0.35, size*0.55);
          ctx.lineTo(size*0.5, size*0.6);
          ctx.lineTo(size*0.4, size*0.75);
          ctx.lineTo(size*0.55, size*0.65);
          ctx.lineTo(size*0.75, size*0.85);
          ctx.lineTo(size*0.85, size*0.3);
          ctx.closePath();
          ctx.fill();
        }
      },
      { 
        color: '#5865F2', 
        name: 'Discord',
        draw: (ctx: CanvasRenderingContext2D, size: number) => {
          // Discord icon - simplified game controller shape
          ctx.fillStyle = '#ffffff';
          // Main body
          ctx.beginPath();
          ctx.ellipse(size/2, size/2, size*0.3, size*0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#5865F2';
          ctx.beginPath();
          ctx.arc(size*0.4, size*0.48, size*0.08, 0, Math.PI * 2);
          ctx.arc(size*0.6, size*0.48, size*0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    ];
    
    iconConfigs.forEach((config, i) => {
      const iconGroup = new THREE.Group();
      
      // Create rounded square icon texture
      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 256;
      iconCanvas.height = 256;
      const ictx = iconCanvas.getContext('2d')!;
      
      // Clear
      ictx.clearRect(0, 0, 256, 256);
      
      // Background - rounded square with brand color
      ictx.fillStyle = config.color;
      const r = 56;
      ictx.beginPath();
      ictx.moveTo(r, 0);
      ictx.lineTo(256 - r, 0);
      ictx.quadraticCurveTo(256, 0, 256, r);
      ictx.lineTo(256, 256 - r);
      ictx.quadraticCurveTo(256, 256, 256 - r, 256);
      ictx.lineTo(r, 256);
      ictx.quadraticCurveTo(0, 256, 0, 256 - r);
      ictx.lineTo(0, r);
      ictx.quadraticCurveTo(0, 0, r, 0);
      ictx.closePath();
      ictx.fill();
      
      // Draw custom icon
      config.draw(ictx, 256);
      
      const iconTex = new THREE.CanvasTexture(iconCanvas);
      iconTex.needsUpdate = true;
      const iconGeo = new THREE.PlaneGeometry(0.7, 0.7);
      const iconMat = new THREE.MeshBasicMaterial({ 
        map: iconTex, 
        transparent: true,
        side: THREE.DoubleSide
      });
      const icon = new THREE.Mesh(iconGeo, iconMat);
      icon.castShadow = true;
      iconGroup.add(icon);
      
      // App name label below
      const nameCanvas = document.createElement('canvas');
      nameCanvas.width = 256;
      nameCanvas.height = 64;
      const nctx = nameCanvas.getContext('2d')!;
      nctx.fillStyle = 'rgba(15, 12, 10, 0.8)';
      nctx.roundRect(0, 0, 256, 64, 16);
      nctx.fill();
      nctx.fillStyle = '#F7F5F0';
      nctx.font = 'bold 24px "Space Grotesk", sans-serif';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(config.name, 128, 32);
      
      const nameTex = new THREE.CanvasTexture(nameCanvas);
      const nameGeo = new THREE.PlaneGeometry(0.8, 0.2);
      const nameMat = new THREE.MeshBasicMaterial({ 
        map: nameTex, 
        transparent: true 
      });
      const nameLabel = new THREE.Mesh(nameGeo, nameMat);
      nameLabel.position.set(0, -0.55, 0);
      nameLabel.scale.set(0, 0, 0); // Hidden initially
      iconGroup.add(nameLabel);
      
      iconGroup.position.set(-3 - i * 0.3, 1.5 - i * 1, -1);
      iconGroup.scale.set(0, 0, 0);
      iconGroup.rotation.z = 0.1;
      
      (iconGroup as any).userData = { 
        index: i,
        originalPos: iconGroup.position.clone(),
        baseRotation: 0.1,
        nameLabel
      };
      appIcons.push(iconGroup);
      scene.add(iconGroup);
    });
  }

  function createParticles() {
    const particleCount = 300;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
      
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.5 + Math.random() * 0.3;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function handleScroll(e: WheelEvent) {
    e.preventDefault();
    // Reduced sensitivity for smoother, slower scrolling
    targetScrollProgress += e.deltaY * 0.0003;
    targetScrollProgress = Math.max(0, Math.min(1, targetScrollProgress));
    
    // Determine phase
    let phase = 'INTRO';
    for (const [key, value] of Object.entries(PHASES)) {
      if (targetScrollProgress >= value.start && targetScrollProgress <= value.end) {
        phase = key;
        break;
      }
    }
    
    const phaseProgress = (targetScrollProgress - PHASES[phase as keyof typeof PHASES].start) / 
      (PHASES[phase as keyof typeof PHASES].end - PHASES[phase as keyof typeof PHASES].start);
    
    dispatch('phaseChange', { phase, progress: phaseProgress, scrollProgress: targetScrollProgress });
  }

  function updateScene(progress: number) {
    const time = performance.now() * 0.001;
    
    // Smooth scroll interpolation
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

    // Phase calculations
    const intro = smoothStep(progress, PHASES.INTRO.start, PHASES.INTRO.end);
    const wakeUp = smoothStep(progress, PHASES.WAKE_UP.start, PHASES.WAKE_UP.end);
    const cap1 = smoothStep(progress, PHASES.CAPABILITY_1.start, PHASES.CAPABILITY_1.end);
    const cap2 = smoothStep(progress, PHASES.CAPABILITY_2.start, PHASES.CAPABILITY_2.end);
    const cap3 = smoothStep(progress, PHASES.CAPABILITY_3.start, PHASES.CAPABILITY_3.end);
    const summary = smoothStep(progress, PHASES.SUMMARY.start, PHASES.SUMMARY.end);
    const cta = smoothStep(progress, PHASES.CTA.start, PHASES.CTA.end);

    // Robot animation
    if (heroRobot) {
      const data = heroRobot.userData as any;
      
      // Idle float
      const floatY = Math.sin(time * 2) * 0.1;
      
      // Keep central during cap1/cap2, move left on cap3, then far right on CTA
      heroRobot.position.x = -cap3 * 2 + cta * 4;
      heroRobot.position.y = data.baseY + floatY;
      
      // Wake up - eyes brighten
      const eyeIntensity = 0.5 + wakeUp * 1.5;
      if (data.leftGlow && data.rightGlow) {
        (data.leftGlow.material as THREE.MeshBasicMaterial).opacity = eyeIntensity * 0.3;
        (data.rightGlow.material as THREE.MeshBasicMaterial).opacity = eyeIntensity * 0.3;
      }
      
      // Rotate to face user
      heroRobot.rotation.y = wakeUp * 0.3;
      
      // Look at bubbles during cap phases
      if (cap1 > 0 || cap2 > 0 || cap3 > 0) {
        heroRobot.rotation.y += Math.sin(time * 3) * 0.05;
      }
      
      // Turn head to the right during CTA zoom
      heroRobot.rotation.y -= cta * 0.6;
      
      // Scale up for CTA
      const scale = 1.2 + cta * 0.3;
      heroRobot.scale.setScalar(scale);
      
      // Accessory animations based on scroll
      // Glasses appear at CAPABILITY_1
      if (data.glasses) {
        data.glasses.visible = cap1 > 0.1;
        data.glasses.scale.setScalar(Math.min(1, cap1 * 2));
        data.glasses.rotation.z = (1 - Math.min(1, cap1 * 3)) * 0.5; // Drop in animation
      }
      
      // Bowtie appears at CAPABILITY_2
      if (data.bowtie) {
        data.bowtie.visible = cap2 > 0.1;
        data.bowtie.scale.setScalar(Math.min(1, cap2 * 2));
        data.bowtie.position.y = -0.3 + (1 - Math.min(1, cap2 * 3)) * 0.2; // Pop up animation
      }
      
      // Eye expression changes - pupils dilate during capabilities
      if (data.leftEye && data.rightEye) {
        const pupilScale = 1 + (cap1 + cap2 + cap3) * 0.3; // Get excited during capabilities
        data.leftEye.scale.setScalar(pupilScale);
        data.rightEye.scale.setScalar(pupilScale);
      }
    }

    // Message bubbles animation
    messageBubbles.forEach((bubble, i) => {
      const delay = i * 0.1;
      const showBubble = smoothStep(progress, PHASES.CAPABILITY_1.start + delay, PHASES.CAPABILITY_1.start + delay + 0.1);
      const hideBubble = smoothStep(progress, PHASES.CTA.start, PHASES.CTA.start + 0.1);
      
      const scale = showBubble * (1 - hideBubble);
      bubble.scale.setScalar(scale);
      
      // Float animation
      bubble.position.y = bubble.userData.originalPos.y + Math.sin(time * 2 + i) * 0.05;
      
      // Move with scroll
      bubble.position.x = bubble.userData.originalPos.x - progress * 2;
    });

    // App icons animation
    appIcons.forEach((icon, i) => {
      const delay = i * 0.05;
      const showIcon = smoothStep(progress, PHASES.CAPABILITY_3.start + delay, PHASES.CAPABILITY_3.start + delay + 0.1);
      const showName = smoothStep(progress, PHASES.CAPABILITY_3.start + 0.1 + delay, PHASES.CAPABILITY_3.start + 0.2 + delay);
      const pulse = summary * Math.sin(time * 4 + i) * 0.1;
      
      icon.scale.setScalar(showIcon * (1 + pulse));
      icon.rotation.z = icon.userData.baseRotation + Math.sin(time + i) * 0.05;
      
      // Show name label
      if (icon.userData.nameLabel) {
        icon.userData.nameLabel.scale.setScalar(showName);
      }
      
      // Orbit around robot
      const angle = time * 0.5 + i * (Math.PI * 2 / 3);
      const radius = 3 - progress * 0.5;
      icon.position.x = Math.cos(angle) * radius - 2;
      icon.position.y = icon.userData.originalPos.y + Math.sin(time + i) * 0.1;
    });

    // Camera movement
    camera.position.z = 8 - progress * 2;
    camera.position.y = Math.sin(progress * Math.PI) * 0.5;
    camera.lookAt(0, 0, 0);

    // Particle animation
    if (particles) {
      particles.rotation.y = time * 0.02 + progress * 0.5;
      particles.position.y = progress * 2;
    }

    // Lighting changes
    if (lightingRig) {
      lightingRig.rotation.y = time * 0.1 + progress * 0.3;
    }
  }

  function smoothStep(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 1;
    const t = (value - min) / (max - min);
    return t * t * (3 - 2 * t);
  }

  function handleResize() {
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    updateScene(targetScrollProgress);
    renderer.render(scene, camera);
  }
</script>

<div bind:this={container} class="scroll-story-container" />

<style>
  .scroll-story-container {
    position: fixed;
    inset: 0;
    z-index: 0;
  }
  
  .scroll-story-container :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
