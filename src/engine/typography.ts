export const CANVAS_W = 1280;
export const NAV_Y = 24;
export const NAV_H = 64;
export const RULER_SIZE = 20;

export const PALETTE = {
  paper: '#F8F9FA',
  ink: '#121417',
  muted: '#5F6672',
  subtle: '#8B929E',
  line: '#DCDFE4',
  card: '#FFFFFF',
  cardStroke: '#E2E5EA',
  codeBg: '#16181D',
  accent: '#0D99FF',
  red: '#F24822',
  pillBg: '#EEF0F4',
} as const;

export interface TextStyle {
  size: number;
  weight: number;
  lh: number;
  color: string;
  ls?: number;
  mono?: boolean;
  code?: boolean;
  pre?: boolean;
  upper?: boolean;
}

export const TEXT_STYLES = {
  brand: { size: 15, weight: 600, lh: 1.2, color: PALETTE.ink, ls: -0.02 },
  nav: { size: 14, weight: 500, lh: 1.3, color: PALETTE.muted },
  eyebrow: {
    size: 11.5,
    weight: 600,
    lh: 1.3,
    color: PALETTE.accent,
    ls: 0.08,
    mono: true,
    upper: true,
  },
  h1: { size: 68, weight: 700, lh: 1.04, color: PALETTE.ink, ls: -0.035 },
  h2: { size: 42, weight: 700, lh: 1.12, color: PALETTE.ink, ls: -0.028 },
  h3: { size: 20, weight: 600, lh: 1.25, color: PALETTE.ink, ls: -0.018 },
  lead: { size: 19, weight: 400, lh: 1.55, color: PALETTE.muted, ls: -0.01 },
  body: { size: 15, weight: 400, lh: 1.6, color: PALETTE.muted },
  small: { size: 12.5, weight: 400, lh: 1.45, color: PALETTE.subtle },
  cardCode: {
    size: 11,
    weight: 600,
    lh: 1.3,
    color: PALETTE.subtle,
    ls: 0.05,
    mono: true,
  },
  cardTitle: { size: 22, weight: 600, lh: 1.25, color: PALETTE.ink, ls: -0.02 },
  cardBody: { size: 14, weight: 400, lh: 1.55, color: PALETTE.muted },
  cardTag: { size: 11.5, weight: 500, lh: 1.4, color: PALETTE.subtle, mono: true },
  cardLink: { size: 13, weight: 600, lh: 1.3, color: PALETTE.ink },
  btnLight: { size: 14, weight: 600, lh: 1.3, color: '#FFFFFF' },
  btnDark: { size: 14, weight: 600, lh: 1.3, color: PALETTE.ink },
  code: { size: 12.5, weight: 400, lh: 1.72, color: '#E0E2E5', mono: true, code: true, pre: true },
  codeDim: { size: 12, weight: 500, lh: 1.4, color: '#81868D', mono: true },
  stat: { size: 13, weight: 500, lh: 1.45, color: PALETTE.accent, mono: true },
} satisfies Record<string, TextStyle>;

export function fontFamily(st: TextStyle): string {
  return st.mono
    ? '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    : 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
}

export function lineHeight(st: TextStyle, size = st.size): number {
  return Math.round(size * st.lh);
}

let measureCtx: CanvasRenderingContext2D | null = null;
const measureCache = new Map<string, { w: number; h: number; lines: number[] }>();

function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d');
  }
  return measureCtx;
}

export function measureText(
  text: string,
  st: TextStyle,
  size = st.size,
  maxWidth?: number
): { w: number; h: number; lines: number[] } {
  const key = `${text}|${st.weight}|${st.mono ? 1 : 0}|${st.ls ?? 0}|${size}|${maxWidth ?? -1}`;
  const cached = measureCache.get(key);
  if (cached) return cached;

  const ctx = getMeasureCtx();
  const lh = lineHeight(st, size);
  const lsPx = (st.ls ?? 0) * size;
  const rawParagraphs = (text || ' ').split('\n');
  const lines: number[] = [];

  if (!ctx) {
    for (const para of rawParagraphs) {
      const approxW = para.length * size * 0.56;
      if (maxWidth && !st.pre && approxW > maxWidth) {
        const rows = Math.max(1, Math.ceil(approxW / maxWidth));
        for (let r = 0; r < rows; r++) lines.push(r < rows - 1 ? maxWidth : approxW % maxWidth || maxWidth);
      } else {
        lines.push(approxW);
      }
    }
    const res = {
      w: Math.max(2, ...lines),
      h: Math.max(lh, lines.length * lh),
      lines,
    };
    measureCache.set(key, res);
    return res;
  }

  ctx.font = `${st.weight} ${size}px ${fontFamily(st)}`;
  const measureStr = (s: string) =>
    ctx.measureText(s).width + Math.max(0, s.length - 1) * lsPx;

  for (const para of rawParagraphs) {
    if (!maxWidth || st.pre) {
      lines.push(measureStr(para));
      continue;
    }
    const words = para.split(' ');
    let cur = '';
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word;
      if (measureStr(test) > maxWidth && cur) {
        lines.push(measureStr(cur));
        cur = word;
      } else {
        cur = test;
      }
    }
    lines.push(measureStr(cur));
  }

  const res = {
    w: Math.max(2, ...lines),
    h: Math.max(lh, lines.length * lh),
    lines,
  };
  if (measureCache.size > 400) measureCache.clear();
  measureCache.set(key, res);
  return res;
}
