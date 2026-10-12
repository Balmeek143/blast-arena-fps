import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './game/Room.js';
import { leaderboardManager } from './db/leaderboard.js';
import { ClientMessage } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend build if dist directory exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/leaderboard', (req, res) => {
  const timeframe = (req.query.timeframe as 'daily' | 'weekly' | 'monthly') || 'daily';
  const entries = leaderboardManager.getLeaderboard(timeframe);
  res.json({ timeframe, entries });
});

// Single Page Application fallback for index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
    return next();
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.send(`<h2>Server is running! In development mode, open Vite client at http://localhost:5173</h2>`);
    }
  });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Single main arena room (expandable to multi-room matches)
const defaultRoom = new GameRoom('main-arena');

wss.on('connection', (ws: WebSocket) => {
  let playerId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString()) as ClientMessage;

      if (msg.type === 'join') {
        playerId = defaultRoom.addClient(ws, msg.name, msg.color);
        console.log(`[Player Joined] ${msg.name} (ID: ${playerId})`);
      } else if (playerId) {
        defaultRoom.handleClientMessage(playerId, msg);
      }
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      console.log(`[Player Left] ID: ${playerId}`);
      defaultRoom.removeClient(playerId);
      playerId = null;
    }
  });

  ws.on('error', err => {
    console.error('WS Error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 FPS Game Server listening on port ${PORT}`);
  console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
});
