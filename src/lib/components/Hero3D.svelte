<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { minions } from '$lib/minions-data';

  // Props
  export let selectedMinionIndex = 0;
  export let onSelectMinion: (index: number) => void;

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let animationId: number;
  let robotGroups: THREE.Group[] = [];
  let particles: THREE.Points;
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;

  // Minion colors for the scene
  const minionColors = minions.map(m => new THREE.Color(m.color));

  onMount(() => {
    if (typeof window === 'undefined') return;
    
    initScene();
    animate();
    
    // Event listeners
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
    // Clean up geometries and materials
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
    // Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a1512, 0.02);

    // Camera
    camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Lighting - warm atmospheric
    const ambientLight = new THREE.AmbientLight(0xffd4a3, 0.3);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffa94d, 1.5);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    const rimLight = new THREE.SpotLight(0xff6b35, 2);
    rimLight.position.set(-10, 5, -5);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xc9a227, 0.8);
    fillLight.position.set(-5, -5, 5);
    scene.add(fillLight);

    // Create floating robots
    createRobots();

    // Create particles
    createParticles();

    // Create ground plane (subtle reflection)
    createGround();
  }

  function createRobots() {
    const count = minions.length;
    const radius = 6;
    
    minions.forEach((minion, i) => {
      const group = new THREE.Group();
      
      // Position in a circle
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.5 - 2;
      const y = Math.sin(i * 0.5) * 0.5;
      
      group.position.set(x, y, z);
      
      // Create stylized robot geometry
      const color = minionColors[i];
      
      // Head (rounded cube)
      const headGeometry = new THREE.BoxGeometry(1.2, 1, 1, 4, 4, 4);
      // Round the edges by modifying vertices
      const positionAttribute = headGeometry.attributes.position;
      for (let j = 0; j < positionAttribute.count; j++) {
        const x = positionAttribute.getX(j);
        const y = positionAttribute.getY(j);
        const z = positionAttribute.getZ(j);
        // Smooth corners
        const len = Math.sqrt(x*x + y*y + z*z);
        if (len > 0) {
          const factor = 0.9 + 0.1 * (1 / len);
          positionAttribute.setXYZ(j, x * factor, y * factor, z * factor);
        }
      }
      headGeometry.computeVertexNormals();
      
      const headMaterial = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.4,
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);
      
      // Face screen (dark glass)
      const faceGeometry = new THREE.PlaneGeometry(0.8, 0.5);
      const faceMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1,
      });
      const face = new THREE.Mesh(faceGeometry, faceMaterial);
      face.position.z = 0.51;
      face.position.y = 0.1;
      group.add(face);
      
      // Eyes (glowing dots)
      const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const eyeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffd4a3,
      });
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 0.1, 0.55);
      group.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.2, 0.1, 0.55);
      group.add(rightEye);
      
      // Antenna
      const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
      const antennaMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8a8a8a,
        metalness: 0.8,
        roughness: 0.2 
      });
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.y = 0.7;
      group.add(antenna);
      
      // Antenna ball
      const ballGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const ball = new THREE.Mesh(ballGeometry, new THREE.MeshBasicMaterial({ 
        color: color,
        toneMapped: false 
      }));
      ball.position.y = 0.9;
      group.add(ball);
      
      // Floating animation data
      (group as any).userData = {
        originalY: y,
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatOffset: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        index: i,
        angle: angle
      };
      
      // Click handler
      head.userData = { index: i };
      face.userData = { index: i };
      
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
      
      // Warm dust colors
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 0.6 + Math.random() * 0.3;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function createGround() {
    const geometry = new THREE.PlaneGeometry(30, 30);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1512,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    ground.receiveShadow = true;
    scene.add(ground);
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

  function updateCamera() {
    // Smooth camera movement based on mouse
    targetRotationX = mouseY * 0.1;
    targetRotationY = mouseX * 0.1;
    
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
    camera.position.y += (mouseY * 1 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);
  }

  function updateRobots(time: number) {
    robotGroups.forEach((group, i) => {
      const data = (group as any).userData;
      
      // Floating animation
      group.position.y = data.originalY + Math.sin(time * data.floatSpeed + data.floatOffset) * 0.2;
      
      // Gentle rotation
      group.rotation.y += data.rotationSpeed;
      
      // Look at camera when selected
      if (i === selectedMinionIndex) {
        group.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
        group.rotation.y += 0.02;
        // Glow effect - increase emissive
        group.children.forEach((child: any) => {
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = 0.3 + Math.sin(time * 3) * 0.2;
          }
        });
      } else {
        group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        // Reset emissive
        group.children.forEach((child: any) => {
          if (child.material && child.material.emissive) {
            child.material.emissiveIntensity = 0;
          }
        });
      }
      
      // Arrange in carousel when selected
      const targetAngle = (i - selectedMinionIndex) * (Math.PI / 8);
      const radius = 6;
      const targetX = Math.sin(targetAngle) * radius;
      const targetZ = Math.cos(targetAngle) * radius * 0.5 - 2;
      
      if (i !== selectedMinionIndex) {
        group.position.x += (targetX - group.position.x) * 0.05;
        group.position.z += (targetZ - group.position.z) * 0.05;
      } else {
        // Selected robot comes forward
        group.position.z += (2 - group.position.z) * 0.05;
        group.position.x += (0 - group.position.x) * 0.05;
      }
    });
  }

  function updateParticles(time: number) {
    if (!particles) return;
    particles.rotation.y = time * 0.05;
    const positions = particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] += Math.sin(time + positions[i]) * 0.002;
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    
    const time = performance.now() * 0.001;
    
    updateCamera();
    updateRobots(time);
    updateParticles(time);
    
    renderer.render(scene, camera);
  }

  // Handle click on canvas
  function handleClick(event: MouseEvent) {
    if (!camera || !renderer) return;
    
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
      if (intersect.object.userData && typeof intersect.object.userData.index === 'number') {
        onSelectMinion(intersect.object.userData.index);
        break;
      }
    }
  }
</script>

<div 
  bind:this={container} 
  class="hero-3d-container"
  on:click={handleClick}
/>

<style>
  .hero-3d-container {
    position: absolute;
    inset: 0;
    z-index: 0;
    cursor: pointer;
  }
  
  .hero-3d-container :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
</style>
