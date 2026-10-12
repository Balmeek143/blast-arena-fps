export type WeaponType = 'pistol' | 'shotgun' | 'rifle' | 'sniper' | 'rocket';

export type PowerupType = 
  | 'power_shotgun'
  | 'power_rifle'
  | 'power_sniper'
  | 'power_rocket'
  | 'health'
  | 'shield'
  | 'speed'
  | 'damage';

export type BotDifficulty = 'rookie' | 'veteran' | 'advanced';

export interface WeaponConfig {
  name: string;
  type: WeaponType;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second
  magazineSize: number;
  reloadTime: number; // in seconds
  spread: number; // bullet spread angle in radians
  pelletCount: number; // for shotgun
  bulletSpeed: number; // for projectile / ray tracer
  isProjectile: boolean; // rockets are projectiles with splash
  splashRadius?: number; // for rockets
  splashDamage?: number;
  powerupRounds?: number; // how many rounds before reverting to pistol
  color: string;
}

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  shoot: boolean;
  reload: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  position: { x: number; y: number; z: number };
  rotation: { yaw: number; pitch: number };
  velocity: { x: number; y: number; z: number };
  health: number;
  shield: number;
  weapon: WeaponType;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  powerAmmoRemaining?: number; // For Smash Karts style power weapons
  speedBoostUntil: number;
  damageBoostUntil: number;
  kills: number;
  deaths: number;
  score: number;
  isAlive: boolean;
  respawnTimer: number;
  color: string;
  isGrounded: boolean;
}

export interface PowerupSpawn {
  id: string;
  type: PowerupType;
  name: string;
  position: { x: number; y: number; z: number };
  available: boolean;
  respawnTimeRemaining: number;
}

export interface RocketProjectile {
  id: string;
  shooterId: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  createdAt: number;
  lifetime: number;
}

export interface KillFeedEntry {
  id: string;
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: WeaponType;
  isHeadshot: boolean;
  timestamp: number;
}

export interface LeaderboardEntry {
  name: string;
  kills: number;
  deaths: number;
  kdRatio: number;
  matchesPlayed: number;
  wins: number;
  lastActive: number;
}

export interface ArenaBox {
  min: [number, number, number];
  max: [number, number, number];
  color?: string;
  type?: 'ground' | 'wall' | 'cover' | 'ramp' | 'platform' | 'jumppad';
}

export interface ArenaData {
  boxes: ArenaBox[];
  spawns: { x: number; y: number; z: number }[];
  powerupSpawns: { x: number; y: number; z: number; type?: PowerupType }[];
}

export type ClientMessage =
  | { type: 'join'; name: string; color?: string }
  | { type: 'input'; input: PlayerInput; yaw: number; pitch: number; tick: number }
  | { type: 'req_leaderboard'; timeframe: 'daily' | 'weekly' | 'monthly' }
  | { type: 'ping'; time: number };

export type ServerMessage =
  | { type: 'init'; selfId: string; arena: ArenaData; config: { matchDuration: number } }
  | { 
      type: 'state'; 
      tick: number; 
      players: PlayerState[]; 
      powerups: PowerupSpawn[]; 
      rockets: RocketProjectile[]; 
      timeLeft: number; 
      state: 'waiting' | 'active' | 'ended';
      leaderboardSnapshot: { name: string; kills: number; deaths: number; score: number }[];
    }
  | { 
      type: 'shoot'; 
      shooterId: string; 
      weapon: WeaponType; 
      origin: [number, number, number]; 
      dir: [number, number, number]; 
    }
  | { 
      type: 'hit'; 
      shooterId: string;
      victimId: string; 
      damage: number; 
      isHeadshot: boolean; 
      isKill: boolean;
      position: [number, number, number];
    }
  | { 
      type: 'kill'; 
      entry: KillFeedEntry; 
    }
  | { 
      type: 'explosion'; 
      position: [number, number, number]; 
      radius: number; 
    }
  | { 
      type: 'match_end'; 
      winner: { id: string; name: string; kills: number }; 
      scoreboard: { name: string; kills: number; deaths: number; score: number }[];
      nextMatchSeconds: number;
    }
  | { 
      type: 'leaderboard'; 
      timeframe: 'daily' | 'weekly' | 'monthly'; 
      entries: LeaderboardEntry[]; 
    }
  | { type: 'pong'; time: number };
