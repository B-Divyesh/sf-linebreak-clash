import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const DB_PATH = process.env.LINEBREAK_DATA || '/data/linebreak-clash.sqlite';
const ROUND_DURATION = Number(process.env.ROUND_DURATION || 90);
const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const ALLOWED_ORIGINS = new Set([
  'https://linebreak-clash.sociobot.in',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
]);
const COLORS = ['#0759c7', '#c73b2f', '#6a3fc7', '#16705a'];
const SPAWNS = [[120, 150, 0], [840, 410, Math.PI], [120, 410, 0], [840, 150, Math.PI]];
const RELAY_POSITIONS = [[480, 100], [480, 460], [280, 280], [680, 280], [480, 280], [260, 150], [700, 410], [700, 150], [260, 410]];
const ROOM_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const clients = new Map();
const rooms = new Map();
const rateBuckets = new Map();

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA busy_timeout = 15000');
const hasRoomTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'rooms'").get();
if (!hasRoomTable) db.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, updated_at INTEGER NOT NULL)');

function publicPlayer(player) {
  const { token: _token, input: _input, lastSeen: _lastSeen, hasConnected: _hasConnected, ...safe } = player;
  return safe;
}

function publicRoom(room) {
  return {
    code: room.code,
    status: room.status,
    elapsed: room.elapsed,
    duration: room.duration,
    result: room.result,
    hostId: room.hostId,
    players: room.players.map(publicPlayer),
    relays: room.relays,
  };
}

function saveRoom(room) {
  room.updatedAt = Date.now();
  db.prepare('INSERT INTO rooms (code, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(code) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at')
    .run(room.code, JSON.stringify(room), room.updatedAt);
}

function loadRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const row of db.prepare('SELECT state FROM rooms WHERE updated_at >= ?').all(cutoff)) {
    try {
      const room = JSON.parse(row.state);
      room.players.forEach((player) => {
        if (player.connected) player.lastSeen = Date.now();
        player.connected = false;
        player.input = { left: false, right: false, dash: false };
      });
      rooms.set(room.code, room);
    } catch { /* Ignore a damaged expired room and keep serving healthy rooms. */ }
  }
  db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(cutoff);
}

function expireRooms() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [roomCode, room] of rooms) {
    if (room.updatedAt >= cutoff) continue;
    rooms.delete(roomCode);
    for (const [socket, auth] of clients) {
      if (auth.room === roomCode) socket.close(4005, 'Room expired');
    }
  }
  db.prepare('DELETE FROM rooms WHERE updated_at < ?').run(cutoff);
}

function code(length = 8) {
  let value = '';
  const bytes = randomBytes(length);
  for (const byte of bytes) value += ROOM_ALPHABET[byte % ROOM_ALPHABET.length];
  return value;
}

function token() { return randomBytes(24).toString('base64url'); }
function cleanName(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 20);
  return cleaned || fallback;
}

function newPlayer(slot, name, host = false) {
  const [x, y, angle] = SPAWNS[slot];
  return { id: randomBytes(8).toString('hex'), token: token(), name, slot, color: COLORS[slot], host, connected: false, hasConnected: false, lastSeen: Date.now(), x, y, previousX: x, previousY: y, angle, score: 0, captures: 0, alive: true, respawnRemaining: 0, dashRemaining: 0, dashCooldown: 0, trail: [], input: { left: false, right: false, dash: false } };
}

function newRoom(name) {
  let roomCode;
  do roomCode = code(); while (rooms.has(roomCode));
  const host = newPlayer(0, cleanName(name, 'Player 1'), true);
  const room = { code: roomCode, status: 'waiting', elapsed: 0, duration: ROUND_DURATION, result: null, hostId: host.id, players: [host], relays: [{ id: 1, x: 480, y: 100, active: true, respawnRemaining: 0 }, { id: 2, x: 280, y: 280, active: true, respawnRemaining: 0 }, { id: 3, x: 680, y: 410, active: true, respawnRemaining: 0 }], relayIndex: 3, updatedAt: Date.now() };
  rooms.set(roomCode, room); saveRoom(room); return { room, player: host };
}

function resetRound(room) {
  room.status = 'playing';
  room.elapsed = 0;
  room.result = null;
  room.relayIndex = 3;
  room.relays = [{ id: 1, x: 480, y: 100, active: true, respawnRemaining: 0 }, { id: 2, x: 280, y: 280, active: true, respawnRemaining: 0 }, { id: 3, x: 680, y: 410, active: true, respawnRemaining: 0 }];
  for (const player of room.players) {
    const [x, y, angle] = SPAWNS[player.slot];
    Object.assign(player, { x, y, previousX: x, previousY: y, angle, score: 0, captures: 0, alive: true, respawnRemaining: 0, dashRemaining: 0, dashCooldown: 0, trail: [], input: { left: false, right: false, dash: false } });
  }
  saveRoom(room);
  broadcast(room);
}

function cors(origin) {
  return ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
}

function sendJson(response, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload), 'Cache-Control': 'no-store', ...extra });
  response.end(payload);
}

function limited(ip) {
  const now = Date.now();
  const current = rateBuckets.get(ip) || { start: now, count: 0 };
  if (now - current.start >= 60_000) { current.start = now; current.count = 0; }
  current.count += 1; rateBuckets.set(ip, current);
  return current.count > 60;
}

async function body(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (text.length > 2_048) throw new Error('body-too-large');
  }
  return text ? JSON.parse(text) : {};
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin || '';
  const corsHeaders = cors(origin);
  if (request.method === 'OPTIONS') {
    response.writeHead(ALLOWED_ORIGINS.has(origin) ? 204 : 403, { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' }); response.end(); return;
  }
  if (request.url === '/health' && request.method === 'GET') { sendJson(response, 200, { ok: true, rooms: rooms.size }); return; }
  const ip = String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) { sendJson(response, 429, { error: 'Too many requests. Wait one minute and try again.' }, { ...corsHeaders, 'Retry-After': '60' }); return; }
  if (origin && !ALLOWED_ORIGINS.has(origin)) { sendJson(response, 403, { error: 'Origin not allowed.' }); return; }
  try {
    if (request.method === 'POST' && request.url === '/rooms') {
      const data = await body(request); const { room, player } = newRoom(data.name);
      sendJson(response, 201, { code: room.code, playerId: player.id, token: player.token }, corsHeaders); return;
    }
    const match = request.url?.match(/^\/rooms\/([2-9A-HJ-NP-Z]{8})\/join$/);
    if (request.method === 'POST' && match) {
      const room = rooms.get(match[1]);
      if (!room) { sendJson(response, 404, { error: 'Room not found. Check the code.' }, corsHeaders); return; }
      if (room.players.length >= 4 || room.status !== 'waiting') { sendJson(response, 409, { error: room.status !== 'waiting' ? 'This round already started.' : 'This room already has four players.' }, corsHeaders); return; }
      const data = await body(request); const player = newPlayer(room.players.length, cleanName(data.name, `Player ${room.players.length + 1}`)); room.players.push(player); saveRoom(room); broadcast(room);
      sendJson(response, 201, { code: room.code, playerId: player.id, token: player.token }, corsHeaders); return;
    }
    sendJson(response, 404, { error: 'Route not found.' }, corsHeaders);
  } catch (error) {
    sendJson(response, error instanceof SyntaxError ? 400 : 413, { error: error instanceof SyntaxError ? 'Send valid JSON.' : 'Request body is too large.' }, corsHeaders);
  }
});
server.requestTimeout = 10_000;
server.headersTimeout = 10_000;

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin || '';
  if (request.url !== '/ws' || !ALLOWED_ORIGINS.has(origin)) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
  wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws));
});

function send(ws, message) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message)); }
function broadcast(room, message = { type: 'snapshot', room: publicRoom(room) }) {
  for (const [ws, auth] of clients) if (auth.room === room.code) send(ws, message);
}

wss.on('connection', (ws) => {
  const timer = setTimeout(() => ws.close(4001, 'Authentication required'), 5_000);
  ws.on('message', (raw) => {
    let message; try { message = JSON.parse(String(raw)); } catch { send(ws, { type: 'error', error: 'Invalid message.' }); return; }
    const auth = clients.get(ws);
    if (!auth) {
      if (message.type !== 'auth') return;
      const room = rooms.get(String(message.room || '').toUpperCase());
      const player = room?.players.find((item) => item.token === message.token);
      if (!room || !player) { send(ws, { type: 'error', error: 'Room or rejoin key is not valid.' }); ws.close(4003, 'Not authorized'); return; }
      if (player.hasConnected && !player.connected && Date.now() - player.lastSeen > 20_000) { send(ws, { type: 'error', error: 'The 20-second rejoin window ended.' }); ws.close(4004, 'Rejoin expired'); return; }
      for (const [otherSocket, otherAuth] of clients) {
        if (otherAuth.playerId !== player.id) continue;
        clients.delete(otherSocket);
        otherSocket.close(4000, 'Replaced by a newer connection');
      }
      clearTimeout(timer); player.connected = true; player.hasConnected = true; player.lastSeen = Date.now(); clients.set(ws, { room: room.code, playerId: player.id, messages: 0, window: Date.now() }); saveRoom(room); broadcast(room); return;
    }
    const room = rooms.get(auth.room); const player = room?.players.find((item) => item.id === auth.playerId); if (!room || !player) return;
    const now = Date.now(); if (now - auth.window > 1_000) { auth.window = now; auth.messages = 0; } auth.messages += 1; if (auth.messages > 80) { ws.close(4008, 'Input rate exceeded'); return; }
    if (message.type === 'start' && player.host && room.status === 'waiting' && room.players.filter((item) => item.connected).length >= 2) resetRound(room);
    if (message.type === 'restart' && player.host && room.status === 'ended' && room.players.filter((item) => item.connected).length >= 2) resetRound(room);
    if (message.type === 'input' && room.status === 'playing') player.input = { left: Boolean(message.left), right: Boolean(message.right), dash: Boolean(message.dash) };
    if (message.type === 'reaction' && ['Nice!', 'Close!', 'Again!'].includes(message.value)) broadcast(room, { type: 'reaction', playerId: player.id, value: message.value });
  });
  ws.on('close', () => {
    clearTimeout(timer); const auth = clients.get(ws); clients.delete(ws); if (!auth) return;
    const room = rooms.get(auth.room); const player = room?.players.find((item) => item.id === auth.playerId); if (!room || !player) return;
    player.connected = false; player.lastSeen = Date.now(); player.input = { left: false, right: false, dash: false }; saveRoom(room); broadcast(room);
  });
});

function distance2(ax, ay, bx, by) { const x = ax - bx; const y = ay - by; return x * x + y * y; }
function segmentDistance2(px, py, a, b) { const x = b.x - a.x; const y = b.y - a.y; const l = x * x + y * y; if (!l) return distance2(px, py, a.x, a.y); const t = Math.max(0, Math.min(1, ((px - a.x) * x + (py - a.y) * y) / l)); return distance2(px, py, a.x + t * x, a.y + t * y); }
function respawn(player) { const [x, y, angle] = SPAWNS[player.slot]; Object.assign(player, { x, y, previousX: x, previousY: y, angle, alive: true, respawnRemaining: 0, dashRemaining: 0, trail: [] }); }
function crash(room, player) { player.alive = false; player.respawnRemaining = 1; player.trail = []; const opponents = room.players.filter((item) => item.id !== player.id); if (opponents.length) opponents.sort((a, b) => a.score - b.score)[0].score += 1; }
function step(room, dt) {
  if (room.status !== 'playing') return;
  room.elapsed = Math.min(room.duration, room.elapsed + dt);
  for (const relay of room.relays) { if (!relay.active) { relay.respawnRemaining -= dt; if (relay.respawnRemaining <= 0) { const pos = RELAY_POSITIONS[room.relayIndex++ % RELAY_POSITIONS.length]; Object.assign(relay, { x: pos[0], y: pos[1], active: true, respawnRemaining: 0 }); } } }
  for (const player of room.players) {
    player.dashCooldown = Math.max(0, player.dashCooldown - dt); player.dashRemaining = Math.max(0, player.dashRemaining - dt); player.trail = player.trail.map((point) => ({ ...point, age: point.age + dt })).filter((point) => point.age < 8.5);
    if (!player.alive) { player.respawnRemaining -= dt; if (player.respawnRemaining <= 0) respawn(player); continue; }
    if (player.input.dash && player.dashCooldown <= 0) { player.dashRemaining = .58; player.dashCooldown = 4.4; }
    if (player.input.left !== player.input.right) player.angle += (player.input.left ? -1 : 1) * 2.75 * dt;
    player.previousX = player.x; player.previousY = player.y; const speed = 108 * (player.dashRemaining > 0 ? 1.8 : 1); player.x += Math.cos(player.angle) * speed * dt; player.y += Math.sin(player.angle) * speed * dt;
    if (player.x < 16 || player.x > 944 || player.y < 16 || player.y > 544) { crash(room, player); continue; }
    if (player.dashRemaining <= 0) {
      let hit = false;
      for (const owner of room.players) { const end = owner.id === player.id ? Math.max(0, owner.trail.length - 12) : owner.trail.length - 1; for (let i = 1; i < end; i += 1) if (segmentDistance2(player.x, player.y, owner.trail[i - 1], owner.trail[i]) < 49) { hit = true; break; } if (hit) break; }
      if (hit) { crash(room, player); continue; }
      const last = player.trail.at(-1); if (!last || distance2(last.x, last.y, player.x, player.y) >= 18) player.trail.push({ x: player.x, y: player.y, age: 0 });
    }
    for (const relay of room.relays) if (relay.active && distance2(player.x, player.y, relay.x, relay.y) <= 676) { relay.active = false; relay.respawnRemaining = 1.15; player.score += 2; player.captures += 1; }
  }
  if (room.elapsed >= room.duration) { room.status = 'ended'; const high = Math.max(...room.players.map((player) => player.score)); const winners = room.players.filter((player) => player.score === high); room.result = winners.length === 1 ? winners[0].id : 'draw'; saveRoom(room); }
}

let previous = performance.now(); let accumulator = 0; let broadcastClock = 0; let saveClock = 0;
const simulationTimer = setInterval(() => { const now = performance.now(); accumulator += Math.min(.2, (now - previous) / 1000); previous = now; while (accumulator >= 1 / 60) { for (const room of rooms.values()) step(room, 1 / 60); accumulator -= 1 / 60; } broadcastClock += 1 / 60; saveClock += 1 / 60; if (broadcastClock >= 1 / 15) { for (const room of rooms.values()) if (room.status !== 'waiting' || room.players.some((player) => player.connected)) broadcast(room); broadcastClock = 0; } if (saveClock >= 1) { for (const room of rooms.values()) if (room.status === 'playing') saveRoom(room); saveClock = 0; } }, 1000 / 60);
const expiryTimer = setInterval(expireRooms, 60_000); expiryTimer.unref();

loadRooms();
server.listen(PORT, '0.0.0.0', () => console.log(`linebreak-clash-realtime listening on ${PORT}`));

function shutdown() {
  clearInterval(simulationTimer); clearInterval(expiryTimer);
  for (const room of rooms.values()) saveRoom(room);
  for (const socket of clients.keys()) socket.close(1012, 'Service restarting');
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => { db.close(); process.exit(0); }, 8_000).unref();
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
