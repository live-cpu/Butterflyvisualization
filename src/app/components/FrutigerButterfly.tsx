import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, X, Minus } from 'lucide-react';
import bgImage from 'figma:asset/a91df9ac6b116a5b1d098cfe4cb4c64640bb5d2e.png';

const CHROME_TEXTURE_URL = "https://images.unsplash.com/photo-1759047770373-ac478dcc2d3c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXF1aWQlMjBjaHJvbWUlMjBtZXRhbCUyMGFic3RyYWN0JTIwdGV4dHVyZSUyMGJsdWV8ZW58MXx8fHwxNzcwNzMzMzgxfDA&ixlib=rb-4.1.0&q=80&w=1080";

// Defined with coordinates roughly in -50 to +80 range
const BUTTERFLY_PATH = new Path2D(
  "M0 0 C10.6 -22.4 31.8 -33.6 42.4 -11.2 C53 11.2 21.2 44.8 0 22.4 C-21.2 44.8 -53 11.2 -42.4 -11.2 C-31.8 -33.6 -10.6 -22.4 0 0 Z M0 22.4 C5.3 44.8 21.2 56 31.8 78.4 C21.2 89.6 0 67.2 0 56 C0 67.2 -21.2 89.6 -31.8 78.4 C-21.2 56 -5.3 44.8 0 22.4 Z"
);
const PATH_SCALE = 7; 

const KEYWORDS = ['const', 'void', 'let', '0x00', '=>', 'func', 'if', 'return', 'null', 'NaN', '0', '1', 'true', 'false', 'await', 'async', 'import', 'ERROR', '404', 'sys', 'daem', 'init', 'mem'];

interface MeltDrop { x: number; y: number; speed: number; life: number; width: number; }

interface CodeParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
  alpha: number;
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
  const metalCanvasRef = useRef<HTMLCanvasElement>(null);
  const codeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Assets
  const [chromeImg, setChromeImg] = useState<HTMLImageElement | null>(null);

  // Physics State
  const dropsRef = useRef<MeltDrop[]>([]);
  const particlesRef = useRef<CodeParticle[]>([]);
  const requestRef = useRef<number>();

  // Load Assets
  useEffect(() => {
    const img = new Image();
    img.src = CHROME_TEXTURE_URL;
    img.crossOrigin = "Anonymous";
    img.onload = () => setChromeImg(img);

    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Initialization: Generate Code Particles ---
  useEffect(() => {
    if (dimensions.width === 0) return;
    
    // Create offscreen canvas to check path
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 100; // Small scratchpad
    offCanvas.height = 100;
    const ctx = offCanvas.getContext('2d');
    if(!ctx) return;
    
    const particles: CodeParticle[] = [];
    const count = 1200; 
    
    for(let i=0; i<count; i++) {
        // Random point in local coordinate space covering the path bounding box
        const lx = (Math.random() - 0.5) * 110; 
        const ly = (Math.random() - 0.4) * 140; 
        
        if (ctx.isPointInPath(BUTTERFLY_PATH, lx, ly)) {
            // Convert to World Space
            const worldX = lx * PATH_SCALE + dimensions.width / 2;
            const worldY = ly * PATH_SCALE + dimensions.height / 2;
            
            particles.push({
                id: i,
                x: worldX,
                y: worldY,
                vx: 0,
                vy: 0,
                text: KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)],
                size: 8 + Math.random() * 8, 
                alpha: 0.6 + Math.random() * 0.4,
                isBroken: false
            });
        }
    }
    
    // Fallback
    if (particles.length < 10) {
        for(let i=0; i<300; i++) {
            particles.push({
                id: i + 9999,
                x: dimensions.width/2 + (Math.random() - 0.5) * 400,
                y: dimensions.height/2 + (Math.random() - 0.5) * 400,
                vx: 0, vy: 0,
                text: "ERROR",
                size: 12, alpha: 1, isBroken: false
            });
        }
    }

    particlesRef.current = particles;
    
  }, [dimensions]);

  // --- Rendering Logic ---

  // 1. Render Metallic Butterfly (Base Layer)
  useEffect(() => {
    const canvas = metalCanvasRef.current;
    if (!canvas || !chromeImg) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    drawMetallicState(ctx, dimensions.width, dimensions.height);

  }, [chromeImg, dimensions]);

  const drawMetallicState = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (!chromeImg) return;
    
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    
    ctx.translate(w / 2, h / 2);
    ctx.scale(PATH_SCALE, PATH_SCALE);
    
    // Enhanced Chrome Effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 15;
    ctx.shadowOffsetY = 15;
    
    const pattern = ctx.createPattern(chromeImg, 'repeat');
    if (pattern) {
        const matrix = new DOMMatrix();
        pattern.setTransform(matrix.scale(0.5)); 
        ctx.fillStyle = pattern;
    } else {
        ctx.fillStyle = '#aaa';
    }
    
    ctx.fill(BUTTERFLY_PATH);
    
    // Shiny Bevels
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 0.5;
    ctx.stroke(BUTTERFLY_PATH);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.1;
    ctx.stroke(BUTTERFLY_PATH);

    ctx.restore();
  };


  // 2. Animation Loop (Melting & Code Particles)
  useEffect(() => {
    const metalCanvas = metalCanvasRef.current;
    const codeCanvas = codeCanvasRef.current;
    
    if (!metalCanvas || !codeCanvas) return;
    const mCtx = metalCanvas.getContext('2d', { willReadFrequently: true });
    const cCtx = codeCanvas.getContext('2d');
    
    if (!mCtx || !cCtx) return;

    const loop = () => {
        // --- Metal Melting Logic ---
        if (dropsRef.current.length > 0) {
            dropsRef.current.forEach(drop => {
                if (drop.life <= 0) return;
                
                const sx = drop.x - drop.width/2;
                const sy = drop.y;
                const sw = drop.width;
                const sh = drop.speed * 2.5; 
                
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
        cCtx.clearRect(0, 0, dimensions.width, dimensions.height);
        
        cCtx.textAlign = 'center';
        cCtx.textBaseline = 'middle';

        particlesRef.current.forEach(p => {
            if (p.isBroken) {
                p.vy += 0.4; // Gravity
                p.vx *= 0.95; // Drag
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.015;
                p.rotation = (p.rotation || 0) + 0.1;
            }

            if (p.alpha <= 0) return;

            cCtx.save();
            cCtx.translate(p.x, p.y);
            if(p.isBroken) cCtx.rotate(p.rotation || 0);
            
            // Aesthetic: Code Text
            if (p.isBroken) {
                cCtx.fillStyle = `rgba(255, 50, 50, ${p.alpha})`; // Red error
                cCtx.shadowColor = 'red';
                cCtx.shadowBlur = 5;
            } else {
                // Modified for transparency visibility: White/Mint with slight shadow
                cCtx.fillStyle = `rgba(220, 255, 230, ${p.alpha})`; 
                cCtx.shadowColor = 'rgba(0,0,0,0.5)'; // Add shadow for legibility on transparent bg
                cCtx.shadowBlur = 2;
            }
            
            cCtx.font = `bold ${p.size}px monospace`;
            cCtx.fillText(p.text, 0, 0);
            cCtx.restore();
        });

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
        x: clientX - dragStart.current.x,
        y: clientY - dragStart.current.y
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
            background: `url(${bgImage}) center/cover no-repeat`,
        }}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-400/20 via-white/10 to-blue-900/40 pointer-events-none" />

        {/* Layer 1: Metallic Butterfly (Distortable) */}
        <canvas 
            ref={metalCanvasRef}
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
                width: 400,
                height: 500,
                backgroundColor: 'rgba(255, 255, 255, 0.15)', // RESTORED GLASSY LOOK
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
                {/* Subtle Grid overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 opacity-10" 
                     style={{backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                </div>
                
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
