import * as THREE from 'three';
import { RocketProjectile, WeaponType } from '../../../shared/types.js';

interface TracerBullet {
  mesh: THREE.Mesh;
  head: THREE.Mesh;
  start: THREE.Vector3;
  end: THREE.Vector3;
  dir: THREE.Vector3;
  totalDist: number;
  speed: number;
  currentDist: number;
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

interface DamageNumber {
  sprite: THREE.Sprite;
  startPos: THREE.Vector3;
  createdAt: number;
  lifetime: number;
}

interface ImpactSpark {
  particles: THREE.Points;
  velocities: THREE.Vector3[];
  createdAt: number;
  lifetime: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private tracers: TracerBullet[] = [];
  private explosions: ExplosionEffect[] = [];
  private damageNumbers: DamageNumber[] = [];
  private impactSparks: ImpactSpark[] = [];
  private rocketMeshes: Map<string, THREE.Group> = new Map();

  // Screen shake
  public shakeIntensity = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
  }

  /**
   * Adds an unmistakable, vibrant 3D glowing tracer projectile that streaks through the air.
   */
  public addTracer(
    origin: [number, number, number],
    dir: [number, number, number],
    maxDist = 90,
    weapon: WeaponType = 'pistol'
  ) {
    const startVec = new THREE.Vector3(origin[0], origin[1], origin[2]);
    const dirVec = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    const endVec = startVec.clone().addScaledVector(dirVec, maxDist);

    // Color based on weapon
    let color = '#fef08a'; // Yellow
    let emissive = '#eab308';
    let bulletRadius = 0.045;
    let tracerLength = 1.6;
    let bulletSpeed = 220; // units/sec

    if (weapon === 'shotgun') {
      color = '#fb923c';
      emissive = '#ea580c';
      bulletRadius = 0.05;
      tracerLength = 0.9;
      bulletSpeed = 180;
    } else if (weapon === 'rifle') {
      color = '#38bdf8';
      emissive = '#0284c7';
      bulletRadius = 0.04;
      tracerLength = 2.0;
      bulletSpeed = 260;
    } else if (weapon === 'sniper') {
      color = '#c084fc';
      emissive = '#9333ea';
      bulletRadius = 0.07;
      tracerLength = 4.5; // Long rail trail
      bulletSpeed = 400;
    }

    // 3D elongated tracer beam
    const geo = new THREE.CylinderGeometry(bulletRadius, bulletRadius, tracerLength, 8);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec);
    mesh.position.copy(startVec);
    this.scene.add(mesh);

    // Glowing head sphere at front of bullet
    const headGeo = new THREE.SphereGeometry(bulletRadius * 2.2, 8, 8);
    const headMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.copy(startVec);
    this.scene.add(head);

    this.tracers.push({
      mesh,
      head,
      start: startVec,
      end: endVec,
      dir: dirVec,
      totalDist: maxDist,
      speed: bulletSpeed,
      currentDist: 0,
      createdAt: Date.now(),
      lifetime: 350 // 350ms duration
    });
  }

  public addImpactSpark(pos: [number, number, number], color = '#fef08a') {
    const count = 12;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 8,
          Math.random() * 6 + 1,
          (Math.random() - 0.5) * 8
        )
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color,
      size: 0.25,
      transparent: true,
      opacity: 1
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);

    this.impactSparks.push({
      particles,
      velocities,
      createdAt: Date.now(),
      lifetime: 250
    });
  }

  public addDamageNumber(pos: [number, number, number], damage: number, isHeadshot: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = 180;
    canvas.height = 70;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.font = isHeadshot ? '900 42px Chakra Petch, sans-serif' : '800 36px Chakra Petch, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = isHeadshot ? `-${damage} 🎯` : `-${damage}`;

    // Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeText(text, 90, 35);

    // Color
    ctx.fillStyle = isHeadshot ? '#f43f5e' : '#fbbf24';
    ctx.fillText(text, 90, 35);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1 });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.4, 0.55, 1);
    sprite.position.set(pos[0], pos[1] + 1.8, pos[2]);
    this.scene.add(sprite);

    this.damageNumbers.push({
      sprite,
      startPos: new THREE.Vector3(pos[0], pos[1] + 1.8, pos[2]),
      createdAt: Date.now(),
      lifetime: 800 // 800ms
    });
  }

  public addExplosion(pos: [number, number, number], radius = 6.5) {
    const now = Date.now();

    // Central expanding fireball
    const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: '#f97316',
      transparent: true,
      opacity: 0.95
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    this.scene.add(mesh);

    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(0.5, 1.4, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(pos[0], pos[1] + 0.15, pos[2]);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    // Sparks/Debris particles
    const pCount = 36;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(pCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < pCount; i++) {
      positions[i * 3] = pos[0];
      positions[i * 3 + 1] = pos[1];
      positions[i * 3 + 2] = pos[2];

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          Math.random() * 14 + 3,
          (Math.random() - 0.5) * 20
        )
      );
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    (pGeo as any).userData = { velocities };

    const pMat = new THREE.PointsMaterial({
      color: '#fbbf24',
      size: 0.45,
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
      duration: 650
    });

    // Camera shake
    const dist = this.camera.position.distanceTo(new THREE.Vector3(pos[0], pos[1], pos[2]));
    if (dist < 45) {
      const trauma = Math.max(0, 1 - dist / 45);
      this.shakeIntensity = Math.min(1.0, this.shakeIntensity + trauma * 0.5);
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

      if (r.velocity) {
        const dir = new THREE.Vector3(r.velocity.x, r.velocity.y, r.velocity.z).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    }

    for (const [id, m] of this.rocketMeshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(m);
        this.rocketMeshes.delete(id);
      }
    }
  }

  private createRocketMesh(): THREE.Group {
    const group = new THREE.Group();

    // Red rocket missile body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.85, 12),
      new THREE.MeshStandardMaterial({ color: '#ef4444', metalness: 0.7, roughness: 0.3 })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.35, 12),
      new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.5 })
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 0.55;
    group.add(nose);

    // Stabilizer fins
    const finGeo = new THREE.BoxGeometry(0.04, 0.25, 0.2);
    const finMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
    const fin1 = new THREE.Mesh(finGeo, finMat);
    fin1.position.z = -0.3;
    const fin2 = new THREE.Mesh(finGeo, finMat);
    fin2.rotation.z = Math.PI / 2;
    fin2.position.z = -0.3;
    group.add(fin1);
    group.add(fin2);

    // Flame engine light
    const flame = new THREE.PointLight('#f97316', 2.5, 5);
    flame.position.z = -0.45;
    group.add(flame);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 8),
      new THREE.MeshBasicMaterial({ color: '#fef08a' })
    );
    flameMesh.rotation.x = -Math.PI / 2;
    flameMesh.position.z = -0.55;
    group.add(flameMesh);

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
    }, 130);
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

    // Update 3D Tracers
    this.tracers = this.tracers.filter(t => {
      const age = now - t.createdAt;
      if (age > t.lifetime) {
        this.scene.remove(t.mesh);
        this.scene.remove(t.head);
        return false;
      }

      // Move bullet forward
      t.currentDist += t.speed * dt;
      const currentPos = t.start.clone().addScaledVector(t.dir, Math.min(t.currentDist, t.totalDist));

      t.mesh.position.copy(currentPos);
      t.head.position.copy(currentPos);

      // Fade out trail towards end of life
      const fadeProgress = age / t.lifetime;
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1 - fadeProgress));

      return true;
    });

    // Update Impact Sparks
    this.impactSparks = this.impactSparks.filter(sp => {
      const age = now - sp.createdAt;
      if (age > sp.lifetime) {
        this.scene.remove(sp.particles);
        return false;
      }

      const progress = age / sp.lifetime;
      const posAttr = sp.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < sp.velocities.length; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + sp.velocities[i].x * dt,
          posAttr.getY(i) + sp.velocities[i].y * dt,
          posAttr.getZ(i) + sp.velocities[i].z * dt
        );
        sp.velocities[i].y -= 12 * dt; // gravity
      }
      posAttr.needsUpdate = true;
      (sp.particles.material as THREE.PointsMaterial).opacity = 1 - progress;

      return true;
    });

    // Update Floating Damage Numbers
    this.damageNumbers = this.damageNumbers.filter(dn => {
      const age = now - dn.createdAt;
      if (age > dn.lifetime) {
        this.scene.remove(dn.sprite);
        return false;
      }

      const progress = age / dn.lifetime;
      // Float upwards
      dn.sprite.position.y = dn.startPos.y + progress * 1.5;
      dn.sprite.material.opacity = 1 - progress * progress;

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

      const scale = 1 + progress * 5.5;
      e.mesh.scale.set(scale, scale, scale);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.95 * (1 - progress));

      const ringScale = 1 + progress * 8;
      e.ring.scale.set(ringScale, ringScale, 1);
      (e.ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 * (1 - progress));

      const posAttr = e.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const vels: THREE.Vector3[] = (e.particles.geometry as any).userData.velocities;
      for (let i = 0; i < vels.length; i++) {
        posAttr.setXYZ(
          i,
          posAttr.getX(i) + vels[i].x * dt,
          posAttr.getY(i) + vels[i].y * dt,
          posAttr.getZ(i) + vels[i].z * dt
        );
        vels[i].y -= 9.8 * dt;
      }
      posAttr.needsUpdate = true;
      (e.particles.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress);

      return true;
    });

    // Decay camera shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.5);
    }
  }
}
