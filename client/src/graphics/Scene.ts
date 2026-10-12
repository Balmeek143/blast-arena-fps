import * as THREE from 'three';
import { ArenaBox, ArenaData, PowerupSpawn } from '../../../shared/types.js';

interface PowerupGroup {
  group: THREE.Group;
  itemRoot: THREE.Group;
  ring1: THREE.Mesh;
  ring2: THREE.Mesh;
  light: THREE.PointLight;
}

export class GameScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private powerupMeshes: Map<string, PowerupGroup> = new Map();
  private jumpPadMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#070b19');
    this.scene.fog = new THREE.FogExp2('#070b19', 0.011);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.setupLights();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private setupLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight('#94a3b8', 0.85);
    this.scene.add(ambient);

    // Directional Sunlight with shadows
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Vibrant cyan fill light
    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.6);
    fillLight.position.set(-40, 30, -30);
    this.scene.add(fillLight);
  }

  public buildArena(arena: ArenaData) {
    for (const box of arena.boxes) {
      this.createArenaBoxMesh(box);
    }
  }

  private createArenaBoxMesh(box: ArenaBox) {
    const width = box.max[0] - box.min[0];
    const height = box.max[1] - box.min[1];
    const depth = box.max[2] - box.min[2];

    const posX = box.min[0] + width / 2;
    const posY = box.min[1] + height / 2;
    const posZ = box.min[2] + depth / 2;

    const geo = new THREE.BoxGeometry(width, height, depth);

    let mat: THREE.Material;
    if (box.type === 'jumppad') {
      const padMat = new THREE.MeshStandardMaterial({
        color: '#10b981',
        emissive: '#059669',
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.8
      });
      this.jumpPadMaterials.push(padMat);
      mat = padMat;
    } else if (box.type === 'ground') {
      mat = new THREE.MeshStandardMaterial({
        color: box.color || '#1e293b',
        roughness: 0.85,
        metalness: 0.2
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: box.color || '#334155',
        roughness: 0.5,
        metalness: 0.3
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY, posZ);
    mesh.receiveShadow = true;
    mesh.castShadow = box.type !== 'ground';

    // Edge wireframe accent
    if (box.type === 'cover' || box.type === 'platform' || box.type === 'wall') {
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.18, transparent: true })
      );
      mesh.add(line);
    }

    this.scene.add(mesh);
  }

  public updatePowerups(powerups: PowerupSpawn[], time: number) {
    for (const p of powerups) {
      let pg = this.powerupMeshes.get(p.id);

      if (!pg) {
        pg = this.createPowerupMesh(p);
        this.powerupMeshes.set(p.id, pg);
        this.scene.add(pg.group);
      }

      pg.group.visible = p.available;

      if (p.available) {
        // Floating sinusoidal bob and rotation
        pg.itemRoot.rotation.y = time * 2.2;
        pg.itemRoot.position.y = 0.9 + Math.sin(time * 3.5 + parseInt(p.id.replace('p-', '') || '0')) * 0.22;

        // Counter-rotating orbital rings
        pg.ring1.rotation.z = time * 2.5;
        pg.ring2.rotation.z = -time * 3.0;

        // Pulsing light
        pg.light.intensity = 1.4 + Math.sin(time * 6) * 0.4;
      }
    }

    // Pulse jump pads
    const padPulse = (Math.sin(time * 5) + 1) * 0.35 + 0.4;
    for (const mat of this.jumpPadMaterials) {
      mat.emissiveIntensity = padPulse;
    }
  }

  private createPowerupMesh(p: PowerupSpawn): PowerupGroup {
    const group = new THREE.Group();
    group.position.set(p.position.x, p.position.y, p.position.z);

    // Color definitions
    let color = '#fbbf24';
    let emissive = '#d97706';
    let label = 'MYSTERY POWERUP';

    if (p.type === 'health') {
      color = '#22c55e';
      emissive = '#15803d';
      label = '💖 MEDKIT (+50 HP)';
    } else if (p.type === 'shield') {
      color = '#38bdf8';
      emissive = '#0284c7';
      label = '🛡️ SHIELD (+50 ARMOR)';
    } else if (p.type === 'damage') {
      color = '#f59e0b';
      emissive = '#b45309';
      label = '🔥 QUAD DAMAGE (2x DMG)';
    } else if (p.type === 'speed') {
      color = '#10b981';
      emissive = '#047857';
      label = '⚡ SPEED BOOST (1.6x)';
    } else if (p.type === 'power_rocket') {
      color = '#ef4444';
      emissive = '#b91c1c';
      label = '🚀 ROCKET LAUNCHER (3 ROCKETS)';
    } else if (p.type === 'power_sniper') {
      color = '#a855f7';
      emissive = '#7e22ce';
      label = '🎯 HEAVY SNIPER (5 ROUNDS)';
    } else if (p.type === 'power_shotgun') {
      color = '#f97316';
      emissive = '#c2410c';
      label = '💥 PUMP SHOTGUN (6 SHELLS)';
    } else if (p.type === 'power_rifle') {
      color = '#06b6d4';
      emissive = '#0891b2';
      label = '⚡ ASSAULT RIFLE (40 ROUNDS)';
    }

    // 1. High-Tech Ground Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.3,
      metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    base.receiveShadow = true;
    group.add(base);

    // Glowing Neon Ring on Base
    const baseRingGeo = new THREE.TorusGeometry(1.15, 0.04, 8, 24);
    const baseRingMat = new THREE.MeshBasicMaterial({ color });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.21;
    group.add(baseRing);

    // Upward Hologram Column
    const beamGeo = new THREE.CylinderGeometry(0.7, 0.7, 3.0, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.6;
    group.add(beam);

    // 2. Floating Item Root
    const itemRoot = new THREE.Group();
    itemRoot.position.y = 1.0;
    group.add(itemRoot);

    // Orbital Energy Rings
    const ringGeo = new THREE.TorusGeometry(0.9, 0.025, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 3;
    itemRoot.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = -Math.PI / 3;
    itemRoot.add(ring2);

    // 3. Bespoke 3D Floating Model
    const model = this.buildSpecificPowerupModel(p.type, color, emissive);
    itemRoot.add(model);

    // Point Light
    const pointLight = new THREE.PointLight(color, 1.8, 6);
    pointLight.position.set(0, 0, 0);
    itemRoot.add(pointLight);

    // 4. Overhead Hologram Text Badge
    const labelSprite = this.createPickupLabelSprite(label, color);
    labelSprite.position.y = 2.4;
    group.add(labelSprite);

    return {
      group,
      itemRoot,
      ring1,
      ring2,
      light: pointLight
    };
  }

  private buildSpecificPowerupModel(type: string, color: string, emissive: string): THREE.Group {
    const group = new THREE.Group();

    if (type === 'health') {
      // 💖 Medkit Briefcase
      const caseGeo = new THREE.BoxGeometry(0.65, 0.5, 0.25);
      const caseMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3, metalness: 0.4 });
      const kit = new THREE.Mesh(caseGeo, caseMat);
      group.add(kit);

      // Handle
      const handleGeo = new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI);
      const handleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, 0.26, 0);
      group.add(handle);

      // Extruded 3D Green Cross
      const crossMat = new THREE.MeshStandardMaterial({ color: '#22c55e', emissive: '#16a34a', emissiveIntensity: 0.9 });
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.28), crossMat);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.28), crossMat);
      group.add(c1);
      group.add(c2);
    } else if (type === 'shield') {
      // 🛡️ Knight Energy Shield Crest
      const shieldShape = new THREE.Shape();
      shieldShape.moveTo(-0.35, 0.35);
      shieldShape.lineTo(0.35, 0.35);
      shieldShape.lineTo(0.35, -0.1);
      shieldShape.lineTo(0, -0.45);
      shieldShape.lineTo(-0.35, -0.1);
      shieldShape.closePath();

      const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
      const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, extrudeSettings);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: '#0284c7',
        emissive: '#38bdf8',
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.2
      });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.z = -0.04;
      group.add(shield);

      // Glowing Center Orb
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 16),
        new THREE.MeshBasicMaterial({ color: '#e0f2fe' })
      );
      orb.position.z = 0.08;
      group.add(orb);
    } else if (type === 'speed') {
      // ⚡ 3D Lightning Bolt
      const boltShape = new THREE.Shape();
      boltShape.moveTo(0.05, 0.45);
      boltShape.lineTo(-0.25, 0.05);
      boltShape.lineTo(-0.02, 0.05);
      boltShape.lineTo(-0.15, -0.45);
      boltShape.lineTo(0.25, -0.05);
      boltShape.lineTo(0.02, -0.05);
      boltShape.closePath();

      const boltGeo = new THREE.ExtrudeGeometry(boltShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02 });
      const boltMat = new THREE.MeshStandardMaterial({
        color: '#10b981',
        emissive: '#34d399',
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2
      });
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      group.add(bolt);
    } else if (type === 'damage') {
      // 🔥 Quad Damage Flaming Spiked Core
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.25, 1),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#ea580c', emissiveIntensity: 1.2 })
      );
      group.add(core);

      // Spikes
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.35, 6);
      const spikeMat = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        if (i === 0) spike.position.y = 0.35;
        if (i === 1) { spike.position.y = -0.35; spike.rotation.x = Math.PI; }
        if (i === 2) { spike.position.x = 0.35; spike.rotation.z = -Math.PI / 2; }
        if (i === 3) { spike.position.x = -0.35; spike.rotation.z = Math.PI / 2; }
        if (i === 4) { spike.position.z = 0.35; spike.rotation.x = Math.PI / 2; }
        if (i === 5) { spike.position.z = -0.35; spike.rotation.x = -Math.PI / 2; }
        group.add(spike);
      }
    } else if (type === 'power_shotgun') {
      // 💥 Floating Pump Shotgun
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.75, 10),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.9 })
      );
      barrel.rotation.z = Math.PI / 2;
      group.add(barrel);

      const pump = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: '#ea580c', emissive: '#c2410c', emissiveIntensity: 0.6 })
      );
      group.add(pump);

      // Floating shotgun shells
      const shellGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8);
      const shellMat = new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.8 });
      const s1 = new THREE.Mesh(shellGeo, shellMat);
      s1.position.set(0.2, 0.22, 0);
      const s2 = new THREE.Mesh(shellGeo, shellMat);
      s2.position.set(-0.2, -0.22, 0);
      group.add(s1);
      group.add(s2);
    } else if (type === 'power_rifle') {
      // ⚡ Floating Assault Rifle
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.14, 0.08),
        new THREE.MeshStandardMaterial({ color: '#0891b2', emissive: '#06b6d4', emissiveIntensity: 0.6, metalness: 0.7 })
      );
      group.add(body);

      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.24, 0.06),
        new THREE.MeshStandardMaterial({ color: '#0f172a' })
      );
      mag.position.set(-0.1, -0.15, 0);
      mag.rotation.z = 0.25;
      group.add(mag);
    } else if (type === 'power_sniper') {
      // 🎯 Floating Heavy Sniper
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.12, 0.08),
        new THREE.MeshStandardMaterial({ color: '#7e22ce', emissive: '#9333ea', emissiveIntensity: 0.7, metalness: 0.8 })
      );
      group.add(body);

      const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.35, 10),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9 })
      );
      scope.rotation.z = Math.PI / 2;
      scope.position.y = 0.12;
      group.add(scope);
    } else if (type === 'power_rocket') {
      // 🚀 Floating Rocket Pod
      const r1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.75, 10),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#b91c1c', emissiveIntensity: 0.7, metalness: 0.6 })
      );
      r1.rotation.z = Math.PI / 2;
      r1.position.y = 0.1;

      const r2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.75, 10),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#b91c1c', emissiveIntensity: 0.7, metalness: 0.6 })
      );
      r2.rotation.z = Math.PI / 2;
      r2.position.y = -0.1;

      group.add(r1);
      group.add(r2);
    }

    return group;
  }

  private createPickupLabelSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(10, 10, 300, 50, 10);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();

      ctx.font = 'bold 22px Chakra Petch, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, 160, 35);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.55, 1);
    return sprite;
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
