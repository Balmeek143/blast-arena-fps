import { ArenaData, PowerupSpawn, PowerupType } from '../../shared/types.js';
import { WEAPON_CONFIGS } from '../../shared/weapons.js';

const POWERUP_NAMES: Record<PowerupType, string> = {
  power_shotgun: 'Shotgun Crate',
  power_rifle: 'Assault Rifle Crate',
  power_sniper: 'Sniper Crate',
  power_rocket: 'Rocket Launcher Crate',
  health: 'Medkit (+50 HP)',
  shield: 'Armor Shield (+50)',
  speed: 'Adrenaline Boost (2x Speed)',
  damage: 'Quad Damage (2x Dmg)'
};

const RESPAWN_TIME = 15; // seconds

export class PowerupManager {
  private powerups: PowerupSpawn[] = [];

  constructor(arena: ArenaData) {
    let idCounter = 1;
    for (const p of arena.powerupSpawns) {
      const type = p.type || this.getRandomType();
      this.powerups.push({
        id: `p-${idCounter++}`,
        type,
        name: POWERUP_NAMES[type],
        position: { x: p.x, y: p.y, z: p.z },
        available: true,
        respawnTimeRemaining: 0
      });
    }
  }

  private getRandomType(): PowerupType {
    const list: PowerupType[] = [
      'power_shotgun',
      'power_rifle',
      'power_sniper',
      'power_rocket',
      'health',
      'shield',
      'speed',
      'damage'
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  public update(dt: number) {
    for (const p of this.powerups) {
      if (!p.available) {
        p.respawnTimeRemaining -= dt;
        if (p.respawnTimeRemaining <= 0) {
          p.available = true;
          p.respawnTimeRemaining = 0;
          // Optionally re-roll mystery type on respawn for variety!
          if (p.type.startsWith('power_')) {
            const weapons: PowerupType[] = ['power_shotgun', 'power_rifle', 'power_sniper', 'power_rocket'];
            p.type = weapons[Math.floor(Math.random() * weapons.length)];
            p.name = POWERUP_NAMES[p.type];
          }
        }
      }
    }
  }

  public checkCollection(playerPos: { x: number; y: number; z: number }): PowerupSpawn | null {
    for (const p of this.powerups) {
      if (!p.available) continue;

      const dx = playerPos.x - p.position.x;
      const dy = playerPos.y - p.position.y;
      const dz = playerPos.z - p.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Player radius ~0.8 + crate pickup radius ~1.2
      if (dist < 1.6) {
        p.available = false;
        p.respawnTimeRemaining = RESPAWN_TIME;
        return p;
      }
    }
    return null;
  }

  public getPowerups(): PowerupSpawn[] {
    return this.powerups;
  }
}
