import { Container, Graphics } from 'pixi.js';
import { PLACEMENT_ANIMATION_MS } from '@/game/constants';
import { randomUnit } from '@/game/random';

const MAX_PARTICLES = 40;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: number;
  g: Graphics;
};

export class ParticleRenderer {
  readonly container = new Container();
  private pool: Particle[] = [];
  private active: Particle[] = [];

  constructor() {
    this.container.label = 'particles';
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const g = new Graphics();
      g.visible = false;
      this.container.addChild(g);
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        radius: 2,
        color: 0xffffff,
        g,
      });
    }
  }

  emit(x: number, y: number, color: number, count = 12): void {
    const spawn = Math.min(count, this.pool.length, MAX_PARTICLES - this.active.length);
    for (let i = 0; i < spawn; i++) {
      const particle = this.pool.pop();
      if (!particle) break;
      const angle = (Math.PI * 2 * i) / spawn + randomUnit() * 0.4;
      const speed = 40 + randomUnit() * 90;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 20;
      particle.maxLife = PLACEMENT_ANIMATION_MS * (0.7 + randomUnit() * 0.5);
      particle.life = particle.maxLife;
      particle.radius = 2 + randomUnit() * 3;
      particle.color = color;
      particle.g.visible = true;
      particle.g.clear();
      particle.g.circle(0, 0, particle.radius).fill({ color, alpha: 0.9 });
      particle.g.position.set(x, y);
      this.active.push(particle);
    }
  }

  update(deltaMs: number): boolean {
    if (this.active.length === 0) return false;
    let changed = false;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i]!;
      p.life -= deltaMs;
      if (p.life <= 0) {
        p.g.visible = false;
        this.active.splice(i, 1);
        this.pool.push(p);
        changed = true;
        continue;
      }

      p.vy += 120 * (deltaMs / 1000);
      p.x += p.vx * (deltaMs / 1000);
      p.y += p.vy * (deltaMs / 1000);
      p.g.position.set(p.x, p.y);
      const alpha = Math.max(0, p.life / p.maxLife);
      p.g.alpha = alpha;
      changed = true;
    }

    return changed;
  }

  destroy(): void {
    this.active.length = 0;
    this.pool.length = 0;
    this.container.destroy({ children: true });
  }
}
