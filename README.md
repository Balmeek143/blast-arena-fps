# 💥 BLAST ARENA — Multiplayer Browser FPS

A fast-paced, cross-platform 3D First-Person Shooter inspired by the casual pick-up-and-play fun of **Smash Karts**. Built with **Three.js**, **TypeScript**, and **Node.js (WebSockets)** for sub-2-second browser load times, buttery smooth 60-120 FPS performance on weak laptops and mobile phones, and 100% free cloud deployment.

---

## 🎮 Game Features

- **⚡ Instant Pick-up & Play**: Zero installations or downloads required. Plays directly in Chrome, Firefox, Edge, Safari, and Mobile browsers.
- **🔫 Default Weapon**: Tactical Pistol with infinite ammo reserves (12-round clip with tactical reload).
- **📦 Smash Karts-Style Power-ups**: Mystery crates float around the arena that grant limited-ammo specialty weapons:
  - **Pump Shotgun**: 6 power shells (8 pellets per blast, high close-quarters burst damage).
  - **Assault Rifle**: 40 rapid-fire automatic rounds.
  - **Heavy Sniper**: 5 high-velocity rounds (lethal 1-shot headshot multiplier).
  - **Rocket Launcher**: 3 explosive rockets with area-of-effect splash damage and physics knockback.
  - *Once power ammo is exhausted, seamlessly reverts back to the standard pistol!*
- **🛡️ Consumables & Buffs**:
  - **Medkits**: Restores +50 Health (up to 100 HP).
  - **Energy Shields**: Adds +50 Armor Shield (absorbs 70% incoming damage).
  - **Adrenaline Boost**: 1.6x movement speed for 10 seconds.
  - **Quad Damage**: Double damage multiplier with glowing avatar for 10 seconds.
- **🤖 Balanced AI Bots (Always Filled Lobbies)**:
  - Lobbies maintain 6 combatants at all times so you never wait alone.
  - When real players join, bots dynamically yield slots; when players leave, bots backfill seamlessly.
  - Three distinct, balanced AI skill tiers:
    - **Rookie**: Relaxed roaming, slower target acquisition, lower accuracy (~35%).
    - **Veteran**: Strafing movement, seeks nearby health packs when wounded, moderate aim (~65%).
    - **Advanced**: Predictive aim leading, jump-pad navigation, tactical power-up crate hunting (~80% accuracy).
- **🏆 Global Leaderboards**:
  - Filterable by **Daily**, **Weekly**, and **Monthly** leaderboards tracking top kills, deaths, K/D ratio, and win totals.
  - Auto-seeded and persistent across server reboots.
- **🚀 Jump Pads**:
  - Green kinetic pads launch players high into the air for aerial frags and vantage points.
- **🔊 Procedural Web Audio Engine**:
  - Synthesized gunshots, headshot chimes, hitmarker ticks, reload clicks, and explosion rumbles generated via the browser Web Audio API with zero external audio assets to fail to load.
- **📱 Cross-Platform Responsive Controls**:
  - **Desktop**: Mouse Pointer Lock (look & shoot) + WASD (movement) + Space (jump) + R (reload) + Tab (scoreboard).
  - **Mobile / Tablet**: Left virtual analog thumbstick + right swipe look zone + touch buttons for FIRE, JUMP, and RELOAD.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
Runs both the WebSocket game server and the Vite hot-reloading client concurrently:
```bash
npm run dev
```
Open your browser to:
- **Client (Vite)**: `http://localhost:5173`
- **Server (WebSocket & REST API)**: `http://localhost:3000`

### 3. Production Build & Start
```bash
npm run build
npm start
```
Open `http://localhost:3000` to play the unified build!

---

## 🌐 100% Free Cloud Deployment Guide

The backend uses a single-port unified architecture (Express serves the compiled Three.js frontend and attaches the WebSocket server on the exact same HTTP port). This allows you to host the entire multiplayer game for **0 cost on free hosting tiers**.

### Option A: Render.com (Recommended Free Hosting)
1. Push your repository to GitHub or GitLab.
2. Log into [Render.com](https://render.com) and click **New > Blueprint** (or **New > Web Service**).
3. Select your repository.
4. Render automatically reads [`render.yaml`](file:///c:/Users/balme/OneDrive/Desktop/Game_Antigravity/render.yaml):
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click **Apply**. Within 2 minutes, your live multiplayer game will be available at `https://your-app.onrender.com`!

### Option B: Railway / Fly.io / Docker
A production [`Dockerfile`](file:///c:/Users/balme/OneDrive/Desktop/Game_Antigravity/Dockerfile) is included:
```bash
docker build -t blast-arena .
docker run -p 3000:3000 blast-arena
```

---

## 📁 Project Architecture

```
Game_Antigravity/
├── client/
│   ├── index.html                  # HTML HUD, Crosshair, Hitmarkers, Mobile UI
│   └── src/
│       ├── main.ts                 # Client bootstrap & local nickname storage
│       ├── core/
│       │   ├── Game.ts             # Client net loop, interpolation & rendering
│       │   ├── Input.ts            # Pointer Lock, keyboard WASD, touch joysticks
│       │   └── Audio.ts            # Procedural Web Audio sound effects
│       ├── graphics/
│       │   ├── Scene.ts            # Three.js arena meshes, lighting & crates
│       │   ├── PlayerRenderer.ts   # 3D player/bot models & floating HP bars
│       │   ├── WeaponRenderer.ts   # 1st-person viewmodels, recoil & muzzle flash
│       │   └── Effects.ts          # Bullet tracers, rocket projectiles, explosions
│       └── ui/
│           ├── HUD.ts              # Health, shield, ammo, timer, and killfeed
│           └── LeaderboardUI.ts    # Daily / Weekly / Monthly ranking modal
├── server/
│   ├── server.ts                   # Unified Express & WebSocket server
│   ├── game/
│   │   ├── Room.ts                 # Match loop, weapon hitscan & rocket physics
│   │   ├── Bot.ts                  # Rookie, Veteran & Advanced AI controllers
│   │   ├── PowerupManager.ts       # Mystery crate spawns & timers
│   │   └── Physics.ts              # AABB collisions, raycasting & jump pads
│   └── db/
│       └── leaderboard.ts          # Daily / Weekly / Monthly stats persistence
├── shared/
│   ├── types.ts                    # Shared network packets & state definitions
│   ├── weapons.ts                  # Pistol, Shotgun, Rifle, Sniper, Rocket stats
│   └── arena.ts                    # 3D Arena geometry, spawn points & jump pads
├── render.yaml                     # 1-Click Render.com free deployment blueprint
├── Dockerfile                      # Containerized production build
└── package.json
```
