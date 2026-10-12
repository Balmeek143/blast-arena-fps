import { BotDifficulty, PlayerInput, PlayerState, PowerupSpawn } from '../../shared/types.js';
import { PhysicsEngine } from './Physics.js';

export class BotController {
  public id: string;
  public name: string;
  public difficulty: BotDifficulty;
  private changeTargetTimer = 0;
  private targetPlayerId: string | null = null;
  private targetPowerupId: string | null = null;
  private shootCooldown = 0;
  private strafeDir: 1 | -1 = 1;
  private strafeTimer = 0;
  private jumpTimer = 0;
  private wanderYaw = 0;

  constructor(id: string, name: string, difficulty: BotDifficulty) {
    this.id = id;
    this.name = name;
    this.difficulty = difficulty;
    this.wanderYaw = Math.random() * Math.PI * 2;
  }

  public generateInput(
    self: PlayerState,
    allPlayers: PlayerState[],
    powerups: PowerupSpawn[],
    physics: PhysicsEngine,
    dt: number
  ): { input: PlayerInput; yaw: number; pitch: number } {
    const input: PlayerInput = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      shoot: false,
      reload: false
    };

    if (!self.isAlive) {
      return { input, yaw: self.rotation.yaw, pitch: self.rotation.pitch };
    }

    // Auto reload if empty or low ammo and not in immediate combat
    if (self.ammo <= 0 && !self.isReloading) {
      input.reload = true;
    }

    this.changeTargetTimer -= dt;
    this.strafeTimer -= dt;
    this.jumpTimer -= dt;
    this.shootCooldown -= dt;

    if (this.strafeTimer <= 0) {
      this.strafeDir = Math.random() > 0.5 ? 1 : -1;
      this.strafeTimer = 1.0 + Math.random() * 1.5;
    }

    // Find viable enemies (other alive players/bots)
    const enemies = allPlayers.filter(p => p.id !== self.id && p.isAlive);

    // AI Decision: Target Powerup or Target Enemy
    let targetEnemy: PlayerState | null = null;
    let targetPowerup: PowerupSpawn | null = null;

    // Veteran & Advanced prioritize health if low or close powerups
    if (this.difficulty !== 'rookie') {
      const availablePowerups = powerups.filter(p => p.available);
      if (self.health < 45) {
        // Find nearest health/shield pack
        const heals = availablePowerups.filter(p => p.type === 'health' || p.type === 'shield');
        if (heals.length > 0) {
          targetPowerup = this.findNearest(self.position, heals);
        }
      }

      if (!targetPowerup && (this.difficulty === 'advanced' || Math.random() < 0.4)) {
        // High-value powerups
        const powerGuns = availablePowerups.filter(p => p.type.startsWith('power_') || p.type === 'damage');
        if (powerGuns.length > 0) {
          const nearestGun = this.findNearest(self.position, powerGuns);
          const dist = this.dist3D(self.position, nearestGun.position);
          if (dist < (this.difficulty === 'advanced' ? 35 : 20)) {
            targetPowerup = nearestGun;
          }
        }
      }
    }

    // Find nearest visible enemy
    let closestEnemyDist = Infinity;
    for (const enemy of enemies) {
      const d = this.dist3D(self.position, enemy.position);
      // Check line of sight
      const canSee = physics.hasLineOfSight(
        { x: self.position.x, y: self.position.y + 1.5, z: self.position.z },
        { x: enemy.position.x, y: enemy.position.y + 1.5, z: enemy.position.z }
      );

      // Advanced can spot enemies farther, Rookie only nearby
      const maxSpotRange = this.difficulty === 'advanced' ? 60 : this.difficulty === 'veteran' ? 45 : 28;

      if (canSee && d < maxSpotRange && d < closestEnemyDist) {
        closestEnemyDist = d;
        targetEnemy = enemy;
      }
    }

    let targetYaw = self.rotation.yaw;
    let targetPitch = self.rotation.pitch;

    if (targetEnemy) {
      // In combat with an enemy!
      const dx = targetEnemy.position.x - self.position.x;
      const dy = (targetEnemy.position.y + 1.2) - (self.position.y + 1.5);
      const dz = targetEnemy.position.z - self.position.z;
      const horizDist = Math.sqrt(dx * dx + dz * dz);

      let aimYaw = Math.atan2(dx, dz);
      let aimPitch = Math.atan2(dy, horizDist);

      // Apply difficulty-based accuracy noise & turn smoothing
      const accuracyNoise = this.difficulty === 'advanced' ? 0.04 : this.difficulty === 'veteran' ? 0.12 : 0.28;
      aimYaw += (Math.random() - 0.5) * accuracyNoise;
      aimPitch += (Math.random() - 0.5) * accuracyNoise * 0.5;

      // Predictive lead for advanced bots
      if (this.difficulty === 'advanced' && targetEnemy.velocity) {
        const leadFactor = 0.08;
        aimYaw += targetEnemy.velocity.x * leadFactor * (Math.cos(aimYaw));
      }

      // Smooth turn towards target
      const turnSpeed = this.difficulty === 'advanced' ? 12 : this.difficulty === 'veteran' ? 8 : 4;
      targetYaw = this.lerpAngle(self.rotation.yaw, aimYaw, Math.min(1, dt * turnSpeed));
      targetPitch = targetPitch + (aimPitch - targetPitch) * Math.min(1, dt * turnSpeed);

      // Movement during combat
      if (horizDist > 25) {
        // Close the gap
        input.forward = true;
      } else if (horizDist < 6 && self.weapon !== 'shotgun') {
        // Back up
        input.backward = true;
      }

      // Strafing
      if (this.difficulty !== 'rookie') {
        if (this.strafeDir === 1) input.right = true;
        else input.left = true;

        // Jump occasionally to dodge bullets or use jump pads
        if (this.jumpTimer <= 0 && Math.random() < (this.difficulty === 'advanced' ? 0.08 : 0.03)) {
          input.jump = true;
          this.jumpTimer = 1.2 + Math.random() * 1.5;
        }
      }

      // Shooting logic
      const aimDiff = Math.abs(this.angleDiff(targetYaw, aimYaw));
      const fireThreshold = this.difficulty === 'advanced' ? 0.15 : this.difficulty === 'veteran' ? 0.25 : 0.45;

      if (aimDiff < fireThreshold && self.ammo > 0 && !self.isReloading) {
        // Trigger pull rate depends on weapon and bot reaction
        if (this.shootCooldown <= 0) {
          input.shoot = true;
          this.shootCooldown = this.difficulty === 'advanced' ? 0.05 : this.difficulty === 'veteran' ? 0.12 : 0.25;
        }
      }
    } else if (targetPowerup) {
      // Navigate towards powerup
      const dx = targetPowerup.position.x - self.position.x;
      const dz = targetPowerup.position.z - self.position.z;
      const navYaw = Math.atan2(dx, dz);

      targetYaw = this.lerpAngle(self.rotation.yaw, navYaw, Math.min(1, dt * 6));
      input.forward = true;

      // Jump if approaching ramp/platform or obstacle
      if (targetPowerup.position.y > self.position.y + 1.0 && Math.random() < 0.1) {
        input.jump = true;
      }
    } else {
      // Wandering / Patrol mode
      if (this.changeTargetTimer <= 0) {
        this.wanderYaw = Math.random() * Math.PI * 2;
        this.changeTargetTimer = 2.0 + Math.random() * 3.0;
      }

      targetYaw = this.lerpAngle(self.rotation.yaw, this.wanderYaw, Math.min(1, dt * 3));
      input.forward = true;

      // Rookie wanders slowly, Advanced moves fast
      if (this.difficulty === 'rookie' && Math.random() < 0.2) {
        input.forward = false;
      }
    }

    return { input, yaw: targetYaw, pitch: targetPitch };
  }

  private dist3D(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private findNearest<T extends { position: { x: number; y: number; z: number } }>(
    pos: { x: number; y: number; z: number },
    items: T[]
  ): T {
    let best = items[0];
    let bestDist = Infinity;
    for (const item of items) {
      const d = this.dist3D(pos, item.position);
      if (d < bestDist) {
        bestDist = d;
        best = item;
      }
    }
    return best;
  }

  private angleDiff(a: number, b: number): number {
    let diff = (b - a) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    return a + this.angleDiff(a, b) * t;
  }
}
