<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { minions } from '$lib/minions-data';

  // Props
  export let selectedMinionIndex = -1;
  export let onSelectMinion: (index: number) => void;
  export let filterIndices: number[] | null = null;
  export let layout: 'carousel' | 'grid' = 'carousel';

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let animationId: number;
  let robotGroups: THREE.Group[] = [];
  let particles: THREE.Points;
  let mouseX = 0;
  let mouseY = 0;

  $: visibleIndices = filterIndices ?? minions.map((_, i) => i);
  $: visibleCount = visibleIndices.length;

  // Curated accessories for each minion - gives each one personality
  const minionAccessories: Record<string, string[]> = {
    accountant: ['glasses', 'bowtie'],              // Benny - professional
    secretary: ['headphones', 'sash'],              // Terry - organized
    trader: ['monocle', 'medal'],                   // Troy - wealthy
    realtor: ['hat', 'badge'],                      // Owen - approachable
    analyst: ['glasses', 'tie'],                    // Barry - data nerd
    restaurant: ['chef-hat', 'bowtie'],             // Sergio - chef style
    support: ['headset', 'smile'],                  // Tim - customer service
    'content-creator': ['sunglasses', 'cape'],      // Casey - cool creative
    'invoice-chaser': ['eyepatch', 'sword'],        // Chase - pirate enforcer
    'receipt-tracker': ['glasses', 'pocket-square'], // Rex - meticulous
    researcher: ['goggles', 'scarf'],               // Russ - explorer
    'email-handler': ['visor', 'earpiece'],         // Ian - tech support
    'gift-guru': ['tiara', 'necklace'],             // Gigi - elegant
    'meal-planner': ['chef-hat', 'apron'],          // Chip - chef
    handyman: ['cap', 'tool-belt'],                 // Hank - worker
    'trip-planner': ['sunglasses', 'sun-hat'],      // Tina - vacation vibe
  };

  onMount(() => {
    if (typeof window === 'undefined') return;
    initScene();
    animate();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) {
      renderer.dispose();
      container?.removeChild(renderer.domElement);
    }
    robotGroups.forEach(group => {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    if (particles) {
      particles.geometry.dispose();
      (particles.material as THREE.Material).dispose();
    }
  });

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0c0a);
    scene.fog = new THREE.FogExp2(0x0f0c0a, 0.02);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting - match homepage
    const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.2);
    scene.add(ambientLight);

    const mainLight = new THREE.SpotLight(0xffa94d, 2);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);

    const fillLight = new THREE.PointLight(0xc9a227, 0.8);
    fillLight.position.set(-5, 2, 5);
    scene.add(fillLight);

    const rimLight = new THREE.SpotLight(0xff6b35, 1.5);
    rimLight.position.set(0, 5, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    createRobots();
    createParticles();
  }

  function createRobot(color: number, accessories: string[] = []) {
    const group = new THREE.Group();
    const robotColor = new THREE.Color(color);

    // Body - rounded cube (same as homepage)
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

    // Add accessories
    accessories.forEach(acc => createAccessory(group, acc, robotColor));

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
      baseY: 0,
      floatSpeed: 0.5 + Math.random() * 0.5,
      floatOffset: Math.random() * Math.PI * 2,
      // Random looking behavior
      lookAngle: (Math.random() - 0.5) * 0.6,  // -0.3 to 0.3 radians (±17 degrees)
      lookChangeTime: Math.random() * 2000,     // When to change look direction
      lookSpeed: 0.02 + Math.random() * 0.02,   // How fast to turn head
    };

    return group;
  }

  function createAccessory(group: THREE.Group, type: string, color: THREE.Color) {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1, roughness: 0.2 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

    switch (type) {
      // EYEWEAR
      case 'glasses':
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 });
        const lensGeo = new THREE.TorusGeometry(0.18, 0.025, 12, 24);
        const leftLens = new THREE.Mesh(lensGeo, frameMat);
        leftLens.position.set(-0.25, 0.1, 0.58);
        group.add(leftLens);
        const rightLens = leftLens.clone();
        rightLens.position.set(0.25, 0.1, 0.58);
        group.add(rightLens);
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.02), frameMat);
        bridge.position.set(0, 0.1, 0.58);
        group.add(bridge);
        break;

      case 'sunglasses':
        const sunMat = new THREE.MeshPhysicalMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
        const leftSun = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.05), sunMat);
        leftSun.position.set(-0.2, 0.12, 0.6);
        group.add(leftSun);
        const rightSun = leftSun.clone();
        rightSun.position.set(0.2, 0.12, 0.6);
        group.add(rightSun);
        break;

      case 'monocle':
        const monoFrame = new THREE.Mesh(
          new THREE.TorusGeometry(0.2, 0.03, 8, 24),
          goldMat
        );
        monoFrame.position.set(0.25, 0.1, 0.6);
        group.add(monoFrame);
        const chain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.6),
          goldMat
        );
        chain.position.set(0.5, -0.2, 0.55);
        chain.rotation.z = -0.3;
        group.add(chain);
        break;

      case 'goggles':
        const goggleMat = new THREE.MeshStandardMaterial({ color: 0xff6600, metalness: 0.3 });
        const strap = new THREE.Mesh(
          new THREE.TorusGeometry(0.75, 0.05, 8, 32, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        strap.position.set(0, 0.1, 0);
        group.add(strap);
        [-0.22, 0.22].forEach((x) => {
          const goggle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16), goggleMat);
          goggle.rotation.x = Math.PI / 2;
          goggle.position.set(x, 0.1, 0.6);
          group.add(goggle);
        });
        break;

      case 'eyepatch':
        const patch = new THREE.Mesh(
          new THREE.CircleGeometry(0.15, 16),
          new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        patch.position.set(0.25, 0.1, 0.58);
        group.add(patch);
        break;

      case 'visor':
        const visor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.15, 32, 1, false, 0, Math.PI),
          new THREE.MeshPhysicalMaterial({ 
            color: 0x00ffff, 
            metalness: 0.9, 
            transparent: true, 
            opacity: 0.7 
          })
        );
        visor.position.set(0, 0.15, 0);
        group.add(visor);
        break;

      // NECKWEAR
      case 'bowtie':
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xD4A853 });
        const leftWing = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 32), bowMat);
        leftWing.rotation.z = Math.PI / 2;
        leftWing.position.set(-0.15, -0.3, 0.55);
        group.add(leftWing);
        const rightWing = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 32), bowMat);
        rightWing.rotation.z = -Math.PI / 2;
        rightWing.position.set(0.15, -0.3, 0.55);
        group.add(rightWing);
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.08), bowMat);
        bowCenter.position.set(0, -0.3, 0.58);
        group.add(bowCenter);
        break;

      case 'tie':
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 });
        const tieTop = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.02), tieMat);
        tieTop.position.set(0, -0.15, 0.58);
        group.add(tieTop);
        const tieBot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), tieMat);
        tieBot.position.set(0, -0.4, 0.56);
        tieBot.rotation.y = Math.PI / 4;
        group.add(tieBot);
        break;

      case 'sash':
        const sash = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 1.0, 0.03),
          new THREE.MeshStandardMaterial({ color: color })
        );
        sash.position.set(-0.35, -0.2, 0.5);
        sash.rotation.z = 0.3;
        group.add(sash);
        break;

      case 'scarf':
        const scarfMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.9 });
        const scarfRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.12, 8, 32),
          scarfMat
        );
        scarfRing.rotation.x = Math.PI / 2;
        scarfRing.position.set(0, -0.2, 0);
        group.add(scarfRing);
        break;

      case 'necklace':
        const chainPath = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.4, -0.3, 0.5),
          new THREE.Vector3(0, -0.7, 0.6),
          new THREE.Vector3(0.4, -0.3, 0.5)
        ]);
        const chainMesh = new THREE.Mesh(
          new THREE.TubeGeometry(chainPath, 20, 0.015, 8, false),
          goldMat
        );
        group.add(chainMesh);
        const pendant = new THREE.Mesh(
          new THREE.SphereGeometry(0.08),
          new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        pendant.position.set(0, -0.7, 0.62);
        group.add(pendant);
        break;

      // HEADWEAR
      case 'hat':
        const hatBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.7, 0.7, 0.03, 32),
          new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
        );
        hatBrim.position.set(0, 0.55, 0);
        group.add(hatBrim);
        const hatTop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32),
          new THREE.MeshStandardMaterial({ color: color })
        );
        hatTop.position.set(0, 0.75, 0);
        group.add(hatTop);
        break;

      case 'chef-hat':
        const chefBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.15, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
        );
        chefBase.position.set(0, 0.65, 0);
        group.add(chefBase);
        const chefTop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.4, 0.4, 32),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
        );
        chefTop.position.set(0, 0.9, 0);
        group.add(chefTop);
        break;

      case 'cap':
        const capMat = new THREE.MeshStandardMaterial({ color: color });
        const capBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.6, 0.6, 0.03, 32, 1, false, 0, Math.PI),
          capMat
        );
        capBrim.position.set(0, 0.55, 0.15);
        capBrim.rotation.x = 0.2;
        group.add(capBrim);
        const capTop = new THREE.Mesh(
          new THREE.SphereGeometry(0.45, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
          capMat
        );
        capTop.position.set(0, 0.55, 0);
        group.add(capTop);
        break;

      case 'sun-hat':
        const sunBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.9, 0.02, 32),
          new THREE.MeshStandardMaterial({ color: 0xffd4a3 })
        );
        sunBrim.position.set(0, 0.55, 0);
        group.add(sunBrim);
        const sunTop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32),
          new THREE.MeshStandardMaterial({ color: 0xff6b6b })
        );
        sunTop.position.set(0, 0.7, 0);
        group.add(sunTop);
        break;

      case 'tiara':
        const tiara = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16, 1, true, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 })
        );
        tiara.position.set(0, 0.65, 0);
        group.add(tiara);
        for (let i = 0; i < 3; i++) {
          const gem = new THREE.Mesh(
            new THREE.SphereGeometry(0.06),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
          );
          gem.position.set((i - 1) * 0.25, 0.75, 0.35);
          group.add(gem);
        }
        break;

      // TECH
      case 'headphones':
        const phoneMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const headband = new THREE.Mesh(
          new THREE.TorusGeometry(0.65, 0.04, 8, 32, Math.PI),
          phoneMat
        );
        headband.position.set(0, 0.1, 0);
        group.add(headband);
        [-0.65, 0.65].forEach((x) => {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), phoneMat);
          cup.rotation.z = Math.PI / 2;
          cup.position.set(x, 0, 0);
          group.add(cup);
        });
        break;

      case 'headset':
        const headband2 = new THREE.Mesh(
          new THREE.TorusGeometry(0.6, 0.03, 8, 32, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        headband2.position.set(0, 0.1, 0);
        group.add(headband2);
        const micBoom = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.25),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        micBoom.position.set(0.3, -0.15, 0.5);
        micBoom.rotation.z = -0.5;
        group.add(micBoom);
        const micTip = new THREE.Mesh(
          new THREE.SphereGeometry(0.04),
          new THREE.MeshStandardMaterial({ color: 0x222222 })
        );
        micTip.position.set(0.4, -0.25, 0.55);
        group.add(micTip);
        break;

      case 'earpiece':
        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.4),
          new THREE.MeshStandardMaterial({ color: 0x888888 })
        );
        wire.position.set(0.65, 0.2, 0);
        group.add(wire);
        const bud = new THREE.Mesh(
          new THREE.SphereGeometry(0.06),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        bud.position.set(0.65, 0, 0.3);
        group.add(bud);
        break;

      // BADGES & DECORATIONS
      case 'badge':
        const badge = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16),
          goldMat
        );
        badge.rotation.x = Math.PI / 2;
        badge.position.set(-0.5, 0.1, 0.5);
        group.add(badge);
        break;

      case 'medal':
        const ribbon = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.05, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        ribbon.position.set(0, -0.2, 0.55);
        ribbon.rotation.z = Math.PI / 6;
        group.add(ribbon);
        const medal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16),
          goldMat
        );
        medal.rotation.x = Math.PI / 2;
        medal.position.set(0.1, -0.35, 0.55);
        group.add(medal);
        break;

      case 'pocket-square':
        const pocketSq = new THREE.Mesh(
          new THREE.BoxGeometry(0.15, 0.08, 0.02),
          new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        pocketSq.position.set(0.45, -0.15, 0.52);
        group.add(pocketSq);
        break;

      // SPECIAL
      case 'cape':
        const capeMat = new THREE.MeshStandardMaterial({ 
          color: 0x8b0000, 
          roughness: 0.9,
          side: THREE.DoubleSide
        });
        const cape = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.2, 0.05),
          capeMat
        );
        cape.position.set(0, -0.3, -0.55);
        cape.rotation.x = 0.1;
        group.add(cape);
        break;

      case 'apron':
        const apronMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
        const apronBody = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.8, 0.05),
          apronMat
        );
        apronBody.position.set(0, -0.4, 0.52);
        group.add(apronBody);
        const apronStrap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        apronStrap.position.set(0.3, -0.1, 0.55);
        apronStrap.rotation.z = 0.5;
        group.add(apronStrap);
        break;

      case 'tool-belt':
        const belt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.75, 0.75, 0.08, 32, 1, true),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        belt.position.set(0, -0.5, 0);
        group.add(belt);
        break;

      case 'sword':
        const swordHandle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.03, 0.15),
          new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        swordHandle.position.set(-0.7, -0.3, 0.2);
        swordHandle.rotation.z = -0.3;
        group.add(swordHandle);
        const swordBlade = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.5, 0.01),
          new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 })
        );
        swordBlade.position.set(-0.75, -0.1, 0.2);
        swordBlade.rotation.z = -0.3;
        group.add(swordBlade);
        break;

      case 'smile':
        // A cheerful smile drawn on the face
        const smileCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.15, -0.15, 0.52),
          new THREE.Vector3(0, -0.25, 0.55),
          new THREE.Vector3(0.15, -0.15, 0.52)
        ]);
        const smileGeo = new THREE.TubeGeometry(smileCurve, 10, 0.015, 8, false);
        const smileMat = new THREE.MeshBasicMaterial({ color: 0xffd4a3 });
        const smile = new THREE.Mesh(smileGeo, smileMat);
        group.add(smile);
        break;
    }
  }

  function createRobots() {
    // Clear existing
    robotGroups.forEach(g => scene.remove(g));
    robotGroups = [];

    minions.forEach((minion, i) => {
      // Convert hex color to number
      const color = parseInt(minion.color.replace('#', '0x'));
      
      // Get curated accessories for this minion
      const accessories = minionAccessories[minion.id] || [];
      
      const group = createRobot(color, accessories);
      
      // Store data for animation
      (group as any).userData = {
        ...((group as any).userData),
        index: i,
        originalY: 0,
        floatSpeed: 0.5 + (i * 0.05),
        floatOffset: i * 0.5,
        // Wandering state
        homeX: 0, homeY: 0, homeZ: 0,
        wanderOffset: { x: 0, y: 0, z: 0 },
        wanderTargetOffset: { x: 0, y: 0, z: 0 },
        wanderTime: 0,
      };

      // Mark the body with the index for click detection
      group.children.forEach(child => {
        if (child.userData) child.userData.index = i;
      });

      robotGroups.push(group);
      scene.add(group);
    });
  }

  function createParticles() {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

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

  function handleResize() {
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function handleMouseMove(event: MouseEvent) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  // Camera offset when minion is selected - shift camera to frame minion on left
  $: cameraOffsetX = selectedMinionIndex >= 0 ? -3 : 0;
  let currentCameraOffsetX = 0;

  function updateLayout(time: number) {
    if (!visibleIndices.length) return;

    // Smoothly interpolate camera offset
    currentCameraOffsetX += (cameraOffsetX - currentCameraOffsetX) * 0.05;

    robotGroups.forEach((group, i) => {
      const isVisible = visibleIndices.includes(i);
      const data = (group as any).userData;

      if (!isVisible) {
        group.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), 0.1);
        return;
      }

      const visibleIndex = visibleIndices.indexOf(i);
      const isFocusMode = selectedMinionIndex >= 0 && selectedMinionIndex < visibleCount;
      const isSelected = i === visibleIndices[selectedMinionIndex];

      // Idle float animation
      const floatY = Math.sin(time * data.floatSpeed + data.floatOffset) * 0.1;

      if (isFocusMode && !isSelected) {
        // Hide non-selected minions
        group.scale.lerp(new THREE.Vector3(0.01, 0.01, 0.01), 0.1);
        group.position.z += (-10 - group.position.z) * 0.05;
      } else if (isFocusMode && isSelected) {
        // Focus mode - position minion on LEFT side of screen, keep wandering!
        const homeX = currentCameraOffsetX - 1.5;  // Left side base position
        const homeY = 0;
        const homeZ = -1;
        
        // Store home for wandering
        data.homeX = homeX;
        data.homeY = homeY;
        data.homeZ = homeZ;
        
        // Wandering behavior even when selected (lively!)
        const now = performance.now();
        
        if (data.wanderOffset === undefined) {
          data.wanderOffset = { x: 0, y: 0, z: 0 };
          data.wanderTargetOffset = { x: 0, y: 0, z: 0 };
          data.wanderTime = now;
        }
        
        const distToTarget = Math.sqrt(
          Math.pow(data.wanderTargetOffset.x - data.wanderOffset.x, 2) +
          Math.pow(data.wanderTargetOffset.y - data.wanderOffset.y, 2) +
          Math.pow(data.wanderTargetOffset.z - data.wanderOffset.z, 2)
        );
        
        if (now > data.wanderTime || distToTarget < 0.05) {
          // Larger perimeter when selected (more visible movement)
          const perimeterX = 1.5;
          const perimeterY = 0.8;
          const perimeterZ = 1.0;
          
          data.wanderTargetOffset.x = (Math.random() - 0.5) * 2 * perimeterX;
          data.wanderTargetOffset.y = (Math.random() - 0.5) * 2 * perimeterY;
          data.wanderTargetOffset.z = (Math.random() - 0.5) * 2 * perimeterZ;
          
          data.wanderTime = now + 1500 + Math.random() * 3000;
        }
        
        // Smooth drift
        const driftSpeed = 0.02;
        data.wanderOffset.x += (data.wanderTargetOffset.x - data.wanderOffset.x) * driftSpeed;
        data.wanderOffset.y += (data.wanderTargetOffset.y - data.wanderOffset.y) * driftSpeed;
        data.wanderOffset.z += (data.wanderTargetOffset.z - data.wanderOffset.z) * driftSpeed;
        
        // Apply position with wander
        group.position.x += (homeX + data.wanderOffset.x - group.position.x) * 0.05;
        group.position.y += (homeY + data.wanderOffset.y - group.position.y) * 0.05;
        group.position.z += (homeZ + data.wanderOffset.z - group.position.z) * 0.05;
        
        // Look toward wander direction
        const lookDir = Math.atan2(data.wanderTargetOffset.x, data.wanderTargetOffset.z);
        if (distToTarget > 0.1) {
          data.lookAngle = lookDir * 0.4;
        }
        group.rotation.y += (data.lookAngle - group.rotation.y) * data.lookSpeed;

        group.scale.lerp(new THREE.Vector3(1.6, 1.6, 1.6), 0.08);  // Bigger!
      } else {
        // Calculate home position based on layout
        let homeX = 0, homeY = 0, homeZ = 0;
        
        if (layout === 'carousel') {
          const count = visibleIndices.length;
          const angleStep = Math.PI / 6;
          const selectedIdx = Math.floor(count / 2);
          const angle = (visibleIndex - selectedIdx) * angleStep;
          const radius = 6;
          homeX = Math.sin(angle) * radius + currentCameraOffsetX;
          homeZ = Math.cos(angle) * radius * 0.5 - 2;
          homeY = floatY + 0.5;
        } else {
          // Grid layout
          const cols = Math.min(visibleCount, 4);
          const col = visibleIndex % cols;
          const row = Math.floor(visibleIndex / cols);
          const spacing = visibleCount <= 2 ? 4 : 3;
          const maxRows = Math.ceil(visibleCount / cols);
          const rowOffset = (maxRows - 1) / 2;
          const baseY = visibleCount === 1 ? -1.5 : -1.0;
          
          homeX = (col - (cols - 1) / 2) * spacing + currentCameraOffsetX;
          homeY = baseY + (rowOffset - row) * spacing * 0.6 + floatY;
          homeZ = visibleCount === 1 ? -1.5 : -3;
        }
        
        // Store home position for wandering reference
        data.homeX = homeX;
        data.homeY = homeY;
        data.homeZ = homeZ;
        
        // Wandering behavior - roam within 3D perimeter around home
        const now = performance.now();
        
        // Initialize wander offset if not set
        if (data.wanderOffset === undefined) {
          data.wanderOffset = { x: 0, y: 0, z: 0 };
          data.wanderTargetOffset = { x: 0, y: 0, z: 0 };
          data.wanderTime = now;
        }
        
        // Pick new wander target periodically or when close to target
        const distToTarget = Math.sqrt(
          Math.pow(data.wanderTargetOffset.x - data.wanderOffset.x, 2) +
          Math.pow(data.wanderTargetOffset.y - data.wanderOffset.y, 2) +
          Math.pow(data.wanderTargetOffset.z - data.wanderOffset.z, 2)
        );
        
        if (now > data.wanderTime || distToTarget < 0.05) {
          // Define 3D perimeter (±1.2 units on X/Z, ±0.6 on Y)
          const perimeterX = 1.2;
          const perimeterY = 0.6;
          const perimeterZ = 1.2;
          
          data.wanderTargetOffset.x = (Math.random() - 0.5) * 2 * perimeterX;
          data.wanderTargetOffset.y = (Math.random() - 0.5) * 2 * perimeterY;
          data.wanderTargetOffset.z = (Math.random() - 0.5) * 2 * perimeterZ;
          
          // Next wander in 1.5-5 seconds
          data.wanderTime = now + 1500 + Math.random() * 3500;
        }
        
        // Smoothly drift toward wander target
        const driftSpeed = 0.015;
        data.wanderOffset.x += (data.wanderTargetOffset.x - data.wanderOffset.x) * driftSpeed;
        data.wanderOffset.y += (data.wanderTargetOffset.y - data.wanderOffset.y) * driftSpeed;
        data.wanderOffset.z += (data.wanderTargetOffset.z - data.wanderOffset.z) * driftSpeed;
        
        // Apply position: home + wander offset
        group.position.x += (homeX + data.wanderOffset.x - group.position.x) * 0.05;
        group.position.y += (homeY + data.wanderOffset.y - group.position.y) * 0.05;
        group.position.z += (homeZ + data.wanderOffset.z - group.position.z) * 0.05;
        
        // Look toward wander direction
        const lookDir = Math.atan2(data.wanderTargetOffset.x, data.wanderTargetOffset.z);
        if (distToTarget > 0.1) {
          data.lookAngle = lookDir * 0.4;
        }
        group.rotation.y += (data.lookAngle - group.rotation.y) * data.lookSpeed;
        
        // Scale
        const baseScale = layout === 'carousel' ? 1 : (visibleCount === 1 ? 1.5 : visibleCount <= 4 ? 1.2 : 1.0);
        const targetScale = isSelected ? baseScale * 1.1 : baseScale;
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      }
    });
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    const isFocusMode = selectedMinionIndex >= 0 && selectedMinionIndex < (filterIndices ?? minions.map((_, i) => i)).length;

    if (isFocusMode) {
      const targetCamX = currentCameraOffsetX;
      camera.position.x += (targetCamX - camera.position.x) * 0.03;
      camera.position.z += (9 - camera.position.z) * 0.03;
      camera.position.y += (0 - camera.position.y) * 0.03;
      camera.lookAt(currentCameraOffsetX, 0, 0);
    } else {
      const targetCamX = mouseX * 2 + currentCameraOffsetX;
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
      camera.position.z += (9 - camera.position.z) * 0.05;
      camera.lookAt(currentCameraOffsetX, 0, 0);
    }

    updateLayout(time);

    if (particles) {
      particles.rotation.y = time * 0.02;
    }

    renderer.render(scene, camera);
  }

  function handleClick(event: MouseEvent) {
    if (!camera || !renderer) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(scene.children, true);
    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object;
      while (obj) {
        if (obj.userData && typeof obj.userData.index === 'number') {
          const globalIndex = obj.userData.index;
          const visibleIndex = visibleIndices.indexOf(globalIndex);
          if (visibleIndex !== -1) {
            onSelectMinion(visibleIndex);
          }
          return;
        }
        obj = obj.parent;
      }
    }
  }
</script>

<div bind:this={container} class="scene-container" on:click={handleClick} />

<style>
  .scene-container {
    position: absolute;
    inset: 0;
    z-index: 0;
    cursor: pointer;
  }
  .scene-container :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
