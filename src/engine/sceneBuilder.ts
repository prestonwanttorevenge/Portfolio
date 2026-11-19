import {
  experienceData,
  profileData,
  projectsData,
  skillsData,
} from '../data';
import { PALETTE, TEXT_STYLES, type TextStyle } from './typography';

export interface Pt {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ElBase {
  id: string;
  v: number;
  vis: boolean;
  dx: number;
  dy: number;
  sticky?: boolean;
}

export interface RectEl extends ElBase {
  kind: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  fill: string;
  stroke?: string;
  draw: { w: number; h: number } | null;
  styled: boolean;
  href?: string;
  external?: boolean;
  image?: string;
  imagePosition?: string;
  selectable?: boolean;
}

export interface TextEl extends ElBase {
  kind: 'text';
  x: number;
  y: number;
  w?: number;
  align: 'left' | 'center' | 'right';
  text: string;
  shown: string;
  st: TextStyle;
  size: number;
  editing: boolean;
  selAll: boolean;
  dyn?: () => string;
  href?: string;
  external?: boolean;
}

export interface PathEl extends ElBase {
  kind: 'path';
  pts: Pt[];
  closed: boolean;
  stroke: string;
  sw: number;
  fill?: string;
  d?: string;
  tf?: { x: number; y: number; s: number };
  add: boolean;
  placed: number;
  shut: boolean;
  edit: boolean;
  owner: number | null;
  fillOn: boolean;
}

export interface GuideEl extends ElBase {
  kind: 'guide';
  axis: 'x' | 'y';
  pos: number;
  cur: number;
  op: number;
  flash: number;
  dragging: boolean;
}

export type SceneEl = RectEl | TextEl | PathEl | GuideEl;

export type TaskSpec =
  | { type: 'path'; el: string }
  | { type: 'rect'; el: string }
  | { type: 'text'; el: string; snap?: string; grow?: boolean }
  | { type: 'guide'; el: string }
  | { type: 'dup'; group: string; k: number }
  | { type: 'edit'; el: string };

export interface TaskDef {
  id: string;
  y: number;
  spec: TaskSpec;
  deps: string[];
}

export interface DupCopy {
  dx: number;
  dy: number;
  edits: string[];
  rectFills?: Record<string, string>;
  hrefs?: Record<string, string>;
}

export interface DupGroup {
  id: string;
  ids: string[];
  copies: {
    dx: number;
    dy: number;
    ids: string[];
  }[];
}

export interface AnchorDef {
  id: string;
  y: number;
}

export interface SceneData {
  els: SceneEl[];
  tasks: TaskDef[];
  groups: DupGroup[];
  anchors: AnchorDef[];
  height: number;
}

// Geometric "P" monogram (viewBox 0 0 100 120) for intro emblem & pen-drawn brand mark
export const MONOGRAM_PATHS: { d: string; anchors: [number, number][] }[] = [
  {
    d: 'M12 108V12H62C80.7777 12 92 23.2223 92 41C92 58.7777 80.7777 70 62 70H34V108H12ZM34 50H59C67.2843 50 71 46.2843 71 41C71 35.7157 67.2843 32 59 32H34V50Z',
    anchors: [
      [12, 108],
      [12, 12],
      [62, 12],
      [92, 41],
      [62, 70],
      [34, 70],
      [34, 108],
    ],
  },
];

export const RAIL_L = 72;
export const RAIL_R = 1208;
export const X0 = 112;
export const CONTENT_W = 1056;

export function buildPortfolioScene(getAgentCount: () => number): SceneData {
  const els: SceneEl[] = [];
  const tasks: TaskDef[] = [];
  const groups: DupGroup[] = [];
  const elMap = new Map<string, SceneEl>();
  let currentSticky = false;

  const reg = <T extends SceneEl>(el: T): T => {
    els.push(el);
    elMap.set(el.id, el);
    return el;
  };

  const addTask = (id: string, y: number, spec: TaskSpec, deps: string[] = []) => {
    tasks.push({ id, y, spec, deps });
  };

  const addPath = (
    id: string,
    pts: Pt[],
    opts: {
      closed?: boolean;
      stroke?: string;
      sw?: number;
      fill?: string;
      d?: string;
      tf?: { x: number; y: number; s: number };
      add?: boolean;
      deps?: string[];
      yOverride?: number;
    } = {}
  ) => {
    reg<PathEl>({
      kind: 'path',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      sticky: currentSticky,
      pts,
      closed: !!opts.closed,
      stroke: opts.stroke ?? PALETTE.line,
      sw: opts.sw ?? 1,
      fill: opts.fill,
      d: opts.d,
      tf: opts.tf,
      add: opts.add ?? true,
      placed: 0,
      shut: false,
      edit: false,
      owner: null,
      fillOn: false,
    });
    const minY = opts.yOverride ?? Math.min(...pts.map((p) => p.y));
    addTask(`p:${id}`, minY, { type: 'path', el: id }, opts.deps ?? []);
  };

  const addRect = (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: {
      r?: number;
      fill?: string;
      stroke?: string;
      deps?: string[];
      href?: string;
      external?: boolean;
      image?: string;
      imagePosition?: string;
      selectable?: boolean;
    } = {}
  ) => {
    reg<RectEl>({
      kind: 'rect',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      sticky: currentSticky,
      x,
      y,
      w,
      h,
      r: opts.r ?? 0,
      fill: opts.fill ?? PALETTE.card,
      stroke: opts.stroke,
      draw: null,
      styled: false,
      href: opts.href,
      external: opts.external,
      image: opts.image,
      imagePosition: opts.imagePosition,
      selectable: opts.selectable,
    });
    addTask(`r:${id}`, y, { type: 'rect', el: id }, opts.deps ?? []);
  };

  const addText = (
    id: string,
    x: number,
    y: number,
    text: string,
    st: TextStyle,
    opts: {
      w?: number;
      align?: 'left' | 'center' | 'right';
      snap?: string;
      grow?: boolean;
      deps?: string[];
      dyn?: () => string;
      href?: string;
      external?: boolean;
    } = {}
  ) => {
    const finalText = st.upper ? text.toUpperCase() : text;
    reg<TextEl>({
      kind: 'text',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      sticky: currentSticky,
      x,
      y,
      w: opts.w,
      align: opts.align ?? 'left',
      text: finalText,
      shown: '',
      st,
      size: st.size,
      editing: false,
      selAll: false,
      dyn: opts.dyn,
      href: opts.href,
      external: opts.external,
    });
    addTask(
      `t:${id}`,
      y,
      { type: 'text', el: id, snap: opts.snap, grow: opts.grow },
      opts.deps ?? []
    );
  };

  const addGuide = (id: string, axis: 'x' | 'y', pos: number, triggerY: number) => {
    reg<GuideEl>({
      kind: 'guide',
      id,
      v: 0,
      vis: false,
      dx: 0,
      dy: 0,
      axis,
      pos,
      cur: pos,
      op: 1,
      flash: 0,
      dragging: false,
    });
    addTask(`g:${id}`, triggerY, { type: 'guide', el: id }, []);
  };

  const addDupGroup = (groupId: string, sourceIds: string[], copies: DupCopy[]) => {
    const group: DupGroup = { id: groupId, ids: sourceIds, copies: [] };
    const sourceTaskIds = tasks
      .filter((t) => 'el' in t.spec && sourceIds.includes(t.spec.el))
      .map((t) => t.id);

    const dupTaskIds: string[] = [];

    copies.forEach((copy, k) => {
      const copiedIds: string[] = [];
      let textIdx = 0;

      for (const srcId of sourceIds) {
        const src = elMap.get(srcId);
        if (!src) continue;
        const copyId = `${srcId}~${k + 1}`;
        copiedIds.push(copyId);

        if (src.kind === 'text') {
          const rawEdit = copy.edits[textIdx];
          const nextText = rawEdit != null ? (src.st.upper ? rawEdit.toUpperCase() : rawEdit) : src.text;
          const nextHref = copy.hrefs && srcId in copy.hrefs ? copy.hrefs[srcId] : src.href;
          const nextExternal =
            copy.hrefs && srcId in copy.hrefs ? nextHref?.startsWith('http') : src.external;
          reg<TextEl>({
            ...src,
            id: copyId,
            x: src.x + copy.dx,
            y: src.y + copy.dy,
            text: nextText,
            shown: '',
            href: nextHref,
            external: nextExternal,
          });
          textIdx++;
        } else if (src.kind === 'rect') {
          const nextFill = copy.rectFills && srcId in copy.rectFills ? copy.rectFills[srcId] : src.fill;
          const nextHref = copy.hrefs && srcId in copy.hrefs ? copy.hrefs[srcId] : src.href;
          const nextExternal =
            copy.hrefs && srcId in copy.hrefs ? nextHref?.startsWith('http') : src.external;
          reg<RectEl>({
            ...src,
            id: copyId,
            x: src.x + copy.dx,
            y: src.y + copy.dy,
            fill: nextFill,
            href: nextHref,
            external: nextExternal,
          });
        }
      }

      group.copies.push({ dx: copy.dx, dy: copy.dy, ids: copiedIds });
      const minY = Math.min(
        ...copiedIds.map((id) => {
          const el = elMap.get(id);
          return el && 'y' in el ? el.y : 0;
        })
      );
      const dTaskId = `d:${groupId}:${k}`;
      dupTaskIds.push(dTaskId);
      addTask(dTaskId, minY, { type: 'dup', group: groupId, k }, sourceTaskIds);
    });

    // Queue editText tasks for every copied text node that changed
    group.copies.forEach((copy) => {
      copy.ids.forEach((copyId, idx) => {
        const copyEl = elMap.get(copyId);
        const srcEl = elMap.get(sourceIds[idx]);
        if (copyEl?.kind === 'text' && srcEl?.kind === 'text' && copyEl.text !== srcEl.text) {
          addTask(`e:${copyId}`, copyEl.y, { type: 'edit', el: copyId }, dupTaskIds);
        }
      });
    });

    groups.push(group);
  };

  const addSectionFrame = (
    name: string,
    topY: number,
    botY: number,
    reverseDivider = false
  ) => {
    const xPair = reverseDivider ? [1280, 0] : [0, 1280];
    addPath(`rule-${name}`, [
      { x: xPair[0], y: botY },
      { x: xPair[1], y: botY },
    ]);
    addPath(`rail-l-${name}`, [
      { x: RAIL_L, y: topY },
      { x: RAIL_L, y: botY },
    ]);
    addPath(`rail-r-${name}`, [
      { x: RAIL_R, y: botY },
      { x: RAIL_R, y: topY },
    ]);
  };

  const addLogoMark = (prefix: string, x: number, y: number, height: number) => {
    const scale = height / 120;
    const tf = { x, y, s: scale };
    MONOGRAM_PATHS.forEach((mp, idx) => {
      addPath(
        `${prefix}-${idx}`,
        mp.anchors.map(([ax, ay]) => ({ x: x + ax * scale, y: y + ay * scale })),
        {
          d: mp.d,
          tf,
          stroke: PALETTE.ink,
          fill: PALETTE.ink,
          closed: true,
          add: false,
          yOverride: y,
        }
      );
    });
  };

  // =========================================================================
  // STICKY NAV (y: 24..88)
  // =========================================================================
  currentSticky = true;
  addPath('nav-rule', [
    { x: 0, y: 88 },
    { x: 1280, y: 88 },
  ]);
  addLogoMark('nav-mark', X0, 44, 24);
  addText('nav-brand', X0 + 32, 47, 'preston.dev', TEXT_STYLES.brand);
  addText('nav-1', 806, 47, 'Projects', TEXT_STYLES.nav, { w: 72, href: '#projects' });
  addDupGroup('nav-links', ['nav-1'], [
    { dx: 92, dy: 0, edits: ['Skills'], hrefs: { 'nav-1': '#skills' } },
    { dx: 164, dy: 0, edits: ['Timeline'], hrefs: { 'nav-1': '#experience' } },
    {
      dx: 258,
      dy: 0,
      edits: ['GitHub ↗'],
      hrefs: { 'nav-1': 'https://github.com/prestonwanttorevenge' },
    },
  ]);
  currentSticky = false;

  // =========================================================================
  // SECTION 0: HERO (y: 88..670)
  // =========================================================================
  addSectionFrame('hero', 88, 670);
  addGuide('g-hero', 'x', X0, 110);

  addText(
    'hero-eye',
    X0,
    158,
    `${profileData.role} · ${profileData.location}`,
    TEXT_STYLES.eyebrow,
    { w: 540, snap: 'g-hero' }
  );
  addText('hero-h1', X0, 194, profileData.name, TEXT_STYLES.h1, {
    w: 580,
    snap: 'g-hero',
    grow: true,
  });
  addText(
    'hero-lead',
    X0,
    296,
    `${profileData.tagline} ${profileData.bio[0]}`,
    TEXT_STYLES.lead,
    { w: 560, snap: 'g-hero' }
  );

  addRect('hero-btn-1', X0, 468, 192, 48, {
    r: 8,
    fill: PALETTE.ink,
    href: '#projects',
  });
  addText('hero-btn-1-t', X0, 482, 'Explore Projects ↓', TEXT_STYLES.btnLight, {
    w: 192,
    align: 'center',
    deps: ['r:hero-btn-1'],
    href: '#projects',
  });

  addRect('hero-btn-2', X0 + 208, 468, 168, 48, {
    r: 8,
    fill: PALETTE.card,
    stroke: PALETTE.cardStroke,
    href: 'https://github.com/prestonwanttorevenge',
    external: true,
  });
  addText('hero-btn-2-t', X0 + 208, 482, 'GitHub ↗', TEXT_STYLES.btnDark, {
    w: 168,
    align: 'center',
    deps: ['r:hero-btn-2'],
    href: 'https://github.com/prestonwanttorevenge',
    external: true,
  });

  addText('hero-status', X0, 546, profileData.status, TEXT_STYLES.small, {
    w: 540,
    deps: ['r:hero-btn-1'],
  });

  // Hero Right: Code Spec Card
  addRect('hero-code-bg', 716, 168, 452, 374, {
    r: 12,
    fill: PALETTE.codeBg,
    stroke: '#2A2F3A',
  });
  addText('hero-code-fn', 742, 192, 'preston.config.ts', TEXT_STYLES.codeDim, {
    w: 400,
    deps: ['r:hero-code-bg'],
  });

  const formatSpecLine = (key: string, value: string): string => {
    const single = `  ${key}: ${value},`;
    const trimmed = value.trim();
    if (single.length > 40 && trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const items = trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const rows: string[] = [];
      for (let i = 0; i < items.length; i += 2) {
        rows.push(`    ${items.slice(i, i + 2).join(', ')},`);
      }
      return [`  ${key}: [`, ...rows, '  ],'].join('\n');
    }
    return single;
  };

  const codeBody = [
    'export const engineer = {',
    ...profileData.specLines.map((l) => formatSpecLine(l.key, l.value)),
    '} as const;',
  ].join('\n');

  addText('hero-code-body', 742, 228, codeBody, TEXT_STYLES.code, {
    w: 400,
    deps: ['r:hero-code-bg', 't:hero-code-fn'],
  });

  // =========================================================================
  // SECTION 1: SELECTED PROJECTS (y: 670..1580)
  // =========================================================================
  addSectionFrame('proj', 670, 1580, true);
  addGuide('g-proj', 'x', X0, 700);

  addText('proj-eye', X0, 720, '01 / Selected Projects', TEXT_STYLES.eyebrow, {
    w: 320,
    snap: 'g-proj',
  });
  addText('proj-h2', X0, 748, 'Projects & Engineering Work', TEXT_STYLES.h2, {
    w: 680,
    snap: 'g-proj',
  });

  // Row 1: 3 Featured Cards (w = 336, gap = 24 => dx = 360)
  const featured = projectsData.slice(0, 3);
  const p0 = featured[0];
  const r1Y = 824;

  addRect('p1-card', X0, r1Y, 336, 352, {
    r: 12,
    fill: PALETTE.card,
    stroke: PALETTE.cardStroke,
    selectable: true,
  });
  addText('p1-code', X0 + 24, r1Y + 24, p0.blueprintCode, TEXT_STYLES.cardCode, {
    w: 288,
    deps: ['r:p1-card'],
  });
  addText('p1-title', X0 + 24, r1Y + 48, p0.title, TEXT_STYLES.cardTitle, {
    w: 288,
    deps: ['r:p1-card'],
  });
  addText('p1-cat', X0 + 24, r1Y + 80, `${p0.category} · ${p0.year}`, TEXT_STYLES.small, {
    w: 288,
    deps: ['r:p1-card'],
  });
  addText('p1-desc', X0 + 24, r1Y + 114, p0.description, TEXT_STYLES.cardBody, {
    w: 288,
    deps: ['r:p1-card'],
  });
  addText('p1-tags', X0 + 24, r1Y + 256, p0.tags.join(' · '), TEXT_STYLES.cardTag, {
    w: 288,
    deps: ['r:p1-card'],
  });
  addText(
    'p1-link',
    X0 + 24,
    r1Y + 306,
    p0.liveUrl ? 'Open Live Demo ↗' : 'View Repository ↗',
    TEXT_STYLES.cardLink,
    {
      w: 180,
      deps: ['r:p1-card'],
      href: p0.liveUrl ?? p0.repoUrl,
      external: true,
    }
  );

  addDupGroup(
    'proj-row-1',
    ['p1-card', 'p1-code', 'p1-title', 'p1-cat', 'p1-desc', 'p1-tags', 'p1-link'],
    featured.slice(1).map((proj, i) => ({
      dx: (i + 1) * 360,
      dy: 0,
      edits: [
        proj.blueprintCode,
        proj.title,
        `${proj.category} · ${proj.year}`,
        proj.description,
        proj.tags.join(' · '),
        proj.id === 'legacy-portfolio' ? 'View Repository ↗' : 'Open Live Demo ↗',
      ],
      hrefs: {
        'p1-link':
          proj.id === 'legacy-portfolio'
            ? proj.repoUrl ?? proj.liveUrl ?? '#'
            : proj.liveUrl ?? proj.repoUrl ?? '#',
      },
    }))
  );

  // Row 2: 2 Systems / PBL Cards (w = 516, gap = 24 => dx = 540)
  const systems = projectsData.slice(3, 5);
  const s0 = systems[0];
  const r2Y = 1206;

  addRect('p2-card', X0, r2Y, 516, 310, {
    r: 12,
    fill: PALETTE.card,
    stroke: PALETTE.cardStroke,
    selectable: true,
  });
  addText('p2-code', X0 + 26, r2Y + 26, s0.blueprintCode, TEXT_STYLES.cardCode, {
    w: 464,
    deps: ['r:p2-card'],
  });
  addText('p2-title', X0 + 26, r2Y + 52, s0.title, TEXT_STYLES.cardTitle, {
    w: 464,
    deps: ['r:p2-card'],
  });
  addText('p2-cat', X0 + 26, r2Y + 86, `${s0.category} · ${s0.year}`, TEXT_STYLES.small, {
    w: 464,
    deps: ['r:p2-card'],
  });
  addText(
    'p2-desc',
    X0 + 26,
    r2Y + 120,
    `${s0.description}\n• ${s0.highlights[0]}`,
    TEXT_STYLES.cardBody,
    { w: 464, deps: ['r:p2-card'] }
  );
  addText('p2-tags', X0 + 26, r2Y + 236, s0.tags.join(' · '), TEXT_STYLES.cardTag, {
    w: 464,
    deps: ['r:p2-card'],
  });
  addText('p2-link', X0 + 26, r2Y + 272, 'View on GitHub ↗', TEXT_STYLES.cardLink, {
    w: 180,
    deps: ['r:p2-card'],
    href: s0.repoUrl ?? 'https://github.com/prestonwanttorevenge',
    external: true,
  });

  if (systems[1]) {
    const s1 = systems[1];
    addDupGroup(
      'proj-row-2',
      ['p2-card', 'p2-code', 'p2-title', 'p2-cat', 'p2-desc', 'p2-tags', 'p2-link'],
      [
        {
          dx: 540,
          dy: 0,
          edits: [
            s1.blueprintCode,
            s1.title,
            `${s1.category} · ${s1.year}`,
            `${s1.description}\n• ${s1.highlights[0]}`,
            s1.tags.join(' · '),
            'View on GitHub ↗',
          ],
          hrefs: { 'p2-link': s1.repoUrl ?? 'https://github.com/prestonwanttorevenge' },
        },
      ]
    );
  }

  // =========================================================================
  // SECTION 2: TECHNICAL STACK / SKILLS (y: 1580..2160)
  // =========================================================================
  addSectionFrame('skills', 1580, 2160);
  addPath('skills-div-1', [
    { x: 454, y: 1730 },
    { x: 454, y: 2110 },
  ]);
  addPath('skills-div-2', [
    { x: 814, y: 1730 },
    { x: 814, y: 2110 },
  ]);
  addGuide('g-skills', 'x', X0, 1610);

  addText('sk-eye', X0, 1626, '02 / Technical Stack', TEXT_STYLES.eyebrow, {
    w: 320,
    snap: 'g-skills',
  });
  addText('sk-h2', X0, 1654, 'Languages, Systems & CS Core', TEXT_STYLES.h2, {
    w: 720,
    snap: 'g-skills',
  });

  const g0 = skillsData[0];
  const skY = 1742;
  const formatSkillLine = (item?: { name: string; note?: string }) =>
    item ? (item.note ? `${item.name}  —  ${item.note}` : item.name) : '';

  addText('sk-code', X0, skY, g0.laneCode, TEXT_STYLES.cardCode, { w: 312 });
  addText('sk-title', X0, skY + 26, g0.title, TEXT_STYLES.h3, { w: 312 });
  addText('sk-i0', X0, skY + 76, formatSkillLine(g0.items[0]), TEXT_STYLES.body, { w: 312 });
  addText('sk-i1', X0, skY + 118, formatSkillLine(g0.items[1]), TEXT_STYLES.body, { w: 312 });
  addText('sk-i2', X0, skY + 160, formatSkillLine(g0.items[2]), TEXT_STYLES.body, { w: 312 });
  addText('sk-i3', X0, skY + 202, formatSkillLine(g0.items[3]), TEXT_STYLES.body, { w: 312 });
  addText('sk-i4', X0, skY + 244, formatSkillLine(g0.items[4]), TEXT_STYLES.body, { w: 312 });

  addDupGroup(
    'skill-cols',
    ['sk-code', 'sk-title', 'sk-i0', 'sk-i1', 'sk-i2', 'sk-i3', 'sk-i4'],
    skillsData.slice(1).map((grp, i) => ({
      dx: (i + 1) * 360,
      dy: 0,
      edits: [
        grp.laneCode,
        grp.title,
        formatSkillLine(grp.items[0]),
        formatSkillLine(grp.items[1]),
        formatSkillLine(grp.items[2]),
        formatSkillLine(grp.items[3]),
        formatSkillLine(grp.items[4]),
      ],
    }))
  );

  // =========================================================================
  // SECTION 3: EXPERIENCE & MENTORSHIP (y: 2160..2840)
  // =========================================================================
  addSectionFrame('exp', 2160, 2840, true);
  addPath('exp-split', [
    { x: 468, y: 2160 },
    { x: 468, y: 2840 },
  ]);
  addGuide('g-exp', 'x', X0, 2190);

  addText('exp-eye', X0, 2212, '03 / Background', TEXT_STYLES.eyebrow, {
    w: 320,
    snap: 'g-exp',
  });
  addText('exp-h2', X0, 2240, 'Education &\nMentorship', TEXT_STYLES.h2, {
    w: 320,
    snap: 'g-exp',
  });
  addRect('exp-portrait', X0, 2354, 320, 376, {
    r: 12,
    fill: '#16181D',
    stroke: PALETTE.cardStroke,
    image: profileData.avatar,
    imagePosition: 'center 15%',
  });
  addText('exp-uni', X0, 2746, profileData.university, TEXT_STYLES.cardLink, {
    w: 320,
    deps: ['r:exp-portrait'],
  });
  addText('exp-major', X0, 2788, profileData.major, TEXT_STYLES.small, {
    w: 320,
    deps: ['r:exp-portrait'],
  });

  const ex0 = experienceData[0];
  const exX = 508;
  const exY = 2224;

  addRect('ex-card', exX, exY, 660, 168, {
    r: 10,
    fill: PALETTE.card,
    stroke: PALETTE.cardStroke,
  });
  addText(
    'ex-period',
    exX + 24,
    exY + 22,
    `${ex0.period} · ${ex0.type.toUpperCase()}`,
    TEXT_STYLES.cardCode,
    { w: 612, deps: ['r:ex-card'] }
  );
  addText('ex-title', exX + 24, exY + 46, ex0.title, TEXT_STYLES.h3, {
    w: 612,
    deps: ['r:ex-card'],
  });
  addText('ex-org', exX + 24, exY + 76, ex0.organization, TEXT_STYLES.small, {
    w: 612,
    deps: ['r:ex-card'],
  });
  addText('ex-sum', exX + 24, exY + 104, ex0.summary, TEXT_STYLES.cardBody, {
    w: 612,
    deps: ['r:ex-card'],
  });

  addDupGroup(
    'exp-rows',
    ['ex-card', 'ex-period', 'ex-title', 'ex-org', 'ex-sum'],
    experienceData.slice(1, 3).map((item, i) => ({
      dx: 0,
      dy: (i + 1) * 192,
      edits: [
        `${item.period} · ${item.type.toUpperCase()}`,
        item.title,
        item.organization,
        item.summary,
      ],
    }))
  );

  // =========================================================================
  // SECTION 4: CTA & FOOTER (y: 2840..3480)
  // =========================================================================
  addSectionFrame('cta', 2840, 3250);
  addPath('cta-split', [
    { x: 760, y: 2840 },
    { x: 760, y: 3250 },
  ]);
  addGuide('g-cta', 'x', X0, 2870);
  addGuide('g-cta-r', 'x', 800, 2870);

  addText('cta-h1', X0, 2896, 'Get in touch.', TEXT_STYLES.h1, {
    w: 580,
    snap: 'g-cta',
    grow: true,
  });
  addText(
    'cta-lead',
    X0,
    2988,
    'Open to Software Engineering internships and project collaborations.',
    TEXT_STYLES.lead,
    { w: 540, snap: 'g-cta' }
  );
  addRect('cta-btn', X0, 3088, 176, 48, {
    r: 8,
    fill: PALETTE.ink,
    href: `mailto:${profileData.email}`,
  });
  addText('cta-btn-t', X0, 3102, 'Email Me ↗', TEXT_STYLES.btnLight, {
    w: 176,
    align: 'center',
    deps: ['r:cta-btn'],
    href: `mailto:${profileData.email}`,
  });
  addRect('cta-btn-2', X0 + 192, 3088, 156, 48, {
    r: 8,
    fill: PALETTE.card,
    stroke: PALETTE.cardStroke,
    href: 'https://github.com/prestonwanttorevenge',
    external: true,
  });
  addText('cta-btn-2-t', X0 + 192, 3102, 'GitHub ↗', TEXT_STYLES.btnDark, {
    w: 156,
    align: 'center',
    deps: ['r:cta-btn-2'],
    href: 'https://github.com/prestonwanttorevenge',
    external: true,
  });

  addText('cta-count', 800, 2910, '', TEXT_STYLES.stat, {
    w: 360,
    snap: 'g-cta-r',
    dyn: () => `This page was built by ${getAgentCount()} agents while you scrolled.`,
  });
  addText(
    'cta-note',
    800,
    2972,
    'Every line, guide, box and word above was placed live by cursors.',
    TEXT_STYLES.body,
    { w: 360, snap: 'g-cta-r' }
  );

  // Footer (y: 3250..3460)
  addSectionFrame('foot', 3250, 3460, true);
  addGuide('g-foot', 'x', 620, 3260);

  addLogoMark('foot-mark', X0, 3286, 22);
  addText('foot-brand', X0 + 30, 3288, profileData.name, TEXT_STYLES.brand);
  addText('foot-copy', X0, 3408, `© 2026 ${profileData.name}`, TEXT_STYLES.small);

  addText('fc-h', 620, 3286, 'Projects', TEXT_STYLES.cardLink, { snap: 'g-foot' });
  addText('fc-1', 620, 3320, 'Tribute_T1 ↗', TEXT_STYLES.nav, {
    snap: 'g-foot',
    href: 'https://prestonwanttorevenge.github.io/Tribute_T1/',
    external: true,
  });
  addText('fc-2', 620, 3350, 'GDGLexi ↗', TEXT_STYLES.nav, {
    href: 'https://prestonwanttorevenge.github.io/gdglexi/',
    external: true,
  });
  addText('fc-3', 620, 3380, 'Portfolio v1 ↗', TEXT_STYLES.nav, {
    href: 'https://github.com/prestonwanttorevenge/prestonwanttorevenge.github.io',
    external: true,
  });
  addText('fc-4', 620, 3410, 'Back to Top ↑', TEXT_STYLES.nav, {
    href: '#projects',
  });

  const emailSocial = profileData.socials.find((s) => s.kind === 'mail');
  const ghSocial = profileData.socials.find((s) => s.kind === 'github');
  const liSocial = profileData.socials.find((s) => s.kind === 'linkedin');
  const fbSocial = profileData.socials.find((s) => s.kind === 'facebook');

  addDupGroup('footer-cols', ['fc-h', 'fc-1', 'fc-2', 'fc-3', 'fc-4'], [
    {
      dx: 240,
      dy: 0,
      edits: ['Connect', 'GitHub ↗', 'LinkedIn ↗', 'Facebook ↗', 'Email ↗'],
      hrefs: {
        'fc-1': ghSocial?.href ?? 'https://github.com/prestonwanttorevenge',
        'fc-2': liSocial?.href ?? '#',
        'fc-3': fbSocial?.href ?? '#',
        'fc-4': emailSocial?.href ?? `mailto:${profileData.email}`,
      },
    },
  ]);

  return {
    els,
    tasks,
    groups,
    anchors: [
      { id: 'projects', y: 670 },
      { id: 'skills', y: 1580 },
      { id: 'experience', y: 2160 },
      { id: 'contact', y: 2840 },
    ],
    height: 3520,
  };
}
