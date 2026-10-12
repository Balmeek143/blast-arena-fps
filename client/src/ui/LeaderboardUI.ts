import { LeaderboardEntry } from '../../../shared/types.js';

export class LeaderboardUI {
  private modal: HTMLElement;
  private tableBody: HTMLElement;
  private tabs: NodeListOf<HTMLButtonElement>;
  private currentTimeframe: 'daily' | 'weekly' | 'monthly' = 'daily';
  private onRequestData: (timeframe: 'daily' | 'weekly' | 'monthly') => void;

  constructor(onRequestData: (timeframe: 'daily' | 'weekly' | 'monthly') => void) {
    this.onRequestData = onRequestData;
    this.modal = document.getElementById('leaderboard-modal')!;
    this.tableBody = document.getElementById('lb-table-body')!;
    this.tabs = document.querySelectorAll('.lb-tab');

    this.initEvents();
  }

  private initEvents() {
    const openBtn = document.getElementById('btn-open-leaderboard');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        this.open();
      });
    }

    const closeBtn = document.getElementById('btn-close-leaderboard');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tf = tab.getAttribute('data-timeframe') as 'daily' | 'weekly' | 'monthly';
        this.currentTimeframe = tf;
        this.onRequestData(tf);
      });
    });
  }

  public open() {
    this.modal.style.display = 'flex';
    this.onRequestData(this.currentTimeframe);
  }

  public close() {
    this.modal.style.display = 'none';
  }

  public renderEntries(entries: LeaderboardEntry[]) {
    if (!entries || entries.length === 0) {
      this.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px; color: #94a3b8;">No kills recorded in this period yet! Be the first!</td></tr>`;
      return;
    }

    let html = '';
    entries.forEach((e, idx) => {
      const rank = idx + 1;
      let rankBadge = `${rank}`;
      if (rank === 1) rankBadge = '🥇 1';
      else if (rank === 2) rankBadge = '🥈 2';
      else if (rank === 3) rankBadge = '🥉 3';

      html += `
        <tr>
          <td style="font-weight: 800; color: ${rank === 1 ? '#fbbf24' : '#fff'};">${rankBadge}</td>
          <td style="font-weight: 700;">${e.name}</td>
          <td style="color: #38bdf8; font-weight: 800;">${e.kills}</td>
          <td>${e.deaths}</td>
          <td style="color: #34d399;">${e.kdRatio}</td>
          <td style="color: #a855f7;">${e.wins}</td>
        </tr>
      `;
    });

    this.tableBody.innerHTML = html;
  }
}
