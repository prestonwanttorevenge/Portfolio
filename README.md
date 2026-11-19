# Trần Thịnh Phát (Preston) — Swarm Portfolio

Interactive Software Engineer portfolio built with **React 19 + TypeScript + Vite**, inspired by [califa/swarm-site](https://github.com/califa/swarm-site). The page starts blank with a starling-murmuration flock of simulated cursors and assembles itself live as you touch the flock, click, or scroll.

---

## Project Structure

```text
├── index.html                   # Meta, Open Graph tags, Google Fonts (Inter + JetBrains Mono)
├── vite.config.ts               # Relative base ('./') for subpath or custom-domain hosting
├── public/
│   ├── favicon.svg              # Monochrome "P" monogram favicon
│   └── og-cover.jpg             # Social preview image (portrait copy)
└── src/
    ├── App.tsx                  # Font preload, single rAF loop, pointer/scroll listeners
    ├── index.css                # Swiss/Figma paper theme (#F8F9FA / #121417), minimal layout styles
    ├── assets/
    │   └── portrait.jpg         # Monochrome portrait rendered in Background section
    ├── data/                    # All editable portfolio content
    │   ├── types.ts             # Data interfaces (ProfileData, ProjectItem, SkillGroup, ExperienceItem)
    │   ├── profile.ts           # Bio, contact email, GitHub/LinkedIn/Facebook, config spec lines
    │   ├── projects.ts          # Tribute_T1, GDGLexi, Portfolio v1, PBL2, PBL1
    │   ├── skills.ts            # Languages, Systems & Tools, CS Fundamentals
    │   ├── experience.ts        # DUT (25T_KHDL), GRIT Tech Mentor, FUNiX Math Mentor
    │   ├── swarmConfig.ts       # CURSOR_NAMES, CURSOR_COLORS, SWARM_TUNING
    │   └── index.ts             # Barrel exports
    ├── engine/
    │   ├── typography.ts        # CANVAS_W (1280), PALETTE, TEXT_STYLES, cached canvas measureText()
    │   ├── sceneBuilder.ts      # buildPortfolioScene() layout, tasks, DupGroups, MONOGRAM_PATHS
    │   ├── swarmEngine.ts       # SwarmEngine: follow() murmuration + generator choreography
    │   ├── overlayRenderer.ts   # renderSwarmOverlay(): HiDPI <canvas> cursors, rulers, guides, hover handles
    │   └── sound.ts             # soundEngine: Web Audio API ticks, snaps & completion chord
    └── components/
        ├── CanvasStage.tsx      # Memoized DOM elements (ElRect, ElPath, ElText), Figma image placeholder
        └── CornerControls.tsx   # Bottom-right SFX toggle & Build All / Replay pill
```

---

## How the Swarm Engine Works

1. **Single `requestAnimationFrame` Loop (`src/App.tsx`)**: Calls `engine.step(dt)`, draws the entire overlay onto one fixed HiDPI `<canvas>` via `renderSwarmOverlay()`, and only triggers a React re-render when `engine.consumeDomDirty()` is `true` (0 re-renders/sec during idle murmuration).
2. **Starling Murmuration (`SwarmEngine.follow`)**:
   - Opens with `18` cursors (`SWARM_TUNING.initialFlock`) orbiting the viewport center or visitor pointer using tangential swirl, radial orbit spring, curl, `90px` neighbor velocity alignment (`70%` self / `30%` neighbors), and a `48px` mouse repulsion bubble.
   - Moving into the flock, clicking (`pointerdown`), or scrolling calls `engine.start()`, peeling workers off into build tasks (`6`–`40` workers scaled by scroll velocity and queue size).
   - Once all tasks complete, cursors regroup into a `34`-cursor (`SWARM_TUNING.finaleFlock`) murmuration around the cursor.
3. **Generator-Driven Build Choreography (`SwarmEngine`)**:
   - `drawPath` / `drawLogo`: Pen tool plots architectural rails, dividers, and the `"P"` monogram anchor-by-anchor.
   - `dragGuide`: 20px dark Figma rulers slide in; a cursor pulls a red alignment guide from the ruler; `snap`-linked text drags onto the guide with a red flash.
   - `drawRect`: Crosshair expands a `#D9D9D9` box (`0×0` → `W×H`) with blue handles, ruler projection lines, and size badge before styling. `exp-portrait` displays a Figma `×` placeholder while dragging, then reveals `portrait.jpg`.
   - `drawText`: Crosshair frames text bounds, then I-beam types with natural timing and caret (`grow: true` headlines step up font sizes).
   - `duplicate` + `editText`: Clones cards/columns/rows (`nav-links`, `proj-row-1`, `proj-row-2`, `skill-cols`, `exp-rows`, `footer-cols`) with red bounds and pixel spacing badges, then double-clicks (`selAll`) to overwrite each field.
4. **Hover Inspect Handles (`overlayRenderer.ts`)**: Moving the pointer over any settled `selectable: true` project card draws a `1px` `#0D99FF` selection box and four `7×7` white/blue corner handles directly on the overlay `<canvas>`.

---

## Editing Content

- **Profile, Links & Bio**: Update `src/data/profile.ts` (`name`, `email`, `socials`, `specLines`, `bio`). Keep `specLines` concise; `sceneBuilder.ts` wraps array values > 40 chars automatically inside `preston.config.ts`.
- **Projects / Skills / Timeline**: Edit `src/data/projects.ts`, `src/data/skills.ts`, and `src/data/experience.ts`. Note that `sceneBuilder.ts` places fixed coordinates inside a `1280px`-wide virtual canvas—if adding significantly longer text or more items, adjust card heights / section Y offsets in `src/engine/sceneBuilder.ts`.
- **Portrait & Share Image**: Replace `src/assets/portrait.jpg` and `public/og-cover.jpg`.

---

## Commands & Deployment

```bash
npm install      # Install dependencies
npm run dev      # Start local Vite dev server
npm run lint     # Run oxlint (0 warnings/errors expected)
npm run build    # TypeScript check (tsc -b) + production bundle -> dist/
```

**Custom HTTPS Hosting:** This repo intentionally avoids GitHub Actions Pages workflows and uses `base: './'` in `vite.config.ts` so it deploys cleanly on **Vercel**, **Cloudflare Pages**, or **Netlify** with automatic HTTPS (`npm run build` → output `dist`). Once a custom domain is live, update `og:image` / `twitter:image` (and add `og:url`) in `index.html` to the full `https://` domain URL.

---

## Handoff & Engineering Notes (For Future Sessions)

- **Zero Layout Thrashing / Zero Heavy CSS**: Never introduce `getBoundingClientRect()` inside `rAF` animation loops; text dimensions come from cached offscreen canvas `measureText()` in `src/engine/typography.ts`. Avoid CSS `backdrop-filter` and multi-layer box-shadow glows.
- **Keep Intro Active by Default**: Do not auto-call `engine.buildAll()` via `prefers-reduced-motion: reduce` inside `App.tsx`—users have the explicit **Build All** button in `CornerControls.tsx`.
- **Pure Cursors**: Cursors in `overlayRenderer.ts` intentionally render as label-free `Path2D` Figma tools so the flock reads cleanly.
- **Linter & TypeScript Constraints**:
  - `tsconfig.app.json` enforces `erasableSyntaxOnly` and `verbatimModuleSyntax` (declare class fields explicitly; use `import type`).
  - `oxlint` enforces `react(immutability)` and `react(refs)`: keep `engine` in `useState` inside `App.tsx` and mutate it strictly via `SwarmEngine` methods (`setViewport`, `setMouse`, `setScroll`, `step`), never via direct property writes in React hooks.
- **Visual & Editorial Tone**: Plain, concrete engineering copy (no LLM buzzwords or fake `PRJ-`/`LANE_` codes) and monochrome Swiss card styling (`#FFFFFF` / `1px solid #E2E5EA`) without rainbow top stripes.
- **Git Preferences**: Commit directly under the user's git identity (`pretonwanttorevenge <thinhphatkaio810@gmail.com>`) with **no `Co-authored-by` trailers**.
