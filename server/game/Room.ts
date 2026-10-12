import { WebSocket } from 'ws';
import { 
  ArenaData, 
  BotDifficulty, 
  ClientMessage, 
  KillFeedEntry, 
  PlayerInput, 
  PlayerState, 
  RocketProjectile, 
  ServerMessage, 
  WeaponType 
} from '../../shared/types.js';
import { WEAPON_CONFIGS } from '../../shared/weapons.js';
import { createDefaultArena } from '../../shared/arena.js';
import { PhysicsEngine } from './Physics.js';
import { PowerupManager } from './PowerupManager.js';
import { BotController } from './Bot.js';
import { leaderboardManager } from '../db/leaderboard.js';

const MATCH_DURATION = 180; // 3 minutes per round
const TARGET_PLAYERS = 6;   // 6 combatants in lobby

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  input: PlayerInput;
  yaw: number;
  pitch: number;
  lastShootTime: number;
  lastPing: number;
}

const BOT_NAMES: { name: string; diff: BotDifficulty }[] = [
  { name: 'Rookie_Ranger', diff: 'rookie' },
  { name: 'Private_Pawn', diff: 'rookie' },
  { name: 'Veteran_Viper', diff: 'veteran' },
  { name: 'Sarge_Striker', diff: 'veteran' },
  { name: 'Ace_Phantom', diff: 'advanced' },
  { name: 'Ghost_Sniper', diff: 'advanced' }
];

const BOT_COLORS = ['#38bdf8', '#fbbf24', '#f43f5e', '#a855f7', '#34d399', '#f97316'];

export class GameRoom {
  public id: string;
  public arena: ArenaData;
  public physics: PhysicsEngine;
  public powerupManager: PowerupManager;

  private clients: Map<string, ConnectedClient> = new Map();
  private players: Map<string, PlayerState> = new Map();
  private bots: Map<string, BotController> = new Map();

  private rockets: RocketProjectile[] = [];
  private killFeed: KillFeedEntry[] = [];
  private tickCounter = 0;
  private timeLeft = MATCH_DURATION;
  private state: 'waiting' | 'active' | 'ended' = 'active';
  private nextMatchTimer = 0;
  private lastUpdateTime = Date.now();
  private loopInterval: NodeJS.Timeout | null = null;

  constructor(id: string) {
    this.id = id;
    this.arena = createDefaultArena();
    this.physics = new PhysicsEngine(this.arena);
    this.powerupManager = new PowerupManager(this.arena);

    // Initial bot population
    this.adjustBots();
    this.startLoop();
  }

  private startLoop() {
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 1000 / 30); // 30 ticks per second
  }

  public stop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  public addClient(ws: WebSocket, name: string, color?: string): string {
    const id = `p_${Math.random().toString(36).substring(2, 9)}`;
    const spawn = this.getRandomSpawn();

    const player: PlayerState = {
      id,
      name: name.substring(0, 16) || `Player_${id.substring(2, 5)}`,
      isBot: false,
      position: { ...spawn },
      rotation: { yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      shield: 0,
      weapon: 'pistol',
      ammo: WEAPON_CONFIGS.pistol.magazineSize,
      maxAmmo: WEAPON_CONFIGS.pistol.magazineSize,
      isReloading: false,
      reloadProgress: 0,
      speedBoostUntil: 0,
      damageBoostUntil: 0,
      kills: 0,
      deaths: 0,
      score: 0,
      isAlive: true,
      respawnTimer: 0,
      color: color || '#38bdf8',
      isGrounded: true
    };

    this.players.set(id, player);
    this.clients.set(id, {
      id,
      ws,
      input: { forward: false, backward: false, left: false, right: false, jump: false, shoot: false, reload: false },
      yaw: 0,
      pitch: 0,
      lastShootTime: 0,
      lastPing: Date.now()
    });

    // Send Init message to client
    const initMsg: ServerMessage = {
      type: 'init',
      selfId: id,
      arena: this.arena,
      config: { matchDuration: MATCH_DURATION }
    };
    ws.send(JSON.stringify(initMsg));

    // Dynamic bot adjustment: remove a bot if lobby is full
    this.adjustBots();
    return id;
  }

  public removeClient(id: string) {
    this.clients.delete(id);
    this.players.delete(id);
    this.adjustBots();
  }

  public handleClientMessage(id: string, msg: ClientMessage) {
    const client = this.clients.get(id);
    if (!client) return;

    if (msg.type === 'input') {
      client.input = msg.input;
      client.yaw = msg.yaw;
      client.pitch = msg.pitch;

      const player = this.players.get(id);
      if (player && player.isAlive) {
        player.rotation.yaw = msg.yaw;
        player.rotation.pitch = msg.pitch;

        if (msg.input.reload && !player.isReloading && player.ammo < player.maxAmmo) {
          this.startReload(player);
        }
      }
    } else if (msg.type === 'ping') {
      client.ws.send(JSON.stringify({ type: 'pong', time: msg.time }));
    } else if (msg.type === 'req_leaderboard') {
      const entries = leaderboardManager.getLeaderboard(msg.timeframe);
      client.ws.send(JSON.stringify({
        type: 'leaderboard',
        timeframe: msg.timeframe,
        entries
      }));
    }
  }

  private adjustBots() {
    const humanCount = this.clients.size;
    const desiredBots = Math.max(0, TARGET_PLAYERS - humanCount);

    // If we have fewer bots than desired, spawn more
    while (this.bots.size < desiredBots) {
      const botIdx = this.bots.size % BOT_NAMES.length;
      const botDef = BOT_NAMES[botIdx];
      const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
      const spawn = this.getRandomSpawn();

      const botPlayer: PlayerState = {
        id: botId,
        name: `${botDef.name}`,
        isBot: true,
        botDifficulty: botDef.diff,
        position: { ...spawn },
        rotation: { yaw: Math.random() * Math.PI * 2, pitch: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        health: 100,
        shield: 0,
        weapon: 'pistol',
        ammo: WEAPON_CONFIGS.pistol.magazineSize,
        maxAmmo: WEAPON_CONFIGS.pistol.magazineSize,
        isReloading: false,
        reloadProgress: 0,
        speedBoostUntil: 0,
        damageBoostUntil: 0,
        kills: 0,
        deaths: 0,
        score: 0,
        isAlive: true,
        respawnTimer: 0,
        color: BOT_COLORS[botIdx % BOT_COLORS.length],
        isGrounded: true
      };

      this.players.set(botId, botPlayer);
      this.bots.set(botId, new BotController(botId, botDef.name, botDef.diff));
    }

    // If we have more bots than desired, remove excess
    while (this.bots.size > desiredBots) {
      const firstBotKey = this.bots.keys().next().value;
      if (firstBotKey) {
        this.bots.delete(firstBotKey);
        this.players.delete(firstBotKey);
      } else break;
    }
  }

  private getRandomSpawn() {
    const list = this.arena.spawns;
    return list[Math.floor(Math.random() * list.length)];
  }

  private tick() {
    const now = Date.now();
    const dt = Math.min((now - this.lastUpdateTime) / 1000, 0.1);
    this.lastUpdateTime = now;
    this.tickCounter++;

    if (this.state === 'active') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.endMatch();
      }
    } else if (this.state === 'ended') {
      this.nextMatchTimer -= dt;
      if (this.nextMatchTimer <= 0) {
        this.restartMatch();
      }
    }

    // Update Powerup Respawns
    this.powerupManager.update(dt);

    // Update Bot Inputs
    const allPlayersList = Array.from(this.players.values());
    for (const [botId, botCtrl] of this.bots) {
      const botPlayer = this.players.get(botId);
      if (!botPlayer) continue;

      const { input, yaw, pitch } = botCtrl.generateInput(
        botPlayer,
        allPlayersList,
        this.powerupManager.getPowerups(),
        this.physics,
        dt
      );

      botPlayer.rotation.yaw = yaw;
      botPlayer.rotation.pitch = pitch;

      if (input.reload && !botPlayer.isReloading && botPlayer.ammo < botPlayer.maxAmmo) {
        this.startReload(botPlayer);
      }

      this.processPlayerMovement(botPlayer, input, dt);

      if (input.shoot) {
        this.attemptShoot(botPlayer);
      }
    }

    // Update Human Players
    for (const [cId, client] of this.clients) {
      const player = this.players.get(cId);
      if (!player) continue;

      this.processPlayerMovement(player, client.input, dt);

      if (client.input.shoot) {
        this.attemptShoot(player);
      }
    }

    // Update Projectiles (Rockets)
    this.updateRockets(dt);

    // Broadcast World State to all clients
    this.broadcastState();
  }

  private processPlayerMovement(player: PlayerState, input: PlayerInput, dt: number) {
    if (!player.isAlive) {
      player.respawnTimer -= dt;
      if (player.respawnTimer <= 0) {
        this.respawnPlayer(player);
      }
      return;
    }

    // Reload timer
    if (player.isReloading) {
      const wCfg = WEAPON_CONFIGS[player.weapon];
      player.reloadProgress += dt / wCfg.reloadTime;
      if (player.reloadProgress >= 1) {
        player.isReloading = false;
        player.reloadProgress = 0;
        player.ammo = player.maxAmmo;
      }
    }

    // Base speed
    let moveSpeed = 10.5;
    if (Date.now() < player.speedBoostUntil) {
      moveSpeed *= 1.6; // Speed boost powerup
    }

    const yaw = player.rotation.yaw;
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    let moveX = 0;
    let moveZ = 0;

    if (input.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (input.backward) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (input.right) {
      moveX += rightX;
      moveZ += rightZ;
    }
    if (input.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }

    const moveLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (moveLen > 0.001) {
      player.velocity.x = (moveX / moveLen) * moveSpeed;
      player.velocity.z = (moveZ / moveLen) * moveSpeed;
    } else {
      player.velocity.x = 0;
      player.velocity.z = 0;
    }

    // Gravity
    player.velocity.y -= this.physics.gravity * dt;

    // Jump
    if (input.jump && player.isGrounded) {
      player.velocity.y = 11.5;
      player.isGrounded = false;
    }

    // Resolve physics
    const result = this.physics.movePlayer(player.position, player.velocity, dt);
    player.position = result.pos;
    player.velocity = result.vel;
    player.isGrounded = result.isGrounded;

    // Jump pad launch!
    if (result.steppedOnJumpPad) {
      player.velocity.y = 22.0; // High bounce!
      player.isGrounded = false;
    }

    // Check out of bounds / fall off
    if (player.position.y < -10) {
      this.killPlayer(player, null, 'pistol', false);
      return;
    }

    // Check powerup pickup
    const collected = this.powerupManager.checkCollection(player.position);
    if (collected) {
      this.applyPowerup(player, collected.type);
    }
  }

  private applyPowerup(player: PlayerState, type: string) {
    const now = Date.now();
    if (type === 'health') {
      player.health = Math.min(100, player.health + 50);
    } else if (type === 'shield') {
      player.shield = Math.min(100, player.shield + 50);
    } else if (type === 'speed') {
      player.speedBoostUntil = now + 10000;
    } else if (type === 'damage') {
      player.damageBoostUntil = now + 10000;
    } else if (type === 'power_shotgun') {
      this.equipPowerWeapon(player, 'shotgun');
    } else if (type === 'power_rifle') {
      this.equipPowerWeapon(player, 'rifle');
    } else if (type === 'power_sniper') {
      this.equipPowerWeapon(player, 'sniper');
    } else if (type === 'power_rocket') {
      this.equipPowerWeapon(player, 'rocket');
    }
  }

  private equipPowerWeapon(player: PlayerState, weapon: WeaponType) {
    const cfg = WEAPON_CONFIGS[weapon];
    player.weapon = weapon;
    player.ammo = cfg.magazineSize;
    player.maxAmmo = cfg.magazineSize;
    player.powerAmmoRemaining = cfg.powerupRounds || cfg.magazineSize;
    player.isReloading = false;
    player.reloadProgress = 0;
  }

  private startReload(player: PlayerState) {
    if (player.isReloading) return;
    player.isReloading = true;
    player.reloadProgress = 0;
  }

  private attemptShoot(player: PlayerState) {
    if (!player.isAlive || player.isReloading || player.ammo <= 0) return;

    const cfg = WEAPON_CONFIGS[player.weapon];
    const now = Date.now();
    const minInterval = 1000 / cfg.fireRate;

    // Check client last shoot time
    const client = this.clients.get(player.id);
    if (client) {
      if (now - client.lastShootTime < minInterval) return;
      client.lastShootTime = now;
    }

    // Consume ammo
    player.ammo -= 1;
    if (player.powerAmmoRemaining !== undefined) {
      player.powerAmmoRemaining -= 1;
      // Smash Karts style: when power ammo runs out, revert to Pistol!
      if (player.powerAmmoRemaining <= 0) {
        player.weapon = 'pistol';
        player.ammo = WEAPON_CONFIGS.pistol.magazineSize;
        player.maxAmmo = WEAPON_CONFIGS.pistol.magazineSize;
        player.powerAmmoRemaining = undefined;
      }
    }

    // Auto reload pistol when clip empty
    if (player.ammo <= 0 && player.weapon === 'pistol') {
      this.startReload(player);
    }

    // Calculate bullet origin and forward direction
    const eyeY = player.position.y + 1.6;
    const origin: [number, number, number] = [player.position.x, eyeY, player.position.z];

    const yaw = player.rotation.yaw;
    const pitch = player.rotation.pitch;

    const baseDirX = Math.sin(yaw) * Math.cos(pitch);
    const baseDirY = Math.sin(pitch);
    const baseDirZ = Math.cos(yaw) * Math.cos(pitch);

    // Broadcast shoot event
    this.broadcast({
      type: 'shoot',
      shooterId: player.id,
      weapon: player.weapon,
      origin,
      dir: [baseDirX, baseDirY, baseDirZ]
    });

    if (cfg.isProjectile) {
      // Fire physical rocket!
      this.rockets.push({
        id: `r_${Math.random().toString(36).substring(2, 8)}`,
        shooterId: player.id,
        position: { x: origin[0], y: origin[1], z: origin[2] },
        velocity: {
          x: baseDirX * cfg.bulletSpeed,
          y: baseDirY * cfg.bulletSpeed,
          z: baseDirZ * cfg.bulletSpeed
        },
        createdAt: now,
        lifetime: 4.0
      });
      return;
    }

    // Raycast hitscan (Pistol, Shotgun, Rifle, Sniper)
    const pellets = cfg.pelletCount;
    for (let p = 0; p < pellets; p++) {
      // Apply spread
      let dirX = baseDirX;
      let dirY = baseDirY;
      let dirZ = baseDirZ;

      if (cfg.spread > 0) {
        dirX += (Math.random() - 0.5) * cfg.spread;
        dirY += (Math.random() - 0.5) * cfg.spread;
        dirZ += (Math.random() - 0.5) * cfg.spread;
        const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        dirX /= len;
        dirY /= len;
        dirZ /= len;
      }

      this.raycastShot(player, origin, [dirX, dirY, dirZ], cfg.damage, cfg.headshotMultiplier);
    }
  }

  private raycastShot(
    shooter: PlayerState,
    orig: [number, number, number],
    dir: [number, number, number],
    baseDamage: number,
    headshotMult: number
  ) {
    let closestDist = Infinity;
    let hitVictim: PlayerState | null = null;
    let isHeadshot = false;

    // First check arena obstacles
    for (const box of this.arena.boxes) {
      if (box.type === 'jumppad') continue;
      const t = this.physics.rayIntersectAABB(orig, dir, box);
      if (t !== null && t < closestDist) {
        closestDist = t;
      }
    }

    // Then check all other alive players
    for (const target of this.players.values()) {
      if (target.id === shooter.id || !target.isAlive) continue;

      const aabb = this.physics.getPlayerAABB(target.position.x, target.position.y, target.position.z);
      const t = this.physics.rayIntersectAABB(orig, dir, aabb);

      if (t !== null && t < closestDist) {
        closestDist = t;
        hitVictim = target;

        // Check if hit was in head region (top 20% of player)
        const hitY = orig[1] + dir[1] * t;
        isHeadshot = hitY >= target.position.y + this.physics.playerHeight * 0.78;
      }
    }

    if (hitVictim) {
      let finalDamage = isHeadshot ? baseDamage * headshotMult : baseDamage;

      // Double damage boost
      if (Date.now() < shooter.damageBoostUntil) {
        finalDamage *= 2.0;
      }

      this.damagePlayer(hitVictim, shooter, finalDamage, isHeadshot, shooter.weapon, [
        orig[0] + dir[0] * closestDist,
        orig[1] + dir[1] * closestDist,
        orig[2] + dir[2] * closestDist
      ]);
    }
  }

  private damagePlayer(
    victim: PlayerState,
    killer: PlayerState | null,
    damage: number,
    isHeadshot: boolean,
    weapon: WeaponType,
    hitPos: [number, number, number]
  ) {
    let dmgLeft = damage;

    // Shield absorption (absorbs up to 70% of incoming damage)
    if (victim.shield > 0) {
      const shieldAbsorb = Math.min(victim.shield, dmgLeft * 0.7);
      victim.shield -= shieldAbsorb;
      dmgLeft -= shieldAbsorb;
    }

    victim.health -= dmgLeft;

    const isKill = victim.health <= 0;

    // Broadcast Hit Event
    if (killer) {
      this.broadcast({
        type: 'hit',
        shooterId: killer.id,
        victimId: victim.id,
        damage: Math.round(damage),
        isHeadshot,
        isKill,
        position: hitPos
      });
    }

    if (isKill) {
      this.killPlayer(victim, killer, weapon, isHeadshot);
    }
  }

  private updateRockets(dt: number) {
    const now = Date.now();
    const remainingRockets: RocketProjectile[] = [];

    for (const r of this.rockets) {
      const age = (now - r.createdAt) / 1000;
      if (age > r.lifetime) {
        this.explodeRocket(r);
        continue;
      }

      const nextX = r.position.x + r.velocity.x * dt;
      const nextY = r.position.y + r.velocity.y * dt;
      const nextZ = r.position.z + r.velocity.z * dt;

      // Check collision with arena boxes
      let collided = false;
      for (const box of this.arena.boxes) {
        if (
          nextX >= box.min[0] && nextX <= box.max[0] &&
          nextY >= box.min[1] && nextY <= box.max[1] &&
          nextZ >= box.min[2] && nextZ <= box.max[2]
        ) {
          collided = true;
          break;
        }
      }

      // Check collision with any player
      if (!collided) {
        for (const p of this.players.values()) {
          if (p.id === r.shooterId || !p.isAlive) continue;
          const dx = nextX - p.position.x;
          const dy = nextY - (p.position.y + 0.9);
          const dz = nextZ - p.position.z;
          if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.0) {
            collided = true;
            break;
          }
        }
      }

      if (collided) {
        r.position = { x: nextX, y: nextY, z: nextZ };
        this.explodeRocket(r);
      } else {
        r.position = { x: nextX, y: nextY, z: nextZ };
        remainingRockets.push(r);
      }
    }

    this.rockets = remainingRockets;
  }

  private explodeRocket(r: RocketProjectile) {
    const cfg = WEAPON_CONFIGS.rocket;
    const radius = cfg.splashRadius || 6.5;
    const maxSplashDmg = cfg.splashDamage || 80;
    const shooter = this.players.get(r.shooterId);

    // Broadcast explosion effect
    this.broadcast({
      type: 'explosion',
      position: [r.position.x, r.position.y, r.position.z],
      radius
    });

    // Splash damage to all nearby players
    for (const p of this.players.values()) {
      if (!p.isAlive) continue;

      const dx = p.position.x - r.position.x;
      const dy = (p.position.y + 0.9) - r.position.y;
      const dz = p.position.z - r.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= radius) {
        const falloff = 1 - (dist / radius);
        const dmg = maxSplashDmg * falloff;

        // Apply knockback
        const knockFactor = 15 * falloff;
        p.velocity.x += (dx / (dist + 0.1)) * knockFactor;
        p.velocity.y += 10 * falloff;
        p.velocity.z += (dz / (dist + 0.1)) * knockFactor;
        p.isGrounded = false;

        this.damagePlayer(p, shooter || null, dmg, false, 'rocket', [r.position.x, r.position.y, r.position.z]);
      }
    }
  }

  private killPlayer(
    victim: PlayerState,
    killer: PlayerState | null,
    weapon: WeaponType,
    isHeadshot: boolean
  ) {
    victim.health = 0;
    victim.isAlive = false;
    victim.deaths += 1;
    victim.respawnTimer = 3.0; // 3 seconds to respawn

    const killerName = killer ? killer.name : 'The Void';
    const killerId = killer ? killer.id : '';

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.score += isHeadshot ? 150 : 100;

      // Record in Leaderboard
      leaderboardManager.recordKill(killer.name, victim.name, weapon);
    }

    const killEntry: KillFeedEntry = {
      id: `kf_${Math.random().toString(36).substring(2, 8)}`,
      killerId,
      killerName,
      victimId: victim.id,
      victimName: victim.name,
      weapon,
      isHeadshot,
      timestamp: Date.now()
    };

    this.killFeed.unshift(killEntry);
    if (this.killFeed.length > 8) this.killFeed.pop();

    this.broadcast({
      type: 'kill',
      entry: killEntry
    });
  }

  private respawnPlayer(player: PlayerState) {
    const spawn = this.getRandomSpawn();
    player.position = { ...spawn };
    player.velocity = { x: 0, y: 0, z: 0 };
    player.health = 100;
    player.shield = 0;
    player.weapon = 'pistol';
    player.ammo = WEAPON_CONFIGS.pistol.magazineSize;
    player.maxAmmo = WEAPON_CONFIGS.pistol.magazineSize;
    player.isReloading = false;
    player.reloadProgress = 0;
    player.powerAmmoRemaining = undefined;
    player.speedBoostUntil = 0;
    player.damageBoostUntil = 0;
    player.isAlive = true;
    player.respawnTimer = 0;
    player.isGrounded = true;
  }

  private endMatch() {
    this.state = 'ended';
    this.nextMatchTimer = 8.0; // 8 seconds countdown to next match

    // Determine winner
    let winner = { id: '', name: 'No One', kills: -1 };
    const scoreboard: { name: string; kills: number; deaths: number; score: number }[] = [];

    for (const p of this.players.values()) {
      scoreboard.push({
        name: p.name,
        kills: p.kills,
        deaths: p.deaths,
        score: p.score
      });
      if (p.kills > winner.kills) {
        winner = { id: p.id, name: p.name, kills: p.kills };
      }
    }

    scoreboard.sort((a, b) => b.kills - a.kills || b.score - a.score);

    leaderboardManager.recordMatchEnd(winner.name, scoreboard);

    this.broadcast({
      type: 'match_end',
      winner,
      scoreboard,
      nextMatchSeconds: 8
    });
  }

  private restartMatch() {
    this.timeLeft = MATCH_DURATION;
    this.state = 'active';

    for (const p of this.players.values()) {
      p.kills = 0;
      p.deaths = 0;
      p.score = 0;
      this.respawnPlayer(p);
    }
  }

  private broadcast(msg: ServerMessage) {
    const json = JSON.stringify(msg);
    for (const c of this.clients.values()) {
      if (c.ws.readyState === WebSocket.OPEN) {
        c.ws.send(json);
      }
    }
  }

  private broadcastState() {
    const snapshot: { name: string; kills: number; deaths: number; score: number }[] = [];
    for (const p of this.players.values()) {
      snapshot.push({
        name: p.name,
        kills: p.kills,
        deaths: p.deaths,
        score: p.score
      });
    }
    snapshot.sort((a, b) => b.kills - a.kills);

    const msg: ServerMessage = {
      type: 'state',
      tick: this.tickCounter,
      players: Array.from(this.players.values()),
      powerups: this.powerupManager.getPowerups(),
      rockets: this.rockets,
      timeLeft: Math.max(0, Math.round(this.timeLeft)),
      state: this.state,
      leaderboardSnapshot: snapshot
    };

    this.broadcast(msg);
  }
}
