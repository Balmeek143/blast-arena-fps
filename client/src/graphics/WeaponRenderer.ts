import * as THREE from 'three';
import { WeaponType } from '../../../shared/types.js';

interface ShellCasing {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  createdAt: number;
}

export class WeaponRenderer {
  private camera: THREE.PerspectiveCamera;
  private gunRoot: THREE.Group;
  private currentWeaponMesh: THREE.Group | null = null;
  private currentWeaponType: WeaponType = 'pistol';

  // Recoil & sway
  private recoilOffset = 0;
  private recoilRot = 0;
  private muzzleFlash: THREE.PointLight;
  private muzzleFlashGroup: THREE.Group;
  private flashMeshes: THREE.Mesh[] = [];
  private flashDuration = 0;

  // Ejected shell casings
  private casings: ShellCasing[] = [];

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.gunRoot = new THREE.Group();

    // Default first-person offset relative to camera
    this.gunRoot.position.set(0.26, -0.24, -0.42);
    this.camera.add(this.gunRoot);

    // Muzzle flash container
    this.muzzleFlashGroup = new THREE.Group();
    this.muzzleFlashGroup.position.set(0, 0.04, -0.45);
    this.gunRoot.add(this.muzzleFlashGroup);

    // Muzzle flash point light
    this.muzzleFlash = new THREE.PointLight('#fef08a', 0, 8);
    this.muzzleFlashGroup.add(this.muzzleFlash);

    // Starburst geometry for vibrant arcade muzzle flash
    const starGeo = new THREE.OctahedronGeometry(0.24, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0 });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    this.muzzleFlashGroup.add(starMesh);
    this.flashMeshes.push(starMesh);

    // Outer flame flare
    const flareGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const flareMat = new THREE.MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 0 });
    const flareMesh = new THREE.Mesh(flareGeo, flareMat);
    this.muzzleFlashGroup.add(flareMesh);
    this.flashMeshes.push(flareMesh);

    this.switchWeapon('pistol');
  }

  public getMuzzleWorldPosition(): THREE.Vector3 {
    const muzzlePos = new THREE.Vector3();
    this.muzzleFlashGroup.getWorldPosition(muzzlePos);
    return muzzlePos;
  }

  public switchWeapon(weapon: WeaponType) {
    if (this.currentWeaponType === weapon && this.currentWeaponMesh) return;
    this.currentWeaponType = weapon;

    if (this.currentWeaponMesh) {
      this.gunRoot.remove(this.currentWeaponMesh);
    }

    this.currentWeaponMesh = this.buildWeaponMesh(weapon);
    this.gunRoot.add(this.currentWeaponMesh);

    // Adjust muzzle flash offset based on barrel length
    if (weapon === 'sniper') {
      this.muzzleFlashGroup.position.set(0, 0.05, -0.85);
    } else if (weapon === 'rocket') {
      this.muzzleFlashGroup.position.set(0, 0.05, -0.65);
    } else if (weapon === 'rifle') {
      this.muzzleFlashGroup.position.set(0, 0.04, -0.55);
    } else if (weapon === 'shotgun') {
      this.muzzleFlashGroup.position.set(0, 0.03, -0.5);
    } else {
      this.muzzleFlashGroup.position.set(0, 0.04, -0.35);
    }
  }

  private buildWeaponMesh(type: WeaponType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'pistol') {
      // Tactical Pistol with chrome slide and textured grip
      const slide = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.075, 0.32),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.2, metalness: 0.9 })
      );
      slide.position.set(0, 0.03, -0.05);

      const barrelTip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1, metalness: 1.0 })
      );
      barrelTip.rotation.x = Math.PI / 2;
      barrelTip.position.set(0, 0.04, -0.22);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.14, 0.15),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8, metalness: 0.3 })
      );
      frame.position.set(0, -0.05, 0.03);
      frame.rotation.x = -0.22;

      // Glow accent
      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.068, 0.01, 0.16),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.6 })
      );
      accent.position.set(0, 0.05, -0.06);

      group.add(slide);
      group.add(barrelTip);
      group.add(frame);
      group.add(accent);
    } else if (type === 'shotgun') {
      // Pump Shotgun (Orange Arcade Style)
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.032, 0.65, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.9 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.18);

      const pump = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.09, 0.22),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.5, metalness: 0.2 })
      );
      pump.position.set(0, -0.02, -0.15);

      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.15, 0.28),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 })
      );
      stock.position.set(0, -0.05, 0.18);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.095, 0.02, 0.1),
        new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.8 })
      );
      glow.position.set(0, 0.03, -0.02);

      group.add(barrel);
      group.add(pump);
      group.add(stock);
      group.add(glow);
    } else if (type === 'rifle') {
      // Assault Rifle (Cyan Neon Sci-Fi)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.13, 0.5),
        new THREE.MeshStandardMaterial({ color: '#0891b2', roughness: 0.4, metalness: 0.6 })
      );
      body.position.set(0, 0, -0.1);

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.38, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.9 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.42);

      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.18, 0.09),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6 })
      );
      mag.position.set(0, -0.14, -0.07);
      mag.rotation.x = 0.3;

      const holoSight = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, 0.08),
        new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#0891b2', emissiveIntensity: 0.8 })
      );
      holoSight.position.set(0, 0.09, -0.1);

      group.add(body);
      group.add(barrel);
      group.add(mag);
      group.add(holoSight);
    } else if (type === 'sniper') {
      // Heavy Sniper (Purple Laser Core)
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.65),
        new THREE.MeshStandardMaterial({ color: '#7e22ce', roughness: 0.3, metalness: 0.8 })
      );
      body.position.set(0, 0, -0.15);

      const longBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.7, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 1.0 })
      );
      longBarrel.rotation.x = Math.PI / 2;
      longBarrel.position.set(0, 0.02, -0.65);

      const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.32, 12),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.2, metalness: 0.8 })
      );
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.11, -0.12);

      const scopeLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.032, 12),
        new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#a855f7', emissiveIntensity: 1.2 })
      );
      scopeLens.position.set(0, 0.11, -0.28);

      group.add(body);
      group.add(longBarrel);
      group.add(scope);
      group.add(scopeLens);
    } else if (type === 'rocket') {
      // Rocket Launcher (Heavy Red Bazooka)
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.85, 16),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.4, metalness: 0.6 })
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.05, -0.25);

      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.095, 0.02, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9 })
      );
      rim.position.set(0, 0.05, -0.67);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.16, 0.09),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 })
      );
      handle.position.set(0, -0.11, -0.06);

      group.add(tube);
      group.add(rim);
      group.add(handle);
    }

    return group;
  }

  public triggerShootEffect() {
    this.recoilOffset = 0.12;
    this.recoilRot = 0.22;

    // Flash light & meshes
    this.muzzleFlash.intensity = 6.0;
    this.flashMeshes.forEach(m => {
      (m.material as THREE.MeshBasicMaterial).opacity = 1;
      m.rotation.z = Math.random() * Math.PI * 2;
      const s = 0.9 + Math.random() * 0.4;
      m.scale.set(s, s, s);
    });
    this.flashDuration = 0.08;

    // Eject shell casing animation
    this.spawnCasing();
  }

  private spawnCasing() {
    const casingGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8);
    const casingMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.9, roughness: 0.2 });
    const casing = new THREE.Mesh(casingGeo, casingMat);

    // Ejection port location on gun
    casing.position.set(0.08, 0.04, -0.05);
    this.gunRoot.add(casing);

    this.casings.push({
      mesh: casing,
      velocity: new THREE.Vector3(1.5 + Math.random() * 0.8, 1.2 + Math.random() * 0.5, -0.2 + Math.random() * 0.4),
      rotVelocity: new THREE.Vector3(Math.random() * 20, Math.random() * 20, Math.random() * 20),
      createdAt: Date.now()
    });
  }

  public update(dt: number, isMoving: boolean, time: number, isReloading: boolean, reloadProgress: number) {
    // Decay recoil smoothly
    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, dt * 18);
    this.recoilRot = THREE.MathUtils.lerp(this.recoilRot, 0, dt * 18);

    // Muzzle flash decay
    if (this.flashDuration > 0) {
      this.flashDuration -= dt;
      if (this.flashDuration <= 0) {
        this.muzzleFlash.intensity = 0;
        this.flashMeshes.forEach(m => {
          (m.material as THREE.MeshBasicMaterial).opacity = 0;
        });
      }
    }

    // Walking / idle bobbing sway
    let swayX = 0;
    let swayY = 0;
    if (isMoving) {
      swayX = Math.sin(time * 9) * 0.025;
      swayY = Math.abs(Math.cos(time * 9)) * 0.022;
    } else {
      swayX = Math.sin(time * 2) * 0.005;
      swayY = Math.cos(time * 4) * 0.005;
    }

    // Reload animation
    let reloadDip = 0;
    let reloadTilt = 0;
    if (isReloading) {
      reloadDip = Math.sin(reloadProgress * Math.PI) * 0.24;
      reloadTilt = Math.sin(reloadProgress * Math.PI) * 0.6;
    }

    // Apply transformed position and rotation
    this.gunRoot.position.set(
      0.26 + swayX,
      -0.24 - swayY - reloadDip,
      -0.42 + this.recoilOffset
    );

    this.gunRoot.rotation.set(
      this.recoilRot + reloadTilt,
      swayX * 2,
      swayX * 3
    );

    // Update shell casings
    const now = Date.now();
    this.casings = this.casings.filter(c => {
      const age = (now - c.createdAt) / 1000;
      if (age > 0.6) {
        this.gunRoot.remove(c.mesh);
        return false;
      }

      c.mesh.position.addScaledVector(c.velocity, dt);
      c.velocity.y -= 9.8 * dt; // gravity
      c.mesh.rotation.x += c.rotVelocity.x * dt;
      c.mesh.rotation.y += c.rotVelocity.y * dt;
      return true;
    });
  }
}
