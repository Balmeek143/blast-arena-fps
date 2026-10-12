import * as THREE from 'three';
import { PlayerState, WeaponType } from '../../../shared/types.js';

interface RenderedPlayer {
  id: string;
  group: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  weaponMesh: THREE.Group;
  healthBarBg: THREE.Mesh;
  healthBarFg: THREE.Mesh;
  shieldBarFg: THREE.Mesh;
  nameSprite: THREE.Sprite;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetPitch: number;
  currentWeapon: WeaponType;
}

export class PlayerRenderer {
  private scene: THREE.Scene;
  private players: Map<string, RenderedPlayer> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public updatePlayers(players: PlayerState[], localPlayerId: string, dt: number) {
    const activeIds = new Set<string>();

    for (const p of players) {
      if (p.id === localPlayerId) continue; // Don't render self from 3rd person
      activeIds.add(p.id);

      let rendered = this.players.get(p.id);
      if (!rendered) {
        rendered = this.createPlayerModel(p);
        this.players.set(p.id, rendered);
        this.scene.add(rendered.group);
      }

      rendered.group.visible = p.isAlive;
      if (!p.isAlive) continue;

      // Update targets for smooth interpolation
      rendered.targetPos.set(p.position.x, p.position.y, p.position.z);
      rendered.targetYaw = p.rotation.yaw;
      rendered.targetPitch = p.rotation.pitch;

      // Smooth position LERP
      rendered.group.position.lerp(rendered.targetPos, Math.min(1, dt * 25));

      // Smooth rotation LERP
      rendered.group.rotation.y = THREE.MathUtils.lerp(
        rendered.group.rotation.y,
        rendered.targetYaw,
        Math.min(1, dt * 25)
      );

      // Pitch head
      rendered.head.rotation.x = THREE.MathUtils.lerp(
        rendered.head.rotation.x,
        rendered.targetPitch,
        Math.min(1, dt * 25)
      );

      // Update weapon model if changed
      if (rendered.currentWeapon !== p.weapon) {
        rendered.currentWeapon = p.weapon;
        this.updateHeldWeapon(rendered, p.weapon);
      }

      // Update overhead health and shield bars
      const hpPct = Math.max(0, Math.min(1, p.health / 100));
      rendered.healthBarFg.scale.x = Math.max(0.001, hpPct);
      rendered.healthBarFg.position.x = -0.5 + hpPct * 0.5;

      const shieldPct = Math.max(0, Math.min(1, p.shield / 100));
      rendered.shieldBarFg.scale.x = Math.max(0.001, shieldPct);
      rendered.shieldBarFg.position.x = -0.5 + shieldPct * 0.5;
      rendered.shieldBarFg.visible = p.shield > 0;

      // Glow effect if Quad Damage is active
      if (Date.now() < p.damageBoostUntil) {
        (rendered.body.material as THREE.MeshStandardMaterial).emissive.set('#f59e0b');
        (rendered.body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
      } else {
        (rendered.body.material as THREE.MeshStandardMaterial).emissive.set('#000000');
        (rendered.body.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
      }
    }

    // Clean up disconnected players
    for (const [id, r] of this.players) {
      if (!activeIds.has(id)) {
        this.scene.remove(r.group);
        this.players.delete(id);
      }
    }
  }

  private createPlayerModel(p: PlayerState): RenderedPlayer {
    const group = new THREE.Group();
    group.position.set(p.position.x, p.position.y, p.position.z);

    const playerColor = p.color || '#38bdf8';

    // Body (Torso)
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: playerColor,
      roughness: 0.5,
      metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({
      color: '#f8fafc',
      roughness: 0.4
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.55;
    head.castShadow = true;

    // Visor / Face goggles
    const visorGeo = new THREE.BoxGeometry(0.35, 0.15, 0.1);
    const visorMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.1,
      metalness: 0.9
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.05, 0.25);
    head.add(visor);

    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.28, 0.7, 0.35);
    const legMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.35, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.35, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Weapon mesh container
    const weaponMesh = new THREE.Group();
    weaponMesh.position.set(0.35, 0.9, 0.3);
    group.add(weaponMesh);

    // Overhead Nametag & Health Bar
    const overhead = new THREE.Group();
    overhead.position.y = 2.2;

    // Health Bar Background
    const barBgGeo = new THREE.PlaneGeometry(1.0, 0.12);
    const barBgMat = new THREE.MeshBasicMaterial({ color: '#0f172a', side: THREE.DoubleSide });
    const healthBarBg = new THREE.Mesh(barBgGeo, barBgMat);
    overhead.add(healthBarBg);

    // Health Bar Foreground
    const hpFgGeo = new THREE.PlaneGeometry(1.0, 0.1);
    const hpFgMat = new THREE.MeshBasicMaterial({ color: '#22c55e', side: THREE.DoubleSide });
    const healthBarFg = new THREE.Mesh(hpFgGeo, hpFgMat);
    healthBarFg.position.z = 0.01;
    overhead.add(healthBarFg);

    // Shield Bar Foreground
    const shieldFgGeo = new THREE.PlaneGeometry(1.0, 0.04);
    const shieldFgMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide });
    const shieldBarFg = new THREE.Mesh(shieldFgGeo, shieldFgMat);
    shieldBarFg.position.set(0, 0.08, 0.02);
    overhead.add(shieldBarFg);

    // Name Canvas Sprite
    const nameSprite = this.createNameSprite(p.name, p.botDifficulty);
    nameSprite.position.y = 0.25;
    overhead.add(nameSprite);

    group.add(overhead);

    const rendered: RenderedPlayer = {
      id: p.id,
      group,
      head,
      body,
      weaponMesh,
      healthBarBg,
      healthBarFg,
      shieldBarFg,
      nameSprite,
      targetPos: new THREE.Vector3(p.position.x, p.position.y, p.position.z),
      targetYaw: p.rotation.yaw,
      targetPitch: p.rotation.pitch,
      currentWeapon: p.weapon
    };

    this.updateHeldWeapon(rendered, p.weapon);
    return rendered;
  }

  private updateHeldWeapon(rendered: RenderedPlayer, weapon: WeaponType) {
    // Clear existing
    while (rendered.weaponMesh.children.length > 0) {
      rendered.weaponMesh.remove(rendered.weaponMesh.children[0]);
    }

    let length = 0.4;
    let color = '#475569';

    if (weapon === 'pistol') {
      length = 0.35;
      color = '#64748b';
    } else if (weapon === 'shotgun') {
      length = 0.7;
      color = '#ea580c';
    } else if (weapon === 'rifle') {
      length = 0.8;
      color = '#0891b2';
    } else if (weapon === 'sniper') {
      length = 1.1;
      color = '#9333ea';
    } else if (weapon === 'rocket') {
      length = 0.9;
      color = '#dc2626';
    }

    const barrelGeo = new THREE.BoxGeometry(0.1, 0.14, length);
    const barrelMat = new THREE.MeshStandardMaterial({ color, metalness: 0.7, roughness: 0.3 });
    const gun = new THREE.Mesh(barrelGeo, barrelMat);
    gun.position.z = length / 2;
    gun.castShadow = true;
    rendered.weaponMesh.add(gun);
  }

  private createNameSprite(name: string, diff?: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 256, 64);

      ctx.font = 'bold 26px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 5;

      const label = diff ? `${name} [${diff.toUpperCase()}]` : name;
      ctx.strokeText(label, 128, 32);

      // Fill
      ctx.fillStyle = diff ? (diff === 'advanced' ? '#f43f5e' : diff === 'veteran' ? '#fbbf24' : '#38bdf8') : '#ffffff';
      ctx.fillText(label, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.0, 0.5, 1.0);
    return sprite;
  }
}
