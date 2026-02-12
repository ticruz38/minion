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
  
  // Seedable random generator for consistent minion appearance
  function createSeededRandom(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return function() {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };
  }
  
  // Accessories available
  const availableAccessories = [
    'glasses', 'sunglasses', 'monocle',
    'bowtie', 'tie',
    'hat', 'tophat', 'beret', 'cap',
    'moustache', 'beard',
    'earring', 'headphones',
    'necklace', 'scarf'
  ];
  
  // Eye styles
  const eyeStyles = ['normal', 'wide', 'narrow', 'wink', 'heart', 'star'];
  
  // Personality traits affect animation
  const personalities = ['bouncy', 'smooth', 'jittery', 'calm', 'energetic'];
  
  // Generate minion traits from ID
  function generateTraits(id: string) {
    const rng = createSeededRandom(id);
    
    // 2-3 accessories per minion
    const numAccessories = Math.floor(rng() * 2) + 2;
    const accessories: string[] = [];
    for (let i = 0; i < numAccessories; i++) {
      const acc = availableAccessories[Math.floor(rng() * availableAccessories.length)];
      if (!accessories.includes(acc)) accessories.push(acc);
    }
    
    return {
      accessories,
      eyeStyle: eyeStyles[Math.floor(rng() * eyeStyles.length)],
      personality: personalities[Math.floor(rng() * personalities.length)],
      bodyScale: {
        x: 0.9 + rng() * 0.2,
        y: 0.85 + rng() * 0.3,
        z: 0.9 + rng() * 0.2
      },
      colorShift: {
        h: (rng() - 0.5) * 30, // +/- 15 degrees hue
        s: (rng() - 0.5) * 0.3, // +/- 15% saturation
        l: (rng() - 0.5) * 0.2  // +/- 10% lightness
      },
      antennaStyle: Math.floor(rng() * 4), // 0-3 different antenna styles
      eyeSize: 0.8 + rng() * 0.4, // 0.8x to 1.2x
      pupilSize: 0.7 + rng() * 0.4, // different pupil sizes
      hasEyelashes: rng() > 0.5, // feminine attribute
      blushIntensity: rng() * 0.5 // feminine attribute
    };
  }
  
  const traits = generateTraits(minionId);
  
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
    const isMobile = window.innerWidth <= 768;
    const size = isMobile ? 220 : 280;
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    container.appendChild(renderer.domElement);

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

  function shiftColor(hexColor: string, shift: { h: number; s: number; l: number }) {
    const color = new THREE.Color(hexColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    hsl.h = (hsl.h + shift.h / 360) % 1;
    if (hsl.h < 0) hsl.h += 1;
    hsl.s = Math.max(0, Math.min(1, hsl.s + shift.s));
    hsl.l = Math.max(0, Math.min(1, hsl.l + shift.l));
    
    return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
  }

  function createMinion() {
    minionGroup = new THREE.Group();
    const prof = professions[minionId] || professions.accountant;
    const mainColor = shiftColor(color, traits.colorShift);
    const secondaryColor = shiftColor(color, { h: 180, s: 0, l: -0.1 });

    // Body based on profession shape with scale variations
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
    body.scale.set(traits.bodyScale.x, traits.bodyScale.y, traits.bodyScale.z);
    minionGroup.add(body);

    // Create eyes based on style
    createEyes(prof.shape, mainColor);

    // Create antenna based on style
    createAntenna(mainColor, secondaryColor);

    // Add accessories
    traits.accessories.forEach(acc => {
      createAccessory(acc, mainColor, secondaryColor);
    });

    // Add blush for feminine attribute
    if (traits.blushIntensity > 0.2) {
      createBlush();
    }

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

    scene.add(minionGroup);
  }

  function createEyes(bodyShape: string, mainColor: THREE.Color) {
    const eyeGroup = new THREE.Group();
    const eyeSize = 0.25 * traits.eyeSize;
    
    const eyeGeometry = new THREE.SphereGeometry(eyeSize, 32, 32);
    const eyeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 0.1,
      thickness: 0.5
    });

    const zPos = bodyShape === 'round' ? 0.7 : 0.75;
    const yPos = 0.2;

    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.35, yPos, zPos);
    eyeGroup.add(leftEye);

    // Right eye
    const rightEye = leftEye.clone();
    rightEye.position.set(0.35, yPos, zPos);
    eyeGroup.add(rightEye);

    // Pupils based on style
    createPupils(eyeGroup, zPos, yPos);

    // Eyelashes for feminine look
    if (traits.hasEyelashes) {
      createEyelashes(eyeGroup, eyeSize, zPos, yPos);
    }

    minionGroup.add(eyeGroup);
  }

  function createPupils(eyeGroup: THREE.Group, zPos: number, yPos: number) {
    const pupilSize = 0.1 * traits.pupilSize;
    let pupilGeometry: THREE.BufferGeometry;

    switch (traits.eyeStyle) {
      case 'heart':
        // Use small sphere for heart effect
        pupilGeometry = new THREE.SphereGeometry(pupilSize, 16, 16);
        break;
      case 'star':
        pupilGeometry = new THREE.ConeGeometry(pupilSize, pupilSize * 2, 5);
        break;
      case 'narrow':
        pupilGeometry = new THREE.CapsuleGeometry(pupilSize * 0.5, pupilSize, 4, 8);
        break;
      default:
        pupilGeometry = new THREE.SphereGeometry(pupilSize, 16, 16);
    }

    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.35, yPos, zPos + 0.2);
    if (traits.eyeStyle === 'wink') {
      leftPupil.scale.y = 0.1; // Winking left eye
    }
    eyeGroup.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.35, yPos, zPos + 0.2);
    eyeGroup.add(rightPupil);
  }

  function createEyelashes(eyeGroup: THREE.Group, eyeSize: number, zPos: number, yPos: number) {
    const lashMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    [-0.35, 0.35].forEach((xPos) => {
      for (let i = -2; i <= 2; i++) {
        const lash = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.005, 0.15),
          lashMaterial
        );
        lash.position.set(
          xPos + i * 0.08,
          yPos + eyeSize + 0.08,
          zPos
        );
        lash.rotation.z = -i * 0.3;
        lash.rotation.x = 0.3;
        eyeGroup.add(lash);
      }
    });
  }

  function createBlush() {
    const blushGeometry = new THREE.CircleGeometry(0.15, 32);
    const blushMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff9999,
      transparent: true,
      opacity: traits.blushIntensity * 0.5,
      side: THREE.DoubleSide
    });

    const leftBlush = new THREE.Mesh(blushGeometry, blushMaterial);
    leftBlush.position.set(-0.5, -0.1, 0.75);
    leftBlush.rotation.y = -0.3;
    minionGroup.add(leftBlush);

    const rightBlush = leftBlush.clone();
    rightBlush.position.set(0.5, -0.1, 0.75);
    rightBlush.rotation.y = 0.3;
    minionGroup.add(rightBlush);
  }

  function createAntenna(mainColor: THREE.Color, secondaryColor: THREE.Color) {
    const antennaGroup = new THREE.Group();

    switch (traits.antennaStyle) {
      case 0: // Standard
        createStandardAntenna(antennaGroup, mainColor);
        break;
      case 1: // Coiled
        createCoiledAntenna(antennaGroup, mainColor);
        break;
      case 2: // Double
        createDoubleAntenna(antennaGroup, mainColor, secondaryColor);
        break;
      case 3: // Heart tip
        createHeartAntenna(antennaGroup, mainColor);
        break;
    }

    minionGroup.add(antennaGroup);
  }

  function createStandardAntenna(group: THREE.Group, color: THREE.Color) {
    const antennaGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.6);
    const antennaMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1, 0);
    group.add(antenna);

    const lightGeometry = new THREE.SphereGeometry(0.12);
    const lightMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      toneMapped: false
    });
    const light = new THREE.Mesh(lightGeometry, lightMaterial);
    light.position.set(0, 1.35, 0);
    group.add(light);
  }

  function createCoiledAntenna(group: THREE.Group, color: THREE.Color) {
    // Create a spiral/coiled antenna
    const coilPoints = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      coilPoints.push(new THREE.Vector3(
        Math.cos(t * Math.PI * 4) * 0.1,
        0.7 + t * 0.6,
        Math.sin(t * Math.PI * 4) * 0.1
      ));
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilPoints);
    const coilGeometry = new THREE.TubeGeometry(coilCurve, 20, 0.02, 8, false);
    const coilMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888,
      metalness: 0.8
    });
    const coil = new THREE.Mesh(coilGeometry, coilMaterial);
    group.add(coil);

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: color, toneMapped: false })
    );
    light.position.set(0, 1.4, 0);
    group.add(light);
  }

  function createDoubleAntenna(group: THREE.Group, color1: THREE.Color, color2: THREE.Color) {
    [-0.2, 0.2].forEach((x, i) => {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
      );
      antenna.position.set(x, 0.95, 0);
      group.add(antenna);

      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.08),
        new THREE.MeshBasicMaterial({ color: i === 0 ? color1 : color2, toneMapped: false })
      );
      light.position.set(x, 1.25, 0);
      group.add(light);
    });
  }

  function createHeartAntenna(group: THREE.Group, color: THREE.Color) {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 })
    );
    antenna.position.set(0, 1, 0);
    group.add(antenna);

    // Heart shape using two spheres and a cone
    const heartGroup = new THREE.Group();
    heartGroup.position.set(0, 1.4, 0);
    heartGroup.scale.set(0.15, 0.15, 0.15);

    const heartMat = new THREE.MeshBasicMaterial({ color: 0xff6699 });
    
    const left = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), heartMat);
    left.position.set(-0.5, 0.5, 0);
    heartGroup.add(left);

    const right = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), heartMat);
    right.position.set(0.5, 0.5, 0);
    heartGroup.add(right);

    const bottom = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 32), heartMat);
    bottom.position.set(0, -0.5, 0);
    heartGroup.add(bottom);

    group.add(heartGroup);
  }

  function createAccessory(type: string, mainColor: THREE.Color, secondaryColor: THREE.Color) {
    const accessoryGroup = new THREE.Group();
    
    switch (type) {
      case 'glasses':
        createGlasses(accessoryGroup);
        break;
      case 'sunglasses':
        createSunglasses(accessoryGroup);
        break;
      case 'monocle':
        createMonocle(accessoryGroup);
        break;
      case 'bowtie':
        createBowtie(accessoryGroup, secondaryColor);
        break;
      case 'tie':
        createTie(accessoryGroup, secondaryColor);
        break;
      case 'hat':
        createHat(accessoryGroup, mainColor);
        break;
      case 'tophat':
        createTopHat(accessoryGroup);
        break;
      case 'beret':
        createBeret(accessoryGroup, secondaryColor);
        break;
      case 'cap':
        createCap(accessoryGroup, mainColor);
        break;
      case 'moustache':
        createMoustache(accessoryGroup);
        break;
      case 'beard':
        createBeard(accessoryGroup);
        break;
      case 'earring':
        createEarring(accessoryGroup, mainColor);
        break;
      case 'headphones':
        createHeadphones(accessoryGroup);
        break;
      case 'necklace':
        createNecklace(accessoryGroup, mainColor);
        break;
      case 'scarf':
        createScarf(accessoryGroup, secondaryColor);
        break;
    }

    minionGroup.add(accessoryGroup);
  }

  function createGlasses(group: THREE.Group) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
    const lensGeo = new THREE.TorusGeometry(0.28, 0.03, 16, 32);
    
    const leftLens = new THREE.Mesh(lensGeo, frameMat);
    leftLens.position.set(-0.35, 0.2, 0.95);
    group.add(leftLens);
    
    const rightLens = leftLens.clone();
    rightLens.position.set(0.35, 0.2, 0.95);
    group.add(rightLens);
    
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.02, 0.02),
      frameMat
    );
    bridge.position.set(0, 0.2, 0.95);
    group.add(bridge);
  }

  function createSunglasses(group: THREE.Group) {
    const lensMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x111111, 
      metalness: 0.8,
      roughness: 0.1
    });
    
    const leftLens = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.05), lensMat);
    leftLens.position.set(-0.35, 0.2, 0.95);
    group.add(leftLens);
    
    const rightLens = leftLens.clone();
    rightLens.position.set(0.35, 0.2, 0.95);
    group.add(rightLens);
  }

  function createMonocle(group: THREE.Group) {
    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.04, 16, 32),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2 })
    );
    frame.position.set(0.35, 0.2, 0.95);
    group.add(frame);

    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1 })
    );
    chain.position.set(0.65, -0.05, 0.9);
    chain.rotation.z = -0.3;
    group.add(chain);
  }

  function createBowtie(group: THREE.Group, color: THREE.Color) {
    const bowMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
    
    const leftWing = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 32), bowMat);
    leftWing.rotation.z = Math.PI / 2;
    leftWing.position.set(-0.2, -0.3, 0.75);
    group.add(leftWing);
    
    const rightWing = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 32), bowMat);
    rightWing.rotation.z = -Math.PI / 2;
    rightWing.position.set(0.2, -0.3, 0.75);
    group.add(rightWing);

    const center = new THREE.Mesh(new THREE.SphereGeometry(0.08), bowMat);
    center.position.set(0, -0.3, 0.78);
    group.add(center);
  }

  function createTie(group: THREE.Group, color: THREE.Color) {
    const tieMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4 });
    
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.05), tieMat);
    top.position.set(0, -0.2, 0.78);
    group.add(top);

    const bottom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.15, 0.5, 4),
      tieMat
    );
    bottom.position.set(0, -0.5, 0.76);
    bottom.rotation.y = Math.PI / 4;
    group.add(bottom);
  }

  function createHat(group: THREE.Group, color: THREE.Color) {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    brim.position.set(0, 0.9, 0);
    group.add(brim);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: color })
    );
    top.position.set(0, 1.15, 0);
    group.add(top);
  }

  function createTopHat(group: THREE.Group) {
    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.05, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
    );
    brim.position.set(0, 0.85, 0);
    group.add(brim);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.6, 32),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3 })
    );
    top.position.set(0, 1.25, 0);
    group.add(top);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.41, 0.08, 32),
      new THREE.MeshStandardMaterial({ color: 0x8b0000 })
    );
    band.position.set(0, 1.05, 0);
    group.add(band);
  }

  function createBeret(group: THREE.Group, color: THREE.Color) {
    const beret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.15, 32),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 })
    );
    beret.position.set(0.1, 1.0, 0);
    beret.rotation.z = -0.2;
    group.add(beret);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8),
      new THREE.MeshStandardMaterial({ color: color })
    );
    stem.position.set(0, 1.1, 0);
    group.add(stem);
  }

  function createCap(group: THREE.Group, color: THREE.Color) {
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: color })
    );
    top.position.set(0, 0.75, 0);
    group.add(top);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 0.05, 32, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: color })
    );
    brim.position.set(0, 0.75, 0.2);
    brim.rotation.x = 0.3;
    group.add(brim);
  }

  function createMoustache(group: THREE.Group) {
    const moustacheMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const left = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.4, 8),
      moustacheMat
    );
    left.rotation.z = Math.PI / 4;
    left.position.set(-0.25, -0.15, 0.85);
    group.add(left);

    const right = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.05, 0.4, 8),
      moustacheMat
    );
    right.rotation.z = -Math.PI / 4;
    right.position.set(0.25, -0.15, 0.85);
    group.add(right);

    const center = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8),
      moustacheMat
    );
    center.position.set(0, -0.25, 0.85);
    group.add(center);
  }

  function createBeard(group: THREE.Group) {
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
    
    const beard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 0.4, 32),
      beardMat
    );
    beard.position.set(0, -0.4, 0.7);
    beard.rotation.x = 0.2;
    group.add(beard);
  }

  function createEarring(group: THREE.Group, color: THREE.Color) {
    [-0.6, 0.6].forEach((x) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.02, 8, 16),
        new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 })
      );
      ring.position.set(x, 0, 0.6);
      group.add(ring);

      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.05),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      gem.position.set(x, -0.1, 0.6);
      group.add(gem);
    });
  }

  function createHeadphones(group: THREE.Group) {
    const headphoneMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4 });
    
    // Headband
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.05, 8, 32, Math.PI),
      headphoneMat
    );
    band.position.set(0, 0.5, 0);
    group.add(band);

    // Ear cups
    [-0.75, 0.75].forEach((x) => {
      const cup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16),
        headphoneMat
      );
      cup.rotation.z = Math.PI / 2;
      cup.position.set(x, 0.2, 0);
      group.add(cup);

      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.05, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x666666 })
      );
      cushion.position.set(x, 0.2, 0);
      group.add(cushion);
    });
  }

  function createNecklace(group: THREE.Group, color: THREE.Color) {
    const chainPoints = [];
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * Math.PI + Math.PI;
      chainPoints.push(new THREE.Vector3(
        Math.cos(angle) * 0.5,
        Math.sin(angle) * 0.3 - 0.3,
        0.75
      ));
    }
    
    const chainCurve = new THREE.CatmullRomCurve3(chainPoints);
    const chainGeo = new THREE.TubeGeometry(chainCurve, 20, 0.02, 8, false);
    const chainMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.8 });
    const chain = new THREE.Mesh(chainGeo, chainMat);
    group.add(chain);

    // Pendant
    const pendant = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pendant.position.set(0, -0.6, 0.78);
    group.add(pendant);
  }

  function createScarf(group: THREE.Group, color: THREE.Color) {
    const scarfMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    
    // Around neck
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.12, 8, 32),
      scarfMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -0.2, 0);
    group.add(ring);

    // Hanging part
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.6, 0.05),
      scarfMat
    );
    tail.position.set(0.3, -0.6, 0.7);
    tail.rotation.z = -0.2;
    group.add(tail);
  }

  function createParticles() {
    const particleCount = 30;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({
      color: color,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    if (minionGroup) {
      // Animation based on personality
      switch (traits.personality) {
        case 'bouncy':
          minionGroup.position.y = Math.sin(time * 3) * 0.15;
          minionGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
          break;
        case 'jittery':
          minionGroup.position.x = (Math.random() - 0.5) * 0.02;
          minionGroup.rotation.z = Math.sin(time * 10) * 0.02;
          break;
        case 'energetic':
          minionGroup.rotation.y = time * 0.5;
          minionGroup.position.y = Math.abs(Math.sin(time * 4)) * 0.1;
          break;
        case 'calm':
          minionGroup.rotation.y = Math.sin(time * 0.3) * 0.05;
          break;
        default: // smooth
          minionGroup.position.y = Math.sin(time * 2) * 0.08;
          minionGroup.rotation.y = Math.sin(time * 0.4) * 0.08;
      }

      if (isHovered) {
        minionGroup.scale.setScalar(1.1);
        minionGroup.rotation.y += 0.02;
      } else if (isSelected) {
        minionGroup.scale.setScalar(1.15);
      } else if (isLocked) {
        minionGroup.scale.setScalar(0.95);
      } else {
        minionGroup.scale.setScalar(1);
      }
    }
    
    if (particles) {
      particles.rotation.y = time * 0.05;
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += Math.sin(time + positions[i - 1]) * 0.002;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    }
    
    renderer.render(scene, camera);
  }
</script>

<div bind:this={container} class="avatar-container" class:hovered={isHovered} class:selected={isSelected} class:locked={isLocked}></div>

<style>
  .avatar-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
  }

  .avatar-container.hovered {
    transform: scale(1.05);
  }

  .avatar-container.selected {
    transform: scale(1.1);
    filter: drop-shadow(0 0 20px rgba(212, 168, 83, 0.5));
  }

  .avatar-container.locked {
    opacity: 0.7;
    filter: grayscale(0.5);
  }

  .avatar-container :global(canvas) {
    border-radius: 50%;
  }
</style>
