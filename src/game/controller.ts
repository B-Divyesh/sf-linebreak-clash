import {
  STEP_SECONDS,
  cloneSnapshot,
  createGame,
  emptyInputs,
  isValidSnapshot,
  remainingSeconds,
  type GameMode,
  type GameState,
  type InputsByPlayer,
  type InputState,
  type PlayerId,
} from './core';
import { GameAudio } from './audio';
import { ArenaRenderer } from './renderer';

export interface Settings {
  sound: boolean;
  reduceEffects: boolean;
  assist: boolean;
  controls: 'wasd' | 'jli';
}

interface SavedRound {
  savedAt: number;
  state: GameState;
}

interface DebugApi {
  getState: () => GameState;
  getFps: () => number;
}

declare global {
  interface Window { __linebreakDebug?: DebugApi }
}

const SETTINGS_KEY = 'linebreak-clash:settings';
const ROUND_KEY = 'linebreak-clash:round';
const DEFAULT_SETTINGS: Settings = { sound: true, reduceEffects: false, assist: false, controls: 'wasd' };

export class GameController {
  private state: GameState;
  private readonly renderer: ArenaRenderer;
  private readonly audio: GameAudio;
  private readonly inputs: InputsByPlayer = emptyInputs();
  private readonly isDemo: boolean;
  private settings: Settings;
  private animationFrame = 0;
  private previousTime = performance.now();
  private accumulator = 0;
  private lastUiSecond = -1;
  private lastSavedAt = 0;
  private frameTimes: number[] = [];
  private fps = 0;
  private settingsWasPlaying = false;
  private pausedByVisibility = false;
  private readonly timeScale = new URLSearchParams(location.search).get('test') === '1' ? 18 : 1;
  private resizeObserver: ResizeObserver;

  private readonly canvas: HTMLCanvasElement;
  private readonly gameRoot: HTMLElement;
  private readonly endScreen: HTMLElement;
  private readonly pauseDialog: HTMLDialogElement;
  private readonly settingsDialog: HTMLDialogElement;
  private readonly statusLive: HTMLElement;

  constructor(private readonly root: HTMLElement, isDemo: boolean) {
    this.isDemo = isDemo;
    this.gameRoot = this.require<HTMLElement>('[data-game-root]');
    this.canvas = this.require<HTMLCanvasElement>('#arena');
    this.endScreen = this.require<HTMLElement>('#end-screen');
    this.pauseDialog = this.require<HTMLDialogElement>('#pause-dialog');
    this.settingsDialog = this.require<HTMLDialogElement>('#settings-dialog');
    this.statusLive = this.require<HTMLElement>('#game-status-live');
    this.settings = isDemo ? { ...DEFAULT_SETTINGS, sound: false } : this.readSettings();
    this.state = createGame({ assist: this.settings.assist });
    this.renderer = new ArenaRenderer(this.canvas);
    this.audio = new GameAudio(this.settings.sound);
    this.resizeObserver = new ResizeObserver(() => this.renderer.resize());
    this.resizeObserver.observe(this.canvas);
    this.bindEvents();
    this.syncSettingsForm();
    this.restoreOrRender();
    this.animationFrame = requestAnimationFrame(this.loop);
    window.__linebreakDebug = {
      getState: () => cloneSnapshot(this.state),
      getFps: () => this.fps,
    };
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    window.__linebreakDebug = undefined;
  }

  start(mode: GameMode, demo = this.isDemo): void {
    this.state = createGame({
      seed: demo ? 620_431 : Math.floor(Math.random() * 0xffff_ffff),
      mode,
      duration: 90,
      assist: this.settings.assist,
      demo,
      status: 'playing',
    });
    this.gameRoot.dataset.mode = mode;
    this.gameRoot.dataset.state = 'playing';
    this.endScreen.hidden = true;
    this.previousTime = performance.now();
    this.accumulator = 0;
    this.announce(`${mode === 'solo' ? 'Solo' : 'Two-player'} round started. Capture the numbered relay nodes.`);
    this.updateUi(true);
    if (!demo) this.canvas.scrollIntoView({ behavior: this.settings.reduceEffects ? 'auto' : 'smooth', block: 'nearest' });
    if (!demo) this.saveRound();
  }

  resetDemo(): void {
    if (!this.isDemo) return;
    this.start('solo', true);
    this.announce('Sample round reset. The sample score and trail are restored.');
  }

  private require<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing game element: ${selector}`);
    return element;
  }

  private readSettings(): Settings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return { ...DEFAULT_SETTINGS, reduceEffects: matchMedia('(prefers-reduced-motion: reduce)').matches };
      const value = JSON.parse(stored) as Partial<Settings>;
      return {
        sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_SETTINGS.sound,
        reduceEffects: typeof value.reduceEffects === 'boolean' ? value.reduceEffects : DEFAULT_SETTINGS.reduceEffects,
        assist: typeof value.assist === 'boolean' ? value.assist : DEFAULT_SETTINGS.assist,
        controls: value.controls === 'jli' ? 'jli' : 'wasd',
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private restoreOrRender(): void {
    if (this.isDemo) {
      this.start('solo', true);
      return;
    }
    try {
      const raw = localStorage.getItem(ROUND_KEY);
      const saved = raw ? JSON.parse(raw) as SavedRound : null;
      if (saved && Date.now() - saved.savedAt <= 20_000 && isValidSnapshot(saved.state) && saved.state.status === 'playing') {
        this.state = saved.state;
        this.state.status = 'playing';
        this.gameRoot.dataset.mode = this.state.mode;
        this.gameRoot.dataset.state = 'playing';
        this.announce('Round restored after refresh.');
      } else if (raw) {
        localStorage.removeItem(ROUND_KEY);
      }
    } catch {
      localStorage.removeItem(ROUND_KEY);
    }
    this.updateUi(true);
    this.renderer.render(this.state);
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'start-solo') this.start('solo', this.isDemo);
      if (action === 'start-local') this.start('local', this.isDemo);
      if (action === 'play-again') this.start(this.state.mode, this.isDemo);
      if (action === 'pause') this.openPause();
      if (action === 'resume') this.closePause();
      if (action === 'restart') this.confirmRestart();
      if (action === 'settings') this.openSettings();
      if (action === 'close-settings') this.closeSettings();
      if (action === 'ping') this.sendPing(button.dataset.ping ?? 'Nice round!');
    });

    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: false });
    this.bindTouchControls();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state.status === 'playing') {
          this.pausedByVisibility = true;
          this.pause(false);
        }
      } else if (this.pausedByVisibility && this.state.status === 'paused') {
        this.pausedByVisibility = false;
        this.state.status = 'playing';
        this.gameRoot.dataset.state = 'playing';
        this.previousTime = performance.now();
        this.announce('Round resumed after returning to the tab.');
      }
    });
    this.pauseDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.closePause();
    });
    this.settingsDialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.closeSettings();
    });
    this.require<HTMLInputElement>('#setting-sound').addEventListener('change', () => this.applySettings());
    this.require<HTMLInputElement>('#setting-motion').addEventListener('change', () => this.applySettings());
    this.require<HTMLInputElement>('#setting-assist').addEventListener('change', () => this.applySettings());
    this.require<HTMLSelectElement>('#setting-controls').addEventListener('change', () => this.applySettings());
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat && (event.code === 'Space' || event.code === 'Enter')) return;
    if (event.code === 'KeyP' || event.code === 'Escape') {
      if (this.settingsDialog.open) return;
      if (this.state.status === 'playing') this.openPause();
      else if (this.state.status === 'paused' && this.pauseDialog.open) this.closePause();
      return;
    }
    if (this.state.status !== 'playing') return;
    const handled = this.setKey(event.code, true);
    if (handled) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    const handled = this.setKey(event.code, false);
    if (handled && this.state.status === 'playing') event.preventDefault();
  };

  private setKey(code: string, pressed: boolean): boolean {
    const mapping: Record<string, [PlayerId, keyof InputsByPlayer['blue']]> = {
      ArrowLeft: ['coral', 'left'], ArrowRight: ['coral', 'right'], Enter: ['coral', 'dash'],
    };
    if (this.settings.controls === 'jli') {
      mapping.KeyJ = ['blue', 'left'];
      mapping.KeyL = ['blue', 'right'];
      mapping.KeyI = ['blue', 'dash'];
    } else {
      mapping.KeyA = ['blue', 'left'];
      mapping.KeyD = ['blue', 'right'];
      mapping.Space = ['blue', 'dash'];
    }
    const action = mapping[code];
    if (!action) return false;
    this.inputs[action[0]][action[1]] = pressed;
    return true;
  }

  private bindTouchControls(): void {
    this.root.querySelectorAll<HTMLButtonElement>('[data-touch-player]').forEach((button) => {
      const player = button.dataset.touchPlayer as PlayerId;
      const control = button.dataset.touchControl as keyof InputState;
      const set = (pressed: boolean) => {
        this.inputs[player][control] = pressed;
        if (pressed && navigator.vibrate && !this.settings.reduceEffects) navigator.vibrate(12);
      };
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true); });
      button.addEventListener('pointerup', () => set(false));
      button.addEventListener('pointercancel', () => set(false));
      button.addEventListener('lostpointercapture', () => set(false));
    });
  }

  private loop = (now: number): void => {
    const frameDelta = Math.min(0.1, (now - this.previousTime) / 1000);
    this.previousTime = now;
    this.frameTimes.push(now);
    while ((this.frameTimes[0] ?? now) < now - 2_000) this.frameTimes.shift();
    if (this.frameTimes.length > 2) this.fps = (this.frameTimes.length - 1) * 1000 / (now - (this.frameTimes[0] ?? now));

    if (this.state.status === 'playing') {
      this.accumulator += frameDelta * this.timeScale;
      while (this.accumulator >= STEP_SECONDS) {
        this.step();
        this.accumulator -= STEP_SECONDS;
        if ((this.state.status as string) === 'ended' && this.endScreen.hidden) this.showEndScreen();
      }
      if (!this.isDemo && now - this.lastSavedAt > 500) this.saveRound();
    }
    this.renderer.render(this.state, this.accumulator / STEP_SECONDS);
    this.updateUi(false);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private step(): void {
    const { advanceGame } = requireCoreAdvance;
    advanceGame(this.state, this.inputs);
    for (const event of this.state.events) {
      if (event.kind === 'capture') {
        this.audio.play('capture');
        this.announce(`${event.player === 'blue' ? 'Player 1' : this.state.mode === 'solo' ? 'Bot' : 'Player 2'} captured a relay.`);
      }
      if (event.kind === 'crash') {
        this.audio.play('crash');
        this.announce(`${event.player === 'blue' ? 'Player 1' : this.state.mode === 'solo' ? 'Bot' : 'Player 2'} hit a trail and will restart.`);
      }
    }
  }

  private updateUi(force: boolean): void {
    const seconds = remainingSeconds(this.state);
    if (!force && seconds === this.lastUiSecond) {
      this.require<HTMLElement>('#fps-value').textContent = `${Math.round(this.fps || 60)} FPS`;
      return;
    }
    this.lastUiSecond = seconds;
    this.require<HTMLElement>('#round-timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    this.require<HTMLElement>('#blue-score').textContent = String(this.state.players.blue.score);
    this.require<HTMLElement>('#coral-score').textContent = String(this.state.players.coral.score);
    this.require<HTMLElement>('#coral-label').textContent = this.state.mode === 'solo' ? 'Bot' : 'Player 2';
    this.require<HTMLElement>('#fps-value').textContent = `${Math.round(this.fps || 60)} FPS`;
    this.require<HTMLButtonElement>('[data-action="pause"]').disabled = this.state.status !== 'playing';
    const summary = `${this.state.mode === 'solo' ? 'Solo' : 'Two-player'} round. Player 1 position ${Math.round(this.state.players.blue.x)}, ${Math.round(this.state.players.blue.y)}. ${this.state.mode === 'solo' ? 'Bot' : 'Player 2'} position ${Math.round(this.state.players.coral.x)}, ${Math.round(this.state.players.coral.y)}. Score ${this.state.players.blue.score} to ${this.state.players.coral.score}. ${seconds} seconds left. ${this.state.relays.filter((relay) => relay.active).length} relays active.`;
    this.require<HTMLElement>('#game-text').textContent = summary;
    this.canvas.setAttribute('aria-label', summary);
  }

  private showEndScreen(): void {
    if (!this.isDemo) localStorage.removeItem(ROUND_KEY);
    const blue = this.state.players.blue.score;
    const coral = this.state.players.coral.score;
    const resultText = this.state.result === 'draw'
      ? 'The round is a draw.'
      : this.state.result === 'blue'
        ? 'Player 1 wins.'
        : `${this.state.mode === 'solo' ? 'The bot' : 'Player 2'} wins.`;
    this.require<HTMLElement>('#end-result').textContent = resultText;
    this.require<HTMLElement>('#end-score').textContent = `Final score: ${blue}–${coral}. Player 1 captured ${this.state.players.blue.captures} relays.`;
    this.endScreen.hidden = false;
    this.gameRoot.dataset.state = 'ended';
    this.audio.play('end');
    this.announce(`Round complete. ${resultText} Final score ${blue} to ${coral}.`);
    this.require<HTMLButtonElement>('[data-action="play-again"]').focus();
  }

  private openPause(): void {
    if (this.state.status !== 'playing') return;
    this.pause(true);
    this.pauseDialog.showModal();
  }

  private pause(announce: boolean): void {
    if (this.state.status !== 'playing') return;
    this.state.status = 'paused';
    this.gameRoot.dataset.state = 'paused';
    if (!this.isDemo) this.saveRound('playing');
    if (announce) this.announce('Round paused.');
  }

  private closePause(): void {
    if (this.pauseDialog.open) this.pauseDialog.close();
    if (this.state.status === 'paused') {
      this.state.status = 'playing';
      this.gameRoot.dataset.state = 'playing';
      this.previousTime = performance.now();
      this.announce('Round resumed.');
    }
  }

  private confirmRestart(): void {
    if (window.confirm('Restart this round? The current score will be cleared.')) {
      if (this.pauseDialog.open) this.pauseDialog.close();
      this.start(this.state.mode, this.isDemo);
    }
  }

  private openSettings(): void {
    this.settingsWasPlaying = this.state.status === 'playing';
    if (this.settingsWasPlaying) this.pause(false);
    this.syncSettingsForm();
    this.settingsDialog.showModal();
  }

  private closeSettings(): void {
    if (this.settingsDialog.open) this.settingsDialog.close();
    if (this.settingsWasPlaying && this.state.status === 'paused') {
      this.state.status = 'playing';
      this.gameRoot.dataset.state = 'playing';
      this.previousTime = performance.now();
    }
    this.settingsWasPlaying = false;
  }

  private syncSettingsForm(): void {
    this.require<HTMLInputElement>('#setting-sound').checked = this.settings.sound;
    this.require<HTMLInputElement>('#setting-motion').checked = this.settings.reduceEffects;
    this.require<HTMLInputElement>('#setting-assist').checked = this.settings.assist;
    this.require<HTMLSelectElement>('#setting-controls').value = this.settings.controls;
    this.updateControlGuide();
  }

  private applySettings(): void {
    this.settings = {
      sound: this.require<HTMLInputElement>('#setting-sound').checked,
      reduceEffects: this.require<HTMLInputElement>('#setting-motion').checked,
      assist: this.require<HTMLInputElement>('#setting-assist').checked,
      controls: this.require<HTMLSelectElement>('#setting-controls').value === 'jli' ? 'jli' : 'wasd',
    };
    this.state.assist = this.settings.assist;
    this.audio.setEnabled(this.settings.sound);
    document.documentElement.dataset.reduceEffects = String(this.settings.reduceEffects);
    this.updateControlGuide();
    if (!this.isDemo) localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    this.announce('Settings saved on this device.');
  }

  private saveRound(forceStatus?: 'playing'): void {
    if (this.isDemo || (this.state.status !== 'playing' && forceStatus !== 'playing')) return;
    const snapshot = cloneSnapshot(this.state);
    if (forceStatus) snapshot.status = forceStatus;
    const saved: SavedRound = { savedAt: Date.now(), state: snapshot };
    localStorage.setItem(ROUND_KEY, JSON.stringify(saved));
    this.lastSavedAt = performance.now();
  }

  private updateControlGuide(): void {
    const guide = this.root.querySelector<HTMLElement>('#blue-control-guide');
    if (!guide) return;
    guide.innerHTML = this.settings.controls === 'jli'
      ? '<strong>Player 1</strong> J/L steer · I dashes'
      : '<strong>Player 1</strong> A/D steer · Space dashes';
  }

  private sendPing(message: string): void {
    const ping = this.require<HTMLElement>('#reaction-ping');
    ping.textContent = message;
    ping.hidden = false;
    this.announce(`Reaction: ${message}`);
    window.setTimeout(() => { ping.hidden = true; }, this.settings.reduceEffects ? 900 : 1_600);
  }

  private announce(message: string): void {
    this.statusLive.textContent = '';
    requestAnimationFrame(() => { this.statusLive.textContent = message; });
  }
}

// Kept as a stable binding so the controller's hot loop does not allocate a dynamic import.
import { advanceGame } from './core';
const requireCoreAdvance = { advanceGame };

export function clearSavedGameData(): void {
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(ROUND_KEY);
}

export function getSavedSettingsForTest(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) as Settings : null;
  } catch {
    return null;
  }
}
