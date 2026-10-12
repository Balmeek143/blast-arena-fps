import { ArenaBox, ArenaData } from '../../shared/types.js';

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export class PhysicsEngine {
  private arena: ArenaData;
  public readonly gravity = 25.0;
  public readonly playerWidth = 0.8;
  public readonly playerHeight = 1.8;

  constructor(arena: ArenaData) {
    this.arena = arena;
  }

  public getPlayerAABB(x: number, y: number, z: number): BoundingBox {
    const halfW = this.playerWidth / 2;
    return {
      min: [x - halfW, y, z - halfW],
      max: [x + halfW, y + this.playerHeight, z + halfW]
    };
  }

  public checkAABBIntersect(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.min[0] <= b.max[0] &&
      a.max[0] >= b.min[0] &&
      a.min[1] <= b.max[1] &&
      a.max[1] >= b.min[1] &&
      a.min[2] <= b.max[2] &&
      a.max[2] >= b.min[2]
    );
  }

  /**
   * Resolves player movement and collision with arena obstacles.
   */
  public movePlayer(
    pos: { x: number; y: number; z: number },
    vel: { x: number; y: number; z: number },
    dt: number
  ): { pos: { x: number; y: number; z: number }; vel: { x: number; y: number; z: number }; isGrounded: boolean; steppedOnJumpPad: boolean } {
    let nextX = pos.x + vel.x * dt;
    let nextY = pos.y + vel.y * dt;
    let nextZ = pos.z + vel.z * dt;

    let isGrounded = false;
    let steppedOnJumpPad = false;

    const halfW = this.playerWidth / 2;
    const h = this.playerHeight;

    // Resolve Y axis first (gravity / jumping)
    for (const box of this.arena.boxes) {
      if (
        nextX + halfW > box.min[0] &&
        nextX - halfW < box.max[0] &&
        nextZ + halfW > box.min[2] &&
        nextZ - halfW < box.max[2]
      ) {
        // Landing on top of box
        if (pos.y >= box.max[1] - 0.25 && nextY <= box.max[1]) {
          nextY = box.max[1];
          vel.y = 0;
          isGrounded = true;

          if (box.type === 'jumppad') {
            steppedOnJumpPad = true;
          }
        }
        // Hitting ceiling/underside
        else if (pos.y + h <= box.min[1] + 0.25 && nextY + h >= box.min[1]) {
          nextY = box.min[1] - h;
          vel.y = 0;
        }
      }
    }

    // Resolve X axis
    for (const box of this.arena.boxes) {
      if (
        nextY < box.max[1] &&
        nextY + h > box.min[1] &&
        nextZ + halfW > box.min[2] &&
        nextZ - halfW < box.max[2]
      ) {
        if (pos.x + halfW <= box.min[0] && nextX + halfW > box.min[0]) {
          nextX = box.min[0] - halfW;
          vel.x = 0;
        } else if (pos.x - halfW >= box.max[0] && nextX - halfW < box.max[0]) {
          nextX = box.max[0] + halfW;
          vel.x = 0;
        }
      }
    }

    // Resolve Z axis
    for (const box of this.arena.boxes) {
      if (
        nextY < box.max[1] &&
        nextY + h > box.min[1] &&
        nextX + halfW > box.min[0] &&
        nextX - halfW < box.max[0]
      ) {
        if (pos.z + halfW <= box.min[2] && nextZ + halfW > box.min[2]) {
          nextZ = box.min[2] - halfW;
          vel.z = 0;
        } else if (pos.z - halfW >= box.max[2] && nextZ - halfW < box.max[2]) {
          nextZ = box.max[2] + halfW;
          vel.z = 0;
        }
      }
    }

    return {
      pos: { x: nextX, y: nextY, z: nextZ },
      vel,
      isGrounded,
      steppedOnJumpPad
    };
  }

  /**
   * Ray vs AABB intersection returning distance t or null
   */
  public rayIntersectAABB(
    orig: [number, number, number],
    dir: [number, number, number],
    box: BoundingBox
  ): number | null {
    let tmin = -Infinity;
    let tmax = Infinity;

    for (let i = 0; i < 3; i++) {
      if (Math.abs(dir[i]) < 1e-8) {
        if (orig[i] < box.min[i] || orig[i] > box.max[i]) return null;
      } else {
        const invD = 1.0 / dir[i];
        let t1 = (box.min[i] - orig[i]) * invD;
        let t2 = (box.max[i] - orig[i]) * invD;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }

    return tmax < 0 ? null : (tmin >= 0 ? tmin : tmax);
  }

  /**
   * Check whether line of sight between two points is blocked by arena boxes
   */
  public hasLineOfSight(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number }
  ): boolean {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 0.01) return true;

    const dir: [number, number, number] = [dx / dist, dy / dist, dz / dist];
    const orig: [number, number, number] = [from.x, from.y, from.z];

    for (const box of this.arena.boxes) {
      if (box.type === 'ground' || box.type === 'jumppad') continue;
      const t = this.rayIntersectAABB(orig, dir, box);
      if (t !== null && t < dist - 0.1) {
        return false;
      }
    }
    return true;
  }
}
