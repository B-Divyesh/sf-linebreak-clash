import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function startSolo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start solo' }).first().click();
  await expect(page.locator('[data-game-root]')).toHaveAttribute('data-state', 'playing');
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
  const storedAfter = await page.evaluate(() => localStorage.getItem('linebreak-clash:settings'));
  expect(storedAfter).toBe(storedBefore);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:')))).toEqual([]);
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

test('two independent clients join a room and finish the same round @claim:online-room', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  await host.goto(`${baseURL}/online/`);
  await host.getByLabel('Your name').first().fill('Ada');
  await host.getByRole('button', { name: 'Create a room' }).click();
  await expect(host.locator('#online-room')).toBeVisible();
  const roomCode = (await host.locator('#room-code').textContent())?.trim() ?? '';
  expect(roomCode).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  await guest.goto(`${baseURL}/online/?room=${roomCode}`);
  await guest.getByLabel('Your name').nth(1).fill('Lin');
  await guest.getByRole('button', { name: 'Join the room' }).click();
  await expect(host.getByText('Lin', { exact: true })).toBeVisible();
  await host.getByRole('button', { name: 'Start online round' }).click();
  await expect(host.locator('#online-status-text')).toHaveText('Round active');
  await expect(guest.locator('#online-status-text')).toHaveText('Round active');
  await expect(host.locator('#online-end')).toBeVisible({ timeout: 8_000 });
  await expect(guest.locator('#online-end')).toBeVisible({ timeout: 8_000 });
  expect(await host.locator('#online-result').textContent()).toMatch(/wins|draw/);
  expect(await guest.locator('#online-result').textContent()).toBe(await host.locator('#online-result').textContent());
  await host.getByRole('button', { name: 'Play another round' }).click();
  await expect(host.locator('#online-status-text')).toHaveText('Round active');
  await expect(host.locator('#online-timer')).toHaveText('00:04');
  await expect(host.locator('#online-players li b')).toHaveText(['0', '0']);
  await expect(guest.locator('#online-status-text')).toHaveText('Round active');
  await hostContext.close();
  await guestContext.close();
});

test('a real client rejoins its active room after a dropped page @claim:online-rejoin', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
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
  await guest.reload();
  await expect(guest.locator('#online-connection')).toHaveText('Connected');
  await expect(guest.locator('#room-code')).toHaveText(roomCode);
  await expect(guest.locator('#online-status-text')).toHaveText(/Round active|Round complete/);
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

test('supports touch play, pause recovery, and an expired snapshot', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 393, height: 727 }, deviceScaleFactor: 2.75, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(`${baseURL}/`);
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
  const createButton = await page.getByRole('button', { name: 'Create a room' }).boundingBox();
  expect(createButton?.height ?? 0).toBeGreaterThanOrEqual(44);
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

test('has no serious accessibility violations on every route', async ({ page }) => {
  for (const route of ['/', '/demo/', '/online/', '/privacy/', '/terms/', '/missing-page']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(serious, `${route}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
  }
});

test('respects reduced motion and clears local data with confirmation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const transition = await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(['0s', '0.00001s', '1e-05s']).toContain(transition);
  await page.evaluate(() => localStorage.setItem('linebreak-clash:settings', '{"sound":false}'));
  await page.evaluate(() => localStorage.setItem('linebreak-clash:online:ABCDEFGH', '{"token":"test"}'));
  await page.goto('/privacy/');
  await page.getByRole('button', { name: 'Clear saved game data' }).click();
  await expect(page.getByRole('dialog', { name: 'Clear saved game data?' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear data', exact: true }).click();
  await expect(page.locator('#clear-feedback')).toContainText('cleared');
  expect(await page.evaluate(() => localStorage.getItem('linebreak-clash:settings'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('linebreak-clash:online:ABCDEFGH'))).toBeNull();
});
