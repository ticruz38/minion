<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  export let minionId: string;
  export let color: string;
  export let isHovered = false;
  export let isSelected = false;
  export let isLocked = false;
  
  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let minionGroup: THREE.Group;
  let animationId: number;
  let particles: THREE.Points;
  
  const professions: Record<string, { shape: string; accessory: string }> = {
    accountant: { shape: 'cube', accessory: 'glasses' },
    realtor: { shape: 'house', accessory: 'key' },
    analyst: { shape: 'diamond', accessory: 'chart' },
    restaurant: { shape: 'round', accessory: 'plate' },
    scheduler: { shape: 'cylinder', accessory: 'clock' },
    support: { shape: 'soft', accessory: 'headset' }
  };

  onMount(() => {
    initScene();
    createMinion();
    createParticles();
    animate();
    
    return () => {
      cleanup();
    };
  });

  onDestroy(() => {
    cleanup();
  });

  function cleanup() {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      if (container?.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    }
    scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  function initScene() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    // Responsive sizing
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 220 : 280;
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    container.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(color, 0.8);
    rimLight.position.set(-5, 5, -5);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(color, 0.5);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);
  }

  function createMinion() {
    minionGroup = new THREE.Group();
    const prof = professions[minionId] || professions.accountant;
    const mainColor = new THREE.Color(color);

    // Body based on profession shape
    let bodyGeometry: THREE.BufferGeometry;
    switch (prof.shape) {
      case 'cube':
        bodyGeometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
        break;
      case 'house':
        bodyGeometry = new THREE.ConeGeometry(1, 1.6, 4);
        break;
      case 'diamond':
        bodyGeometry = new THREE.OctahedronGeometry(0.9);
        break;
      case 'round':
        bodyGeometry = new THREE.SphereGeometry(0.9, 32, 32);
        break;
      case 'cylinder':
        bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 1.4, 32);
        break;
      default:
        bodyGeometry = new THREE.CapsuleGeometry(0.7, 0.6, 4, 16);
    }

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: mainColor,
      metalness: 0.3,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      emissive: mainColor,
      emissiveIntensity: 0.1
    });

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    minionGroup.add(body);

    // Face - eyes
    const eyeGroup = new THREE.Group();
    
    // Left eye
    const eyeGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 0.1,
      thickness: 0.5
    });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.35, 0.2, prof.shape === 'round' ? 0.7 : 0.75);
    eyeGroup.add(leftEye);

    // Right eye
    const rightEye = leftEye.clone();
    rightEye.position.set(0.35, 0.2, prof.shape === 'round' ? 0.7 : 0.75);
    eyeGroup.add(rightEye);

    // Pupils
    const pupilGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.35, 0.2, prof.shape === 'round' ? 0.92 : 0.97);
    eyeGroup.add(leftPupil);

    const rightPupil = leftPupil.clone();
    rightPupil.position.set(0.35, 0.2, prof.shape === 'round' ? 0.92 : 0.97);
    eyeGroup.add(rightPupil);

    minionGroup.add(eyeGroup);

    // Antenna for tech feel
    const antennaGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6);
    const antennaMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1, 0);
    minionGroup.add(antenna);

    // Antenna light
    const antennaLightGeometry = new THREE.SphereGeometry(0.12);
    const antennaLightMaterial = new THREE.MeshBasicMaterial({ 
      color: mainColor,
      toneMapped: false
    });
    const antennaLight = new THREE.Mesh(antennaLightGeometry, antennaLightMaterial);
    antennaLight.position.set(0, 1.35, 0);
    minionGroup.add(antennaLight);

    // Glowing ring around minion
    const ringGeometry = new THREE.TorusGeometry(1.2, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: mainColor,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.8;
    minionGroup.add(ring);

    // Profession accessory
    createAccessory(prof.accessory, mainColor);

    scene.add(minionGroup);
  }

  function createAccessory(type: string, color: THREE.Color) {
    const accessoryGroup = new THREE.Group();
    
    switch (type) {
      case 'glasses': // Accountant
        const glassesGeo = new THREE.TorusGeometry(0.3, 0.03, 16, 32);
        const glassesMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const leftLens = new THREE.Mesh(glassesGeo, glassesMat);
        leftLens.position.set(-0.35, 0.2, 0.95);
        accessoryGroup.add(leftLens);
        const rightLens = leftLens.clone();
        rightLens.position.set(0.35, 0.2, 0.95);
        accessoryGroup.add(rightLens);
        // Bridge
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.02, 0.02),
          glassesMat
        );
        bridge.position.set(0, 0.2, 0.95);
        accessoryGroup.add(bridge);
        break;

      case 'key': // Realtor
        const keyGroup = new THREE.Group();
        const keyRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.15, 0.03, 8, 32),
          new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2 })
        );
        keyGroup.add(keyRing);
        const keyShaft = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 0.4, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2 })
        );
        keyShaft.position.y = -0.3;
        keyGroup.add(keyShaft);
        keyGroup.position.set(0.9, 0.3, 0);
        accessoryGroup.add(keyGroup);
        break;

      case 'chart': // Analyst
        const bars = new THREE.Group();
        [0.3, 0.5, 0.7].forEach((h, i) => {
          const bar = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, h, 0.12),
            new THREE.MeshPhysicalMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.3 })
          );
          bar.position.set((i - 1) * 0.25, h / 2 + 0.8, 0);
          bars.add(bar);
        });
        accessoryGroup.add(bars);
        break;

      case 'plate': // Restaurant
        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.35, 0.05, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 })
        );
        plate.position.set(0, 1.2, 0);
        accessoryGroup.add(plate);
        const food = new THREE.Mesh(
          new THREE.SphereGeometry(0.15),
          new THREE.MeshStandardMaterial({ color: 0xff6b35 })
        );
        food.position.set(0, 1.35, 0);
        accessoryGroup.add(food);
        break;

      case 'clock': // Scheduler
        const clockGroup = new THREE.Group();
        const clockFace = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.05, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        clockFace.rotation.x = Math.PI / 2;
        clockGroup.add(clockFace);
        const hand1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.03, 0.25, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        hand1.position.z = 0.04;
        clockGroup.add(hand1);
        const hand2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.03, 0.02),
          new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        hand2.position.z = 0.04;
        clockGroup.add(hand2);
        clockGroup.position.set(0.8, 0.2, 0.3);
        clockGroup.rotation.y = 0.5;
        accessoryGroup.add(clockGroup);
        break;

      case 'headset': // Support
        const headset = new THREE.Group();
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(0.6, 0.04, 8, 32, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        headset.add(band);
        const earCup1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        earCup1.rotation.z = Math.PI / 2;
        earCup1.position.set(-0.58, 0, 0);
        headset.add(earCup1);
        const earCup2 = earCup1.clone();
        earCup2.position.set(0.58, 0, 0);
        headset.add(earCup2);
        const mic = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        mic.position.set(0.5, -0.3, 0.2);
        mic.rotation.z = 0.5;
        headset.add(mic);
        accessoryGroup.add(headset);
        break;
    }

    minionGroup.add(accessoryGroup);
  }

  function createParticles() {
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const mainColor = new THREE.Color(color);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      colors[i * 3] = mainColor.r;
      colors[i * 3 + 1] = mainColor.g;
      colors[i * 3 + 2] = mainColor.b;

      sizes[i] = Math.random() * 0.05 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    if (minionGroup) {
      // Idle floating animation
      if (!isSelected) {
        minionGroup.position.y = Math.sin(time * 2) * 0.1;
        minionGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
      }

      // Hover state - excited animation
      if (isHovered && !isSelected) {
        minionGroup.position.y = Math.sin(time * 8) * 0.15 + 0.2;
        minionGroup.rotation.y += 0.03;
        minionGroup.scale.setScalar(1.1 + Math.sin(time * 10) * 0.02);
      } else if (!isSelected) {
        minionGroup.scale.setScalar(1);
      }

      // Selected state - spinning reveal
      if (isSelected) {
        minionGroup.rotation.y += 0.05;
        minionGroup.scale.setScalar(1.15);
        minionGroup.position.y = 0.3;
      }

      // Locked state - dimmed
      if (isLocked) {
        minionGroup.scale.setScalar(0.9);
      }
    }

    // Animate particles
    if (particles) {
      particles.rotation.y = time * 0.1;
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(time + i) * 0.002;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  $: {
    // React to state changes
    if (minionGroup && isSelected) {
      // Trigger selection burst effect
      const burstRing = new THREE.Mesh(
        new THREE.RingGeometry(1, 1.2, 32),
        new THREE.MeshBasicMaterial({ 
          color: new THREE.Color(color),
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide
        })
      );
      burstRing.rotation.x = Math.PI / 2;
      burstRing.position.y = -1;
      minionGroup.add(burstRing);

      // Animate and remove burst ring
      let scale = 1;
      const expandRing = () => {
        scale += 0.1;
        burstRing.scale.setScalar(scale);
        (burstRing.material as THREE.MeshBasicMaterial).opacity -= 0.02;
        if ((burstRing.material as THREE.MeshBasicMaterial).opacity > 0) {
          requestAnimationFrame(expandRing);
        } else {
          minionGroup.remove(burstRing);
          burstRing.geometry.dispose();
          burstRing.material.dispose();
        }
      };
      expandRing();
    }
  }
</script>

<div bind:this={container} class="avatar-container" class:hovered={isHovered} class:selected={isSelected} class:locked={isLocked} style="color: {color}">
  <div class="selection-ring" class:active={isSelected}></div>
</div>

<style>
  .avatar-container {
    width: 280px;
    height: 280px;
    position: relative;
    border-radius: 24px;
    background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    overflow: hidden;
    transition: all 0.3s ease;
  }

  @media (max-width: 768px) {
    .avatar-container {
      width: 220px;
      height: 220px;
    }
  }

  @media (max-width: 400px) {
    .avatar-container {
      width: 200px;
      height: 200px;
    }
  }

  .avatar-container.hovered {
    border-color: currentColor;
    box-shadow: 0 0 40px currentColor;
    transform: scale(1.02);
  }

  .avatar-container.selected {
    border-color: currentColor;
    box-shadow: 0 0 60px currentColor, inset 0 0 60px rgba(255,255,255,0.1);
    transform: scale(1.05);
  }

  .avatar-container.locked {
    opacity: 0.5;
    filter: grayscale(0.5);
  }

  .selection-ring {
    position: absolute;
    inset: -4px;
    border-radius: 28px;
    border: 2px solid transparent;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  .selection-ring.active {
    opacity: 1;
    border-color: currentColor;
    animation: ring-pulse 1.5s ease-in-out infinite;
  }

  @keyframes ring-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.02); opacity: 0.7; }
  }

  :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
