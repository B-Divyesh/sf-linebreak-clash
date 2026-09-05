import {
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type GameState,
  type PlayerState,
} from './core';

const PAPER = '#f3eddf';
const INK = '#10233d';
const GRID = '#c9c0ad';
const COBALT = '#0759c7';
const VERMILION = '#c73b2f';
const RELAY = '#d7f13b';

export class ArenaRenderer {
  private readonly context: CanvasRenderingContext2D;
  private width = WORLD_WIDTH;
  private height = WORLD_HEIGHT;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available in this browser.');
    this.context = context;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.context.setTransform(
      (this.width / WORLD_WIDTH) * ratio,
      0,
      0,
      (this.height / WORLD_HEIGHT) * ratio,
      0,
      0,
    );
  }

  render(state: GameState, interpolation = 1): void {
    const context = this.context;
    context.fillStyle = PAPER;
    context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.drawGrid();

    context.strokeStyle = INK;
    context.lineWidth = 5;
    context.strokeRect(13, 13, WORLD_WIDTH - 26, WORLD_HEIGHT - 26);
    context.lineWidth = 1;
    context.setLineDash([8, 8]);
    context.strokeRect(27, 27, WORLD_WIDTH - 54, WORLD_HEIGHT - 54);
    context.setLineDash([]);

    for (const player of Object.values(state.players)) this.drawTrail(player);
    for (const relay of state.relays) if (relay.active) this.drawRelay(relay.id, relay.x, relay.y);
    for (const player of Object.values(state.players)) this.drawPlayer(player, interpolation);

    if (state.status === 'ready') this.drawReadyPlate();
    if (state.status === 'paused') this.drawPausedPlate();
  }

  private drawGrid(): void {
    const context = this.context;
    context.strokeStyle = GRID;
    context.lineWidth = 1;
    context.globalAlpha = 0.62;
    for (let x = 40; x < WORLD_WIDTH; x += 40) {
      context.beginPath(); context.moveTo(x, 0); context.lineTo(x, WORLD_HEIGHT); context.stroke();
    }
    for (let y = 40; y < WORLD_HEIGHT; y += 40) {
      context.beginPath(); context.moveTo(0, y); context.lineTo(WORLD_WIDTH, y); context.stroke();
    }
    context.globalAlpha = 1;
  }

  private drawTrail(player: PlayerState): void {
    if (player.trail.length < 2) return;
    const context = this.context;
    context.strokeStyle = player.id === 'blue' ? COBALT : VERMILION;
    context.lineWidth = 8;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    if (player.id === 'coral') context.setLineDash([18, 5]);
    context.beginPath();
    player.trail.forEach((point, index) => {
      const alpha = Math.max(0.18, 1 - point.age / 8.5);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
      context.globalAlpha = alpha;
    });
    context.stroke();
    context.globalAlpha = 1;
    context.setLineDash([]);
  }

  private drawRelay(id: number, x: number, y: number): void {
    const context = this.context;
    context.save();
    context.translate(x, y);
    context.fillStyle = RELAY;
    context.strokeStyle = INK;
    context.lineWidth = 4;
    context.beginPath(); context.arc(0, 0, 24, 0, Math.PI * 2); context.fill(); context.stroke();
    context.lineWidth = 2;
    context.beginPath(); context.arc(0, 0, 32, 0, Math.PI * 2); context.stroke();
    context.fillStyle = INK;
    context.font = '700 18px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(id), 0, 1);
    context.restore();
  }

  private drawPlayer(player: PlayerState, interpolation: number): void {
    if (!player.alive) return;
    const context = this.context;
    const x = player.previousX + (player.x - player.previousX) * interpolation;
    const y = player.previousY + (player.y - player.previousY) * interpolation;
    context.save();
    context.translate(x, y);
    context.rotate(player.angle);
    context.fillStyle = player.id === 'blue' ? COBALT : VERMILION;
    context.strokeStyle = INK;
    context.lineWidth = 3;
    if (player.id === 'blue') {
      context.beginPath(); context.arc(0, 0, 11, 0, Math.PI * 2); context.fill(); context.stroke();
    } else {
      context.beginPath(); context.moveTo(13, 0); context.lineTo(0, 11); context.lineTo(-13, 0); context.lineTo(0, -11); context.closePath(); context.fill(); context.stroke();
    }
    context.fillStyle = PAPER;
    context.beginPath(); context.moveTo(10, 0); context.lineTo(2, -4); context.lineTo(2, 4); context.closePath(); context.fill();
    context.restore();
  }

  private drawReadyPlate(): void {
    this.drawPlate('ARENA READY', 'Start a round above');
  }

  private drawPausedPlate(): void {
    this.drawPlate('ROUND PAUSED', 'Resume when ready');
  }

  private drawPlate(title: string, detail: string): void {
    const context = this.context;
    context.fillStyle = 'rgba(243, 237, 223, 0.94)';
    context.strokeStyle = INK;
    context.lineWidth = 4;
    context.fillRect(335, 220, 290, 120);
    context.strokeRect(335, 220, 290, 120);
    context.fillStyle = INK;
    context.textAlign = 'center';
    context.font = '800 26px Arial Narrow, Arial, sans-serif';
    context.fillText(title, 480, 270);
    context.font = '16px Arial, sans-serif';
    context.fillText(detail, 480, 304);
  }
}

