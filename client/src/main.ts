import { GameEngine } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
  const playBtn = document.getElementById('btn-play') as HTMLButtonElement;

  // Load saved nickname if available
  const savedName = localStorage.getItem('blast_arena_nickname');
  if (savedName && nameInput) {
    nameInput.value = savedName;
  } else if (nameInput) {
    nameInput.value = `Player_${Math.floor(Math.random() * 899 + 100)}`;
  }

  const game = new GameEngine();

  const handleStart = () => {
    const rawName = nameInput ? nameInput.value.trim() : '';
    const finalName = rawName || `Agent_${Math.floor(Math.random() * 899 + 100)}`;
    localStorage.setItem('blast_arena_nickname', finalName);

    game.start(finalName);
  };

  if (playBtn) {
    playBtn.addEventListener('click', handleStart);
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleStart();
      }
    });
  }
});
