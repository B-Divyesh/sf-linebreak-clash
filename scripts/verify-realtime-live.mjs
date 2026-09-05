import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WebSocket } from 'ws';

const run = promisify(execFile);
const base = 'https://linebreak-clash-realtime.sociobot.in';
const origin = 'https://linebreak-clash.sociobot.in';
const app = 'sf-linebreak-clash-realtime';
const group = 'sociobot';

async function post(path, name) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
  assert.equal(response.status, 201);
  return response.json();
}

async function connect(identity) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('wss://linebreak-clash-realtime.sociobot.in/ws', { origin });
    const timeout = setTimeout(() => reject(new Error('Live WebSocket timed out.')), 10_000);
    socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', room: identity.code, token: identity.token })));
    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'snapshot') { clearTimeout(timeout); resolve({ socket, room: message.room }); }
      if (message.type === 'error') { clearTimeout(timeout); reject(new Error(message.error)); }
    });
    socket.on('error', () => {});
  });
}

async function waitForStatus(socket, status) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Live room did not reach ${status}.`)), 10_000);
    const listener = (raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === 'snapshot' && message.room.status === status) {
        clearTimeout(timeout); socket.off('message', listener); resolve(message.room);
      }
    };
    socket.on('message', listener);
  });
}

const host = await post('/rooms', 'Restart host');
const guest = await post(`/rooms/${host.code}/join`, 'Restart guest');
const hostConnection = await connect(host);
const guestConnection = await connect(guest);
const playing = waitForStatus(hostConnection.socket, 'playing');
hostConnection.socket.send(JSON.stringify({ type: 'start' }));
const beforeRestart = await playing;
await new Promise((resolve) => setTimeout(resolve, 1_500));

const { stdout } = await run('az', ['containerapp', 'show', '-g', group, '-n', app, '--query', 'properties.latestReadyRevisionName', '-o', 'tsv']);
const revision = stdout.trim();
assert.ok(revision.startsWith(`${app}--`));
await run('az', ['containerapp', 'revision', 'deactivate', '-g', group, '-n', app, '--revision', revision]);
await run('az', ['containerapp', 'revision', 'activate', '-g', group, '-n', app, '--revision', revision]);

let healthy = false;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try { healthy = (await fetch(`${base}/health`)).status === 200; } catch { healthy = false; }
  if (healthy) break;
  await new Promise((resolve) => setTimeout(resolve, 1_500));
}
assert.equal(healthy, true);

const restored = await connect(host);
assert.equal(restored.room.status, 'playing');
assert.equal(restored.room.players.length, 2);
assert.ok(restored.room.elapsed >= beforeRestart.elapsed - 1);

const otherRoom = await post('/rooms', 'Other host');
let isolated = false;
try { await connect({ code: otherRoom.code, token: host.token }); } catch { isolated = true; }
assert.equal(isolated, true);

let limitedResponse = null;
for (let attempt = 0; attempt < 70; attempt += 1) {
  const response = await fetch(`${base}/missing`, { headers: { Origin: origin } });
  if (response.status === 429) { limitedResponse = response; break; }
}
assert.ok(limitedResponse);
assert.equal(limitedResponse.headers.get('retry-after'), '60');

hostConnection.socket.close(); guestConnection.socket.close(); restored.socket.close();
console.log(JSON.stringify({ health: 200, independentRoomsIsolated: true, restartPersistence: true, restoredPlayers: 2, restoredStatus: restored.room.status, liveRateLimit: 429, retryAfter: 60 }));
