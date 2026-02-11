import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Maximize2, X, Minus } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const BUTTER_IMG_URL = `${BASE}butter.png`;
const BG_IMG_URL = `${BASE}water.png`;

const KEYWORDS = ['const', 'void', 'let', '0x00', '=>', 'func', 'if', 'return', 'null', 'NaN', '0', '1', 'true', 'false', 'await', 'async', 'import', 'ERROR', '404', 'sys', 'daem', 'init', 'mem'];

// Frutiger Aero blue palette (back to front draw order)
const AERO_COLORS = [
  [88, 151, 211],   // #5897D3 - bottom layer (drawn first)
  [86, 189, 227],   // #56BDE3 - middle layer
  [197, 241, 253],  // #C5F1FD - top layer (drawn last)
];

const MODAL_W = 400;
const MODAL_H = 500;
const BUBBLE_COUNT = 15;

function Bubbles() {
  const bubbles = useMemo(() => {
    const normal = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
      id: i,
      size: 30 + Math.random() * 80,
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 12 + Math.random() * 12,
      wobble: 20 + Math.random() * 40,
      seed: Math.floor(Math.random() * 100),
      distortScale: 15 + Math.random() * 20,
      freq: (0.01 + Math.random() * 0.02).toFixed(4),
    }));
    // 2 extra large bubbles (2x~3x)
    const big = Array.from({ length: 2 }, (_, i) => ({
      id: BUBBLE_COUNT + i,
      size: 180 + Math.random() * 100,
      left: 15 + Math.random() * 70,
      delay: 3 + Math.random() * 8,
      duration: 18 + Math.random() * 10,
      wobble: 30 + Math.random() * 50,
      seed: Math.floor(Math.random() * 100),
      distortScale: 25 + Math.random() * 15,
      freq: (0.005 + Math.random() * 0.01).toFixed(4),
    }));
    return [...normal, ...big];
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]">
      {/* SVG distortion filters - one per bubble for variety */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          {bubbles.map(b => (
            <filter key={b.id} id={`bwarp${b.id}`}>
              <feTurbulence
                type="fractalNoise"
                baseFrequency={b.freq}
                numOctaves={3}
                seed={b.seed}
                result="noise"
              >
                <animate
                  attributeName="seed"
                  from={b.seed}
                  to={b.seed + 50}
                  dur={`${b.duration * 0.8}s`}
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={b.distortScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
      </svg>

      {bubbles.map(b => (
        <div
          key={b.id}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            bottom: -b.size - 20,
            backdropFilter: `url(#bwarp${b.id})`,
            WebkitBackdropFilter: `url(#bwarp${b.id})`,
            background: `radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)`,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: `inset 0 -${b.size * 0.1}px ${b.size * 0.25}px rgba(255,255,255,0.06), inset 0 ${b.size * 0.08}px ${b.size * 0.15}px rgba(200,220,255,0.08), 0 0 ${b.size * 0.3}px rgba(255,255,255,0.03)`,
            animation: `bubbleRise${b.id} ${b.duration}s ${b.delay}s infinite ease-in`,
            willChange: 'transform, opacity',
          }}
        >
          {/* Highlight reflection */}
          <div
            className="absolute rounded-full"
            style={{
              width: '30%',
              height: '20%',
              top: '12%',
              left: '18%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.6) 0%, transparent 100%)',
              transform: 'rotate(-30deg)',
            }}
          />
          {/* Bottom rim light */}
          <div
            className="absolute rounded-full"
            style={{
              width: '50%',
              height: '15%',
              bottom: '10%',
              left: '25%',
              background: 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 100%)',
            }}
          />
        </div>
      ))}
      <style>{bubbles.map(b => `
        @keyframes bubbleRise${b.id} {
          0% {
            transform: translateY(0) translateX(0) scale(0.8);
            opacity: 0;
          }
          5% {
            opacity: 1;
            transform: translateY(-5vh) translateX(0) scale(1);
          }
          25% {
            transform: translateY(-30vh) translateX(${b.wobble}px) scale(0.97);
          }
          50% {
            opacity: 0.8;
            transform: translateY(-60vh) translateX(-${b.wobble * 0.6}px) scale(0.93);
          }
          75% {
            transform: translateY(-90vh) translateX(${b.wobble * 0.3}px) scale(0.85);
          }
          100% {
            transform: translateY(-120vh) translateX(-${b.wobble * 0.2}px) scale(0.7);
            opacity: 0;
          }
        }
      `).join('')}</style>
    </div>
  );
}

interface MeltDrop { x: number; y: number; speed: number; life: number; width: number; }

interface CodeParticle {
  id: number;
  relX: number;
  relY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
  baseSize: number;
  alpha: number;
  colorIdx: number;
  isBroken: boolean;
  rotation?: number;
}

export default function FrutigerButterfly() {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Modal State
  const [modalPos, setModalPos] = useState({ x: 50, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Canvas Refs
  const imgCanvasRef = useRef<HTMLCanvasElement>(null);
  const codeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Assets
  const [butterImg, setButterImg] = useState<HTMLImageElement | null>(null);

  // Physics State
  const dropsRef = useRef<MeltDrop[]>([]);
  const particlesRef = useRef<CodeParticle[]>([]);
  const requestRef = useRef<number>();

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioStartedRef = useRef(false);

  // Load Assets
  useEffect(() => {
    const img = new Image();
    img.src = BUTTER_IMG_URL;
    img.onload = () => setButterImg(img);

    // Setup background music
    const audio = new Audio(`${BASE}frutiger_aero.mp3`);
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    const startAudio = () => {
      if (audioStartedRef.current) return;
      audioStartedRef.current = true;
      audio.play().catch(() => {});
    };
    document.addEventListener('click', startAudio, { once: true });
    document.addEventListener('touchstart', startAudio, { once: true });

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', startAudio);
      document.removeEventListener('touchstart', startAudio);
      audio.pause();
    };
  }, []);

  // Helper: compute draw rect for butter image
  const getImageRect = (img: HTMLImageElement, w: number, h: number) => {
    const maxW = w * 0.6;
    const maxH = h * 0.6;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2 - h * 0.05;
    return { drawX, drawY, drawW, drawH, scale };
  };

  // --- Generate Code Particles from butter.png alpha ---
  useEffect(() => {
    if (!butterImg) return;

    // Use the image's native pixels directly for accurate sampling
    const sampW = Math.min(butterImg.width, 400);
    const sampH = Math.round(sampW * (butterImg.height / butterImg.width));
    const offCanvas = document.createElement('canvas');
    offCanvas.width = sampW;
    offCanvas.height = sampH;
    const ctx = offCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(butterImg, 0, 0, sampW, sampH);
    const imageData = ctx.getImageData(0, 0, sampW, sampH);
    const pixels = imageData.data;

    const particles: CodeParticle[] = [];
    const targetCount = 800;
    let attempts = 0;
    const maxAttempts = targetCount * 10;

    while (particles.length < targetCount && attempts < maxAttempts) {
        attempts++;
        const px = Math.floor(Math.random() * sampW);
        const py = Math.floor(Math.random() * sampH);
        const idx = (py * sampW + px) * 4;
        const alpha = pixels[idx + 3];

        if (alpha > 30) {
            const relX = px / sampW;
            const relY = py / sampH;

            const baseSize = 8 + Math.random() * 8;
            particles.push({
                id: particles.length,
                relX,
                relY,
                x: 0, y: 0,
                vx: 0, vy: 0,
                text: KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)],
                size: baseSize,
                baseSize,
                alpha: 0.6 + Math.random() * 0.4,
                colorIdx: Math.floor(Math.random() * AERO_COLORS.length),
                isBroken: false
            });
        }
    }

    // Sort by layer: 0 (back) drawn first, 2 (front) drawn last
    particles.sort((a, b) => a.colorIdx - b.colorIdx);
    particlesRef.current = particles;
  }, [butterImg]);

  // --- Reposition particles + clamp modal when dimensions change ---
  useEffect(() => {
    if (!butterImg || dimensions.width === 0) return;
    const { drawX, drawY, drawW, drawH } = getImageRect(butterImg, dimensions.width, dimensions.height);

    particlesRef.current.forEach(p => {
        if (p.isBroken) return;
        p.x = drawX + p.relX * drawW;
        p.y = drawY + p.relY * drawH - 36;
    });

    // Clamp modal so it stays visible
    setModalPos(prev => ({
        x: Math.min(prev.x, dimensions.width - 60),
        y: Math.min(prev.y, dimensions.height - 60)
    }));
  }, [dimensions, butterImg]);

  // --- Draw butter.png as original image centered on canvas ---
  useEffect(() => {
    const canvas = imgCanvasRef.current;
    if (!canvas || !butterImg) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    drawButterImage(ctx, dimensions.width, dimensions.height);
  }, [butterImg, dimensions]);

  const drawButterImage = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!butterImg) return;

    ctx.clearRect(0, 0, w, h);

    const { drawX, drawY, drawW, drawH } = getImageRect(butterImg, w, h);
    ctx.drawImage(butterImg, drawX, drawY, drawW, drawH);
  };

  // --- Animation Loop (Melting & Code Particles) ---
  useEffect(() => {
    const imgCanvas = imgCanvasRef.current;
    const codeCanvas = codeCanvasRef.current;

    if (!imgCanvas || !codeCanvas) return;
    const mCtx = imgCanvas.getContext('2d', { willReadFrequently: true });
    const cCtx = codeCanvas.getContext('2d');

    if (!mCtx || !cCtx) return;

    const loop = () => {
        // --- Image Melting Logic ---
        if (dropsRef.current.length > 0) {
            dropsRef.current.forEach(drop => {
                if (drop.life <= 0) return;

                const sx = Math.max(0, drop.x - drop.width/2);
                const sy = Math.max(0, drop.y);
                const sw = Math.min(drop.width, imgCanvas.width - sx);
                const sh = Math.min(drop.speed * 2.5, imgCanvas.height - sy);

                if (sw <= 0 || sh <= 0) return;

                try {
                    const imageData = mCtx.getImageData(sx, sy, sw, sh);
                    mCtx.putImageData(imageData, sx + (Math.random()-0.5)*2, sy + drop.speed);

                    drop.y += drop.speed;
                    drop.life -= 0.015;
                    drop.speed *= 0.99;
                } catch (e) { }
            });
            dropsRef.current = dropsRef.current.filter(d => d.life > 0);
        }

        // --- Code Particle Logic ---
        const w = codeCanvas.width;
        const h = codeCanvas.height;
        cCtx.clearRect(0, 0, w, h);

        cCtx.textAlign = 'center';
        cCtx.textBaseline = 'middle';

        const alive = particlesRef.current;
        for (let i = alive.length - 1; i >= 0; i--) {
            const p = alive[i];

            if (p.isBroken) {
                p.vy += 0.4;
                p.vx *= 0.95;
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.015;
                p.rotation = (p.rotation || 0) + 0.1;

                // Remove dead particles to prevent buildup
                if (p.alpha <= 0 || p.y > h + 100) {
                    alive.splice(i, 1);
                    continue;
                }
            }

            if (p.alpha <= 0) continue;

            cCtx.save();
            cCtx.translate(p.x, p.y);
            if (p.isBroken) cCtx.rotate(p.rotation || 0);

            if (p.isBroken) {
                cCtx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
                cCtx.shadowColor = `rgba(255, 255, 255, 0.3)`;
                cCtx.shadowBlur = 4;
            } else {
                const [cr, cg, cb] = AERO_COLORS[p.colorIdx] || AERO_COLORS[0];
                cCtx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${p.alpha})`;
                cCtx.shadowColor = `rgba(${cr}, ${cg}, ${cb}, 0.3)`;
                cCtx.shadowBlur = 3;
            }

            cCtx.font = `bold ${p.size}px monospace`;
            cCtx.fillText(p.text, 0, 0);
            cCtx.restore();
        }

        requestRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [dimensions]);


  // --- Event Handlers ---

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.window-header')) return;

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    dragStart.current = {
        x: clientX - modalPos.x,
        y: clientY - modalPos.y
    };
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setModalPos({
        x: Math.max(-MODAL_W + 60, Math.min(clientX - dragStart.current.x, dimensions.width - 60)),
        y: Math.max(0, Math.min(clientY - dragStart.current.y, dimensions.height - 60))
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleCodeClick = (e: React.MouseEvent) => {
      const clientX = e.clientX;
      const clientY = e.clientY;

      let hitCount = 0;
      const hitRadius = 80;

      particlesRef.current.forEach(p => {
          if (p.isBroken) return;
          const dx = p.x - clientX;
          const dy = p.y - clientY;
          if (dx*dx + dy*dy < hitRadius*hitRadius) {
              p.isBroken = true;
              p.vx = (Math.random() - 0.5) * 15;
              p.vy = (Math.random() - 1.0) * 10;
              p.rotation = Math.random();
              hitCount++;
          }
      });

      if (hitCount > 0 || true) {
          for(let i=0; i<5; i++) {
            dropsRef.current.push({
                x: clientX + (Math.random() - 0.5) * 60,
                y: clientY,
                speed: 4 + Math.random() * 6,
                life: 1.5,
                width: 20 + Math.random() * 30
            });
          }
      }
  };

  return (
    <div
        className="relative w-full h-full overflow-hidden select-none font-sans"
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
        style={{
            background: `url(${BG_IMG_URL}) center/cover no-repeat black`,
        }}
    >
        {/* Bubble Overlay */}
        <Bubbles />

        {/* Layer 1: Butter Image (Distortable/Meltable) */}
        <canvas
            ref={imgCanvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0 pointer-events-none block"
        />

        {/* Layer 2: Draggable Frutiger Window */}
        <div
            ref={modalRef}
            className="absolute shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md rounded-lg overflow-hidden flex flex-col border border-white/50"
            style={{
                left: modalPos.x,
                top: modalPos.y,
                width: MODAL_W,
                height: MODAL_H,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 10px 40px rgba(0,0,0,0.2)'
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
        >
            {/* Window Header */}
            <div className="window-header h-9 bg-gradient-to-b from-white/80 to-white/40 border-b border-white/50 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 tracking-wide drop-shadow-sm">SYSTEM_VIEWER.exe</span>
                </div>
                <div className="flex gap-2">
                    <Minus size={14} className="text-slate-600" />
                    <Maximize2 size={14} className="text-slate-600" />
                    <X size={14} className="text-slate-600" />
                </div>
            </div>

            {/* Window Content (The Lens) */}
            <div className="relative flex-1 w-full h-full overflow-hidden bg-white/5 cursor-crosshair">
                {/* Code Butterfly Canvas */}
                <canvas
                    ref={codeCanvasRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    className="absolute block"
                    style={{
                        transform: `translate(${-modalPos.x}px, ${-modalPos.y + 36}px)`,
                        pointerEvents: 'auto'
                    }}
                    onClick={handleCodeClick}
                />

                <div className="absolute bottom-2 right-2 text-[10px] text-white/80 font-mono opacity-80 pointer-events-none z-20 drop-shadow-md">
                    STATUS: LIVE FEED [CONNECTED]
                    <br/>
                    COORD: {Math.round(modalPos.x)}, {Math.round(modalPos.y)}
                    <br/>
                    <span className="text-xs animate-pulse text-red-400">● REC</span>
                </div>
            </div>
        </div>

        {/* Global Footer */}
        <div className="absolute bottom-8 left-8 text-white z-0 pointer-events-none mix-blend-overlay">
            <h1 className="text-7xl font-black tracking-tighter italic opacity-60 drop-shadow-lg">AERO</h1>
            <p className="text-sm tracking-[0.6em] font-light ml-2">VISUALIZATION SYSTEM</p>
        </div>
    </div>
  );
}
