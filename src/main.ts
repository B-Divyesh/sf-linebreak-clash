import './styles.css';
import { clearSavedGameData, GameController } from './game/controller';
import { OnlineController } from './online';

type Route = 'home' | 'demo' | 'online' | 'privacy' | 'terms' | 'not-found';

const appElement = document.querySelector<HTMLElement>('#app');
if (!appElement) throw new Error('The app root is missing.');
const app: HTMLElement = appElement;

let controller: GameController | null = null;
let onlineController: OnlineController | null = null;

const routeDetails: Record<Route, { title: string; canonical?: string }> = {
  home: { title: 'Linebreak Clash — Capture relay nodes', canonical: '/' },
  demo: { title: 'Demo — Linebreak Clash', canonical: '/demo/' },
  online: { title: 'Online room — Linebreak Clash', canonical: '/online/' },
  privacy: { title: 'Privacy — Linebreak Clash', canonical: '/privacy/' },
  terms: { title: 'Terms — Linebreak Clash', canonical: '/terms/' },
  'not-found': { title: 'Page not found — Linebreak Clash' },
};

function currentRoute(): Route {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/' && new URLSearchParams(location.search).get('demo') === '1') return 'demo';
  if (path === '/') return 'home';
  if (path === '/demo') return 'demo';
  if (path === '/online') return 'online';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  return 'not-found';
}

function header(): string {
  return `
    <a class="skip-link" href="#main">Skip to game</a>
    <header class="site-header">
      <a class="wordmark" href="/" data-link aria-label="Linebreak Clash home">
        <span>LINEBREAK</span><span>CLASH</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/" data-link>Play</a>
        <a href="/online/" data-link>Online</a>
        <a href="/demo/" data-link>Sample</a>
        <a href="/privacy/" data-link>Privacy</a>
      </nav>
    </header>`;
}

function footer(): string {
  return `
    <footer class="site-footer">
      <p>Capture relay nodes in a 90-second trail arena.</p>
      <nav aria-label="Footer navigation">
        <a href="/privacy/" data-link>Privacy</a>
        <a href="/terms/" data-link>Terms</a>
        <a href="https://sociobot.in" rel="external">Built by Param Factory <span class="visually-hidden">(external site)</span></a>
      </nav>
      <p class="build-id">Version 1.0.0</p>
    </footer>`;
}

function gameMarkup(): string {
  return `
    <section class="game-stage" aria-labelledby="arena-title" data-game-root data-mode="solo" data-state="ready">
      <div class="stage-heading">
        <div>
          <p class="section-kicker">90-second round</p>
          <h2 id="arena-title">Live relay arena</h2>
        </div>
        <div class="stage-actions" aria-label="Round actions">
          <button class="button compact" type="button" data-action="start-solo">Start solo</button>
          <button class="button secondary compact" type="button" data-action="start-local">Start two players</button>
          <a class="button secondary compact" href="/online/" data-link>Play online</a>
          <button class="icon-button" type="button" data-action="pause" aria-label="Pause round" disabled>Pause</button>
          <button class="icon-button" type="button" data-action="settings" aria-label="Open game settings">Settings</button>
        </div>
      </div>

      <div class="scoreboard" aria-label="Round score">
        <p class="score player-blue"><span>Player 1</span><strong id="blue-score">0</strong></p>
        <p class="timer"><span>Time</span><strong id="round-timer">01:30</strong></p>
        <p class="score player-coral"><span id="coral-label">Bot</span><strong id="coral-score">0</strong></p>
        <p class="fps" id="fps-value" aria-label="Current rendered frames per second">60 FPS</p>
      </div>

      <div class="arena-wrap">
        <canvas id="arena" width="960" height="560" role="img" aria-label="Ready relay arena with three numbered relay nodes"></canvas>
        <p id="reaction-ping" class="reaction-ping" role="status" hidden></p>
        <section id="end-screen" class="end-screen" aria-labelledby="end-title" hidden>
          <p class="section-kicker">Round result</p>
          <h2 id="end-title">Round complete</h2>
          <p id="end-result">Player 1 wins.</p>
          <p id="end-score">Final score: 0–0.</p>
          <div class="button-row">
            <button class="button" type="button" data-action="play-again">Play again</button>
            <button class="button secondary" type="button" data-action="start-local">Start two players</button>
          </div>
        </section>
      </div>

      <p id="game-text" class="visually-hidden">Ready arena. Start a solo or two-player round.</p>
      <p id="game-status-live" class="visually-hidden" aria-live="polite" aria-atomic="true"></p>

      <div class="controls-and-pings">
        <div class="control-guide">
          <p id="blue-control-guide"><strong>Player 1</strong> A/D steer · Space dashes</p>
          <p class="player-two-guide"><strong>Player 2</strong> ←/→ steer · Enter dashes</p>
        </div>
        <div class="ping-list" aria-label="Reaction pings">
          <span>Send a reaction</span>
          <button type="button" data-action="ping" data-ping="Nice capture!">Nice!</button>
          <button type="button" data-action="ping" data-ping="That was close!">Close!</button>
          <button type="button" data-action="ping" data-ping="Play again!">Again!</button>
        </div>
      </div>

      <div class="touch-controls" aria-label="Touch controls for player 1">
        <button type="button" data-touch-player="blue" data-touch-control="left" aria-label="Player 1 steer left">Turn left</button>
        <button class="dash-control" type="button" data-touch-player="blue" data-touch-control="dash" aria-label="Player 1 dash">Dash</button>
        <button type="button" data-touch-player="blue" data-touch-control="right" aria-label="Player 1 steer right">Turn right</button>
      </div>
      <div class="touch-controls touch-p2" aria-label="Touch controls for player 2">
        <button type="button" data-touch-player="coral" data-touch-control="left" aria-label="Player 2 steer left">P2 left</button>
        <button class="dash-control coral" type="button" data-touch-player="coral" data-touch-control="dash" aria-label="Player 2 dash">P2 dash</button>
        <button type="button" data-touch-player="coral" data-touch-control="right" aria-label="Player 2 steer right">P2 right</button>
      </div>

      <dialog id="pause-dialog" aria-labelledby="pause-title">
        <form method="dialog" class="dialog-panel">
          <p class="section-kicker">Current round</p>
          <h2 id="pause-title">Round paused</h2>
          <p>The timer and trails will stay where they are.</p>
          <div class="dialog-actions">
            <button class="button" type="button" data-action="resume">Resume round</button>
            <button class="button secondary" type="button" data-action="restart">Restart round</button>
          </div>
        </form>
      </dialog>

      <dialog id="settings-dialog" aria-labelledby="settings-title">
        <div class="dialog-panel">
          <p class="section-kicker">Game settings</p>
          <h2 id="settings-title">Adjust the round</h2>
          <div class="setting-list">
            <label><span><strong>Sound</strong><small>Play short capture and collision tones.</small></span><input id="setting-sound" type="checkbox"></label>
            <label><span><strong>Reduce effects</strong><small>Remove panel movement and vibration.</small></span><input id="setting-motion" type="checkbox"></label>
            <label><span><strong>Assist mode</strong><small>Slow both trails and add collision space.</small></span><input id="setting-assist" type="checkbox"></label>
            <label><span><strong>Player 1 keys</strong><small>Choose a comfortable steering set.</small></span><select id="setting-controls"><option value="wasd">A / D / Space</option><option value="jli">J / L / I</option></select></label>
          </div>
          <button class="button" type="button" data-action="close-settings">Save and close</button>
        </div>
      </dialog>
    </section>`;
}

function homePage(): string {
  return `
    ${header()}
    <main id="main">
      <section class="first-screen">
        <div class="intro-panel">
          <p class="product-label">Linebreak Clash</p>
          <h1 tabindex="-1">Capture relay nodes with a moving trail</h1>
          <p class="audience">For friends who want a quick browser arena on one screen or separate devices.</p>
          <div class="primary-choice">
            <a class="button" href="/demo/" data-link>Try it with sample data</a>
            <span>Loads a seeded round you can play now.</span>
          </div>
          <ul class="plain-facts" aria-label="Game facts">
            <li>Free to play.</li>
            <li>No account or ads.</li>
            <li>Solo and local rounds work offline after the first visit.</li>
          </ul>
        </div>
        ${gameMarkup()}
      </section>

      <section class="how-section" id="how" aria-labelledby="how-title">
        <p class="section-number" aria-hidden="true">01</p>
        <div>
          <h2 id="how-title">How to play</h2>
          <ol class="steps">
            <li><strong>Capture numbered nodes.</strong><span>Steer through a relay to add two points.</span></li>
            <li><strong>Break your trail.</strong><span>Press dash to stop drawing briefly and cross any trail.</span></li>
            <li><strong>Win the round.</strong><span>Finish 90 seconds with more points than the other trail.</span></li>
          </ol>
        </div>
      </section>

      <section class="limits-section" aria-labelledby="limits-title">
        <p class="section-number" aria-hidden="true">02</p>
        <div>
          <h2 id="limits-title">What this release includes</h2>
          <p>This release has solo, local two-player, and private online modes.</p>
          <p>Online rooms connect two to four players on separate devices.</p>
          <p>Settings and an active round stay in this browser.</p>
          <p>The sample never reads or changes saved game data.</p>
        </div>
      </section>
    </main>
    ${footer()}`;
}

function onlinePage(): string {
  return `
    ${header()}
    <main id="main" class="online-main">
      <section class="online-intro">
        <p class="product-label">Private online room</p>
        <h1 tabindex="-1">Join a room and capture relay nodes</h1>
        <p>For two to four friends playing a 90-second round on separate devices.</p>
        <p class="online-privacy">No account or open chat. A dropped player can rejoin for 20 seconds.</p>
      </section>
      <section id="online-entry" class="online-entry" aria-labelledby="entry-title">
        <h2 id="entry-title">Create or join a room</h2>
        <form id="create-room">
          <label for="create-name">Your name</label>
          <input id="create-name" name="name" maxlength="20" value="Host" autocomplete="nickname" required>
          <button class="button" type="submit">Create a room</button>
        </form>
        <p class="form-divider">or</p>
        <form id="join-room" novalidate>
          <label for="join-name">Your name</label>
          <input id="join-name" name="name" maxlength="20" value="Player 2" autocomplete="nickname" required>
          <label for="join-code">Room code</label>
          <input id="join-code" name="room" minlength="8" maxlength="8" inputmode="text" autocomplete="off" required aria-describedby="room-code-help online-error">
          <small id="room-code-help">Enter the eight characters shared by the host.</small>
          <button class="button secondary" type="submit">Join the room</button>
        </form>
      </section>
      <p id="online-error" class="form-error" role="alert"></p>
      <section id="online-room" class="online-room" aria-labelledby="online-arena-title" hidden>
        <div class="room-header">
          <div><p class="section-kicker">Room <strong id="room-code">--------</strong></p><h2 id="online-arena-title">Online relay arena</h2></div>
          <div class="connection-actions"><p id="online-connection" class="connection-status" aria-live="polite">Not connected</p><button id="leave-online" class="text-button" type="button">Leave room</button></div>
        </div>
        <div class="invite-row">
          <label for="invite-link">Invite link</label>
          <input id="invite-link" readonly>
          <button class="button secondary compact" type="button" id="copy-room">Copy invite</button>
        </div>
        <ul id="online-players" class="online-players" aria-label="Players in this room"></ul>
        <div class="online-round-bar">
          <p><strong id="online-status-text">Waiting for players</strong><span id="online-timer">01:30</span></p>
          <button class="button" type="button" id="start-online" disabled>Start online round</button>
          <span id="online-wait-note">Share the room code. Two players are needed to start.</span>
        </div>
        <div class="arena-wrap online-canvas-wrap">
          <canvas id="online-arena" width="960" height="560" role="img" aria-label="Waiting online arena"></canvas>
          <p id="online-reaction" class="reaction-ping" role="status" hidden></p>
          <section id="online-end" class="end-screen" aria-labelledby="online-end-title" hidden><p class="section-kicker">Round result</p><h2 id="online-end-title">Round complete</h2><p id="online-result"></p><button class="button" type="button" id="restart-online">Play another round</button><p id="online-restart-note"></p></section>
        </div>
        <div class="online-controls" aria-label="Online steering controls">
          <button type="button" data-online-control="left">Turn left</button>
          <button type="button" data-online-control="dash">Dash</button>
          <button type="button" data-online-control="right">Turn right</button>
        </div>
        <div class="ping-list online-pings" aria-label="Preset reactions"><span>Send a reaction</span><button type="button" data-online-reaction="Nice!">Nice!</button><button type="button" data-online-reaction="Close!">Close!</button><button type="button" data-online-reaction="Again!">Again!</button></div>
      </section>
    </main>
    ${footer()}`;
}

function demoPage(): string {
  return `
    ${header()}
    <aside class="demo-banner" aria-label="Sample mode">
      <strong>Demo — sample data, nothing is saved</strong>
      <div>
        <button type="button" class="text-button" id="reset-demo">Reset demo</button>
        <a class="text-button" href="/" data-link>Start for real</a>
      </div>
    </aside>
    <main id="main" class="demo-main">
      <section class="demo-intro">
        <p class="product-label">Seed 620431 · Sample score loaded</p>
        <h1 tabindex="-1">Play a sample relay round</h1>
        <p>Steer Player 1 with A and D, then press Space to cross a trail.</p>
      </section>
      ${gameMarkup()}
      <section class="demo-notes" aria-labelledby="sample-title">
        <h2 id="sample-title">What the sample contains</h2>
        <p>The seeded round starts after three relay captures with 56 seconds left.</p>
        <p>Reset restores the same score, trails, relay positions, and timer.</p>
      </section>
    </main>
    ${footer()}`;
}

function privacyPage(): string {
  return `
    ${header()}
    <main id="main" class="text-page">
      <p class="product-label">Privacy</p>
      <h1 tabindex="-1">See what stays in your browser</h1>
      <p class="page-lede">Linebreak Clash does not need an account and does not use analytics or ads.</p>
      <section aria-labelledby="stored-title">
        <h2 id="stored-title">Data stored on this device</h2>
        <p>The game stores sound, motion, and assist settings in local storage.</p>
        <p>An active round is stored for 20 seconds so a quick refresh can recover it.</p>
        <p>An online room key is stored so you can rejoin the same room.</p>
        <p>The sample runs in memory. It does not read or change saved settings or rounds.</p>
      </section>
      <section aria-labelledby="sent-title">
        <h2 id="sent-title">Data sent elsewhere</h2>
        <p>Online play sends your chosen name, controls, scores, and room state to this product's room service.</p>
        <p>The room service uses a private SQLite database so a room survives a service restart.</p>
        <p>Inactive room records are removed after 24 hours.</p>
        <p>No data goes to analytics, advertising, or third-party game services.</p>
        <p>The hosting service receives standard web requests needed to deliver the game.</p>
      </section>
      <section aria-labelledby="control-title">
        <h2 id="control-title">Clear your data</h2>
        <p>You can clear all Linebreak Clash settings, round data, and online room keys here.</p>
        <button class="button danger" type="button" id="open-clear-data">Clear saved game data</button>
        <p id="clear-feedback" role="status" aria-live="polite"></p>
      </section>
      <section aria-labelledby="request-title">
        <h2 id="request-title">Privacy questions</h2>
        <p>There is no account record to access or delete.</p>
        <p>Email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> with a room code if you want its record removed early.</p>
      </section>
      <p class="effective-date">Effective 5 September 2026.</p>
    </main>
    <dialog id="clear-data-dialog" aria-labelledby="clear-data-title">
      <form method="dialog" class="dialog-panel">
        <h2 id="clear-data-title">Clear saved game data?</h2>
        <p>This removes settings, any active round, and online room keys from this browser.</p>
        <div class="dialog-actions">
          <button class="button danger" value="confirm">Clear data</button>
          <button class="button secondary" value="cancel">Keep data</button>
        </div>
      </form>
    </dialog>
    ${footer()}`;
}

function termsPage(): string {
  return `
    ${header()}
    <main id="main" class="text-page">
      <p class="product-label">Terms</p>
      <h1 tabindex="-1">Read the rules for playing</h1>
      <p class="page-lede">Linebreak Clash is a free browser game for general audiences.</p>
      <section aria-labelledby="use-title">
        <h2 id="use-title">Use the game fairly</h2>
        <p>You may play, share the site, and use the source under its MIT license.</p>
        <p>Do not disrupt the site or try to make it unavailable to other players.</p>
      </section>
      <section aria-labelledby="availability-title">
        <h2 id="availability-title">Availability</h2>
        <p>The game is provided as available, without a promise of uninterrupted service.</p>
        <p>Local settings can be lost when browser storage is cleared.</p>
      </section>
      <section aria-labelledby="responsibility-title">
        <h2 id="responsibility-title">Responsibility</h2>
        <p>Use the game at your own risk where the law permits.</p>
        <p>These terms do not remove rights that local law gives you.</p>
      </section>
      <p class="effective-date">Effective 5 September 2026.</p>
    </main>
    ${footer()}`;
}

function notFoundPage(): string {
  return `
    ${header()}
    <main id="main" class="not-found-page">
      <div class="broken-route" aria-hidden="true"><span></span><i>?</i><span></span></div>
      <p class="product-label">Error 404</p>
      <h1 tabindex="-1">Find the game from the home page</h1>
      <p>This address does not match a Linebreak Clash page.</p>
      <a class="button" href="/" data-link>Return to the game</a>
    </main>
    ${footer()}`;
}

function updateHead(route: Route): void {
  const details = routeDetails[route];
  document.title = details.title;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical && details.canonical) canonical.href = `https://linebreak-clash.sociobot.in${details.canonical}`;
}

function bindPageActions(route: Route): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      history.pushState({}, '', url.pathname + url.search + url.hash);
      render(true);
    });
  });

  if (route === 'home' || route === 'demo') {
    controller = new GameController(app, route === 'demo');
  }
  if (route === 'online') onlineController = new OnlineController(app);
  if (route === 'demo') {
    document.querySelector<HTMLButtonElement>('#reset-demo')?.addEventListener('click', () => controller?.resetDemo());
  }
  if (route === 'privacy') {
    const dialog = document.querySelector<HTMLDialogElement>('#clear-data-dialog');
    document.querySelector<HTMLButtonElement>('#open-clear-data')?.addEventListener('click', () => dialog?.showModal());
    dialog?.addEventListener('close', () => {
      if (dialog.returnValue !== 'confirm') return;
      clearSavedGameData();
      const feedback = document.querySelector<HTMLElement>('#clear-feedback');
      if (feedback) feedback.textContent = 'Saved game data cleared from this browser.';
    });
  }
}

function render(focusHeading = false): void {
  controller?.destroy();
  controller = null;
  onlineController?.destroy();
  onlineController = null;
  const route = currentRoute();
  updateHead(route);
  app.innerHTML = route === 'home'
    ? homePage()
    : route === 'demo'
      ? demoPage()
      : route === 'online'
        ? onlinePage()
      : route === 'privacy'
        ? privacyPage()
        : route === 'terms'
          ? termsPage()
          : notFoundPage();
  bindPageActions(route);
  if (focusHeading) {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('h1')?.focus();
    const announcement = `${document.querySelector('h1')?.textContent ?? ''} page loaded.`;
    const region = document.querySelector<HTMLElement>('#route-announcer');
    if (region) region.textContent = announcement;
  }
}

const announcer = document.createElement('div');
announcer.id = 'route-announcer';
announcer.className = 'visually-hidden';
announcer.setAttribute('aria-live', 'polite');
document.body.append(announcer);

window.addEventListener('popstate', () => render(true));
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // The game still works when private browsing blocks service workers.
    });
  });
}
