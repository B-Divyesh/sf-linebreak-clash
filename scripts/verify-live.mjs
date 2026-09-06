import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = 'https://linebreak-clash.sociobot.in';
const realtimeOrigin = 'https://linebreak-clash-realtime.sociobot.in';
const evidence = '/work/.evidence/linebreak-clash';
await mkdir(evidence, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const requests = [];
const watch = (page) => {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
};

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const desktop = await desktopContext.newPage(); watch(desktop);
await desktop.goto(origin, { waitUntil: 'networkidle' });
assert.equal(await desktop.locator('h1').innerText(), 'Capture relay nodes with a moving trail');
assert.match(await desktop.locator('.audience').innerText(), /friends.*separate devices/i);
assert.equal(await desktop.getByRole('link', { name: 'Try it with sample data' }).isVisible(), true);
assert.ok((await desktop.locator('#arena').boundingBox()).y < 900);
await desktop.evaluate(() => localStorage.setItem('linebreak-clash:settings', '{"sound":false,"assist":true,"reduceEffects":true,"controls":"wasd"}'));
const realSettings = await desktop.evaluate(() => localStorage.getItem('linebreak-clash:settings'));
await desktop.getByRole('link', { name: 'Try it with sample data' }).click();
await desktop.getByText('Demo — sample data, nothing is saved').waitFor();
assert.equal(await desktop.locator('#blue-score').innerText(), '4');
assert.equal(await desktop.locator('#coral-score').innerText(), '2');
await desktop.getByRole('button', { name: 'Reset demo' }).click();
assert.equal(await desktop.locator('#blue-score').innerText(), '4');
assert.equal(await desktop.evaluate(() => localStorage.getItem('linebreak-clash:settings')), realSettings);

const phoneContext = await browser.newContext({ viewport: { width: 393, height: 727 }, screen: { width: 393, height: 727 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
const phone = await phoneContext.newPage(); watch(phone);
await phone.goto(origin, { waitUntil: 'networkidle' });
assert.equal(await phone.locator('h1').innerText(), 'Capture relay nodes with a moving trail');
assert.equal(await phone.getByRole('link', { name: 'Try it with sample data' }).isVisible(), true);
assert.ok((await phone.locator('#arena').boundingBox()).y < 727);
assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= 393));
await phone.getByRole('button', { name: 'Start solo' }).click();
await phone.waitForTimeout(3_000);
const phoneFps = await phone.evaluate(() => window.__linebreakDebug?.getFps() ?? 0);
assert.ok(phoneFps >= 50, `Measured ${phoneFps} FPS`);

const offlineContext = await browser.newContext();
const offline = await offlineContext.newPage(); watch(offline);
await offline.goto(origin);
await offline.evaluate(async () => { await navigator.serviceWorker.ready; });
await offline.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
await offlineContext.setOffline(true);
await offline.reload();
await offline.getByRole('button', { name: 'Start solo' }).click();
assert.equal(await offline.locator('[data-game-root]').getAttribute('data-state'), 'playing');
await offlineContext.close();

const reducedContext = await browser.newContext({ reducedMotion: 'reduce' });
const reduced = await reducedContext.newPage(); watch(reduced);
await reduced.goto(origin);
assert.match(await reduced.locator('.button').first().evaluate((node) => getComputedStyle(node).transitionDuration), /^(0s|0\.00001s|1e-05s)$/);
await reducedContext.close();

const hostContext = await browser.newContext();
const guestContext = await browser.newContext();
const host = await hostContext.newPage();
const guest = await guestContext.newPage();
watch(host); watch(guest);
await host.goto(`${origin}/online/`, { waitUntil: 'networkidle' });
await host.locator('#create-name').fill('Ada');
await host.getByRole('button', { name: 'Create a room' }).click();
await host.locator('#online-room').waitFor();
const roomCode = (await host.locator('#room-code').innerText()).trim();
assert.match(roomCode, /^[2-9A-HJ-NP-Z]{8}$/);
await guest.goto(`${origin}/online/?room=${roomCode}`, { waitUntil: 'networkidle' });
await guest.locator('#join-name').fill('Lin');
await guest.getByRole('button', { name: 'Join the room' }).click();
await host.locator('#online-players li').nth(1).waitFor();
await host.getByRole('button', { name: 'Start online round' }).click();
await host.waitForFunction(() => document.querySelector('#online-status-text')?.textContent === 'Round active');
await guest.waitForFunction(() => document.querySelector('#online-status-text')?.textContent === 'Round active');
await guest.waitForTimeout(5_000);
await guest.reload();
await guest.waitForFunction(() => document.querySelector('#online-connection')?.textContent === 'Connected');
assert.equal((await guest.locator('#room-code').innerText()).trim(), roomCode);
await host.locator('#online-end').waitFor({ state: 'visible', timeout: 100_000 });
await guest.locator('#online-end').waitFor({ state: 'visible', timeout: 10_000 });
assert.equal(await host.locator('#online-result').getAttribute('aria-live'), 'polite');
assert.equal(await guest.locator('#online-result').getAttribute('aria-live'), 'polite');
await host.waitForFunction(() => document.activeElement?.id === 'online-end-title');
await guest.waitForFunction(() => document.activeElement?.id === 'online-end-title');
const hostResult = (await host.locator('#online-result').innerText()).trim();
const guestResult = (await guest.locator('#online-result').innerText()).trim();
assert.match(hostResult, /wins\.|draw\./);
assert.equal(guestResult, hostResult);
await host.screenshot({ path: `${evidence}/online-end-live.png`, fullPage: true });
await host.getByRole('button', { name: 'Play another round' }).click();
await host.waitForFunction(() => document.querySelector('#online-status-text')?.textContent === 'Round active');
assert.match(await host.locator('#online-timer').innerText(), /^01:(30|29|28)$/);
assert.deepEqual(await host.locator('#online-players li b').allInnerTexts(), ['0', '0']);

const allowedOrigins = new Set([origin, realtimeOrigin]);
assert.ok(requests.every((url) => allowedOrigins.has(new URL(url).origin)), 'Unexpected runtime request origin');
assert.deepEqual(errors, []);

const result = { desktopFirstScreen: true, phoneFirstScreen: true, phoneFps, sampleScore: '4–2', sampleReset: true, realSettingsUnchanged: true, offlineReload: true, reducedMotion: true, roomCodeLength: roomCode.length, independentClients: 2, rejoinedDuringRound: true, liveRoundDurationSeconds: 90, endResult: hostResult, onlineResultAnnounced: true, onlineResultFocused: true, rematchReset: true, consoleErrors: errors.length, requestOrigins: [...new Set(requests.map((url) => new URL(url).origin))] };
await writeFile(`${evidence}/live-browser.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result));

await Promise.all([desktopContext.close(), phoneContext.close(), hostContext.close(), guestContext.close()]);
await browser.close();
