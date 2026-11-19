import { CURSOR_COLORS, CURSOR_NAMES, SWARM_TUNING } from '../data';
import { soundEngine } from './sound';
import {
  type AnchorDef,
  type Bounds,
  type DupGroup,
  type GuideEl,
  type PathEl,
  type Pt,
  type RectEl,
  type SceneEl,
  type TaskDef,
  type TextEl,
  buildPortfolioScene,
} from './sceneBuilder';
import { CANVAS_W, NAV_H, NAV_Y, RULER_SIZE, lineHeight, measureText } from './typography';

export type CursorShape =
  | 'arrow'
  | 'cross'
  | 'ibeam'
  | 'pen'
  | 'pen-add'
  | 'pen-close'
  | 'dup'
  | 'ew'
  | 'ns';

export type OverlayItem =
  | {
      t: 'box';
      b: Bounds;
      handles?: boolean;
      badge?: string;
      rulerLines?: boolean;
      underline?: { x: number; y: number; w: number };
      color?: 'blue' | 'red';
    }
  | {
      t: 'measure';
      a: Pt;
      b: Pt;
      label: string;
    };

export interface Cursor {
  id: number;
  x: number;
  y: number;
  home: Pt | null;
  name: string;
  color: string;
  shape: CursorShape;
  press: number;
  task: TaskRuntime | null;
  gen: Generator<void, void, number> | null;
  ov: (() => OverlayItem[]) | null;
  idleFor: number;
  leaving: boolean;
  worked: boolean;
  sticky: boolean;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  force: number;
  curl: number;
  ph: number;
  orbit: number;
  spin: number;
  follow: boolean;
}

export interface TaskRuntime extends TaskDef {
  state: 'wait' | 'active' | 'done';
  doneAt: number;
}

export interface ViewportState {
  scrollY: number;
  vh: number;
  vw: number;
  s: number;
  left: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

const STICKY_OFFSET = NAV_Y;
const RULER_BAR = RULER_SIZE;

export class SwarmEngine {
  els: Map<string, SceneEl> = new Map();
  list: SceneEl[] = [];
  tasks: TaskRuntime[] = [];
  byTask: Map<string, TaskRuntime> = new Map();
  groups: Map<string, DupGroup> = new Map();
  anchors: AnchorDef[] = [];
  cursors: Cursor[] = [];
  vp: ViewportState = { scrollY: 0, vh: 800, vw: 1280, s: 1, left: 0 };
  height: number;
  started = false;
  frontier = 0;
  vel = 0;
  tempo = 1;
  time = 0;
  rulers = { want: 0, t: 0, lastNeed: -10 };
  lastScroll = 0;
  nextId = 0;
  spawnCooldown = 0;
  flocking = false;
  lastMouseWorld: Pt | null = null;
  tv: Pt = { x: 0, y: 0 };
  mouse: Pt | null = null;
  guideDeps: Map<string, TaskRuntime[]> = new Map();
  retiredWorkers = 0;
  private domDirty = true;

  constructor() {
    const scene = buildPortfolioScene(
      () => this.cursors.filter((c) => c.worked).length + this.retiredWorkers
    );
    this.height = scene.height;
    this.anchors = scene.anchors;

    for (const el of scene.els) {
      this.els.set(el.id, el);
      this.list.push(el);
    }

    for (const t of scene.tasks) {
      const rt: TaskRuntime = { ...t, state: 'wait', doneAt: 0 };
      this.tasks.push(rt);
      this.byTask.set(t.id, rt);
      if (t.spec.type === 'text' && t.spec.snap) {
        const list = this.guideDeps.get(t.spec.snap) ?? [];
        list.push(rt);
        this.guideDeps.set(t.spec.snap, list);
      }
    }

    for (const g of scene.groups) {
      this.groups.set(g.id, g);
    }

    for (let i = 0; i < SWARM_TUNING.initialFlock; i++) {
      const a = (i / SWARM_TUNING.initialFlock) * Math.PI * 2;
      const c = this.makeCursor(
        CANVAS_W / 2 + Math.cos(a) * 160,
        360 + Math.sin(a) * 160,
        i < SWARM_TUNING.minWorkers ? { x: 0, y: 0 } : null
      );
      c.follow = true;
      this.cursors.push(c);
    }
  }

  consumeDomDirty(): boolean {
    if (!this.domDirty) return false;
    this.domDirty = false;
    return true;
  }

  markDomDirty(): void {
    this.domDirty = true;
  }

  private bump(el: SceneEl): void {
    el.v++;
    this.domDirty = true;
  }

  private makeCursor(x: number, y: number, home: Pt | null = null): Cursor {
    const id = this.nextId++;
    const fast = Math.random() < 0.25;
    return {
      id,
      x,
      y,
      home,
      name: CURSOR_NAMES[id % CURSOR_NAMES.length],
      color: CURSOR_COLORS[id % CURSOR_COLORS.length],
      shape: 'arrow',
      press: 0,
      task: null,
      gen: null,
      ov: null,
      idleFor: 0,
      leaving: false,
      worked: false,
      sticky: false,
      vx: 0,
      vy: 0,
      angle: 0,
      speed: fast ? rand(1000, 1500) : rand(300, 750),
      force: fast ? rand(3500, 6000) : rand(700, 1800),
      spin: fast ? rand(0.4, 1.0) : rand(0, 0.4),
      curl: rand(-1, 1),
      ph: rand(0, Math.PI * 2),
      orbit: rand(70, 170),
      follow: false,
    };
  }

  get viewTop(): number {
    return this.vp.scrollY / this.vp.s;
  }

  get viewBot(): number {
    return (this.vp.scrollY + this.vp.vh) / this.vp.s;
  }

  get stick(): number {
    return Math.max(0, this.viewTop + (RULER_BAR * this.rulers.t) / this.vp.s - STICKY_OFFSET);
  }

  get navHeightPx(): number {
    return NAV_H * this.vp.s;
  }

  private isSticky(task: TaskRuntime): boolean {
    const spec = task.spec;
    const elId =
      spec.type === 'dup'
        ? this.groups.get(spec.group)?.ids[0]
        : 'el' in spec
          ? spec.el
          : undefined;
    if (!elId) return false;
    return !!this.els.get(elId)?.sticky;
  }

  fromViewport(vx: number, vy: number): Pt {
    return {
      x: (vx - this.vp.left) / this.vp.s,
      y: (this.vp.scrollY + vy) / this.vp.s,
    };
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.domDirty = true;
    for (const c of this.cursors) {
      c.follow = false;
      c.gen = null;
      c.angle = (((c.angle + 180) % 360) + 360) % 360 - 180;
    }
  }

  setScroll(scrollY: number): void {
    this.vp.scrollY = scrollY;
    if (scrollY > 4) this.start();
  }

  setViewport(vw: number, vh: number, s: number, left: number): void {
    this.vp.vw = vw;
    this.vp.vh = vh;
    this.vp.s = s;
    this.vp.left = left;
    this.domDirty = true;
  }

  setMouse(x: number | null, y?: number): void {
    this.mouse = x !== null && y !== undefined ? { x, y } : null;
  }

  buildAll(): void {
    this.started = true;
    this.frontier = this.height;
    for (const t of this.tasks) {
      t.state = 'done';
      t.doneAt = this.time;
    }
    for (const el of this.list) {
      if (el.kind === 'guide') {
        el.vis = false;
        el.op = 0;
        el.dragging = false;
      } else if (el.kind === 'rect') {
        el.vis = true;
        el.draw = null;
        el.styled = true;
        el.dx = 0;
        el.dy = 0;
      } else if (el.kind === 'text') {
        el.vis = true;
        el.shown = el.dyn ? el.dyn() : el.text;
        el.size = el.st.size;
        el.editing = false;
        el.selAll = false;
        el.dx = 0;
        el.dy = 0;
      } else if (el.kind === 'path') {
        el.vis = true;
        el.placed = el.pts.length + (el.d ? 1 : 0);
        el.shut = el.closed;
        el.edit = false;
        el.owner = null;
        el.fillOn = !!el.fill;
      }
      this.bump(el);
    }

    for (const c of this.cursors) {
      c.task = null;
      c.gen = null;
      c.ov = null;
      c.leaving = false;
      c.sticky = false;
      c.shape = 'arrow';
      c.follow = true;
    }
    this.rulers.want = 0;
    this.rulers.t = 0;
    this.flocking = true;
    this.domDirty = true;
    soundEngine.playChord();
  }

  bounds(el: SceneEl): Bounds {
    if (el.kind === 'text') {
      const m = measureText(el.shown || ' ', el.st, el.size, el.w);
      return {
        x: el.x + el.dx,
        y: el.y + el.dy,
        w: el.w ?? Math.max(m.w, 2),
        h: Math.max(m.h, lineHeight(el.st, el.size)),
      };
    }
    if (el.kind === 'rect') {
      return {
        x: el.x + el.dx,
        y: el.y + el.dy,
        w: el.draw?.w ?? el.w,
        h: el.draw?.h ?? el.h,
      };
    }
    if (el.kind === 'path') {
      const xs = el.pts.map((p) => p.x);
      const ys = el.pts.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) - minX,
        h: Math.max(...ys) - minY,
      };
    }
    return { x: el.pos, y: 0, w: 0, h: 0 };
  }

  unionBounds(ids: string[]): Bounds {
    const bs = ids
      .map((id) => this.els.get(id))
      .filter((el): el is SceneEl => !!el)
      .map((el) => this.bounds(el));
    const minX = Math.min(...bs.map((b) => b.x));
    const minY = Math.min(...bs.map((b) => b.y));
    return {
      x: minX,
      y: minY,
      w: Math.max(...bs.map((b) => b.x + b.w)) - minX,
      h: Math.max(...bs.map((b) => b.y + b.h)) - minY,
    };
  }

  private textUnderline(el: TextEl): { x: number; y: number; w: number } {
    const m = measureText(el.shown || ' ', el.st, el.size, el.w);
    const b = this.bounds(el);
    const firstW = m.lines[0] ?? 0;
    return {
      x: el.align === 'center' && el.w ? b.x + (el.w - firstW) / 2 : b.x,
      y: b.y + lineHeight(el.st, el.size) * 0.5 + el.size * 0.42,
      w: firstW,
    };
  }

  private selection(el: SceneEl, extra: Partial<Extract<OverlayItem, { t: 'box' }>> = {}): OverlayItem {
    const b = this.bounds(el);
    return {
      t: 'box',
      b,
      handles: true,
      badge: `${Math.round(b.w)} × ${Math.round(b.h)}`,
      rulerLines: true,
      underline: el.kind === 'text' ? this.textUnderline(el) : undefined,
      ...extra,
    };
  }

  step(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    this.time += dt;

    const s = this.vp.s;
    const scrollVel = Math.abs(this.vp.scrollY - this.lastScroll) / s / Math.max(dt, 0.001);
    this.lastScroll = this.vp.scrollY;
    this.vel = Math.max(this.vel * Math.exp(-dt * 1.2), this.vel * 0.7 + scrollVel * 0.3);

    if (this.started) {
      this.frontier = Math.max(this.frontier, this.viewBot);
    }

    const avail = this.started ? this.available() : [];
    const busyCount = this.cursors.filter((c) => c.task).length;
    this.tempo = clamp(
      2.1 + this.vel / 900 + (avail.length / Math.max(1, this.cursors.length)) * 0.5,
      2.1,
      4.8
    );

    if (this.rulers.want > 0) this.rulers.lastNeed = this.time;
    const prevRulerT = this.rulers.t;
    const targetRulerT = this.time - this.rulers.lastNeed < 0.7 ? 1 : 0;
    this.rulers.t += (targetRulerT - this.rulers.t) * Math.min(1, dt * 10);
    if (Math.abs(targetRulerT - this.rulers.t) < 0.002) this.rulers.t = targetRulerT;
    if (this.rulers.t !== prevRulerT) this.domDirty = true;

    // Fade guides once dependent texts finish snapping
    for (const el of this.list) {
      if (el.kind !== 'guide' || !el.vis) continue;
      if (el.flash > 0) {
        el.flash = Math.max(0, el.flash - dt * 1.5);
      }
      const deps = this.guideDeps.get(el.id) ?? [];
      if (!el.dragging && deps.every((d) => d.state === 'done')) {
        const lastDone = deps.length > 0 ? Math.max(...deps.map((d) => d.doneAt)) : 0;
        if (this.time - lastDone > 1.2 && el.op > 0) {
          el.op = Math.max(0, el.op - dt * 1.2);
        }
      }
    }

    // Enter finale murmuration once every task has started/finished
    if (!this.flocking && this.started && this.tasks.every((t) => t.state !== 'wait')) {
      for (const c of this.cursors) {
        if (!c.task && !c.follow) {
          c.follow = true;
          c.gen = null;
          c.leaving = false;
          c.ov = null;
          c.shape = 'arrow';
        }
      }
      if (this.cursors.every((c) => c.follow)) {
        this.flocking = true;
        this.domDirty = true;
        soundEngine.playChord();
      }
    }

    if (this.flocking) {
      this.flock(dt);
      return;
    }

    if (!this.started) {
      const center = this.fromViewport(this.vp.vw / 2, this.vp.vh / 2);
      if (this.follow(dt, this.cursors, center, 0.7)) {
        this.start();
      }
      return;
    }

    const followers = this.cursors.filter((c) => c.follow);
    if (followers.length > 0) this.follow(dt, followers);

    this.spawnCooldown -= dt;
    const desiredWorkers = clamp(
      SWARM_TUNING.minWorkers + Math.floor(this.vel / 50) + Math.floor(avail.length / 3),
      SWARM_TUNING.minWorkers,
      SWARM_TUNING.maxWorkers
    );
    const activeTotal = this.cursors.filter((c) => !c.leaving).length;

    if (
      this.started &&
      activeTotal < desiredWorkers &&
      avail.length > activeTotal - busyCount &&
      this.spawnCooldown <= 0
    ) {
      const fromLeft = Math.random() < 0.5;
      const p = this.fromViewport(
        fromLeft ? -40 : this.vp.vw + 40,
        rand(0.2, 0.8) * this.vp.vh
      );
      this.cursors.push(this.makeCursor(p.x, p.y));
      this.spawnCooldown = 0.035;
    }

    for (const c of this.cursors) {
      if (c.task || c.leaving || c.follow || !this.started) continue;
      const picked = this.pick(c, avail);
      if (picked) {
        avail.splice(avail.indexOf(picked), 1);
        picked.state = 'active';
        c.task = picked;
        c.worked = true;
        if (this.isSticky(picked)) {
          c.sticky = true;
          c.y -= this.stick;
        }
        c.idleFor = 0;
        c.gen = this.run(c, picked);
      }
    }

    for (const c of [...this.cursors]) {
      if (c.follow) continue;
      c.press = Math.max(0, c.press - dt * 6);
      if (c.angle !== 0) {
        c.angle = Math.abs(c.angle) < 0.5 ? 0 : c.angle * (1 - Math.min(1, dt * 10));
      }
      if (!c.task) {
        c.idleFor += dt;
        if (
          !c.leaving &&
          this.started &&
          c.idleFor > 2.5 &&
          this.cursors.filter((m) => !m.leaving).length > SWARM_TUNING.minWorkers &&
          !c.home
        ) {
          c.leaving = true;
          c.gen = this.leave(c);
        }
        if (!c.gen) c.gen = this.idle(c);
      }
      if (!c.gen) continue;
      const res = c.gen.next(dt);
      if (res.done) {
        if (c.task) {
          c.task.state = 'done';
          c.task.doneAt = this.time;
          c.task = null;
          c.ov = null;
          if (c.sticky) {
            c.sticky = false;
            c.y += this.stick;
          }
          c.shape = 'arrow';
        }
        c.gen = null;
        if (c.leaving) {
          if (c.worked) this.retiredWorkers++;
          const idx = this.cursors.indexOf(c);
          if (idx >= 0) this.cursors.splice(idx, 1);
        }
      }
    }
  }

  private flockTarget(): Pt {
    if (this.mouse) return this.fromViewport(this.mouse.x, this.mouse.y);
    const t = this.time;
    return this.fromViewport(
      this.vp.vw * (0.5 + 0.28 * Math.sin(t * 0.37)),
      this.vp.vh * (0.5 + 0.25 * Math.sin(t * 0.53 + 1))
    );
  }

  private flock(dt: number): void {
    this.spawnCooldown -= dt;
    if (this.cursors.length < SWARM_TUNING.finaleFlock && this.spawnCooldown <= 0) {
      const fromLeft = Math.random() < 0.5;
      const p = this.fromViewport(
        fromLeft ? -30 : this.vp.vw + 30,
        rand(0.1, 0.9) * this.vp.vh
      );
      const c = this.makeCursor(p.x, p.y);
      c.follow = true;
      this.cursors.push(c);
      this.spawnCooldown = 0.04;
    }
    this.follow(dt, this.cursors);
  }

  private follow(dt: number, cursors: Cursor[], customCenter?: Pt, scale = 1): boolean {
    const mouseWorld = this.mouse ? this.fromViewport(this.mouse.x, this.mouse.y) : null;
    const center = customCenter ?? this.flockTarget();
    const s = this.time;

    if (mouseWorld && this.lastMouseWorld && dt > 0) {
      const k = Math.min(1, dt * 18);
      this.tv.x += ((mouseWorld.x - this.lastMouseWorld.x) / dt - this.tv.x) * k;
      this.tv.y += ((mouseWorld.y - this.lastMouseWorld.y) / dt - this.tv.y) * k;
    }
    this.lastMouseWorld = mouseWorld;

    const baseR = 135 * scale * (1 + 0.18 * Math.sin(s * 0.55));
    const swirlDir = Math.tanh(Math.cos(s * 0.11) * 3);
    const desired: [number, number][] = [];

    for (const c of cursors) {
      const dx = c.x - center.x;
      const dy = c.y - center.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const rx = dx / dist;
      const ry = dy / dist;
      const theta = Math.atan2(dy, dx);
      const orbitOffset = (c.orbit - 120) * 0.55 * scale;
      const targetR = baseR * (1 + 0.3 * Math.sin(3 * theta + s * 0.7)) + orbitOffset;
      const tang = 300 * (0.7 + c.spin * 0.2) * swirlDir;
      const radial = clamp((targetR - dist) * 4, -2600, 1400);
      const outer = Math.min(1, Math.max(0, (dist - targetR) / 600));
      desired.push([
        -ry * tang + rx * radial - ry * c.curl * 400 * outer,
        rx * tang + ry * radial + rx * c.curl * 400 * outer,
      ]);
    }

    for (let i = 0; i < cursors.length; i++) {
      const c = cursors[i];
      let alignX = 0;
      let alignY = 0;
      let weightSum = 0;

      for (let j = 0; j < cursors.length; j++) {
        if (j === i) continue;
        const o = cursors[j];
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (d > 90) continue;
        const w = 1 - d / 90;
        alignX += o.vx * w;
        alignY += o.vy * w;
        weightSum += w;
      }

      let [vxD, vyD] = desired[i];
      if (weightSum > 0) {
        vxD = vxD * 0.7 + (alignX / weightSum) * 0.3;
        vyD = vyD * 0.7 + (alignY / weightSum) * 0.3;
      }

      const extra = Math.max(0, Math.hypot(c.x - center.x, c.y - center.y) - 180 * scale);
      const maxSpd = c.speed * (1.3 + Math.min(3.2, extra / 90));
      const mag = Math.hypot(vxD, vyD);
      if (mag > maxSpd && mag > 0) {
        vxD *= maxSpd / mag;
        vyD *= maxSpd / mag;
      }

      let ax = (vxD - c.vx) * 6;
      let ay = (vyD - c.vy) * 6;
      const maxF = c.force * (1.4 + Math.min(5, extra / 50));
      const fMag = Math.hypot(ax, ay);
      if (fMag > maxF && fMag > 0) {
        ax *= maxF / fMag;
        ay *= maxF / fMag;
      }

      c.vx += ax * dt;
      c.vy += ay * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }

    const bubbleR = 48;
    let touched = false;
    if (mouseWorld) {
      for (const c of cursors) {
        const dx = c.x - mouseWorld.x;
        const dy = c.y - mouseWorld.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= bubbleR) continue;
        touched = true;
        const nx = dx / dist;
        const ny = dy / dist;
        c.x = mouseWorld.x + nx * bubbleR;
        c.y = mouseWorld.y + ny * bubbleR;
        const rel = (c.vx - this.tv.x) * nx + (c.vy - this.tv.y) * ny;
        if (rel < 0) {
          c.vx -= nx * rel * 1.6;
          c.vy -= ny * rel * 1.6;
        }
        c.vx += nx * 260;
        c.vy += ny * 260;
      }
    }

    for (const c of cursors) {
      const spd = Math.hypot(c.vx, c.vy);
      if (spd < 30) continue;
      const targetAngle = (Math.atan2(c.vy, c.vx) * 180) / Math.PI + 128;
      const diff = ((targetAngle - c.angle + 540) % 360) - 180;
      c.angle += diff * Math.min(1, dt * 8);
      c.press = Math.max(0, c.press - dt * 6);
    }

    return touched;
  }

  private available(): TaskRuntime[] {
    const out: TaskRuntime[] = [];
    for (const t of this.tasks) {
      if (t.state !== 'wait' || t.y > this.frontier) continue;
      if (t.deps.every((depId) => this.byTask.get(depId)?.state === 'done')) {
        out.push(t);
      }
    }
    return out;
  }

  private pick(c: Cursor, pool: TaskRuntime[]): TaskRuntime | null {
    let best: TaskRuntime | null = null;
    let bestScore = Infinity;
    const top = this.viewTop - 40;
    const bot = this.viewBot;
    for (const t of pool) {
      const zone = t.y >= top && t.y <= bot ? 0 : t.y < top ? 1 : 2;
      const score = zone * 1e6 + (zone === 1 ? top - t.y : t.y) * 0.6 + Math.abs(t.y - c.y) * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return best;
  }

  private *wait(sec: number): Generator<void, void, number> {
    let elapsed = 0;
    while (elapsed < sec) {
      elapsed += (yield) * this.tempo;
    }
  }

  private *moveTo(
    c: Cursor,
    target: Pt | (() => Pt),
    opts: { speed?: number; drag?: boolean; bend?: number; onStep?: () => void } = {}
  ): Generator<void, void, number> {
    const getTarget = typeof target === 'function' ? target : () => target;
    const sx = c.x;
    const sy = c.y;
    const first = getTarget();
    const dist = Math.hypot(first.x - sx, first.y - sy);
    if (dist < 0.5) {
      c.x = first.x;
      c.y = first.y;
      opts.onStep?.();
      return;
    }

    const dur = clamp(0.12 + Math.sqrt(dist) * 0.021, 0.14, 0.9) / (opts.speed ?? 1);
    const bend = (opts.bend ?? (Math.random() < 0.5 ? -1 : 1) * rand(0.04, 0.14)) * Math.min(dist, 600);
    let elapsed = 0;

    while (elapsed < dur) {
      elapsed += (yield) * this.tempo;
      const p = Math.min(1, elapsed / dur);
      const d = opts.drag || p < 0.15 ? easeInOutCubic(p) : easeOutQuint(p);
      const cur = getTarget();
      const dx = cur.x - sx;
      const dy = cur.y - sy;
      const len = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(Math.PI * d) * bend;
      c.x = sx + dx * d + (-dy / len) * arc;
      c.y = sy + dy * d + (dx / len) * arc;
      opts.onStep?.();
    }

    const end = getTarget();
    c.x = end.x;
    c.y = end.y;
    opts.onStep?.();
  }

  private *click(c: Cursor): Generator<void, void, number> {
    c.press = 1;
    soundEngine.playTick(1);
    yield* this.wait(0.07);
  }

  private *type(el: TextEl, text: string, replace = false): Generator<void, void, number> {
    for (let i = 0; i < text.length; i++) {
      if (i === 0 && replace) el.shown = '';
      el.shown += text[i];
      el.selAll = false;
      this.bump(el);
      if (i % 4 === 0) soundEngine.playTick(i % 5);
      let d = rand(0.012, 0.04);
      if (text[i] === ' ') d += rand(0, 0.03);
      if (text[i] === '\n') d += 0.1;
      if (Math.random() < 0.025) d += rand(0.08, 0.2);
      yield* this.wait(d);
    }
  }

  private *idle(c: Cursor): Generator<void, void, number> {
    if (!this.started && c.home) {
      const h = c.home;
      const ph = rand(0, 6);
      while (!this.started) {
        const t = this.time;
        c.x = h.x + Math.sin(t * 1.3 + ph) * 3;
        c.y = h.y + Math.cos(t * 1.7 + ph) * 2.5;
        yield;
      }
    }
    for (;;) {
      const top = this.viewTop;
      const bot = this.viewBot;
      const p: Pt = { x: rand(160, 1100), y: rand(top + (bot - top) * 0.2, top + (bot - top) * 0.8) };
      yield* this.moveTo(c, p, { speed: 0.35 });
      let w = rand(0.4, 1.4);
      while (w > 0) {
        w -= yield;
        if (c.y < this.viewTop || c.y > this.viewBot) break;
      }
    }
  }

  private *leave(c: Cursor): Generator<void, void, number> {
    const right = c.x > CANVAS_W / 2;
    yield* this.moveTo(
      c,
      () => this.fromViewport(right ? this.vp.vw + 60 : -60, (c.y - this.viewTop) * this.vp.s),
      { speed: 0.85 }
    );
  }

  private run(c: Cursor, task: TaskRuntime): Generator<void, void, number> {
    const spec = task.spec;
    switch (spec.type) {
      case 'path':
        return this.drawPath(c, this.els.get(spec.el) as PathEl);
      case 'rect':
        return this.drawRect(c, this.els.get(spec.el) as RectEl);
      case 'text':
        return this.drawText(
          c,
          this.els.get(spec.el) as TextEl,
          spec.snap ? (this.els.get(spec.snap) as GuideEl) : null,
          !!spec.grow
        );
      case 'guide':
        return this.dragGuide(c, this.els.get(spec.el) as GuideEl);
      case 'dup':
        return this.duplicate(c, this.groups.get(spec.group)!, spec.k);
      case 'edit':
        return this.editText(c, this.els.get(spec.el) as TextEl);
    }
  }

  private anchor(p: Pt): Pt | (() => Pt) {
    if (p.x <= 0) return () => ({ x: this.fromViewport(6, 0).x, y: p.y });
    if (p.x >= CANVAS_W) return () => ({ x: this.fromViewport(this.vp.vw - 6, 0).x, y: p.y });
    return p;
  }

  private *drawPath(c: Cursor, el: PathEl): Generator<void, void, number> {
    if (el.d) return yield* this.drawLogo(c, el);
    c.shape = el.add ? 'pen-add' : 'pen';
    yield* this.moveTo(c, this.anchor(el.pts[0]));
    yield* this.click(c);
    el.vis = true;
    el.edit = true;
    el.placed = 1;
    el.owner = c.id;
    this.bump(el);
    c.shape = 'pen';
    for (let i = 1; i < el.pts.length; i++) {
      yield* this.moveTo(c, this.anchor(el.pts[i]), { bend: rand(-0.03, 0.03) });
      yield* this.click(c);
      el.placed = i + 1;
      this.bump(el);
      yield* this.wait(rand(0.04, 0.12));
    }
    if (el.closed) {
      c.shape = 'pen-close';
      yield* this.moveTo(c, el.pts[0], { bend: rand(-0.03, 0.03) });
      yield* this.click(c);
      el.shut = true;
      this.bump(el);
    }
    el.owner = null;
    this.bump(el);
    c.shape = 'pen';
    yield* this.moveTo(c, { x: c.x + rand(14, 30), y: c.y + rand(10, 24) }, { speed: 1.4 });
    yield* this.wait(0.25);
    el.edit = false;
    if (el.fill) el.fillOn = true;
    this.bump(el);
  }

  private *drawLogo(c: Cursor, el: PathEl): Generator<void, void, number> {
    c.shape = 'pen';
    yield* this.moveTo(c, this.anchor(el.pts[0]));
    el.vis = true;
    el.placed = 1;
    this.bump(el);
    for (let i = 1; i <= el.pts.length; i++) {
      yield* this.moveTo(c, el.pts[i % el.pts.length], { speed: 1.6 });
      el.placed = i + 1;
      this.bump(el);
    }
    el.shut = true;
    el.fillOn = true;
    this.bump(el);
    yield* this.moveTo(c, { x: c.x + rand(14, 30), y: c.y + rand(10, 24) }, { speed: 1.4 });
  }

  private *drawRect(c: Cursor, el: RectEl): Generator<void, void, number> {
    c.shape = 'cross';
    yield* this.moveTo(c, { x: el.x, y: el.y });
    c.press = 1;
    el.vis = true;
    el.draw = { w: 0, h: 0 };
    this.bump(el);
    c.ov = () => [this.selection(el)];
    yield* this.moveTo(
      c,
      { x: el.x + el.w, y: el.y + el.h },
      {
        speed: 0.78,
        drag: true,
        bend: 0,
        onStep: () => {
          el.draw = { w: Math.max(0, c.x - el.x), h: Math.max(0, c.y - el.y) };
          this.bump(el);
        },
      }
    );
    el.draw = null;
    this.bump(el);
    c.shape = 'arrow';
    yield* this.wait(rand(0.18, 0.3));
    el.styled = true;
    soundEngine.playSnap();
    this.bump(el);
    yield* this.wait(0.32);
    c.ov = null;
  }

  private *drawText(
    c: Cursor,
    el: TextEl,
    snapGuide: GuideEl | null,
    grow: boolean
  ): Generator<void, void, number> {
    if (el.dyn) el.text = el.dyn();
    if (snapGuide) {
      if (snapGuide.axis === 'x') {
        el.dx = rand(28, 64);
        el.dy = rand(-8, 8);
      } else {
        el.dx = rand(-8, 8);
        el.dy = rand(18, 34) * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    if (grow) el.size = 18;

    const ix = el.x + el.dx;
    const iy = el.y + el.dy;
    c.shape = 'cross';
    yield* this.moveTo(c, { x: ix, y: iy });

    if (el.w == null) {
      yield* this.click(c);
      el.vis = true;
      el.editing = true;
      this.bump(el);
    } else {
      c.press = 1;
      const tempBox: RectEl = {
        kind: 'rect',
        id: '',
        v: 0,
        vis: true,
        dx: 0,
        dy: 0,
        x: ix,
        y: iy,
        w: 0,
        h: 0,
        r: 0,
        fill: '',
        draw: null,
        styled: true,
      };
      const lh = lineHeight(el.st, el.size);
      c.ov = () => [this.selection(tempBox)];
      yield* this.moveTo(
        c,
        { x: ix + el.w, y: iy + lh },
        {
          speed: 0.92,
          drag: true,
          bend: 0,
          onStep: () => {
            tempBox.w = Math.max(0, c.x - ix);
            tempBox.h = Math.max(0, c.y - iy);
          },
        }
      );
      el.vis = true;
      el.editing = true;
      this.bump(el);
    }

    c.shape = 'ibeam';
    c.ov = () => [{ t: 'box', b: this.bounds(el) }];
    yield* this.moveTo(
      c,
      { x: c.x + rand(-28, 10), y: c.y + rand(10, 28) },
      { speed: 1.5 }
    );
    yield* this.type(el, el.text);
    yield* this.wait(0.12);
    el.editing = false;
    this.bump(el);
    c.shape = 'arrow';
    c.ov = () => [this.selection(el)];

    if (grow) {
      const steps = [26, 36, 48, 60].filter((sz) => sz < el.st.size);
      for (const sz of [...steps, el.st.size]) {
        yield* this.wait(0.06);
        el.size = sz;
        this.bump(el);
      }
      soundEngine.playSnap();
      yield* this.wait(0.15);
    }

    if (snapGuide) {
      const gTask = this.byTask.get(`g:${snapGuide.id}`);
      while (gTask && gTask.state !== 'done') yield;

      const b = this.bounds(el);
      const grabPt: Pt = {
        x: b.x + Math.min(b.w * 0.4, 60) + rand(-6, 6),
        y: b.y + Math.min(b.h * 0.5, 22),
      };
      yield* this.moveTo(c, grabPt);
      c.press = 1;
      const snapTarget: Pt = { x: grabPt.x - el.dx, y: grabPt.y - el.dy };
      const overshoot: Pt = {
        x: snapTarget.x + (snapGuide.axis === 'x' ? -rand(2, 5) : rand(-6, 6)),
        y: snapTarget.y + (snapGuide.axis === 'y' ? -rand(2, 5) : rand(-3, 3)),
      };
      const updateDrag = () => {
        let nx = c.x - snapTarget.x;
        let ny = c.y - snapTarget.y;
        if (snapGuide.axis === 'x' && Math.abs(nx) < 9) {
          if (nx !== 0 && el.dx !== 0) snapGuide.flash = 1;
          nx = 0;
        }
        if (snapGuide.axis === 'y' && Math.abs(ny) < 9) {
          if (ny !== 0 && el.dy !== 0) snapGuide.flash = 1;
          ny = 0;
        }
        el.dx = nx;
        el.dy = ny;
        this.bump(el);
      };
      yield* this.moveTo(c, overshoot, { speed: 0.6, drag: true, onStep: updateDrag });
      yield* this.wait(0.1);
      yield* this.moveTo(c, snapTarget, { speed: 2, onStep: updateDrag });
      el.dx = 0;
      el.dy = 0;
      this.bump(el);
      soundEngine.playSnap();
      yield* this.wait(0.22);
    } else {
      yield* this.wait(0.18);
    }

    c.ov = null;
  }

  private *dragGuide(c: Cursor, guide: GuideEl): Generator<void, void, number> {
    this.rulers.want++;
    try {
      const jitter = rand(-0.14, 0.14);
      const rulerGrabPt = (): Pt =>
        guide.axis === 'x'
          ? this.fromViewport(10, this.vp.vh * (0.45 + jitter))
          : this.fromViewport(this.vp.left + 320 * this.vp.s + jitter * 180, 10);

      c.shape = 'arrow';
      yield* this.moveTo(c, rulerGrabPt);
      while (this.rulers.t < 0.95) yield;
      yield* this.moveTo(c, rulerGrabPt, { speed: 3 });
      c.press = 1;
      c.shape = guide.axis === 'x' ? 'ew' : 'ns';
      guide.vis = true;
      guide.dragging = true;
      guide.op = 1;

      const syncGuide = () => {
        guide.cur = guide.axis === 'x' ? c.x : c.y;
      };
      syncGuide();

      const destPt = (): Pt => {
        const g = rulerGrabPt();
        return guide.axis === 'x' ? { x: guide.pos, y: g.y + 40 } : { x: g.x + 30, y: guide.pos };
      };
      yield* this.moveTo(c, destPt, { speed: 0.55, drag: true, onStep: syncGuide });
      guide.cur = guide.pos;
      guide.dragging = false;
      c.shape = 'arrow';
      soundEngine.playSnap();
      yield* this.wait(0.22);
    } finally {
      this.rulers.want--;
    }
  }

  private spacingOverlay(a: Bounds, b: Bounds): OverlayItem | null {
    const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    if (overlapY > 0) {
      const yMid = Math.max(a.y, b.y) + overlapY / 2;
      const [left, right] = a.x < b.x ? [a, b] : [b, a];
      const gap = right.x - (left.x + left.w);
      if (gap > 0) {
        return {
          t: 'measure',
          a: { x: left.x + left.w, y: yMid },
          b: { x: right.x, y: yMid },
          label: String(Math.round(gap)),
        };
      }
    } else if (overlapX > 0) {
      const xMid = Math.max(a.x, b.x) + overlapX / 2;
      const [top, bot] = a.y < b.y ? [a, b] : [b, a];
      const gap = bot.y - (top.y + top.h);
      if (gap > 0) {
        return {
          t: 'measure',
          a: { x: xMid, y: top.y + top.h },
          b: { x: xMid, y: bot.y },
          label: String(Math.round(gap)),
        };
      }
    }
    return null;
  }

  private *duplicate(c: Cursor, group: DupGroup, k: number): Generator<void, void, number> {
    const copy = group.copies[k];
    const completedSources = [
      { dx: 0, dy: 0, ids: group.ids },
      ...group.copies.filter((_, idx) => this.byTask.get(`d:${group.id}:${idx}`)?.state === 'done'),
    ];
    let nearest = completedSources[0];
    for (const src of completedSources) {
      if (
        Math.hypot(src.dx - copy.dx, src.dy - copy.dy) <
        Math.hypot(nearest.dx - copy.dx, nearest.dy - copy.dy)
      ) {
        nearest = src;
      }
    }

    const srcBounds = this.unionBounds(nearest.ids);
    c.shape = 'arrow';
    const grabPt: Pt = {
      x: srcBounds.x + Math.min(srcBounds.w * 0.45, 70) + rand(-8, 8),
      y: srcBounds.y + Math.min(srcBounds.h * 0.45, 30) + rand(-4, 4),
    };
    yield* this.moveTo(c, grabPt);
    yield* this.click(c);
    c.ov = () => [
      {
        t: 'box',
        b: srcBounds,
        handles: true,
        badge: `${Math.round(srcBounds.w)} × ${Math.round(srcBounds.h)}`,
      },
    ];
    yield* this.wait(rand(0.14, 0.26));
    c.shape = 'dup';
    yield* this.wait(0.12);
    c.press = 1;

    const startDx = nearest.dx - copy.dx;
    const startDy = nearest.dy - copy.dy;

    copy.ids.forEach((copyId, idx) => {
      const el = this.els.get(copyId);
      const master = this.els.get(group.ids[idx]);
      if (!el || !master) return;
      el.vis = true;
      el.dx = startDx;
      el.dy = startDy;
      if (el.kind === 'text' && master.kind === 'text') {
        el.shown = master.text;
      }
      if (el.kind === 'rect') {
        el.styled = true;
      }
      this.bump(el);
    });

    const dropPt: Pt = { x: grabPt.x - startDx, y: grabPt.y - startDy };
    c.ov = () => {
      const curBounds = this.unionBounds(copy.ids);
      const items: OverlayItem[] = [
        { t: 'box', b: srcBounds, color: 'red' },
        { t: 'box', b: curBounds, color: 'red' },
      ];
      const sp = this.spacingOverlay(srcBounds, curBounds);
      if (sp) items.push(sp);
      return items;
    };

    yield* this.moveTo(c, dropPt, {
      speed: 0.62,
      drag: true,
      onStep: () => {
        copy.ids.forEach((copyId) => {
          const el = this.els.get(copyId);
          if (!el) return;
          el.dx = c.x - dropPt.x;
          el.dy = c.y - dropPt.y;
          this.bump(el);
        });
      },
    });

    soundEngine.playSnap();
    yield* this.wait(0.1);
    c.shape = 'arrow';
    c.ov = () => {
      const curBounds = this.unionBounds(copy.ids);
      return [
        {
          t: 'box',
          b: curBounds,
          handles: true,
          badge: `${Math.round(curBounds.w)} × ${Math.round(curBounds.h)}`,
        },
      ];
    };
    yield* this.wait(0.3);
  }

  private *editText(c: Cursor, el: TextEl): Generator<void, void, number> {
    c.shape = 'arrow';
    const b = this.bounds(el);
    const firstW = measureText(el.shown, el.st, el.size, el.w).lines[0] ?? b.w;
    const xStart = el.align === 'center' && el.w ? b.x + (el.w - firstW) / 2 : b.x;
    yield* this.moveTo(c, {
      x: xStart + Math.min(firstW * 0.5, 50) + rand(-5, 5),
      y: b.y + lineHeight(el.st, el.size) * 0.55,
    });
    yield* this.click(c);
    yield* this.wait(0.08);
    yield* this.click(c);

    el.editing = true;
    el.selAll = true;
    this.bump(el);
    c.shape = 'ibeam';
    c.ov = () => [{ t: 'box', b: this.bounds(el) }];
    yield* this.wait(rand(0.18, 0.3));
    yield* this.type(el, el.text, true);
    yield* this.wait(0.1);
    el.editing = false;
    this.bump(el);
    c.shape = 'arrow';
    c.ov = () => [this.selection(el)];
    yield* this.wait(0.24);
  }
}
