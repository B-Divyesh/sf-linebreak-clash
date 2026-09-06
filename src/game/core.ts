export const STEP_SECONDS = 1 / 60;
export const ROUND_SECONDS = 90;
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 560;

export type PlayerId = 'blue' | 'coral';
export type GameMode = 'solo' | 'local';
export type GameStatus = 'ready' | 'playing' | 'paused' | 'ended';
export type GameResult = PlayerId | 'draw' | null;

export interface InputState {
  left: boolean;
  right: boolean;
  dash: boolean;
}

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface PlayerState {
  id: PlayerId;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  angle: number;
  score: number;
  captures: number;
  alive: boolean;
  respawnRemaining: number;
  dashRemaining: number;
  dashCooldown: number;
  trail: TrailPoint[];
}

export interface RelayState {
  id: number;
  x: number;
  y: number;
  active: boolean;
  respawnRemaining: number;
}

export interface GameEvent {
  kind: 'capture' | 'crash' | 'dash' | 'end';
  player?: PlayerId;
}

export interface GameState {
  version: 1;
  seed: number;
  randomState: number;
  mode: GameMode;
  duration: number;
  elapsed: number;
  tick: number;
  status: GameStatus;
  result: GameResult;
  assist: boolean;
  players: Record<PlayerId, PlayerState>;
  relays: RelayState[];
  events: GameEvent[];
}

export interface CreateGameOptions {
  seed?: number;
  mode?: GameMode;
  duration?: number;
  assist?: boolean;
  demo?: boolean;
  status?: GameStatus;
}

export type InputsByPlayer = Record<PlayerId, InputState>;

const EMPTY_INPUT: InputState = { left: false, right: false, dash: false };
const RELAY_POSITIONS = [
  [480, 112], [480, 448], [300, 280], [660, 280], [480, 280],
  [252, 142], [708, 418], [708, 142], [252, 418], [384, 210],
  [576, 350], [576, 210], [384, 350],
] as const;

function makePlayer(id: PlayerId): PlayerState {
  const blue = id === 'blue';
  const x = blue ? 132 : WORLD_WIDTH - 132;
  const y = blue ? WORLD_HEIGHT * 0.42 : WORLD_HEIGHT * 0.58;
  return {
    id,
    x,
    y,
    previousX: x,
    previousY: y,
    angle: blue ? 0 : Math.PI,
    score: 0,
    captures: 0,
    alive: true,
    respawnRemaining: 0,
    dashRemaining: 0,
    dashCooldown: 0,
    trail: [],
  };
}

function nextRandom(state: GameState): number {
  let value = state.randomState | 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.randomState = value >>> 0;
  return state.randomState / 0x1_0000_0000;
}

function placeRelay(state: GameState, relay: RelayState): void {
  const position = RELAY_POSITIONS[Math.floor(nextRandom(state) * RELAY_POSITIONS.length)] ?? RELAY_POSITIONS[0];
  relay.x = position[0];
  relay.y = position[1];
  relay.active = true;
  relay.respawnRemaining = 0;
}

export function createGame(options: CreateGameOptions = {}): GameState {
  const seed = options.seed ?? 741_903;
  const state: GameState = {
    version: 1,
    seed,
    randomState: seed >>> 0 || 1,
    mode: options.mode ?? 'solo',
    duration: options.duration ?? ROUND_SECONDS,
    elapsed: 0,
    tick: 0,
    status: options.status ?? 'ready',
    result: null,
    assist: options.assist ?? false,
    players: { blue: makePlayer('blue'), coral: makePlayer('coral') },
    relays: [
      { id: 1, x: 0, y: 0, active: true, respawnRemaining: 0 },
      { id: 2, x: 0, y: 0, active: true, respawnRemaining: 0 },
      { id: 3, x: 0, y: 0, active: true, respawnRemaining: 0 },
    ],
    events: [],
  };
  state.relays.forEach((relay) => placeRelay(state, relay));

  if (options.demo) {
    state.elapsed = Math.min(34, state.duration * 0.5);
    state.players.blue.score = 4;
    state.players.blue.captures = 2;
    state.players.coral.score = 2;
    state.players.coral.captures = 1;
    for (let index = 0; index < 16; index += 1) {
      state.players.blue.trail.push({ x: 132 + index * 12, y: 235 + Math.sin(index / 3) * 24, age: 5 - index * 0.12 });
      state.players.coral.trail.push({ x: 828 - index * 12, y: 325 - Math.sin(index / 3) * 24, age: 5 - index * 0.12 });
    }
    // Continue from the newest supplied path point. Starting at the trail's
    // origin makes the first fixed step collide with an older sample segment
    // and clears the populated sample before the player can use it.
    const blueEnd = state.players.blue.trail.at(-1)!;
    const coralEnd = state.players.coral.trail.at(-1)!;
    Object.assign(state.players.blue, { x: blueEnd.x, y: blueEnd.y, previousX: blueEnd.x, previousY: blueEnd.y, angle: 0 });
    Object.assign(state.players.coral, { x: coralEnd.x, y: coralEnd.y, previousX: coralEnd.x, previousY: coralEnd.y, angle: Math.PI });
  }
  return state;
}

function normalizeAngle(angle: number): number {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distanceToSegmentSquared(px: number, py: number, a: TrailPoint, b: TrailPoint): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared === 0) return distanceSquared(px, py, a.x, a.y);
  const projection = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / lengthSquared));
  return distanceSquared(px, py, a.x + projection * vx, a.y + projection * vy);
}

function getBotInput(state: GameState): InputState {
  const bot = state.players.coral;
  if (!bot.alive) return EMPTY_INPUT;
  let targetX = WORLD_WIDTH / 2;
  let targetY = WORLD_HEIGHT / 2;
  let nearest = Number.POSITIVE_INFINITY;
  for (const relay of state.relays) {
    if (!relay.active) continue;
    const distance = distanceSquared(bot.x, bot.y, relay.x, relay.y);
    if (distance < nearest) {
      nearest = distance;
      targetX = relay.x;
      targetY = relay.y;
    }
  }
  const wallInset = 62;
  if (bot.x < wallInset || bot.x > WORLD_WIDTH - wallInset || bot.y < wallInset || bot.y > WORLD_HEIGHT - wallInset) {
    targetX = WORLD_WIDTH / 2;
    targetY = WORLD_HEIGHT / 2;
  }
  const desired = Math.atan2(targetY - bot.y, targetX - bot.x);
  const difference = normalizeAngle(desired - bot.angle);
  return {
    left: difference < -0.035,
    right: difference > 0.035,
    dash: bot.dashCooldown <= 0 && nearest > 190 * 190 && state.tick % 180 === 0,
  };
}

function respawnPlayer(state: GameState, player: PlayerState): void {
  const blue = player.id === 'blue';
  player.x = blue ? 132 : WORLD_WIDTH - 132;
  player.y = blue ? WORLD_HEIGHT * 0.42 : WORLD_HEIGHT * 0.58;
  player.previousX = player.x;
  player.previousY = player.y;
  player.angle = blue ? 0 : Math.PI;
  player.alive = true;
  player.respawnRemaining = 0;
  player.dashRemaining = 0;
  player.trail = [];
  state.events.push({ kind: 'dash', player: player.id });
}

function crashPlayer(state: GameState, player: PlayerState): void {
  if (!player.alive) return;
  player.alive = false;
  player.respawnRemaining = state.assist ? 0.75 : 1.05;
  player.dashRemaining = 0;
  player.trail = [];
  const opponent = player.id === 'blue' ? state.players.coral : state.players.blue;
  opponent.score += 1;
  state.events.push({ kind: 'crash', player: player.id });
}

function collidesWithTrail(state: GameState, player: PlayerState): boolean {
  if (player.dashRemaining > 0) return false;
  const collisionRadiusSquared = (state.assist ? 5 : 7) ** 2;
  for (const trailOwner of Object.values(state.players)) {
    const end = trailOwner.id === player.id ? Math.max(0, trailOwner.trail.length - 12) : trailOwner.trail.length - 1;
    for (let index = 1; index < end; index += 1) {
      const a = trailOwner.trail[index - 1];
      const b = trailOwner.trail[index];
      if (a && b && distanceToSegmentSquared(player.x, player.y, a, b) < collisionRadiusSquared) return true;
    }
  }
  return false;
}

function updatePlayer(state: GameState, player: PlayerState, input: InputState): void {
  player.dashCooldown = Math.max(0, player.dashCooldown - STEP_SECONDS);
  player.dashRemaining = Math.max(0, player.dashRemaining - STEP_SECONDS);
  player.trail = player.trail
    .map((point) => ({ ...point, age: point.age + STEP_SECONDS }))
    .filter((point) => point.age < 8.5);

  if (!player.alive) {
    player.respawnRemaining -= STEP_SECONDS;
    if (player.respawnRemaining <= 0) respawnPlayer(state, player);
    return;
  }

  if (input.dash && player.dashCooldown <= 0) {
    player.dashRemaining = 0.58;
    player.dashCooldown = 4.4;
    state.events.push({ kind: 'dash', player: player.id });
  }

  const turnSpeed = state.assist ? 2.35 : 2.75;
  if (input.left !== input.right) player.angle += (input.left ? -1 : 1) * turnSpeed * STEP_SECONDS;
  player.angle = normalizeAngle(player.angle);
  player.previousX = player.x;
  player.previousY = player.y;
  const baseSpeed = state.assist ? 88 : 108;
  const speed = baseSpeed * (player.dashRemaining > 0 ? 1.8 : 1);
  player.x += Math.cos(player.angle) * speed * STEP_SECONDS;
  player.y += Math.sin(player.angle) * speed * STEP_SECONDS;

  const margin = 16;
  if (player.x < margin || player.x > WORLD_WIDTH - margin || player.y < margin || player.y > WORLD_HEIGHT - margin) {
    crashPlayer(state, player);
    return;
  }

  if (collidesWithTrail(state, player)) {
    crashPlayer(state, player);
    return;
  }

  if (player.dashRemaining <= 0) {
    const last = player.trail.at(-1);
    if (!last || distanceSquared(last.x, last.y, player.x, player.y) >= 18) {
      player.trail.push({ x: player.x, y: player.y, age: 0 });
    }
  }

  for (const relay of state.relays) {
    if (relay.active && distanceSquared(player.x, player.y, relay.x, relay.y) <= 26 * 26) {
      relay.active = false;
      relay.respawnRemaining = 1.15;
      player.score += 2;
      player.captures += 1;
      state.events.push({ kind: 'capture', player: player.id });
    }
  }
}

export function advanceGame(state: GameState, inputs: InputsByPlayer): void {
  if (state.status !== 'playing') return;
  state.events = [];
  state.tick += 1;
  state.elapsed = Math.min(state.duration, state.elapsed + STEP_SECONDS);

  for (const relay of state.relays) {
    if (!relay.active) {
      relay.respawnRemaining -= STEP_SECONDS;
      if (relay.respawnRemaining <= 0) placeRelay(state, relay);
    }
  }

  updatePlayer(state, state.players.blue, inputs.blue);
  updatePlayer(state, state.players.coral, state.mode === 'solo' ? getBotInput(state) : inputs.coral);

  if (state.elapsed >= state.duration) {
    state.status = 'ended';
    const blueScore = state.players.blue.score;
    const coralScore = state.players.coral.score;
    state.result = blueScore === coralScore ? 'draw' : blueScore > coralScore ? 'blue' : 'coral';
    state.events.push({ kind: 'end' });
  }
}

export function emptyInputs(): InputsByPlayer {
  return {
    blue: { ...EMPTY_INPUT },
    coral: { ...EMPTY_INPUT },
  };
}

export function remainingSeconds(state: GameState): number {
  return Math.max(0, Math.ceil(state.duration - state.elapsed));
}

export function cloneSnapshot(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function isValidSnapshot(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GameState>;
  return state.version === 1
    && (state.mode === 'solo' || state.mode === 'local')
    && typeof state.duration === 'number'
    && state.duration > 0
    && typeof state.elapsed === 'number'
    && state.elapsed >= 0
    && state.elapsed <= state.duration
    && !!state.players?.blue
    && !!state.players?.coral
    && Array.isArray(state.relays);
}
