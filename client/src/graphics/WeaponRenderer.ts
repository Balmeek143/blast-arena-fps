import * as THREE from 'three';
import { WeaponType } from '../../../shared/types.js';

export class WeaponRenderer {
  private camera: THREE.PerspectiveCamera;
  private gunRoot: THREE.Group;
  private currentWeaponMesh: THREE.Group | null = null;
  private currentWeaponType: WeaponType = 'pistol';

  // Recoil & sway
  private recoilOffset = 0;
  private recoilRot = 0;
  private muzzleFlash: THREE.PointLight;
  private muzzleFlashMesh: THREE.Mesh;
  private flashDuration = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.gunRoot = new THREE.Group();

    // Default first-person offset relative to camera
    this.gunRoot.position.set(0.25, -0.25, -0.45);
    this.camera.add(this.gunRoot);

    // Muzzle flash light & starburst
    this.muzzleFlash = new THREE.PointLight('#fef08a', 0, 4);
    this.muzzleFlash.position.set(0, 0.05, -0.3);
    this.gunRoot.add(this.muzzleFlash);

    const flashGeo = new THREE.OctahedronGeometry(0.08, 0);
    const flashMat = new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0 });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.position.set(0, 0.05, -0.3);
    this.gunRoot.add(this.muzzleFlashMesh);

    this.switchWeapon('pistol');
  }

  public switchWeapon(weapon: WeaponType) {
    if (this.currentWeaponType === weapon && this.currentWeaponMesh) return;
    this.currentWeaponType = weapon;

    if (this.currentWeaponMesh) {
      this.gunRoot.remove(this.currentWeaponMesh);
    }

    this.currentWeaponMesh = this.buildWeaponMesh(weapon);
    this.gunRoot.add(this.currentWeaponMesh);
  }

  private buildWeaponMesh(type: WeaponType): THREE.Group {
    const group = new THREE.Group();

    if (type === 'pistol') {
      // Tactical Pistol
      const slide = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.07, 0.28),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.3, metalness: 0.8 })
      );
      slide.position.set(0, 0.03, -0.05);

      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.12, 0.14),
        new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 })
      );
      frame.position.set(0, -0.04, 0.02);
      frame.rotation.x = -0.2;

      group.add(slide);
      group.add(frame);
    } else if (type === 'shotgun') {
      // Pump Shotgun
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.55, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.4, metalness: 0.9 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.15);

      const pump = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.08, 0.18),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.6 })
      );
      pump.position.set(0, -0.02, -0.12);

      const stock = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.14, 0.25),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 })
      );
      stock.position.set(0, -0.04, 0.15);

      group.add(barrel);
      group.add(pump);
      group.add(stock);
    } else if (type === 'rifle') {
      // Assault Rifle
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.12, 0.45),
        new THREE.MeshStandardMaterial({ color: '#0891b2', roughness: 0.4, metalness: 0.6 })
      );
      body.position.set(0, 0, -0.08);

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.9 })
      );
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, -0.35);

      const mag = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.16, 0.08),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
      );
      mag.position.set(0, -0.12, -0.05);
      mag.rotation.x = 0.25;

      group.add(body);
      group.add(barrel);
      group.add(mag);
    } else if (type === 'sniper') {
      // Heavy Sniper
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.11, 0.6),
        new THREE.MeshStandardMaterial({ color: '#7e22ce', roughness: 0.4, metalness: 0.7 })
      );
      body.position.set(0, 0, -0.12);

      const longBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.55, 12),
        new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.2, metalness: 0.95 })
      );
      longBarrel.rotation.x = Math.PI / 2;
      longBarrel.position.set(0, 0.02, -0.55);

      const scope = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.2, metalness: 0.8 })
      );
      scope.rotation.x = Math.PI / 2;
      scope.position.set(0, 0.1, -0.1);

      group.add(body);
      group.add(longBarrel);
      group.add(scope);
    } else if (type === 'rocket') {
      // Rocket Launcher
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.75, 16),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.4, metalness: 0.6 })
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.04, -0.2);

      const handle = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.14, 0.08),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 })
      );
      handle.position.set(0, -0.1, -0.05);

      group.add(tube);
      group.add(handle);
    }

    return group;
  }

  public triggerShootEffect() {
    this.recoilOffset = 0.08;
    this.recoilRot = 0.15;

    // Flash light & mesh
    this.muzzleFlash.intensity = 3.5;
    (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 1;
    this.muzzleFlashMesh.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
    this.flashDuration = 0.05;
  }

  public update(dt: number, isMoving: boolean, time: number, isReloading: boolean, reloadProgress: number) {
    // Decay recoil
    this.recoilOffset = THREE.MathUtils.lerp(this.recoilOffset, 0, dt * 15);
    this.recoilRot = THREE.MathUtils.lerp(this.recoilRot, 0, dt * 15);

    // Muzzle flash decay
    if (this.flashDuration > 0) {
      this.flashDuration -= dt;
      if (this.flashDuration <= 0) {
        this.muzzleFlash.intensity = 0;
        (this.muzzleFlashMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }

    // Walking sway
    let swayX = 0;
    let swayY = 0;
    if (isMoving) {
      swayX = Math.sin(time * 9) * 0.02;
      swayY = Math.abs(Math.cos(time * 9)) * 0.02;
    } else {
      swayX = Math.sin(time * 2) * 0.005;
      swayY = Math.cos(time * 4) * 0.005;
    }

    // Reload animation dip
    let reloadDip = 0;
    let reloadTilt = 0;
    if (isReloading) {
      reloadDip = Math.sin(reloadProgress * Math.PI) * 0.22;
      reloadTilt = Math.sin(reloadProgress * Math.PI) * 0.5;
    }

    // Apply transformed position and rotation
    this.gunRoot.position.set(
      0.25 + swayX,
      -0.25 - swayY - reloadDip,
      -0.45 + this.recoilOffset
    );

    this.gunRoot.rotation.set(
      this.recoilRot + reloadTilt,
      swayX * 2,
      swayX * 3
    );
  }
}
