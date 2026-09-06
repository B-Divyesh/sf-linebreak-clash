import { describe, expect, it } from 'vitest';
import {
  ROUND_SECONDS,
  STEP_SECONDS,
  advanceGame,
  cloneSnapshot,
  createGame,
  emptyInputs,
  isValidSnapshot,
} from '../../src/game/core';

describe('deterministic game core', () => {
  it('runs a complete 90-second round and selects a result', () => {
    const game = createGame({ seed: 12, status: 'playing', mode: 'local' });
    const inputs = emptyInputs();
    const steps = Math.ceil(ROUND_SECONDS / STEP_SECONDS) + 2;
    for (let step = 0; step < steps && game.status === 'playing'; step += 1) advanceGame(game, inputs);

    expect(game.status).toBe('ended');
    expect(game.elapsed).toBe(90);
    expect(['blue', 'coral', 'draw']).toContain(game.result);
  });

  it('repeats the same run from the same seed', () => {
    const first = createGame({ seed: 9182, status: 'playing' });
    const second = createGame({ seed: 9182, status: 'playing' });
    for (let tick = 0; tick < 1_200; tick += 1) {
      const inputs = emptyInputs();
      inputs.blue.left = tick % 180 < 42;
      inputs.blue.right = tick % 180 > 138;
      inputs.blue.dash = tick % 270 === 0;
      advanceGame(first, inputs);
      advanceGame(second, inputs);
    }
    expect(cloneSnapshot(first)).toEqual(cloneSnapshot(second));
  });

  it('adds two points when a player captures a relay @claim:relay-score', () => {
    const game = createGame({ seed: 44, status: 'playing', mode: 'local' });
    const relay = game.relays[0];
    game.players.blue.x = relay.x;
    game.players.blue.y = relay.y;
    game.players.blue.previousX = relay.x;
    game.players.blue.previousY = relay.y;
    const before = game.players.blue.score;
    advanceGame(game, emptyInputs());
    expect(game.players.blue.score).toBe(before + 2);
    expect(relay.active).toBe(false);
  });

  it('lets a dash cross a trail without a collision @claim:dash-break', () => {
    const game = createGame({ seed: 45, status: 'playing', mode: 'local' });
    const blue = game.players.blue;
    blue.x = 200;
    blue.y = 200;
    blue.previousX = 200;
    blue.previousY = 200;
    blue.angle = 0;
    game.players.coral.trail = [
      { x: 201, y: 180, age: 1 },
      { x: 201, y: 220, age: 1 },
    ];
    const inputs = emptyInputs();
    inputs.blue.dash = true;
    advanceGame(game, inputs);
    expect(blue.alive).toBe(true);
    expect(blue.dashRemaining).toBeGreaterThan(0);
    expect(blue.trail).toHaveLength(0);
  });

  it('gives the other player one point when a trail collision happens @claim:collision-score', () => {
    const game = createGame({ seed: 46, status: 'playing', mode: 'local' });
    const blue = game.players.blue;
    blue.x = 200;
    blue.y = 200;
    blue.previousX = 200;
    blue.previousY = 200;
    blue.angle = 0;
    game.players.coral.trail = [
      { x: 201, y: 180, age: 1 },
      { x: 201, y: 220, age: 1 },
      { x: 201, y: 230, age: 1 },
    ];
    advanceGame(game, emptyInputs());
    expect(blue.alive).toBe(false);
    expect(game.players.coral.score).toBe(1);
    expect(blue.respawnRemaining).toBeGreaterThan(0);
  });

  it('removes old trail points from the arena @claim:trail-expiry', () => {
    const game = createGame({ seed: 47, status: 'playing', mode: 'local' });
    game.players.blue.alive = false;
    game.players.blue.respawnRemaining = 10;
    game.players.blue.trail = [{ x: 200, y: 200, age: 8.49 }];
    advanceGame(game, emptyInputs());
    expect(game.players.blue.trail).toHaveLength(0);
  });

  it('slows movement and leaves more collision space in assist mode @claim:assist-mode', () => {
    const normal = createGame({ seed: 51, status: 'playing', mode: 'local', assist: false });
    const assisted = createGame({ seed: 51, status: 'playing', mode: 'local', assist: true });
    for (const game of [normal, assisted]) {
      const blue = game.players.blue;
      Object.assign(blue, { x: 200, y: 200, previousX: 200, previousY: 200, angle: 0 });
      game.players.coral.trail = [
        { x: 207.8, y: 180, age: 1 },
        { x: 207.8, y: 220, age: 1 },
        { x: 207.8, y: 230, age: 1 },
      ];
    }

    advanceGame(normal, emptyInputs());
    advanceGame(assisted, emptyInputs());

    expect(normal.players.blue.x - 200).toBeGreaterThan(assisted.players.blue.x - 200);
    expect(normal.players.blue.alive).toBe(false);
    expect(assisted.players.blue.alive).toBe(true);
  });

  it('moves the seeded solo bot without player input', () => {
    const game = createGame({ seed: 48, status: 'playing', mode: 'solo' });
    const start = { x: game.players.coral.x, y: game.players.coral.y };
    for (let tick = 0; tick < 60; tick += 1) advanceGame(game, emptyInputs());
    expect(Math.hypot(game.players.coral.x - start.x, game.players.coral.y - start.y)).toBeGreaterThan(20);
  });

  it('rejects incomplete or malformed recovery snapshots', () => {
    expect(isValidSnapshot(null)).toBe(false);
    expect(isValidSnapshot({ version: 1, mode: 'solo' })).toBe(false);
    const game = createGame();
    game.elapsed = 91;
    expect(isValidSnapshot(game)).toBe(false);
  });
});
