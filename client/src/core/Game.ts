import * as THREE from 'three';
import { ClientMessage, KillFeedEntry, PlayerState, ServerMessage } from '../../../shared/types.js';
import { GameScene } from '../graphics/Scene.js';
import { PlayerRenderer } from '../graphics/PlayerRenderer.js';
import { WeaponRenderer } from '../graphics/WeaponRenderer.js';
import { EffectsManager } from '../graphics/Effects.js';
import { InputManager } from './Input.js';
import { soundManager } from './Audio.js';
import { HUDManager } from '../ui/HUD.js';
import { LeaderboardUI } from '../ui/LeaderboardUI.js';

export class GameEngine {
  private ws: WebSocket | null = null;
  private canvas: HTMLCanvasElement;
  private scene: GameScene;
  private input: InputManager;
  private playerRenderer: PlayerRenderer;
  private weaponRenderer: WeaponRenderer;
  private effects: EffectsManager;
  private hud: HUDManager;
  private leaderboardUI: LeaderboardUI;

  private selfId: string | null = null;
  private localPlayerState: PlayerState | null = null;
  private playerName = 'Player';
  private tickCounter = 0;
  private lastFrameTime = performance.now();

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.scene = new GameScene(this.canvas);
    this.input = new InputManager(this.canvas);
    this.playerRenderer = new PlayerRenderer(this.scene.scene);
    this.weaponRenderer = new WeaponRenderer(this.scene.camera);
    this.effects = new EffectsManager(this.scene.scene, this.scene.camera);
    this.hud = new HUDManager();

    this.leaderboardUI = new LeaderboardUI((timeframe) => {
      this.send({ type: 'req_leaderboard', timeframe });
    });
  }

  public start(playerName: string) {
    this.playerName = playerName || `Player_${Math.floor(Math.random() * 900 + 100)}`;

    // Hide Menu, Show HUD
    const menu = document.getElementById('menu-screen');
    if (menu) menu.style.display = 'none';

    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'block';

    this.input.lockPointer();
    this.connectNetwork();
    this.startLoop();
  }

  private connectNetwork() {
    // Determine WebSocket URL dynamically
    const isHttps = window.location.protocol === 'https:';
    const isDev = window.location.port === '5173';
    const host = isDev ? 'localhost:3000' : window.location.host;
    const protocol = isHttps ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}`;

    console.log(`Connecting to WebSocket game server at ${wsUrl}`);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to game server!');
      this.send({
        type: 'join',
        name: this.playerName
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage;
        this.handleServerMessage(msg);
      } catch (e) {
        console.error('Error parsing server message:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('Disconnected from game server. Reconnecting in 2s...');
      setTimeout(() => this.connectNetwork(), 2000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
    };
  }

  private send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    if (msg.type === 'init') {
      this.selfId = msg.selfId;
      this.scene.buildArena(msg.arena);
    } else if (msg.type === 'state') {
      const nowSec = performance.now() / 1000;

      // Find local player
      if (this.selfId) {
        const self = msg.players.find(p => p.id === this.selfId);
        if (self) {
          this.localPlayerState = self;
          this.hud.updateLocalPlayer(self);
          this.weaponRenderer.switchWeapon(self.weapon);
        }
      }

      // Update other players and bots
      this.playerRenderer.updatePlayers(msg.players, this.selfId || '', 1 / 30);

      // Update powerups & rockets
      this.scene.updatePowerups(msg.powerups, nowSec);
      this.effects.updateRockets(msg.rockets);

      // Update HUD match clock & scoreboard
      this.hud.updateMatchState(msg.timeLeft, msg.leaderboardSnapshot);
      this.hud.updateScoreboard(msg.leaderboardSnapshot, this.playerName);
    } else if (msg.type === 'shoot') {
      soundManager.playShoot(msg.weapon);

      // If shooter is local player, originate tracer directly from gun muzzle!
      let tracerOrigin = msg.origin;
      if (msg.shooterId === this.selfId) {
        const muzzlePos = this.weaponRenderer.getMuzzleWorldPosition();
        tracerOrigin = [muzzlePos.x, muzzlePos.y, muzzlePos.z];
        this.weaponRenderer.triggerShootEffect();
      }

      // Draw high-visibility 3D bullet tracer
      this.effects.addTracer(tracerOrigin, msg.dir, 90, msg.weapon);
    } else if (msg.type === 'hit') {
      if (msg.shooterId === this.selfId) {
        soundManager.playHit(msg.isHeadshot);
        this.effects.showHitmarker(msg.isHeadshot);
        this.effects.addDamageNumber(msg.position, msg.damage, msg.isHeadshot);
        this.effects.addImpactSpark(msg.position, msg.isHeadshot ? '#f43f5e' : '#fef08a');
      }
      if (msg.victimId === this.selfId) {
        soundManager.playHurt();
        this.effects.flashDamageVignette();
      }
    } else if (msg.type === 'kill') {
      this.hud.addKillFeed(msg.entry);
    } else if (msg.type === 'explosion') {
      soundManager.playExplosion();
      this.effects.addExplosion(msg.position, msg.radius);
    } else if (msg.type === 'leaderboard') {
      this.leaderboardUI.renderEntries(msg.entries);
    }
  }

  private startLoop() {
    const loop = (time: number) => {
      requestAnimationFrame(loop);
      const dt = Math.min((time - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = time;
      this.tickCounter++;

      // Send local input to server
      const pInput = this.input.getPlayerInput();
      this.send({
        type: 'input',
        input: pInput,
        yaw: this.input.yaw,
        pitch: this.input.pitch,
        tick: this.tickCounter
      });

      // Update local camera position & rotation to local player head
      if (this.localPlayerState && this.localPlayerState.isAlive) {
        const headY = this.localPlayerState.position.y + 1.6;
        this.scene.camera.position.set(
          this.localPlayerState.position.x,
          headY,
          this.localPlayerState.position.z
        );

        // First-person rotation (Euler YXZ: Yaw around Y, Pitch around X)
        this.scene.camera.rotation.order = 'YXZ';
        this.scene.camera.rotation.y = this.input.yaw;
        this.scene.camera.rotation.x = this.input.pitch;

        // Viewmodel animation
        const isMoving = pInput.forward || pInput.backward || pInput.left || pInput.right;
        this.weaponRenderer.update(
          dt,
          isMoving,
          time / 1000,
          this.localPlayerState.isReloading,
          this.localPlayerState.reloadProgress
        );
      }

      // Update visual effects & render Three.js scene
      this.effects.update(dt);
      this.scene.render();
    };

    requestAnimationFrame(loop);
  }
}
