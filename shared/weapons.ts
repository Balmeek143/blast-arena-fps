import { WeaponConfig, WeaponType } from './types.js';

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  pistol: {
    name: 'Tactical Pistol',
    type: 'pistol',
    damage: 24,
    headshotMultiplier: 2.0,
    fireRate: 4.5,
    magazineSize: 12,
    reloadTime: 1.2,
    spread: 0.012,
    pelletCount: 1,
    bulletSpeed: 300,
    isProjectile: false,
    color: '#94a3b8' // Slate
  },
  shotgun: {
    name: 'Pump Shotgun',
    type: 'shotgun',
    damage: 13,
    headshotMultiplier: 1.5,
    fireRate: 1.3,
    magazineSize: 6,
    reloadTime: 1.5,
    spread: 0.075,
    pelletCount: 8,
    bulletSpeed: 250,
    isProjectile: false,
    powerupRounds: 6,
    color: '#f97316' // Orange
  },
  rifle: {
    name: 'Assault Rifle',
    type: 'rifle',
    damage: 21,
    headshotMultiplier: 1.75,
    fireRate: 9.0,
    magazineSize: 35,
    reloadTime: 1.6,
    spread: 0.025,
    pelletCount: 1,
    bulletSpeed: 320,
    isProjectile: false,
    powerupRounds: 40,
    color: '#06b6d4' // Cyan
  },
  sniper: {
    name: 'Heavy Sniper',
    type: 'sniper',
    damage: 85,
    headshotMultiplier: 2.2, // 187 damage (one-shot kill)
    fireRate: 0.8,
    magazineSize: 5,
    reloadTime: 2.0,
    spread: 0.002,
    pelletCount: 1,
    bulletSpeed: 500,
    isProjectile: false,
    powerupRounds: 5,
    color: '#a855f7' // Purple
  },
  rocket: {
    name: 'Rocket Launcher',
    type: 'rocket',
    damage: 90,
    headshotMultiplier: 1.0,
    fireRate: 0.9,
    magazineSize: 3,
    reloadTime: 2.2,
    spread: 0.005,
    pelletCount: 1,
    bulletSpeed: 45,
    isProjectile: true,
    splashRadius: 6.5,
    splashDamage: 80,
    powerupRounds: 3,
    color: '#ef4444' // Red
  }
};
