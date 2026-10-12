import fs from 'fs';
import path from 'path';
import { LeaderboardEntry } from '../../shared/types.js';

interface KillRecord {
  killerName: string;
  victimName: string;
  weapon: string;
  timestamp: number;
}

interface PlayerStats {
  name: string;
  kills: number;
  deaths: number;
  matchesPlayed: number;
  wins: number;
  lastActive: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

export class LeaderboardManager {
  private kills: KillRecord[] = [];
  private playerStats: Map<string, PlayerStats> = new Map();

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(LEADERBOARD_FILE)) {
        const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.kills = parsed.kills || [];
        if (parsed.playerStats) {
          for (const [name, stats] of Object.entries(parsed.playerStats)) {
            this.playerStats.set(name, stats as PlayerStats);
          }
        }
      } else {
        // Seed some initial friendly leaderboard entries so the board isn't blank on first boot
        this.seedInitialData();
      }
    } catch (e) {
      console.warn('Failed to load leaderboard data, initializing empty:', e);
      this.seedInitialData();
    }
  }

  private seedInitialData() {
    const seed = [
      { name: 'ApexStriker', kills: 48, deaths: 12, wins: 5 },
      { name: 'CyberViper', kills: 39, deaths: 15, wins: 3 },
      { name: 'ShadowHawk', kills: 31, deaths: 14, wins: 2 },
      { name: 'PixelKnight', kills: 24, deaths: 18, wins: 1 },
      { name: 'NeonRacer', kills: 19, deaths: 16, wins: 1 }
    ];
    const now = Date.now();
    for (const s of seed) {
      this.playerStats.set(s.name, {
        name: s.name,
        kills: s.kills,
        deaths: s.deaths,
        matchesPlayed: s.wins + 4,
        wins: s.wins,
        lastActive: now - Math.floor(Math.random() * 86400000)
      });
      // Add kill records
      for (let i = 0; i < s.kills; i++) {
        this.kills.push({
          killerName: s.name,
          victimName: 'Rookie_Bot',
          weapon: 'rifle',
          timestamp: now - Math.floor(Math.random() * 86400000 * 3)
        });
      }
    }
    this.saveData();
  }

  private saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      // Prune kills older than 31 days to keep file light
      const thirtyDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      this.kills = this.kills.filter(k => k.timestamp >= thirtyDaysAgo);

      const obj = {
        kills: this.kills,
        playerStats: Object.fromEntries(this.playerStats)
      };
      fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving leaderboard:', e);
    }
  }

  public recordKill(killerName: string, victimName: string, weapon: string) {
    const now = Date.now();
    this.kills.push({
      killerName,
      victimName,
      weapon,
      timestamp: now
    });

    let kStats = this.playerStats.get(killerName);
    if (!kStats) {
      kStats = { name: killerName, kills: 0, deaths: 0, matchesPlayed: 0, wins: 0, lastActive: now };
      this.playerStats.set(killerName, kStats);
    }
    kStats.kills += 1;
    kStats.lastActive = now;

    let vStats = this.playerStats.get(victimName);
    if (!vStats) {
      vStats = { name: victimName, kills: 0, deaths: 0, matchesPlayed: 0, wins: 0, lastActive: now };
      this.playerStats.set(victimName, vStats);
    }
    vStats.deaths += 1;
    vStats.lastActive = now;

    this.saveData();
  }

  public recordMatchEnd(winnerName: string, participants: { name: string; kills: number; deaths: number }[]) {
    const now = Date.now();
    for (const p of participants) {
      let stats = this.playerStats.get(p.name);
      if (!stats) {
        stats = { name: p.name, kills: p.kills, deaths: p.deaths, matchesPlayed: 0, wins: 0, lastActive: now };
        this.playerStats.set(p.name, stats);
      }
      stats.matchesPlayed += 1;
      if (p.name === winnerName) {
        stats.wins += 1;
      }
      stats.lastActive = now;
    }
    this.saveData();
  }

  public getLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly'): LeaderboardEntry[] {
    const now = Date.now();
    let cutoff = 0;
    if (timeframe === 'daily') {
      cutoff = now - 24 * 60 * 60 * 1000;
    } else if (timeframe === 'weekly') {
      cutoff = now - 7 * 24 * 60 * 60 * 1000;
    } else if (timeframe === 'monthly') {
      cutoff = now - 30 * 24 * 60 * 60 * 1000;
    }

    // Tally kills within cutoff
    const killCounts: Map<string, number> = new Map();
    for (const k of this.kills) {
      if (k.timestamp >= cutoff) {
        killCounts.set(k.killerName, (killCounts.get(k.killerName) || 0) + 1);
      }
    }

    const entries: LeaderboardEntry[] = [];
    for (const [name, stats] of this.playerStats) {
      const windowKills = killCounts.get(name) || 0;
      if (windowKills > 0 || timeframe === 'monthly') {
        const kd = stats.deaths > 0 ? Number((windowKills / stats.deaths).toFixed(2)) : windowKills;
        entries.push({
          name: stats.name,
          kills: windowKills,
          deaths: stats.deaths,
          kdRatio: kd,
          matchesPlayed: stats.matchesPlayed,
          wins: stats.wins,
          lastActive: stats.lastActive
        });
      }
    }

    // Sort descending by kills
    entries.sort((a, b) => b.kills - a.kills);
    return entries.slice(0, 50);
  }
}

export const leaderboardManager = new LeaderboardManager();
