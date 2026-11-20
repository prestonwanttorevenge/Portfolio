import React from 'react';
import {
  MONOGRAM_PATHS,
  type PathEl,
  type RectEl,
  type SceneEl,
  type TextEl,
} from '../engine/sceneBuilder';
import type { SwarmEngine } from '../engine/swarmEngine';
import {
  CANVAS_W,
  NAV_H,
  NAV_Y,
  PALETTE,
  RULER_SIZE,
  fontFamily,
  lineHeight,
} from '../engine/typography';

function renderCodeTokens(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const lines = text.split('\n');
  lines.forEach((line, lineIdx) => {
    const tokenRe =
      /(\b(?:export|const|as)\b)|([A-Za-z_]+(?=:))|("(?:[^"\\]|\\.)*")|(\[|\]|\{|\}|:|,|;)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = tokenRe.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(line.slice(lastIndex, match.index));
      }
      if (match[1]) {
        nodes.push(
          <span key={`${lineIdx}-${key++}`} style={{ color: '#C084FC' }}>
            {match[1]}
          </span>
        );
      } else if (match[2]) {
        nodes.push(
          <span key={`${lineIdx}-${key++}`} style={{ color: '#8FC9D6' }}>
            {match[2]}
          </span>
        );
      } else if (match[3]) {
        nodes.push(
          <span key={`${lineIdx}-${key++}`} style={{ color: '#FDE68A' }}>
            {match[3]}
          </span>
        );
      } else if (match[4]) {
        nodes.push(
          <span key={`${lineIdx}-${key++}`} style={{ color: '#81868D' }}>
            {match[4]}
          </span>
        );
      }
      lastIndex = tokenRe.lastIndex;
    }
    if (lastIndex < line.length) {
      nodes.push(line.slice(lastIndex));
    }
    if (lineIdx < lines.length - 1) nodes.push('\n');
  });
  return nodes;
}

const ElRect = React.memo(
  ({ el, onOpenContact }: { el: RectEl; v: number; onOpenContact?: () => void }) => {
    if (!el.vis) return null;
    const w = el.draw?.w ?? el.w;
    const h = el.draw?.h ?? el.h;
    const style: React.CSSProperties = {
      left: el.x + el.dx,
      top: el.y + el.dy,
      width: w,
      height: h,
      backgroundColor: el.styled ? el.fill : '#D9D9D9',
      borderRadius: el.styled ? el.r : 0,
      boxShadow:
        el.styled && el.stroke ? `inset 0 0 0 1px ${el.stroke}` : 'none',
      overflow: el.image ? 'hidden' : undefined,
    };

    if (el.href && el.styled) {
      const isContactModal = el.href === '#contact-form';
      return (
        <a
          className="el-rect el-link"
          style={style}
          href={el.href}
          target={el.external ? '_blank' : undefined}
          rel={el.external ? 'noreferrer' : undefined}
          aria-label={el.id}
          onClick={
            isContactModal
              ? (e) => {
                  e.preventDefault();
                  onOpenContact?.();
                }
              : undefined
          }
        />
      );
    }

    if (el.image) {
      return (
        <div className="el-rect" style={style}>
          {!el.styled ? (
            <svg
              className="el-placeholder-x"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line x1="0" y1="0" x2="100" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="100" y1="0" x2="0" y2="100" vectorEffect="non-scaling-stroke" />
            </svg>
          ) : (
            <img
              src={el.image}
              alt="Trần Thịnh Phát portrait"
              className="el-img"
              style={{ objectPosition: el.imagePosition ?? 'center' }}
            />
          )}
        </div>
      );
    }

    return <div className="el-rect" style={style} />;
  },
  (a, b) => a.v === b.v
);

const ElPath = React.memo(
  ({ el }: { el: PathEl; v: number }) => {
    if (!el.vis || el.placed === 0) return null;

    if (el.d && el.tf) {
      const ratio = Math.min(1, (el.placed - 1) / el.pts.length);
      return (
        <path
          d={el.d}
          transform={`translate(${el.tf.x} ${el.tf.y}) scale(${el.tf.s})`}
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - ratio}
          stroke={el.stroke}
          strokeWidth={1.2 / el.tf.s}
          fill={el.fill}
          fillOpacity={el.fillOn ? 1 : 0}
          style={{
            transition: 'fill-opacity 220ms ease, stroke-dashoffset 120ms linear',
          }}
        />
      );
    }

    const d =
      el.pts
        .slice(0, el.placed)
        .map((p, idx) => `${idx ? 'L' : 'M'}${p.x} ${p.y}`)
        .join(' ') + (el.shut ? ' Z' : '');

    return (
      <path
        d={d}
        stroke={el.stroke}
        strokeWidth={el.sw}
        fill={el.fill ?? 'none'}
        fillOpacity={el.fillOn ? 1 : 0}
        style={{ transition: 'fill-opacity 220ms ease' }}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
    );
  },
  (a, b) => a.v === b.v
);

const ElText = React.memo(
  ({ el, onOpenContact }: { el: TextEl; v: number; onOpenContact?: () => void }) => {
    if (!el.vis) return null;
    const st = el.st;
    const content = el.selAll ? (
      <span className="text-sel">{el.shown}</span>
    ) : st.code ? (
      renderCodeTokens(el.shown)
    ) : (
      el.shown
    );

    const style: React.CSSProperties = {
      left: el.x + el.dx,
      top: el.y + el.dy,
      width: el.w,
      whiteSpace: el.w != null && !st.pre ? 'pre-wrap' : 'pre',
      fontFamily: fontFamily(st),
      fontSize: el.size,
      fontWeight: st.weight,
      lineHeight: `${lineHeight(st, el.size)}px`,
      letterSpacing: `${st.ls ?? 0}em`,
      color: st.color,
      textAlign: el.align,
    };

    const inner = (
      <>
        {content}
        {el.editing && !el.selAll && (
          <span className="caret" style={{ height: el.size * 1.15 }} />
        )}
      </>
    );

    if (el.href && !el.editing) {
      const isContactModal = el.href === '#contact-form';
      return (
        <a
          className="el-text el-link"
          style={style}
          href={el.href}
          target={el.external ? '_blank' : undefined}
          rel={el.external ? 'noreferrer' : undefined}
          onClick={
            isContactModal
              ? (e) => {
                  e.preventDefault();
                  onOpenContact?.();
                }
              : undefined
          }
        >
          {inner}
        </a>
      );
    }

    return (
      <div className="el-text" style={style}>
        {inner}
      </div>
    );
  },
  (a, b) => a.v === b.v
);

function SceneElements({
  els,
  height,
  onOpenContact,
}: {
  els: SceneEl[];
  height: number;
  onOpenContact?: () => void;
}) {
  return (
    <>
      {els.map((el) =>
        el.kind === 'rect' ? (
          <ElRect key={el.id} el={el} v={el.v} onOpenContact={onOpenContact} />
        ) : null
      )}
      <svg className="paths" width={CANVAS_W} height={height}>
        {els.map((el) =>
          el.kind === 'path' ? <ElPath key={el.id} el={el} v={el.v} /> : null
        )}
      </svg>
      {els.map((el) =>
        el.kind === 'text' ? (
          <ElText key={el.id} el={el} v={el.v} onOpenContact={onOpenContact} />
        ) : null
      )}
    </>
  );
}

export const CanvasStage: React.FC<{
  engine: SwarmEngine;
  onOpenContact?: () => void;
}> = ({ engine, onOpenContact }) => {
  const { s, left } = engine.vp;
  const stickyEls = engine.list.filter((el) => el.sticky);
  const bodyEls = engine.list.filter((el) => !el.sticky);
  const navHasVisible = stickyEls.some((el) => el.vis);

  return (
    <div className="page" style={{ height: engine.height * s }}>
      {/* Section anchor targets for #hash navigation */}
      {engine.anchors.map((a) => (
        <div
          key={a.id}
          id={a.id}
          className="anchor-mark"
          style={{ top: a.y * s }}
        />
      ))}

      {/* Sticky Navigation Layer */}
      <div
        className="nav-sticky"
        style={{
          marginTop: NAV_Y * s,
          height: NAV_H * s,
          top: RULER_SIZE * engine.rulers.t,
        }}
      >
        {navHasVisible && <div className="nav-backdrop" />}
        <div
          className="nav-canvas"
          style={{
            width: CANVAS_W,
            transform: `translateX(${left}px) scale(${s}) translateY(${-NAV_Y}px)`,
          }}
        >
          <SceneElements els={stickyEls} height={NAV_Y + NAV_H + 30} />
        </div>
      </div>

      {/* Main Document Canvas */}
      <div
        className="canvas"
        style={{
          width: CANVAS_W,
          height: engine.height,
          transform: `translateX(${left}px) scale(${s})`,
        }}
      >
        <SceneElements els={bodyEls} height={engine.height} onOpenContact={onOpenContact} />
      </div>

      {/* Intro Centered Emblem (fades out once touched or scrolled) */}
      <div
        className={`intro-logo${engine.started ? ' gone' : ''}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 120" width={54} height={65}>
          {MONOGRAM_PATHS.map((p, i) => (
            <path key={i} d={p.d} fill={PALETTE.line} />
          ))}
        </svg>
        <div className="intro-hint">Touch the swarm or scroll to build</div>
      </div>
    </div>
  );
};
