import type { Cursor, CursorShape, SwarmEngine } from './swarmEngine';
import { PALETTE, RULER_SIZE } from './typography';

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  bg: string,
  text: string
) {
  ctx.save();
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  const tw = ctx.measureText(text).width;
  const bw = tw + 10;
  const bh = 18;
  const bx = cx - bw / 2;
  ctx.fillStyle = bg;
  roundRectPath(ctx, bx, top, bw, bh, 3);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, top + bh / 2 + 0.5);
  ctx.restore();
}

interface CursorPaths {
  arrow: Path2D;
  penCollar: Path2D;
  penBody: Path2D;
  penSlot: Path2D;
  penAdd: Path2D;
  cross: Path2D;
  ibeam: Path2D;
  resize: Path2D;
}

let cachedPaths: CursorPaths | null = null;

function getCursorPaths(): CursorPaths {
  if (!cachedPaths) {
    cachedPaths = {
      arrow: new Path2D(
        'M4.6 3.9 C4.2 3.1 4.9 2.4 5.7 2.8 L20.6 9.4 C21.5 9.8 21.4 11.1 20.4 11.3 L13.9 12.9 C13.4 13 13 13.4 12.9 13.9 L11.3 20.4 C11.1 21.4 9.8 21.5 9.4 20.6 Z'
      ),
      penCollar: new Path2D('M17.4 10.6 L20.6 13.8 L13.8 20.6 L10.6 17.4 Z'),
      penBody: new Path2D('M3 3 L13.1 6.3 L17.4 10.6 L10.6 17.4 L6.3 13.1 Z'),
      penSlot: new Path2D('M3.6 3.6 L8.9 8.9'),
      penAdd: new Path2D('M23 19.5 V26.5 M19.5 23 H26.5'),
      cross: new Path2D('M12 3.5 V20.5 M3.5 12 H20.5'),
      ibeam: new Path2D(
        'M8.5 4.5 H10.5 Q12 4.5 12 6 Q12 4.5 13.5 4.5 H15.5 M12 6 V18 M8.5 19.5 H10.5 Q12 19.5 12 18 Q12 19.5 13.5 19.5 H15.5'
      ),
      resize: new Path2D('M2.5 12 L7 7.5 V10.4 H17 V7.5 L21.5 12 L17 16.5 V13.6 H7 V16.5 Z'),
    };
  }
  return cachedPaths;
}

const HOTSPOTS: Record<CursorShape, [number, number]> = {
  arrow: [5, 3.5],
  dup: [5, 3.5],
  pen: [3, 3],
  'pen-add': [3, 3],
  'pen-close': [3, 3],
  cross: [12, 12],
  ibeam: [12, 12],
  ew: [12, 12],
  ns: [12, 12],
};

function drawCursorIcon(ctx: CanvasRenderingContext2D, c: Cursor) {
  const paths = getCursorPaths();
  const shape: CursorShape = c.shape;
  const [ox, oy] = HOTSPOTS[shape];
  const scale = 1 - c.press * 0.12;

  ctx.save();
  if (shape === 'arrow' && c.angle !== 0) {
    ctx.rotate((c.angle * Math.PI) / 180);
  }
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }
  ctx.translate(-ox, -oy);

  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.lineJoin = 'round';

  if (shape === 'arrow') {
    ctx.fillStyle = c.color;
    ctx.fill(paths.arrow);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.arrow);
  } else if (shape === 'dup') {
    ctx.save();
    ctx.translate(4, 3.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill(paths.arrow);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.3;
    ctx.stroke(paths.arrow);
    ctx.restore();

    ctx.fillStyle = c.color;
    ctx.fill(paths.arrow);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.arrow);
  } else if (shape === 'pen' || shape === 'pen-add' || shape === 'pen-close') {
    ctx.fillStyle = c.color;
    ctx.fill(paths.penCollar);
    ctx.fill(paths.penBody);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.penCollar);
    ctx.stroke(paths.penBody);

    ctx.lineCap = 'round';
    ctx.lineWidth = 1.2;
    ctx.stroke(paths.penSlot);
    ctx.beginPath();
    ctx.arc(10.2, 10.2, 1.75, 0, Math.PI * 2);
    ctx.stroke();

    if (shape === 'pen-add') {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.4;
      ctx.stroke(paths.penAdd);
      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1.3;
      ctx.stroke(paths.penAdd);
    } else if (shape === 'pen-close') {
      ctx.beginPath();
      ctx.arc(23, 23, 2.8, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  } else if (shape === 'cross') {
    ctx.lineCap = 'round';
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.6;
    ctx.stroke(paths.cross);
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.cross);
  } else if (shape === 'ibeam') {
    ctx.lineCap = 'round';
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3.6;
    ctx.stroke(paths.ibeam);
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.ibeam);
  } else if (shape === 'ew' || shape === 'ns') {
    if (shape === 'ns') {
      ctx.translate(12, 12);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-12, -12);
    }
    ctx.fillStyle = c.color;
    ctx.fill(paths.resize);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke(paths.resize);
  }

  ctx.restore();
}

function drawRulers(
  ctx: CanvasRenderingContext2D,
  engine: SwarmEngine,
  vw: number,
  vh: number
) {
  const t = engine.rulers.t;
  if (t <= 0.01) return;

  const { s, left, scrollY } = engine.vp;
  const shift = (t - 1) * RULER_SIZE;

  ctx.save();

  // Top Ruler
  ctx.save();
  ctx.translate(0, shift);
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(0, 0, vw, RULER_SIZE);
  ctx.strokeStyle = '#3A3A3A';
  ctx.beginPath();
  ctx.moveTo(0, RULER_SIZE - 0.5);
  ctx.lineTo(vw, RULER_SIZE - 0.5);
  ctx.stroke();

  // Selection bands in top ruler
  for (const c of engine.cursors) {
    if (!c.ov) continue;
    for (const item of c.ov()) {
      if (item.t !== 'box' || !item.handles) continue;
      const sx1 = left + item.b.x * s;
      const sx2 = left + (item.b.x + item.b.w) * s;
      ctx.fillStyle = 'rgba(13, 153, 255, 0.22)';
      ctx.fillRect(sx1, 0, sx2 - sx1, RULER_SIZE);
      ctx.fillStyle = PALETTE.accent;
      ctx.font = '500 9px Inter, system-ui, sans-serif';
      ctx.fillText(String(Math.round(item.b.x)), sx1 + 3, 10);
    }
  }

  // Ticks
  const step = s < 0.7 ? 100 : 50;
  const startX = Math.floor(-left / s / step) * step;
  const endX = Math.ceil((vw - left) / s / step) * step;
  ctx.font = '500 9px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#8C8C8C';
  ctx.strokeStyle = '#5E5E5E';
  for (let wx = startX; wx <= endX; wx += step) {
    const sx = Math.round(left + wx * s) + 0.5;
    if (sx < RULER_SIZE) continue;
    const major = wx % 100 === 0;
    ctx.beginPath();
    ctx.moveTo(sx, major ? 11 : 15);
    ctx.lineTo(sx, RULER_SIZE);
    ctx.stroke();
    if (major) {
      ctx.fillText(String(wx), sx + 3, 9);
    }
  }

  // Active dragging X guide ticks
  for (const el of engine.list) {
    if (el.kind === 'guide' && el.dragging && el.axis === 'x') {
      const sx = left + el.cur * s;
      ctx.strokeStyle = PALETTE.red;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, RULER_SIZE);
      ctx.stroke();
      ctx.fillStyle = PALETTE.red;
      ctx.fillText(String(Math.round(el.cur)), sx + 4, 10);
    }
  }
  ctx.restore();

  // Left Ruler
  ctx.save();
  ctx.translate(shift, 0);
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(0, 0, RULER_SIZE, vh);
  ctx.strokeStyle = '#3A3A3A';
  ctx.beginPath();
  ctx.moveTo(RULER_SIZE - 0.5, 0);
  ctx.lineTo(RULER_SIZE - 0.5, vh);
  ctx.stroke();

  for (const c of engine.cursors) {
    if (!c.ov) continue;
    for (const item of c.ov()) {
      if (item.t !== 'box' || !item.handles) continue;
      const sy1 = item.b.y * s - scrollY;
      const sy2 = (item.b.y + item.b.h) * s - scrollY;
      ctx.fillStyle = 'rgba(13, 153, 255, 0.22)';
      ctx.fillRect(0, sy1, RULER_SIZE, sy2 - sy1);
    }
  }

  const startY = Math.floor(scrollY / s / step) * step;
  const endY = Math.ceil((scrollY + vh) / s / step) * step;
  ctx.font = '500 9px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#8C8C8C';
  ctx.strokeStyle = '#5E5E5E';
  for (let wy = startY; wy <= endY; wy += step) {
    const sy = Math.round(wy * s - scrollY) + 0.5;
    if (sy < RULER_SIZE) continue;
    const major = wy % 100 === 0;
    ctx.beginPath();
    ctx.moveTo(major ? 11 : 15, sy);
    ctx.lineTo(RULER_SIZE, sy);
    ctx.stroke();
    if (major) {
      ctx.save();
      ctx.translate(10, sy - 3);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(String(wy), 0, 0);
      ctx.restore();
    }
  }

  for (const el of engine.list) {
    if (el.kind === 'guide' && el.dragging && el.axis === 'y') {
      const sy = el.cur * s - scrollY;
      ctx.strokeStyle = PALETTE.red;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(RULER_SIZE, sy);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Corner Cap
  ctx.globalAlpha = t;
  ctx.fillStyle = '#2C2C2C';
  ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE);

  ctx.restore();
}

export function renderSwarmOverlay(
  ctx: CanvasRenderingContext2D,
  engine: SwarmEngine,
  vw: number,
  vh: number,
  dpr = 1
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, vw, vh);

  const { s, left, scrollY } = engine.vp;
  const toSX = (wx: number) => left + wx * s;
  const toSY = (wy: number, sticky = false) =>
    (wy + (sticky ? engine.stick : 0)) * s - scrollY;

  // 1. Guides & active pen-tool anchor lines
  for (const el of engine.list) {
    if (el.kind === 'guide' && el.vis && el.op > 0) {
      ctx.save();
      ctx.globalAlpha = el.op;
      ctx.strokeStyle = PALETTE.red;
      ctx.lineWidth = 1 + el.flash;
      if (el.flash > 0) {
        ctx.shadowColor = PALETTE.red;
        ctx.shadowBlur = 4;
      }
      ctx.beginPath();
      if (el.axis === 'x') {
        const sx = toSX(el.cur);
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, vh);
      } else {
        const sy = toSY(el.cur);
        ctx.moveTo(0, sy);
        ctx.lineTo(vw, sy);
      }
      ctx.stroke();
      ctx.restore();
    }

    if (el.kind === 'path' && el.edit) {
      const pts = el.pts.slice(0, el.placed).map((p) => ({
        x: toSX(p.x),
        y: toSY(p.y, el.sticky),
      }));
      const owner = el.owner != null ? engine.cursors.find((c) => c.id === el.owner) : null;
      const poly = owner
        ? [...pts, { x: toSX(owner.x), y: toSY(owner.y, el.sticky) }]
        : pts;

      if (poly.length > 0) {
        ctx.save();
        ctx.strokeStyle = PALETTE.accent;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        poly.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        if (el.shut && pts.length > 0) ctx.lineTo(pts[0].x, pts[0].y);
        ctx.stroke();

        for (const p of pts) {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = PALETTE.accent;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  // 1b. Hover Figma selection outline + 4 corner handles on selectable cards
  if (engine.mouse) {
    const mw = engine.fromViewport(engine.mouse.x, engine.mouse.y);
    for (const el of engine.list) {
      if (
        el.kind === 'rect' &&
        el.selectable &&
        el.vis &&
        el.styled &&
        !el.draw &&
        el.dx === 0 &&
        el.dy === 0 &&
        mw.x >= el.x &&
        mw.x <= el.x + el.w &&
        mw.y >= el.y &&
        mw.y <= el.y + el.h
      ) {
        const sx = toSX(el.x);
        const sy = toSY(el.y);
        const sw = el.w * s;
        const sh = el.h * s;

        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = PALETTE.accent;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, sw, sh);

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = PALETTE.accent;
        ctx.lineWidth = 1.2;
        const corners: [number, number][] = [
          [sx, sy],
          [sx + sw, sy],
          [sx, sy + sh],
          [sx + sw, sy + sh],
        ];
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
          ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7);
        }
        ctx.restore();
        break;
      }
    }
  }

  // 2. Selection Boxes, Handles, Ruler Projections & Spacing Badges
  const rulerT = engine.rulers.t;
  for (const c of engine.cursors) {
    if (!c.ov) continue;
    for (const item of c.ov()) {
      if (item.t === 'box') {
        const sx = toSX(item.b.x);
        const sy = toSY(item.b.y, c.sticky);
        const sw = item.b.w * s;
        const sh = item.b.h * s;
        const strokeColor = item.color === 'red' ? PALETTE.red : PALETTE.accent;

        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, sw, sh);

        if (item.underline && item.underline.w > 0) {
          const ux = toSX(item.underline.x);
          const uy = toSY(item.underline.y, c.sticky);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(ux + item.underline.w * s, uy);
          ctx.stroke();
        }

        if (item.rulerLines && rulerT > 0.05) {
          ctx.save();
          ctx.globalAlpha = rulerT;
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = PALETTE.accent;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(RULER_SIZE, sy + sh / 2);
          ctx.lineTo(sx, sy + sh / 2);
          ctx.moveTo(sx + sw / 2, RULER_SIZE);
          ctx.lineTo(sx + sw / 2, sy);
          ctx.stroke();
          ctx.restore();
        }

        if (item.handles) {
          const corners: [number, number][] = [
            [sx, sy],
            [sx + sw, sy],
            [sx, sy + sh],
            [sx + sw, sy + sh],
          ];
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = PALETTE.accent;
          ctx.lineWidth = 1;
          for (const [hx, hy] of corners) {
            ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
            ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7);
          }
        }

        if (item.badge && sw > 0) {
          drawBadge(ctx, sx + sw / 2, sy + sh + 8, strokeColor, item.badge);
        }
        ctx.restore();
      } else {
        const ax = toSX(item.a.x);
        const ay = toSY(item.a.y, c.sticky);
        const bx = toSX(item.b.x);
        const by = toSY(item.b.y, c.sticky);

        ctx.save();
        ctx.strokeStyle = PALETTE.red;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        const horizontal = Math.abs(ay - by) < 1;
        drawBadge(
          ctx,
          horizontal ? (ax + bx) / 2 : ax + 20,
          horizontal ? ay + 8 : (ay + by) / 2 - 9,
          PALETTE.red,
          item.label
        );
        ctx.restore();
      }
    }
  }

  // 3. Dark Figma Rulers
  drawRulers(ctx, engine, vw, vh);

  // 4. Multiplayer Cursors
  for (const c of engine.cursors) {
    const sx = toSX(c.x);
    const sy = toSY(c.y, c.sticky);
    if (sx < -90 || sx > vw + 90 || sy < -90 || sy > vh + 90) continue;

    ctx.save();
    ctx.translate(sx, sy);
    drawCursorIcon(ctx, c);
    ctx.restore();
  }
}
