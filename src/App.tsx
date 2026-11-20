import { useCallback, useEffect, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { ContactModal } from './components/ContactModal';
import { CornerControls } from './components/CornerControls';
import { renderSwarmOverlay } from './engine/overlayRenderer';
import { soundEngine } from './engine/sound';
import { SwarmEngine } from './engine/swarmEngine';
import { CANVAS_W } from './engine/typography';

export function App() {
  const [engine, setEngine] = useState<SwarmEngine | null>(null);
  const [, setDomTick] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const createEngine = useCallback(() => new SwarmEngine(), []);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const fonts = [
      '400 16px Inter',
      '500 16px Inter',
      '600 16px Inter',
      '700 16px Inter',
      '400 16px "JetBrains Mono"',
      '500 16px "JetBrains Mono"',
    ];
    const timeout = new Promise<void>((res) => setTimeout(res, 2000));
    Promise.race([
      Promise.all(fonts.map((f) => document.fonts.load(f))).then(() => undefined),
      timeout,
    ]).then(() => {
      setEngine(createEngine());
    });
  }, [createEngine]);

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!engine) return;

    const resize = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const s = Math.min(1, vw / CANVAS_W);
      engine.setViewport(vw, vh, s, (vw - CANVAS_W * s) / 2);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(vw * dpr);
        canvas.height = Math.round(vh * dpr);
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
      }
    };

    const onScroll = () => engine.setScroll(window.scrollY);
    const onWheel = () => {
      if (window.scrollY > 0) engine.start();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (engine.started) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button')) return;
      engine.start();
    };
    const onPointerMove = (e: PointerEvent) => {
      engine.setMouse(e.clientX, e.clientY);
    };
    const onPointerLeave = () => {
      engine.setMouse(null);
    };

    resize();
    onScroll();

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    let rafId = 0;
    let lastNow = performance.now();

    const frame = (now: number) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;

      engine.step(dt);

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const targetW = Math.round(engine.vp.vw * dpr);
        const targetH = Math.round(engine.vp.vh * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
          canvas.style.width = `${engine.vp.vw}px`;
          canvas.style.height = `${engine.vp.vh}px`;
        }
        renderSwarmOverlay(ctx, engine, engine.vp.vw, engine.vp.vh, dpr);
      }

      if (engine.consumeDomDirty()) {
        setDomTick((t) => t + 1);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [engine]);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEngine.enabled = next;
      if (next) soundEngine.playSnap();
      return next;
    });
  };

  const handleBuildAll = () => {
    if (!engine) return;
    engine.buildAll();
    setDomTick((t) => t + 1);
  };

  const handleReplay = () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setEngine(createEngine());
  };

  if (!engine) return null;

  return (
    <>
      <CanvasStage engine={engine} onOpenContact={() => setContactOpen(true)} />
      <canvas ref={canvasRef} className="swarm-canvas" aria-hidden="true" />
      <CornerControls
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        isComplete={engine.flocking}
        onBuildAll={handleBuildAll}
        onReplay={handleReplay}
      />
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
    </>
  );
}

export default App;
