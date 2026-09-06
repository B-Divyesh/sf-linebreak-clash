const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 560;
const API_BASE = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8787'
  : 'https://linebreak-clash-realtime.sociobot.in';

interface OnlinePlayer {
  id: string;
  name: string;
  slot: number;
  color: string;
  host: boolean;
  connected: boolean;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  angle: number;
  score: number;
  captures: number;
  alive: boolean;
  dashCooldown: number;
  trail: Array<{ x: number; y: number; age: number }>;
}

interface OnlineRoom {
  code: string;
  status: 'waiting' | 'playing' | 'ended';
  elapsed: number;
  duration: number;
  result: string | null;
  hostId: string;
  players: OnlinePlayer[];
  relays: Array<{ id: number; x: number; y: number; active: boolean }>;
}

interface Identity { code: string; playerId: string; token: string }

export class OnlineController {
  private socket: WebSocket | null = null;
  private room: OnlineRoom | null = null;
  private identity: Identity | null = null;
  private reconnectStarted = 0;
  private reconnectTimer = 0;
  private inputTimer = 0;
  private input = { left: false, right: false, dash: false };
  private destroyed = false;
  private reactionTimer = 0;
  private lastRoomStatus: OnlineRoom['status'] | null = null;
  private readonly resizeObserver: ResizeObserver;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly status: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.canvas = this.require<HTMLCanvasElement>('#online-arena');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable.');
    this.context = context;
    this.status = this.require<HTMLElement>('#online-connection');
    this.bind();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.drawEmpty();
    const room = new URLSearchParams(location.search).get('room')?.toUpperCase();
    if (room) {
      this.require<HTMLInputElement>('#join-code').value = room;
      const stored = localStorage.getItem(`linebreak-clash:online:${room}`);
      if (stored) {
        try { this.identity = JSON.parse(stored) as Identity; this.connect(); } catch { localStorage.removeItem(`linebreak-clash:online:${room}`); }
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    clearInterval(this.inputTimer); clearTimeout(this.reconnectTimer); clearTimeout(this.reactionTimer);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.socket?.close();
  }

  private require<T extends Element>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing online element: ${selector}`);
    return element;
  }

  private bind(): void {
    this.require<HTMLFormElement>('#create-room').addEventListener('submit', (event) => { event.preventDefault(); void this.create(); });
    this.require<HTMLFormElement>('#join-room').addEventListener('submit', (event) => { event.preventDefault(); void this.join(); });
    this.require<HTMLButtonElement>('#start-online').addEventListener('click', () => this.send({ type: 'start' }));
    this.require<HTMLButtonElement>('#restart-online').addEventListener('click', () => this.send({ type: 'restart' }));
    this.require<HTMLButtonElement>('#copy-room').addEventListener('click', () => void this.copyInvite());
    this.require<HTMLButtonElement>('#leave-online').addEventListener('click', () => this.leave());
    this.root.querySelectorAll<HTMLButtonElement>('[data-online-reaction]').forEach((button) => button.addEventListener('click', () => this.send({ type: 'reaction', value: button.dataset.onlineReaction })));
    window.addEventListener('keydown', this.keyDown, { passive: false });
    window.addEventListener('keyup', this.keyUp, { passive: false });
    this.root.querySelectorAll<HTMLButtonElement>('[data-online-control]').forEach((button) => {
      const key = button.dataset.onlineControl as keyof typeof this.input;
      const set = (value: boolean) => { this.input[key] = value; };
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); set(true); });
      button.addEventListener('pointerup', () => set(false));
      button.addEventListener('pointercancel', () => set(false));
      button.addEventListener('lostpointercapture', () => set(false));
    });
  }

  private keyDown = (event: KeyboardEvent) => {
    if (this.isEditable(event.target) || this.room?.status !== 'playing') return;
    if (this.setKey(event.code, true)) event.preventDefault();
  };
  private keyUp = (event: KeyboardEvent) => {
    if (this.isEditable(event.target) || this.room?.status !== 'playing') return;
    if (this.setKey(event.code, false)) event.preventDefault();
  };
  private isEditable(target: EventTarget | null): boolean {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  }
  private setKey(code: string, value: boolean): boolean {
    if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = value;
    else if (code === 'KeyD' || code === 'ArrowRight') this.input.right = value;
    else if (code === 'Space' || code === 'Enter') this.input.dash = value;
    else return false;
    return true;
  }

  private async create(): Promise<void> {
    await this.request('/rooms', this.require<HTMLInputElement>('#create-name').value, 'POST');
  }

  private async join(): Promise<void> {
    const room = this.require<HTMLInputElement>('#join-code').value.trim().toUpperCase();
    if (!/^[2-9A-HJ-NP-Z]{8}$/.test(room)) { this.showError('Enter the eight-character room code.'); return; }
    await this.request(`/rooms/${room}/join`, this.require<HTMLInputElement>('#join-name').value, 'POST');
  }

  private async request(path: string, name: string, method: string): Promise<void> {
    this.showError(''); this.setStatus('Connecting…');
    try {
      const response = await fetch(`${API_BASE}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json() as Identity & { error?: string };
      if (!response.ok) throw new Error(data.error || 'The room service could not complete that request.');
      this.identity = { code: data.code, playerId: data.playerId, token: data.token };
      localStorage.setItem(`linebreak-clash:online:${data.code}`, JSON.stringify(this.identity));
      history.replaceState({}, '', `/online/?room=${data.code}`);
      this.connect();
    } catch (error) {
      this.setStatus('Not connected');
      this.showError(error instanceof TypeError ? 'The room service is unavailable. Try again.' : error instanceof Error ? error.message : 'The room service is unavailable. Try again.');
    }
  }

  private connect(): void {
    if (!this.identity || this.destroyed) return;
    clearTimeout(this.reconnectTimer); this.socket?.close();
    const url = new URL('/ws', API_BASE); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url); this.socket = socket; this.setStatus(this.reconnectStarted ? 'Rejoining…' : 'Connecting…');
    socket.addEventListener('open', () => { socket.send(JSON.stringify({ type: 'auth', room: this.identity?.code, token: this.identity?.token })); });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as { type: string; room?: OnlineRoom; error?: string; value?: string };
      if (message.type === 'snapshot' && message.room) { this.room = message.room; this.reconnectStarted = 0; this.setStatus('Connected'); this.render(); this.startInput(); }
      if (message.type === 'reaction' && message.value) {
        const ping = this.require<HTMLElement>('#online-reaction'); ping.textContent = message.value; ping.hidden = false;
        clearTimeout(this.reactionTimer);
        this.reactionTimer = window.setTimeout(() => { if (!this.destroyed) ping.hidden = true; }, 1_500);
      }
      if (message.type === 'error') this.showError(message.error || 'The room connection failed.');
    });
    socket.addEventListener('error', () => {
      if (!this.room) this.showError('The room service did not connect. It will retry for 20 seconds.');
    });
    socket.addEventListener('close', (event) => {
      clearInterval(this.inputTimer);
      if (this.destroyed) return;
      if (event.code === 4004 || event.code === 4003) { this.setStatus('Rejoin ended'); return; }
      if (!this.identity) return;
      if (!this.reconnectStarted) this.reconnectStarted = Date.now();
      const seconds = Math.max(0, 20 - Math.floor((Date.now() - this.reconnectStarted) / 1_000));
      this.setStatus(`Connection lost. Rejoining for ${seconds} seconds.`);
      if (seconds > 0) this.reconnectTimer = window.setTimeout(() => this.connect(), 1_000);
    });
  }

  private startInput(): void {
    clearInterval(this.inputTimer);
    this.inputTimer = window.setInterval(() => {
      if (this.room?.status === 'playing') this.send({ type: 'input', ...this.input });
    }, 50);
  }

  private send(message: object): void { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }

  private render(): void {
    if (!this.room || !this.identity) return;
    const announceEnd = this.room.status === 'ended' && this.lastRoomStatus !== 'ended';
    this.require<HTMLElement>('#room-code').textContent = this.room.code;
    this.require<HTMLInputElement>('#invite-link').value = `${location.origin}/online/?room=${this.room.code}`;
    this.require<HTMLElement>('#online-room').hidden = false;
    this.require<HTMLElement>('#online-entry').hidden = true;
    this.require<HTMLElement>('#online-status-text').textContent = this.room.status === 'waiting' ? 'Waiting for players' : this.room.status === 'playing' ? 'Round active' : 'Round complete';
    const list = this.require<HTMLUListElement>('#online-players'); list.replaceChildren();
    for (const player of this.room.players) {
      const item = document.createElement('li'); item.innerHTML = '<span class="online-color"></span><strong></strong><span></span><b></b>'; item.querySelector('.online-color')?.classList.add(`slot-${player.slot}`);
      item.querySelector('strong')!.textContent = player.name + (player.id === this.identity.playerId ? ' (you)' : '');
      item.querySelector('span:last-of-type')!.textContent = player.connected ? 'Connected' : 'Rejoining';
      item.querySelector('b')!.textContent = String(player.score); list.append(item);
    }
    const start = this.require<HTMLButtonElement>('#start-online');
    const isHost = this.identity.playerId === this.room.hostId;
    const connectedPlayers = this.room.players.filter((player) => player.connected).length;
    start.hidden = !isHost || this.room.status !== 'waiting';
    start.disabled = connectedPlayers < 2;
    this.require<HTMLElement>('#online-wait-note').textContent = this.room.status === 'playing'
      ? 'Steer with A and D or the buttons. Press Space to dash.'
      : this.room.status === 'ended'
        ? 'The round is complete.'
        : connectedPlayers < 2
          ? 'Share the room code. Two players are needed to start.'
          : isHost
            ? 'Everyone is connected. Start when ready.'
            : 'Waiting for the host to start.';
    this.require<HTMLElement>('#online-timer').textContent = `${String(Math.floor(Math.max(0, this.room.duration - this.room.elapsed) / 60)).padStart(2, '0')}:${String(Math.ceil(Math.max(0, this.room.duration - this.room.elapsed)) % 60).padStart(2, '0')}`;
    this.draw();
    const end = this.require<HTMLElement>('#online-end'); end.hidden = this.room.status !== 'ended';
    if (this.room.status === 'ended') {
      const winner = this.room.players.find((player) => player.id === this.room?.result);
      this.require<HTMLElement>('#online-result').textContent = winner ? `${winner.name} wins.` : 'The round is a draw.';
      const restart = this.require<HTMLButtonElement>('#restart-online');
      restart.hidden = !isHost;
      restart.disabled = connectedPlayers < 2;
      this.require<HTMLElement>('#online-restart-note').textContent = restart.hidden ? 'The host can start the next round.' : 'Scores and the timer reset for everyone.';
      if (announceEnd) this.require<HTMLElement>('#online-end-title').focus();
    }
    this.lastRoomStatus = this.room.status;
  }

  private drawEmpty(): void { this.context.fillStyle = '#f3eddf'; this.context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); this.context.fillStyle = '#10233d'; this.context.font = '700 30px Arial'; this.context.textAlign = 'center'; this.context.fillText('Create or join a room', WORLD_WIDTH / 2, WORLD_HEIGHT / 2); }
  private resize(): void { const rect = this.canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2); this.canvas.width = Math.max(1, Math.round(rect.width * ratio)); this.canvas.height = Math.max(1, Math.round(rect.height * ratio)); this.context.setTransform((rect.width / WORLD_WIDTH) * ratio, 0, 0, (rect.height / WORLD_HEIGHT) * ratio, 0, 0); if (this.room) this.draw(); else this.drawEmpty(); }
  private draw(): void {
    if (!this.room) return; const ctx = this.context; ctx.fillStyle = '#f3eddf'; ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT); ctx.strokeStyle = '#ded4bf'; ctx.lineWidth = 1;
    for (let x = 40; x < WORLD_WIDTH; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke(); }
    for (let y = 40; y < WORLD_HEIGHT; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke(); }
    ctx.strokeStyle = '#10233d'; ctx.lineWidth = 5; ctx.strokeRect(13, 13, WORLD_WIDTH - 26, WORLD_HEIGHT - 26);
    for (const player of this.room.players) { if (player.trail.length > 1) { ctx.strokeStyle = player.color; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); player.trail.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y)); ctx.stroke(); } }
    for (const relay of this.room.relays) if (relay.active) { ctx.fillStyle = '#d7f13b'; ctx.strokeStyle = '#10233d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(relay.x, relay.y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#10233d'; ctx.font = '700 18px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(relay.id), relay.x, relay.y + 6); }
    for (const player of this.room.players) if (player.alive) { ctx.fillStyle = player.color; ctx.strokeStyle = '#10233d'; ctx.lineWidth = 3; ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle); ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, 9); ctx.lineTo(-9, -9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
    this.canvas.setAttribute('aria-label', `${this.room.status} online arena with ${this.room.players.length} players. ${this.room.players.map((player) => `${player.name} ${player.score} points`).join(', ')}.`);
  }

  private async copyInvite(): Promise<void> {
    const feedback = this.require<HTMLElement>('#online-copy-feedback');
    try {
      await navigator.clipboard.writeText(this.require<HTMLInputElement>('#invite-link').value);
      feedback.textContent = 'Invite link copied.';
    } catch {
      this.require<HTMLInputElement>('#invite-link').select();
      feedback.textContent = 'Invite link selected. Copy it from the field.';
    }
  }
  private leave(): void {
    if (this.identity) localStorage.removeItem(`linebreak-clash:online:${this.identity.code}`);
    this.identity = null;
    this.socket?.close();
    location.assign('/online/');
  }
  private setStatus(message: string): void { this.status.textContent = message; }
  private showError(message: string): void { this.require<HTMLElement>('#online-error').textContent = message; }
}
