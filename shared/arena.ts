import { ArenaData } from './types.js';

export function createDefaultArena(): ArenaData {
  return {
    boxes: [
      // Main Ground
      { min: [-50, -1, -50], max: [50, 0, 50], color: '#334155', type: 'ground' },

      // Perimeter Walls
      { min: [-52, 0, -50], max: [-50, 8, 50], color: '#1e293b', type: 'wall' },
      { min: [50, 0, -50], max: [52, 8, 50], color: '#1e293b', type: 'wall' },
      { min: [-50, 0, -52], max: [50, 8, -50], color: '#1e293b', type: 'wall' },
      { min: [-50, 0, 50], max: [50, 8, 52], color: '#1e293b', type: 'wall' },

      // Center Elevated Platform
      { min: [-10, 0, -10], max: [10, 2.5, 10], color: '#475569', type: 'platform' },
      { min: [-2, 2.5, -2], max: [2, 4.5, 2], color: '#64748b', type: 'cover' },

      // Ramps to Center Platform
      { min: [-14, 0, -3], max: [-10, 2.5, 3], color: '#64748b', type: 'ramp' },
      { min: [10, 0, -3], max: [14, 2.5, 3], color: '#64748b', type: 'ramp' },

      // North Structure (Sniper Tower / Catwalk)
      { min: [-18, 0, -35], max: [-14, 6, -31], color: '#0f172a', type: 'wall' }, // Pillar
      { min: [14, 0, -35], max: [18, 6, -31], color: '#0f172a', type: 'wall' },  // Pillar
      { min: [-20, 5.5, -36], max: [20, 6, -30], color: '#38bdf8', type: 'platform' }, // Bridge
      { min: [-20, 0, -30], max: [-16, 5.5, -20], color: '#64748b', type: 'ramp' }, // Ramp up North

      // South Structure (Bunker / Elevated Base)
      { min: [-20, 0, 30], max: [20, 3.5, 38], color: '#475569', type: 'platform' },
      { min: [-6, 3.5, 32], max: [6, 5.5, 36], color: '#f59e0b', type: 'cover' },
      { min: [-20, 0, 25], max: [-16, 3.5, 30], color: '#64748b', type: 'ramp' },
      { min: [16, 0, 25], max: [20, 3.5, 30], color: '#64748b', type: 'ramp' },

      // West Quad (Storage Containers & Cover)
      { min: [-36, 0, -12], max: [-26, 4, -4], color: '#ef4444', type: 'cover' },
      { min: [-34, 0, 8], max: [-24, 4, 16], color: '#3b82f6', type: 'cover' },
      { min: [-38, 0, -2], max: [-32, 2.5, 4], color: '#10b981', type: 'cover' },

      // East Quad (Storage Containers & Cover)
      { min: [26, 0, -12], max: [36, 4, -4], color: '#eab308', type: 'cover' },
      { min: [24, 0, 8], max: [34, 4, 16], color: '#8b5cf6', type: 'cover' },
      { min: [32, 0, -2], max: [38, 2.5, 4], color: '#06b6d4', type: 'cover' },

      // Jump Pads (Launch players into the air!)
      { min: [-22, 0, -2], max: [-18, 0.4, 2], color: '#10b981', type: 'jumppad' },
      { min: [18, 0, -2], max: [22, 0.4, 2], color: '#10b981', type: 'jumppad' },
      { min: [-2, 0, 20], max: [2, 0.4, 24], color: '#10b981', type: 'jumppad' },
      { min: [-2, 0, -24], max: [2, 0.4, -20], color: '#10b981', type: 'jumppad' }
    ],
    spawns: [
      { x: -35, y: 1, z: -35 },
      { x: 35, y: 1, z: -35 },
      { x: -35, y: 1, z: 35 },
      { x: 35, y: 1, z: 35 },
      { x: 0, y: 7, z: -33 },  // Sniper bridge spawn
      { x: 0, y: 4, z: 34 },   // South bunker spawn
      { x: -28, y: 1, z: 0 },
      { x: 28, y: 1, z: 0 }
    ],
    powerupSpawns: [
      // Center Platform: Rare high-impact powerup
      { x: 0, y: 3.5, z: 0, type: 'power_rocket' },
      // North Sniper Bridge
      { x: 0, y: 7, z: -33, type: 'power_sniper' },
      // South Bunker
      { x: 0, y: 4.5, z: 34, type: 'power_shotgun' },
      // East & West Corridors
      { x: -30, y: 1, z: 2, type: 'power_rifle' },
      { x: 30, y: 1, z: 2, type: 'damage' },
      // Four Quadrant Consumables
      { x: -20, y: 1, z: -20, type: 'health' },
      { x: 20, y: 1, z: -20, type: 'shield' },
      { x: -20, y: 1, z: 20, type: 'speed' },
      { x: 20, y: 1, z: 20, type: 'health' }
    ]
  };
}
