import * as THREE from 'three';
import { RocketProjectile } from '../../../shared/types.js';

interface Tracer {
  line: THREE.Line;
  createdAt: number;
  lifetime: number;
}

interface ExplosionEffect {
  mesh: THREE.Mesh;
  ring: THREE.Mesh;
  particles: THREE.Points;
  createdAt: number;
  duration: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private tracers: Tracer[] = [];
  private explosions: ExplosionEffect[] = [];
  private rocketMeshes: Map<string, THREE.Group> = new Map();

  // Screen shake
  public shakeIntensity = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  public addTracer(origin: [number, number, number], dir: [number, number, number], maxDist = 80, color = '#fef08a') {
    const endX = origin[0] + dir[0] * maxDist;
    const endY = origin[1] + dir[1] * maxDist;
    const endZ = origin[2] + dir[2] * maxDist;

    const points = [
      new THREE.Vector3(origin[0], origin[1], origin[2]),
      new THREE.Vector3(endX, endY, endZ)
    ];

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      line,
      createdAt: Date.now(),
      lifetime: 80 // 80ms visibility
    });
  }

  public addExplosion(pos: [number, number, number], radius = 6.5) {
    const now = Date.now();

    // Central expanding fireball
    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(mesh);

    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos[0], pos[1] + 0.1, pos[2]);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    // Sparks/Debris particles
    const pCount = 30;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 16,
        Math.random() * 12 + 2,
        (Math.random() - 0.5) * 16
      );
      velocities.push(v);
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (pGeo as any).userData = { velocities };

    const pMat = new THREE.PointsMaterial({
      color: '#fbbf24',
      size: 0.35,
      transparent: true,
      opacity: 1
    });
    const particles = new THREE.Points(pGeo, pMat);
    this.scene.add(particles);

    this.explosions.push({
      mesh,
      ring,
      particles,
      createdAt: now,
      duration: 600 // 600ms
    });

    // Camera shake based on distance to player
    const dist = this.camera.position.distanceTo(new THREE.Vector3(pos[0], pos[1], pos[2]));
    if (dist < 40) {
      const trauma = Math.max(0, 1 - dist / 40);
      this.shakeIntensity = Math.min(1.0, this.shakeIntensity + trauma * 0.4);
    }
  }

  public updateRockets(rockets: RocketProjectile[]) {
    const activeIds = new Set<string>();

    for (const r of rockets) {
      activeIds.add(r.id);
      let mesh = this.rocketMeshes.get(r.id);

      if (!mesh) {
        mesh = this.createRocketMesh();
        this.rocketMeshes.set(r.id, mesh);
        this.scene.add(mesh);
      }

      mesh.position.set(r.position.x, r.position.y, r.position.z);

      // Orient mesh forward along velocity
      if (r.velocity) {
        const dir = new THREE.Vector3(r.velocity.x, r.velocity.y, r.velocity.z).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    }

    // Clean up expired rockets
    for (const [id, m] of this.rocketMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(m);
        this.rocketMeshes.delete(id);
      }
    }
  }

  private createRocketMesh(): THREE.Group {
    const group = new THREE.Group();

    // Red rocket nose & cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.3 })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 8),
      new THREE.MeshStandardMaterial({ color: '#f59e0b' })
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.5;
    group.add(nose);

    // Glowing tail flame
    const flame = new THREE.PointLight('#f97316', 1.5, 3);
    flame.position.z = -0.4;
    group.add(flame);

    return group;
  }

  public showHitmarker(isHeadshot: boolean) {
    const hm = document.getElementById('hitmarker');
    if (!hm) return;

    const lines = hm.querySelectorAll('.hm-line');
    lines.forEach(l => {
      if (isHeadshot) l.classList.add('headshot');
      else l.classList.remove('headshot');
    });

    hm.classList.add('active');
    setTimeout(() => {
      hm.classList.remove('active');
    }, 120);
  }

  public flashDamageVignette() {
    const vig = document.getElementById('damage-vignette');
    if (!vig) return;
    vig.style.boxShadow = 'inset 0 0 100px rgba(239, 68, 68, 0.75)';
    setTimeout(() => {
      vig.style.boxShadow = 'inset 0 0 100px rgba(239, 68, 68, 0)';
    }, 150);
  }

  public update(dt: number) {
    const now = Date.now();

    // Update Tracers
    this.tracers = this.tracers.filter(t => {
      const age = now - t.createdAt;
      if (age > t.lifetime) {
        this.scene.remove(t.line);
        return false;
      }
      (t.line.material as THREE.LineBasicMaterial).opacity = 1 - (age / t.lifetime);
      return true;
    });

    // Update Explosions
    this.explosions = this.explosions.filter(e => {
      const age = now - e.createdAt;
      if (age > e.duration) {
        this.scene.remove(e.mesh);
        this.scene.remove(e.ring);
        this.scene.remove(e.particles);
        return false;
      }

      const progress = age / e.duration;

      // Expand fireball & fade
      const scale = 1 + progress * 5;
      e.mesh.scale.set(scale, scale, scale);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.9 * (1 - progress));

      // Expand ring
      const ringScale = 1 + progress * 7;
      e.ring.scale.set(ringScale, ringScale, 1);
      (e.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - progress));

      // Disperse particles
      const posAttr = e.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vels: THREE.Vector3[] = (e.particles.geometry as any).userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vels[i].x * dt,
          posAttr.getY(i) + vels[i].y * dt,
          posAttr.getZ(i) + vels[i].z * dt
        );
        vels[i].y -= 9.8 * dt; // gravity on sparks
      }
      posAttr.needsUpdate = true;
      (e.particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress);

      return true;
    });

    // Decay camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.0);
    }
  }
}
