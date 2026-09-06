import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WebSocket } from 'ws';

const port = 8793;
const origin = 'http://127.0.0.1:4173';
const base = `http://127.0.0.1:${port}`;
const directory = await mkdtemp(join(tmpdir(), 'linebreak-realtime-'));
const database = join(directory, 'rooms.sqlite');

function start() {
  return spawn(process.execPath, ['realtime/server.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port), ROUND_DURATION: '30', LINEBREAK_DATA: database }, stdio: ['ignore', 'pipe', 'pipe'] });
}

async function ready(child) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Realtime process exited before health became ready.');
    try { const response = await fetch(`${base}/health`); if (response.ok) return; } catch { /* retry during startup */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Realtime health endpoint did not become ready.');
}

async function stop(child) {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}

async function post(path, payload) {
  return fetch(`${base}${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

async function connect(identity) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, { origin });
    const timeout = setTimeout(() => reject(new Error('WebSocket authentication timed out.')), 2_000);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', room: identity.code, token: identity.token })));
    socket.on('message', (raw) => { const message = JSON.parse(String(raw)); if (message.type === 'snapshot') { clearTimeout(timeout); resolve({ socket, room: message.room }); } });
    socket.on('error', reject);
  });
}

async function waitForStatus(socket, status) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Room did not reach ${status}.`)), 2_000);
    const listener = (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'snapshot' && message.room.status === status) { clearTimeout(timeout); socket.off('message', listener); resolve(message.room); }
    };
    socket.on('message', listener);
  });
}

async function nextSnapshot(socket, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Expected a newer server snapshot.')), 2_000);
    const listener = (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'snapshot' && predicate(message.room)) {
        clearTimeout(timeout);
        socket.off('message', listener);
        resolve(message.room);
      }
    };
    socket.on('message', listener);
  });
}

let child = start();
try {
  await ready(child);
  const health = await fetch(`${base}/health`);
  if (!health.ok || !(await health.json()).ok) throw new Error('Health response was not ready.');
  const created = await post('/rooms', { name: 'Host' });
  if (created.status !== 201) throw new Error(`Create returned ${created.status}`);
  const host = await created.json();
  const roomCodes = new Set([host.code]);
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const response = await post('/rooms', { name: `Code ${attempt}` });
    if (response.status !== 201) throw new Error(`Room-code create returned ${response.status}`);
    const identity = await response.json();
    if (!/^[2-9A-HJ-NP-Z]{8}$/.test(identity.code) || roomCodes.has(identity.code)) throw new Error('Room codes were not distinct secure-format codes.');
    roomCodes.add(identity.code);
  }
  const guests = [];
  for (const name of ['Two', 'Three', 'Four']) { const response = await post(`/rooms/${host.code}/join`, { name }); if (response.status !== 201) throw new Error(`Join returned ${response.status}`); guests.push(await response.json()); }
  const full = await post(`/rooms/${host.code}/join`, { name: 'Five' });
  if (full.status !== 409) throw new Error(`Fifth player should be rejected, got ${full.status}`);
  let connection = await connect(guests[0]); connection.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 30));
  let reconnects = 0;
  for (let attempt = 0; attempt < 20; attempt += 1) { connection = await connect(guests[0]); reconnects += 1; connection.socket.close(); await new Promise((resolve) => setTimeout(resolve, 15)); }
  if (reconnects !== 20) throw new Error(`Only ${reconnects}/20 reconnects succeeded.`);
  const hostConnection = await connect(host);
  const guestConnection = await connect(guests[0]);
  const playing = waitForStatus(hostConnection.socket, 'playing');
  hostConnection.socket.send(JSON.stringify({ type: 'start' }));
  const startedRoom = await playing;
  const trusted = startedRoom.players.find((player) => player.id === host.playerId);
  if (!trusted) throw new Error('Host was missing from its own room snapshot.');
  const afterForgery = nextSnapshot(hostConnection.socket, (room) => room.elapsed > startedRoom.elapsed);
  hostConnection.socket.send(JSON.stringify({ type: 'input', left: false, right: false, dash: false, x: 777, y: 444, score: 999, captures: 999, alive: false, elapsed: 29, duration: 1, status: 'ended', result: 'forged', collision: false }));
  const authoritativeRoom = await afterForgery;
  const authoritativePlayer = authoritativeRoom.players.find((player) => player.id === host.playerId);
  if (!authoritativePlayer || authoritativePlayer.score !== trusted.score || authoritativePlayer.captures !== trusted.captures || authoritativePlayer.x === 777 || authoritativePlayer.y === 444 || !authoritativePlayer.alive || authoritativeRoom.duration !== 30 || authoritativeRoom.status !== 'playing' || authoritativeRoom.elapsed >= 2) {
    throw new Error('The room accepted client-authored score, position, collision, or clock state.');
  }
  hostConnection.socket.close(); guestConnection.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await stop(child);
  child = start(); await ready(child);
  connection = await connect(host);
  if (connection.room.status !== 'playing') throw new Error(`Restored room status was ${connection.room.status}.`);
  connection.socket.close();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await stop(child);
  const persisted = new DatabaseSync(database);
  persisted.prepare('UPDATE rooms SET updated_at = ?').run(Date.now() - 25 * 60 * 60 * 1000);
  persisted.close();
  child = start(); await ready(child);
  const afterExpiry = await fetch(`${base}/health`).then((response) => response.json());
  if (afterExpiry.rooms !== 0) throw new Error(`Expired room remained available; health reported ${afterExpiry.rooms}.`);
  let limited = null;
  for (let attempt = 0; attempt < 70; attempt += 1) { const response = await fetch(`${base}/missing`); if (response.status === 429) { limited = response; break; } }
  if (!limited || limited.headers.get('retry-after') !== '60') throw new Error('Rate limit did not return 429 with Retry-After.');
  console.log(JSON.stringify({ claims: ['@claim:server-authority', '@claim:room-persistence'], health: 200, roomCodeSamples: roomCodes.size, roomPlayers: 4, fifthPlayer: 409, reconnects: '20/20', serverRejectedForgedState: true, restartPersistence: true, expiredAfter24Hours: true, rateLimit: 429, retryAfter: 60 }));
} finally {
  if (child.exitCode === null) await stop(child);
}
