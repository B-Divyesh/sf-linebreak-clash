import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function startSolo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start solo' }).first().click();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
}

async function expectTouchTargets(page: Page): Promise<void> {
  const undersized = await page.locator('a, button').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
    })
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: (element.textContent || element.getAttribute('aria-label') || '').trim(), width: rect.width, height: rect.height };
    })
    .filter((target) => target.width < 44 || target.height < 44));
  expect(undersized).toEqual([]);
}

async function expectPopulatedRoomToFitPhone(page: Page): Promise<void> {
  const layout = await page.evaluate(() => {
    const list = document.querySelector<HTMLElement>('#online-players');
    if (!list) throw new Error('Missing player list');
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      listWidth: list.clientWidth,
      listContentWidth: list.scrollWidth,
      cards: [...list.querySelectorAll<HTMLElement>('li')].map((card) => {
        const rect = card.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
    };
  });

  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.listContentWidth).toBeLessThanOrEqual(layout.listWidth);
  expect(layout.cards).toHaveLength(2);
  expect(layout.cards.every((card) => card.left >= 0 && card.right <= layout.viewportWidth)).toBe(true);
}

test('starts the complete game without an account, ad, or payment @claim:free-entry', async ({ page }) => {
  await page.goto('/');
  await startSolo(page);
  await expect(page.locator('#game-text')).toContainText('Solo round');
  await expect(page.locator('text=/sign in|checkout|payment/i')).toHaveCount(0);
});

test('runs the accelerated deterministic 90-second round to an end screen @claim:round-end', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('#round-timer')).toHaveText('01:30');
  await startSolo(page);
  expect(await page.evaluate(() => window.__linebreakDebug?.getState().duration)).toBe(90);
  await expect(page.locator('#end-screen')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#end-result')).toContainText('wins');
  await expect(page.locator('#end-score')).toContainText('Final score:');
  await expect(page.getByRole('button', { name: 'Play again' })).toBeFocused();
  await page.screenshot({ path: 'test-results/round-end.png' });
});

test('play again resets the timer and scores @claim:restart-reset', async ({ page }) => {
  await page.goto('/?test=1');
  await startSolo(page);
  await expect(page.locator('#end-screen')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Play again' }).click();
  const restarted = await page.evaluate(() => window.__linebreakDebug?.getState());
  expect(restarted?.duration).toBe(90);
  expect(restarted?.elapsed ?? 90).toBeLessThan(5);
  expect(restarted?.players.blue.score).toBe(0);
  expect(restarted?.players.coral.score).toBe(0);
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
});

test('solo and two-player modes respond to their advertised controls @claim:play-modes', async ({ page }) => {
  await page.goto('/');
  await startSolo(page);
  const botStart = await page.evaluate(() => window.__linebreakDebug?.getState().players.coral);
  await page.waitForTimeout(450);
  const botAfter = await page.evaluate(() => window.__linebreakDebug?.getState().players.coral);
  expect(Math.hypot((botAfter?.x ?? 0) - (botStart?.x ?? 0), (botAfter?.y ?? 0) - (botStart?.y ?? 0))).toBeGreaterThan(10);

  await page.getByRole('button', { name: 'Start two players' }).first().click();
  await page.keyboard.down('KeyA');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('ArrowLeft');
  const local = await page.evaluate(() => window.__linebreakDebug?.getState());
  expect(local?.mode).toBe('local');
  expect(local?.players.blue.angle).toBeLessThan(-0.2);
  expect(local?.players.coral.angle).toBeLessThan(3);
});

test('settings persist after reload and remain applied @claim:settings-persist', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByLabel('Sound').uncheck();
  await page.getByLabel('Reduce effects').check();
  await page.getByLabel('Assist mode').check();
  await page.getByLabel('Player 1 keys').selectOption('jli');
  await page.getByRole('button', { name: 'Save and close' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await expect(page.getByLabel('Sound')).not.toBeChecked();
  await expect(page.getByLabel('Reduce effects')).toBeChecked();
  await expect(page.getByLabel('Assist mode')).toBeChecked();
  await expect(page.getByLabel('Player 1 keys')).toHaveValue('jli');
});

test('remapped Player 1 controls steer and dash during a round @claim:remapped-controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByLabel('Player 1 keys').selectOption('jli');
  await page.getByRole('button', { name: 'Save and close' }).click();
  await startSolo(page);
  const before = await page.evaluate(() => window.__linebreakDebug?.getState().players.blue.angle ?? 0);
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyJ');
  const afterTurn = await page.evaluate(() => window.__linebreakDebug?.getState().players.blue.angle ?? 0);
  expect(afterTurn).toBeLessThan(before - 0.2);
  await page.keyboard.down('KeyI');
  await page.waitForTimeout(100);
  await page.keyboard.up('KeyI');
  expect(await page.evaluate(() => window.__linebreakDebug?.getState().players.blue.dashCooldown ?? 0)).toBeGreaterThan(3.5);
});

test('the Pause button, P, and Escape pause and resume the same round @claim:pause-controls', async ({ page }) => {
  await page.goto('/');
  await startSolo(page);
  const elapsedBeforePause = await page.evaluate(() => window.__linebreakDebug?.getState().elapsed ?? 0);
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(page.getByRole('dialog', { name: 'Round paused' })).toBeVisible();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Resume round' }).click();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('dialog', { name: 'Round paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Round paused' })).toBeVisible();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'paused');
  await page.getByRole('button', { name: 'Resume round' }).click();
  expect(await page.evaluate(() => window.__linebreakDebug?.getState().elapsed ?? 0)).toBeGreaterThanOrEqual(elapsedBeforePause);
});

test('an active round recovers after a refresh within 20 seconds @claim:refresh-recovery', async ({ page }) => {
  await page.goto('/');
  await startSolo(page);
  await page.waitForTimeout(1_300);
  const before = await page.evaluate(() => window.__linebreakDebug?.getState().elapsed ?? 0);
  expect(before).toBeGreaterThan(0.8);
  await page.reload();
  const after = await page.evaluate(() => window.__linebreakDebug?.getState());
  expect(after?.status).toBe('playing');
  expect(after?.elapsed ?? 0).toBeGreaterThanOrEqual(before - 0.6);
  await expect(page.locator('#round-timer')).not.toHaveText('01:30');
});

test('sample mode loads, resets, and never changes saved game data @claim:demo-isolation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('linebreak-clash:settings', JSON.stringify({ sound: false, reduceEffects: true, assist: true }));
  });
  await page.goto('/');
  await startSolo(page);
  await page.waitForTimeout(650);
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(page.getByRole('dialog', { name: 'Round paused' })).toBeVisible();
  await page.locator('#pause-dialog').evaluate((dialog: HTMLDialogElement) => dialog.close());
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'paused');
  await page.evaluate(async () => {
    localStorage.setItem('linebreak-clash:online:ABCDEFGH', JSON.stringify({ code: 'ABCDEFGH', playerId: 'real-player', token: 'real-token' }));
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('linebreak-real-data', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('round');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction('round', 'readwrite');
        transaction.objectStore('round').put('untouched', 'active');
        transaction.oncomplete = () => { request.result.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
    const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
    if (storage.getDirectory) {
      const directory = await storage.getDirectory();
      const file = await directory.getFileHandle('real-round.txt', { create: true });
      const writable = await file.createWritable();
      await writable.write('untouched');
      await writable.close();
    }
  });
  const storageBefore = await page.evaluate(async () => {
    const local = Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]));
    const databases = (await indexedDB.databases()).map((database) => database.name).filter(Boolean).sort();
    const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
    let opfs: string[] | null = null;
    if (storage.getDirectory) {
      const directory = await storage.getDirectory();
      opfs = [];
      const entries = (directory as unknown as { entries: () => AsyncIterable<[string, unknown]> }).entries();
      for await (const [name] of entries) opfs.push(name);
      opfs.sort();
    }
    return { local, databases, opfs };
  });
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo\/$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#blue-score')).toHaveText('4');
  await expect(page.locator('#coral-score')).toHaveText('2');
  const storedBefore = await page.evaluate(() => localStorage.getItem('linebreak-clash:settings'));
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByLabel('Assist mode').check();
  await page.getByRole('button', { name: 'Save and close' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#blue-score')).toHaveText('4');
  const storageAfter = await page.evaluate(async () => {
    const local = Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)]));
    const databases = (await indexedDB.databases()).map((database) => database.name).filter(Boolean).sort();
    const storage = navigator.storage as StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> };
    let opfs: { names: string[]; text: string } | null = null;
    if (storage.getDirectory) {
      const directory = await storage.getDirectory();
      const names: string[] = [];
      const entries = (directory as unknown as { entries: () => AsyncIterable<[string, unknown]> }).entries();
      for await (const [name] of entries) names.push(name);
      const file = await directory.getFileHandle('real-round.txt');
      opfs = { names: names.sort(), text: await (await file.getFile()).text() };
    }
    return { local, databases, opfs };
  });
  expect(await page.evaluate(() => localStorage.getItem('linebreak-clash:settings'))).toBe(storedBefore);
  expect(storageAfter.local).toEqual(storageBefore.local);
  expect(storageAfter.databases).toEqual(storageBefore.databases);
  expect(storageAfter.opfs?.names ?? null).toEqual(storageBefore.opfs);
  expect(storageAfter.opfs?.text ?? null).toBe(storageBefore.opfs ? 'untouched' : null);
});

test('the seeded sample restores its visible game state on reset @claim:sample-state', async ({ page }) => {
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('#blue-score')).toHaveText('4');
  await expect(page.locator('#coral-score')).toHaveText('2');
  await expect(page.locator('#round-timer')).toHaveText('00:56');
  const initial = await page.evaluate(() => {
    const state = window.__linebreakDebug?.getState();
    if (!state) throw new Error('Sample game state is unavailable.');
    return {
      captures: state.players.blue.captures + state.players.coral.captures,
      trailCounts: [state.players.blue.trail.length, state.players.coral.trail.length],
      trails: [state.players.blue, state.players.coral].map((player) => player.trail.slice(0, 16).map(({ x, y }) => ({ x, y }))),
      relays: state.relays.map(({ id, x, y, active }) => ({ id, x, y, active })),
    };
  });
  expect(initial.captures).toBe(3);
  expect(initial.trailCounts[0]).toBeGreaterThanOrEqual(16);
  expect(initial.trailCounts[1]).toBeGreaterThanOrEqual(16);
  expect(initial.relays.filter((relay) => relay.active)).toHaveLength(3);
  const visibleTrailPixels = await page.locator('#arena').evaluate((node) => {
    const canvas = node as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!pixels) throw new Error('Sample canvas pixels are unavailable.');
    let blue = 0;
    let coral = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const [red, green, blueChannel] = [pixels[index] ?? 0, pixels[index + 1] ?? 0, pixels[index + 2] ?? 0];
      if (blueChannel > red + 50 && blueChannel > green + 30) blue += 1;
      if (red > green + 50 && red > blueChannel + 50) coral += 1;
    }
    return { blue, coral };
  });
  expect(visibleTrailPixels.blue).toBeGreaterThan(500);
  expect(visibleTrailPixels.coral).toBeGreaterThan(500);
  await page.waitForTimeout(550);
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('#blue-score')).toHaveText('4');
  await expect(page.locator('#coral-score')).toHaveText('2');
  await expect(page.locator('#round-timer')).toHaveText('00:56');
  const reset = await page.evaluate(() => {
    const state = window.__linebreakDebug?.getState();
    if (!state) throw new Error('Reset sample game state is unavailable.');
    return {
      captures: state.players.blue.captures + state.players.coral.captures,
      trailCounts: [state.players.blue.trail.length, state.players.coral.trail.length],
      trails: [state.players.blue, state.players.coral].map((player) => player.trail.slice(0, 16).map(({ x, y }) => ({ x, y }))),
      relays: state.relays.map(({ id, x, y, active }) => ({ id, x, y, active })),
    };
  });
  expect(reset.captures).toBe(3);
  expect(reset.trailCounts[0]).toBeGreaterThanOrEqual(16);
  expect(reset.trailCounts[1]).toBeGreaterThanOrEqual(16);
  expect(reset.trails).toEqual(initial.trails);
  expect(reset.relays).toEqual(initial.relays);
});

test('the sample sends no analytics, ads, or third-party requests @claim:privacy-requests', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto(`${baseURL}/demo/`);
  await page.getByRole('button', { name: 'Nice!' }).click();
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByRole('button', { name: 'Save and close' }).click();
  await page.goto(`${baseURL}/online/`);
  await page.getByRole('button', { name: 'Create a room' }).click();
  await expect(page.locator('#online-room')).toBeVisible();
  expect(requests.length).toBeGreaterThan(0);
  const allowedOrigins = new Set([new URL(baseURL ?? '').origin, 'http://127.0.0.1:8787']);
  expect(requests.every((url) => allowedOrigins.has(new URL(url).origin))).toBe(true);
  await context.close();
});

test('Copy invite puts the current room URL on the clipboard @claim:copy-invite', async ({ browser, baseURL }) => {
  const origin = baseURL ?? 'http://127.0.0.1:4173';
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  const page = await context.newPage();
  await page.goto(`${origin}/online/`);
  await page.getByRole('button', { name: 'Create a room' }).click();
  await expect(page.locator('#online-room')).toBeVisible();
  const roomCode = (await page.locator('#room-code').textContent())?.trim() ?? '';

  await page.getByRole('button', { name: 'Copy invite' }).click();

  await expect(page.locator('#online-copy-feedback')).toHaveText('Invite link copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${origin}/online/?room=${roomCode}`);
  await context.close();
});

test('online rooms provide preset reactions without an open chat or account step @claim:no-open-chat', async ({ page }) => {
  await page.goto('/online/');
  await page.getByRole('button', { name: 'Create a room' }).click();
  await expect(page.locator('#online-room')).toBeVisible();

  const writableFields = await page.locator('input:not([readonly]), textarea').evaluateAll((elements) => elements
    .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
    .map((element) => ({ tag: element.tagName, type: (element as HTMLInputElement).type })));
  expect(writableFields).toEqual([]);
  await expect(page.locator('[data-online-reaction]')).toHaveCount(3);
});

test('local and online preset reactions reach the player who sees them @claim:reaction-pings', async ({ browser, baseURL }) => {
  const origin = baseURL ?? 'http://127.0.0.1:4173';
  const localContext = await browser.newContext();
  const local = await localContext.newPage();
  await local.goto(`${origin}/`);
  await local.locator('[data-action="ping"]').first().click();
  await expect(local.locator('#reaction-ping')).toHaveText('Nice capture!');
  await expect(local.locator('#reaction-ping')).toBeVisible();

  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.goto(`${origin}/online/`);
  await host.getByRole('button', { name: 'Create a room' }).click();
  await expect(host.locator('#online-room')).toBeVisible();
  const roomCode = (await host.locator('#room-code').textContent())?.trim() ?? '';
  await guest.goto(`${origin}/online/?room=${roomCode}`);
  await guest.getByRole('button', { name: 'Join the room' }).click();
  await expect(guest.locator('#online-room')).toBeVisible();
  await expect(host.locator('#online-players li')).toHaveCount(2);

  await host.locator('[data-online-reaction="Nice!"]').click();
  await expect(guest.locator('#online-reaction')).toHaveText('Nice!');
  await expect(guest.locator('#online-reaction')).toBeVisible();
  await localContext.close();
  await hostContext.close();
  await guestContext.close();
});

test('the Reduce effects setting removes hover movement and touch vibration @claim:reduce-effects', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 393, height: 727 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const origin = baseURL ?? 'http://127.0.0.1:4173';
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value: (duration: number) => {
        const target = window as Window & { __linebreakVibrations?: number[] };
        target.__linebreakVibrations ??= [];
        target.__linebreakVibrations.push(duration);
        return true;
      },
    });
  });
  await page.goto(`${origin}/`);
  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByLabel('Reduce effects').check();
  await page.getByRole('button', { name: 'Save and close' }).click();
  const primary = page.getByRole('link', { name: 'Try it with sample data' });
  await primary.hover();
  expect(await primary.evaluate((element) => ({ transform: getComputedStyle(element).transform, transition: getComputedStyle(element).transitionDuration }))).toEqual({ transform: 'none', transition: '0s' });

  await startSolo(page);
  const turnLeft = page.getByRole('button', { name: 'Player 1 steer left' });
  await turnLeft.tap();
  expect(await page.evaluate(() => (window as Window & { __linebreakVibrations?: number[] }).__linebreakVibrations ?? [])).toEqual([]);

  await page.getByRole('button', { name: 'Open game settings' }).click();
  await page.getByLabel('Reduce effects').uncheck();
  await page.getByRole('button', { name: 'Save and close' }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.reduceEffects)).toBe('false');
  await turnLeft.tap();
  expect(await page.evaluate(() => (window as Window & { __linebreakVibrations?: number[] }).__linebreakVibrations ?? [])).toEqual([12]);
  await context.close();
});

test('solo and local rounds work offline after the first visit @claim:offline-play', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await startSolo(page);
  await expect(page.locator('#game-text')).toContainText('Solo round');
  await page.getByRole('button', { name: 'Start two players' }).first().click();
  await expect(page.locator('#game-text')).toContainText('Two-player round');
  await context.close();
});

test('the arena renders at least 50 FPS on the mobile test profile @claim:mobile-fps', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  const arena = await page.locator('#arena').boundingBox();
  expect(arena?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await startSolo(page);
  await page.waitForTimeout(3_000);
  const fps = await page.evaluate(() => window.__linebreakDebug?.getFps() ?? 0);
  expect(fps).toBeGreaterThanOrEqual(50);
  await context.close();
});

test('four independent clients finish the same 90-second room and share a rematch @claim:online-room', async ({ browser, baseURL }) => {
  test.setTimeout(40_000);
  const hostContext = await browser.newContext();
  const guestContexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const host = await hostContext.newPage();
  const guests = await Promise.all(guestContexts.map((context) => context.newPage()));
  await host.goto(`${baseURL}/online/`);
  await host.getByLabel('Your name').first().fill('Ada');
  await host.getByRole('button', { name: 'Create a room' }).click();
  await expect(host.locator('#online-room')).toBeVisible();
  const roomCode = (await host.locator('#room-code').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  for (const [index, guest] of guests.entries()) {
    await guest.goto(`${baseURL}/online/?room=${roomCode}`);
    await guest.getByLabel('Your name').nth(1).fill(['Lin', 'Jo', 'Mina'][index] ?? 'Guest');
    await guest.getByRole('button', { name: 'Join the room' }).click();
  }
  await expect(host.locator('#online-players li')).toHaveCount(4);
  await host.getByRole('button', { name: 'Start online round' }).click();
  await expect(host.locator('#online-status-text')).toHaveText('Round active');
  await expect(host.locator('#online-timer')).toHaveText('01:30');
  await Promise.all(guests.map((guest) => expect(guest.locator('#online-status-text')).toHaveText('Round active')));
  await Promise.all([host, ...guests].map((page) => expect(page.locator('#online-end')).toBeVisible({ timeout: 30_000 })));
  const results = await Promise.all([host, ...guests].map((page) => page.locator('#online-result').textContent()));
  expect(results[0]).toMatch(/wins|draw/);
  expect(new Set(results).size).toBe(1);
  await Promise.all([host, ...guests].map(async (page) => {
    await expect(page.locator('#online-result')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#online-end-title')).toBeFocused();
  }));
  await host.getByRole('button', { name: 'Play another round' }).click();
  await expect(host.locator('#online-status-text')).toHaveText('Round active');
  await expect(host.locator('#online-timer')).toHaveText('01:30');
  await expect(host.locator('#online-players li b')).toHaveText(['0', '0', '0', '0']);
  await Promise.all(guests.map((guest) => expect(guest.locator('#online-status-text')).toHaveText('Round active')));
  await hostContext.close();
  await Promise.all(guestContexts.map((context) => context.close()));
});

test('online play sends identity and controls, then receives server room state @claim:online-payloads', async ({ browser, baseURL }) => {
  const origin = baseURL ?? 'http://127.0.0.1:4173';
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const postedBodies: string[] = [];
  host.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/rooms')) postedBodies.push(request.postData() ?? '');
  });
  await host.addInitScript(() => {
    const sent: string[] = [];
    const received: string[] = [];
    const socketPrototype = WebSocket.prototype as unknown as {
      send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => void;
    };
    const send = socketPrototype.send;
    const addEventListener = socketPrototype.addEventListener;
    socketPrototype.send = function trackedSend(this: WebSocket, data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      sent.push(String(data));
      return send.call(this, data);
    };
    socketPrototype.addEventListener = function trackedAddEventListener(this: WebSocket, type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (type === 'message') addEventListener.call(this, type, (event: Event) => received.push(String((event as MessageEvent).data)), options);
      return addEventListener.call(this, type, listener, options);
    };
    Object.assign(window as Window & { __linebreakSent?: string[]; __linebreakReceived?: string[] }, { __linebreakSent: sent, __linebreakReceived: received });
  });
  await host.goto(`${origin}/online/`);
  await host.getByLabel('Your name').first().fill('Ada');
  await host.getByRole('button', { name: 'Create a room' }).click();
  await expect(host.locator('#online-room')).toBeVisible();
  const roomCode = (await host.locator('#room-code').textContent())?.trim() ?? '';
  await guest.goto(`${origin}/online/?room=${roomCode}`);
  await guest.getByRole('button', { name: 'Join the room' }).click();
  await expect(guest.locator('#online-room')).toBeVisible();
  await expect(host.locator('#online-players li')).toHaveCount(2);
  await host.getByRole('button', { name: 'Start online round' }).click();
  await expect(host.locator('#online-status-text')).toHaveText('Round active');
  await host.waitForTimeout(180);

  expect(postedBodies.map((body) => JSON.parse(body))).toEqual([{ name: 'Ada' }]);
  const frames = await host.evaluate(() => {
    const source = window as Window & { __linebreakSent?: string[]; __linebreakReceived?: string[] };
    return {
      sent: (source.__linebreakSent ?? []).map((value) => JSON.parse(value) as Record<string, unknown>),
      received: (source.__linebreakReceived ?? []).map((value) => JSON.parse(value) as Record<string, unknown>),
    };
  });
  const inputFrames = frames.sent.filter((frame) => frame.type === 'input');
  expect(frames.sent.some((frame) => frame.type === 'auth' && typeof frame.room === 'string' && typeof frame.token === 'string')).toBe(true);
  expect(inputFrames.length).toBeGreaterThan(0);
  expect(inputFrames.every((frame) => Object.keys(frame).sort().join(',') === 'dash,left,right,type')).toBe(true);
  expect(frames.received.some((frame) => {
    const room = frame.room as { elapsed?: unknown; players?: Array<{ score?: unknown }> } | undefined;
    return frame.type === 'snapshot' && typeof room?.elapsed === 'number' && typeof room.players?.[0]?.score === 'number';
  })).toBe(true);
  await hostContext.close();
  await guestContext.close();
});

test('a dropped client rejoins the active room just before its 20-second limit @claim:online-rejoin', async ({ browser, baseURL }) => {
  test.setTimeout(40_000);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  let guest = await guestContext.newPage();
  await host.goto(`${baseURL}/online/`);
  await host.getByRole('button', { name: 'Create a room' }).click();
  await expect(host.locator('#online-room')).toBeVisible();
  const roomCode = (await host.locator('#room-code').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  await guest.goto(`${baseURL}/online/?room=${roomCode}`);
  await guest.getByRole('button', { name: 'Join the room' }).click();
  await expect(host.locator('#online-players li')).toHaveCount(2);
  await host.getByRole('button', { name: 'Start online round' }).click();
  await expect(guest.locator('#online-status-text')).toHaveText('Round active');
  await guest.close();
  await expect(host.getByText('Rejoining', { exact: true })).toBeVisible();
  await host.waitForTimeout(19_150);
  guest = await guestContext.newPage();
  await guest.goto(`${baseURL}/online/?room=${roomCode}`);
  await expect(guest.locator('#online-connection')).toHaveText('Connected');
  await expect(guest.locator('#room-code')).toHaveText(roomCode);
  await expect(guest.locator('#online-status-text')).toHaveText('Round active');
  await hostContext.close();
  await guestContext.close();
});

test('an invalid online room code gives a useful recovery message', async ({ page }) => {
  await page.goto('/online/');
  await page.getByLabel('Your name').first().fill('');
  await page.getByLabel('Your name').first().pressSequentially('Ada');
  await expect(page.getByLabel('Your name').first()).toHaveValue('Ada');
  await page.getByLabel('Room code').fill('BAD');
  await page.getByRole('button', { name: 'Join the room' }).click();
  await expect(page.locator('#online-error')).toHaveText('Enter the eight-character room code.');
  await page.getByLabel('Room code').fill('22222222');
  await page.getByRole('button', { name: 'Join the room' }).click();
  await expect(page.locator('#online-error')).toHaveText('Room not found. Check the code.');
});

test('touch controls steer mobile play and visible links and controls meet the 44px target @claim:touch-controls', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 393, height: 727 }, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
  await expectTouchTargets(page);
  const arena = await page.locator('#arena').boundingBox();
  expect(arena?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(727);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  await startSolo(page);
  const angleBefore = await page.evaluate(() => window.__linebreakDebug?.getState().players.blue.angle ?? 0);
  const left = page.getByRole('button', { name: 'Player 1 steer left' });
  await left.dispatchEvent('pointerdown', { pointerId: 1 });
  await page.waitForTimeout(300);
  await left.dispatchEvent('pointerup', { pointerId: 1 });
  const angleAfter = await page.evaluate(() => window.__linebreakDebug?.getState().players.blue.angle ?? 0);
  expect(angleAfter).toBeLessThan(angleBefore - 0.2);
  await page.getByRole('button', { name: 'Pause round' }).click();
  await expect(page.getByRole('dialog', { name: 'Round paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume round' }).click();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
  await page.getByRole('button', { name: 'Pause round' }).click();
  await page.evaluate(() => {
    const raw = localStorage.getItem('linebreak-clash:round');
    if (!raw) throw new Error('Expected a saved round');
    const saved = JSON.parse(raw) as { savedAt: number };
    saved.savedAt = Date.now() - 21_000;
    localStorage.setItem('linebreak-clash:round', JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#round-timer')).toHaveText('01:30');
  await page.goto(`${baseURL}/online/`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(393);
  await expectTouchTargets(page);
  const createButton = await page.getByRole('button', { name: 'Create a room' }).boundingBox();
  expect(createButton?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.getByLabel('Your name').first().fill('Alexandra-Team-Alpha');
  await page.getByRole('button', { name: 'Create a room' }).click();
  await expect(page.locator('#online-room')).toBeVisible();
  const roomCode = (await page.locator('#room-code').textContent())?.trim() ?? '';
  const guestContext = await browser.newContext({ viewport: { width: 393, height: 727 }, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true });
  const guest = await guestContext.newPage();
  await guest.goto(`${baseURL}/online/`);
  await guest.getByLabel('Your name').last().fill('Christopher-Player-2');
  await guest.getByLabel('Room code').fill(roomCode);
  await guest.getByRole('button', { name: 'Join the room' }).click();
  await expect(page.locator('#online-players li')).toHaveCount(2);
  await expect(guest.locator('#online-players li')).toHaveCount(2);
  await expect(page.locator('#online-players')).toContainText('Alexandra-Team-Alpha');
  await expect(page.locator('#online-players')).toContainText('Christopher-Player-2');
  await expectPopulatedRoomToFitPhone(page);
  await expectPopulatedRoomToFitPhone(guest);
  await expectTouchTargets(page);
  await guestContext.close();
  await page.goto(`${baseURL}/demo/`);
  await expectTouchTargets(page);
  await page.goto(`${baseURL}/privacy/`);
  await expectTouchTargets(page);
  await page.goto(`${baseURL}/terms/`);
  await expectTouchTargets(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(`${baseURL}/`);
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  await context.close();
});

test('has keyboard focus, route titles, legal pages, and a designed missing page', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to game' })).toBeFocused();
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveTitle('Privacy — Linebreak Clash');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.goto('/online/');
  await expect(page).toHaveTitle('Online room — Linebreak Clash');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.goto('/privacy/');
  await page.getByRole('link', { name: 'Terms' }).click();
  await expect(page).toHaveTitle('Terms — Linebreak Clash');
  await page.goBack();
  await expect(page).toHaveTitle('Privacy — Linebreak Clash');
  await expect(page.locator('h1')).toBeFocused();
  await page.goto('/a-route-that-does-not-exist');
  await expect(page).toHaveTitle('Page not found — Linebreak Clash');
  await expect(page.getByRole('link', { name: 'Return to the game' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('visible focus rings contrast with both paper content and navy navigation', async ({ page }) => {
  await page.goto('/');
  const ratios = await page.evaluate(() => {
    const channel = (value: number) => {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (color: string) => {
      const match = color.match(/\d+(?:\.\d+)?/g);
      if (!match || match.length < 3) throw new Error(`Cannot read colour ${color}`);
      const [red, green, blue] = match.slice(0, 3).map(Number);
      return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
    };
    const contrast = (first: string, second: string) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const ratioFor = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      element.focus();
      if (!element.matches(':focus-visible')) throw new Error(`${selector} did not show a keyboard focus ring`);
      let background: string | null = null;
      for (let parent = element.parentElement; parent && !background; parent = parent.parentElement) {
        const candidate = getComputedStyle(parent).backgroundColor;
        if (candidate !== 'rgba(0, 0, 0, 0)' && candidate !== 'transparent') background = candidate;
      }
      if (!background) throw new Error(`Missing background for ${selector}`);
      return contrast(getComputedStyle(element).outlineColor, background);
    };
    return { content: ratioFor('.primary-choice .button'), navigation: ratioFor('.site-header nav a') };
  });
  expect(ratios.content).toBeGreaterThanOrEqual(3);
  expect(ratios.navigation).toBeGreaterThanOrEqual(3);
});

test('has no serious accessibility violations on every route', async ({ page }) => {
  for (const route of ['/', '/demo/', '/online/', '/privacy/', '/terms/', '/missing-page']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious, `${route}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});

test('respects reduced motion and clears every saved game key with confirmation @claim:clear-saved-data', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const transition = await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(['0s', '0.00001s', '1e-05s']).toContain(transition);
  await page.evaluate(() => localStorage.setItem('linebreak-clash:settings', '{"sound":false}'));
  await page.evaluate(() => localStorage.setItem('linebreak-clash:round', '{"savedAt":1}'));
  await page.evaluate(() => localStorage.setItem('linebreak-clash:online:ABCDEFGH', '{"token":"test"}'));
  await page.goto('/privacy/');
  await page.getByRole('button', { name: 'Clear saved game data' }).click();
  await expect(page.getByRole('dialog', { name: 'Clear saved game data?' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear data', exact: true }).click();
  await expect(page.locator('#clear-feedback')).toContainText('cleared');
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('linebreak-clash:')))).toEqual([]);
});
