import { KillFeedEntry, PlayerState } from '../../../shared/types.js';
import { WEAPON_CONFIGS } from '../../../shared/weapons.js';

export class HUDManager {
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private shieldBar: HTMLElement;
  private shieldText: HTMLElement;
  private weaponName: HTMLElement;
  private ammoCurrent: HTMLElement;
  private ammoReserve: HTMLElement;
  private ammoHint: HTMLElement;
  private reloadIndicator: HTMLElement;
  private buffBadges: HTMLElement;
  private matchTimer: HTMLElement;
  private matchLeader: HTMLElement;
  private killfeedContainer: HTMLElement;
  private scoreboardBody: HTMLElement;

  constructor() {
    this.hpBar = document.getElementById('hp-bar')!;
    this.hpText = document.getElementById('hp-text')!;
    this.shieldBar = document.getElementById('shield-bar')!;
    this.shieldText = document.getElementById('shield-text')!;
    this.weaponName = document.getElementById('weapon-name')!;
    this.ammoCurrent = document.getElementById('ammo-current')!;
    this.ammoReserve = document.getElementById('ammo-reserve')!;
    this.ammoHint = document.getElementById('ammo-type-hint')!;
    this.reloadIndicator = document.getElementById('reload-indicator')!;
    this.buffBadges = document.getElementById('buff-badges')!;
    this.matchTimer = document.getElementById('match-timer')!;
    this.matchLeader = document.getElementById('match-leader')!;
    this.killfeedContainer = document.getElementById('killfeed')!;
    this.scoreboardBody = document.getElementById('sb-body')!;
  }

  public updateLocalPlayer(self: PlayerState) {
    // HP
    const hp = Math.max(0, Math.round(self.health));
    this.hpBar.style.width = `${hp}%`;
    this.hpText.textContent = `${hp} / 100`;

    // Shield
    const shield = Math.max(0, Math.round(self.shield));
    this.shieldBar.style.width = `${shield}%`;
    this.shieldText.textContent = `${shield} / 100`;

    // Weapon & Ammo
    const cfg = WEAPON_CONFIGS[self.weapon];
    this.weaponName.textContent = cfg.name;
    this.weaponName.style.color = cfg.color;

    this.ammoCurrent.textContent = `${self.ammo}`;

    if (self.weapon === 'pistol') {
      this.ammoReserve.textContent = '∞';
      this.ammoHint.textContent = 'Default Weapon';
    } else {
      const remainingPower = self.powerAmmoRemaining ?? self.ammo;
      this.ammoReserve.textContent = `${remainingPower} Power Shells`;
      this.ammoHint.textContent = '⚡ Mystery Power-up Weapon (Reverts when empty)';
    }

    // Weapon card styling based on powerup status
    const weaponCard = document.getElementById('weapon-status');
    if (weaponCard) {
      if (self.weapon !== 'pistol') {
        weaponCard.style.borderColor = cfg.color;
        weaponCard.style.boxShadow = `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px ${cfg.color}66`;
      } else {
        weaponCard.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        weaponCard.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.6)';
      }
    }

    // Reloading
    this.reloadIndicator.style.display = self.isReloading ? 'block' : 'none';

    // Buffs
    const now = Date.now();
    let badgesHtml = '';
    if (now < self.speedBoostUntil) {
      const secs = Math.ceil((self.speedBoostUntil - now) / 1000);
      badgesHtml += `<span class="buff-badge badge-speed">⚡ SPEED x1.6 (${secs}s)</span>`;
    }
    if (now < self.damageBoostUntil) {
      const secs = Math.ceil((self.damageBoostUntil - now) / 1000);
      badgesHtml += `<span class="buff-badge badge-damage">🔥 2X DAMAGE (${secs}s)</span>`;
    }
    this.buffBadges.innerHTML = badgesHtml;
  }

  public updateMatchState(timeLeft: number, leaderSnapshot: { name: string; kills: number }[]) {
    // Format mm:ss
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    this.matchTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (leaderSnapshot && leaderSnapshot.length > 0) {
      const top = leaderSnapshot[0];
      this.matchLeader.textContent = `👑 1st: ${top.name} (${top.kills} kills)`;
    } else {
      this.matchLeader.textContent = '👑 Match in progress';
    }
  }

  public addKillFeed(entry: KillFeedEntry) {
    const row = document.createElement('div');
    row.className = `killfeed-row ${entry.isHeadshot ? 'headshot' : ''}`;

    const headshotTag = entry.isHeadshot ? ' 🎯' : '';
    row.innerHTML = `
      <span class="kf-killer">${entry.killerName || 'The Void'}</span>
      <span class="kf-weapon">[${entry.weapon}${headshotTag}]</span>
      <span class="kf-victim">${entry.victimName}</span>
    `;

    this.killfeedContainer.prepend(row);

    // Auto remove after 5s
    setTimeout(() => {
      row.style.opacity = '0';
      row.style.transition = 'opacity 0.4s';
      setTimeout(() => row.remove(), 400);
    }, 4500);
  }

  public updateScoreboard(players: { name: string; kills: number; deaths: number; score: number }[], localPlayerName: string) {
    let html = '';
    players.forEach((p, idx) => {
      const isMe = p.name === localPlayerName;
      html += `
        <tr class="${isMe ? 'me' : ''}">
          <td>${idx + 1}</td>
          <td>${p.name} ${isMe ? '⭐ (You)' : ''}</td>
          <td>${p.kills}</td>
          <td>${p.deaths}</td>
          <td>${p.score}</td>
        </tr>
      `;
    });
    this.scoreboardBody.innerHTML = html;
  }
}
