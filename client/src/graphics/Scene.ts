import * as THREE from 'three';
import { ArenaBox, ArenaData, PowerupSpawn } from '../../../shared/types.js';

export class GameScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  private powerupMeshes: Map<string, THREE.Group> = new Map();
  private jumpPadMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b132b');
    this.scene.fog = new THREE.FogExp2('#0b132b', 0.012);

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
    const ambient = new THREE.AmbientLight('#94a3b8', 0.8);
    this.scene.add(ambient);

    // Directional Sunlight with shadows
    const sun = new THREE.DirectionalLight('#ffffff', 1.4);
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

    // Subtle blue fill light from opposite angle
    const fillLight = new THREE.DirectionalLight('#38bdf8', 0.5);
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
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8
      });
      this.jumpPadMaterials.push(padMat);
      mat = padMat;
    } else if (box.type === 'ground') {
      mat = new THREE.MeshStandardMaterial({
        color: box.color || '#334155',
        roughness: 0.85,
        metalness: 0.15
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: box.color || '#64748b',
        roughness: 0.6,
        metalness: 0.2
      });
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, posY, posZ);
    mesh.receiveShadow = true;
    mesh.castShadow = box.type !== 'ground';

    // Edge wireframe accent for stylized low-poly outline look!
    if (box.type === 'cover' || box.type === 'platform' || box.type === 'wall') {
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.15, transparent: true })
      );
      mesh.add(line);
    }

    this.scene.add(mesh);
  }

  public updatePowerups(powerups: PowerupSpawn[], time: number) {
    for (const p of powerups) {
      let group = this.powerupMeshes.get(p.id);

      if (!group) {
        group = this.createPowerupMesh(p);
        this.powerupMeshes.set(p.id, group);
        this.scene.add(group);
      }

      group.visible = p.available;

      if (p.available) {
        // Floating sinusoidal bob and rotation
        group.rotation.y = time * 2.0;
        group.position.y = p.position.y + 0.8 + Math.sin(time * 3.5 + parseInt(p.id.replace('p-', '') || '0')) * 0.25;
      }
    }

    // Pulse jump pads
    const padPulse = (Math.sin(time * 4) + 1) * 0.3 + 0.4;
    for (const mat of this.jumpPadMaterials) {
      mat.emissiveIntensity = padPulse;
    }
  }

  private createPowerupMesh(p: PowerupSpawn): THREE.Group {
    const group = new THREE.Group();
    group.position.set(p.position.x, p.position.y, p.position.z);

    // Color based on type
    let color = '#fbbf24';
    let emissive = '#d97706';

    if (p.type === 'health') {
      color = '#22c55e';
      emissive = '#15803d';
    } else if (p.type === 'shield') {
      color = '#38bdf8';
      emissive = '#0284c7';
    } else if (p.type === 'damage') {
      color = '#f59e0b';
      emissive = '#b45309';
    } else if (p.type === 'speed') {
      color = '#10b981';
      emissive = '#047857';
    } else if (p.type === 'power_rocket') {
      color = '#ef4444';
      emissive = '#b91c1c';
    } else if (p.type === 'power_sniper') {
      color = '#a855f7';
      emissive = '#7e22ce';
    } else if (p.type === 'power_shotgun') {
      color = '#f97316';
      emissive = '#c2410c';
    } else if (p.type === 'power_rifle') {
      color = '#06b6d4';
      emissive = '#0891b2';
    }

    // Outer Question/Mystery Box
    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const boxMat = new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.7
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.castShadow = true;
    group.add(box);

    // Glowing wireframe edges
    const edges = new THREE.EdgesGeometry(boxGeo);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: '#ffffff', linewidth: 2 })
    );
    box.add(edgeLines);

    // Floating light source
    const pointLight = new THREE.PointLight(color, 1.2, 5);
    pointLight.position.set(0, 0, 0);
    group.add(pointLight);

    return group;
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
