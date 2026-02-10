import React, { useEffect, useRef, useState } from 'react';

// Configuration
const CONFIG = {
  bg: '#000000',
  textColors: ['#FFFFFF'], 
  keywords: ['const', 'let', '=>', 'func', '{ }', 'void', 'return', 'if', 'class', 'import', 'from', 'async', 'await', 'null', 'true', 'false', '0', '1', '< />', '[]'],
  spawnChance: 0.012, // Reduced slightly to balance larger butterflies
  riseSpeed: { min: 0.5, max: 1.5 },
  swayAmplitude: { min: 20, max: 60 },
  swayFrequency: { min: 0.005, max: 0.02 },
  gravity: 0.05, 
  friction: 0.98, 
  flutterStrength: 0.1, 
};

interface Particle {
  relX: number; 
  relY: number;
  x: number; 
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  layer: 'body' | 'wing_inner' | 'wing_outer';
}

interface Butterfly {
  id: number;
  x: number;
  y: number;
  baseY: number; 
  scale: number;
  riseSpeed: number;
  swayPhase: number;
  swayFreq: number;
  particles: Particle[];
  isBroken: boolean;
  opacity: number;
}

const CodeButterflies: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const butterfliesRef = useRef<Butterfly[]>([]);
  const mouseRef = useRef<{ x: number; y: number; isActive: boolean }>({ x: -1000, y: -1000, isActive: false });
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: Generate Butterfly Curve points
  const generateButterflyParticles = (scale: number): Particle[] => {
    const particles: Particle[] = [];
    const keywords = CONFIG.keywords;
    
    // Body (Vertical line)
    const bodyCount = 6; // Reduced count
    for (let i = 0; i < bodyCount; i++) {
      particles.push({
        relX: (Math.random() - 0.5) * 4 * scale,
        relY: (i - bodyCount / 2) * 8 * scale,
        x: 0, y: 0, vx: 0, vy: 0,
        text: keywords[Math.floor(Math.random() * keywords.length)],
        size: Math.round(10 * scale), // Rounded size for caching
        alpha: 0.3 + Math.random() * 0.2, 
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        layer: 'body'
      });
    }

    // Wings
    // Increased step size (0.15 -> 0.3) to reduce particle count by 50%
    const step = 0.3; 
    for (let t = 0; t <= Math.PI * 12; t += step) {
      if (Math.random() > 0.45) continue; 

      const r = Math.exp(Math.cos(t)) - 2 * Math.cos(4 * t) - Math.pow(Math.sin(t / 12), 5);
      
      const xx = r * Math.sin(t);
      const yy = -r * Math.cos(t); 

      const isInner = Math.abs(xx) < 1.5 && Math.abs(yy) < 1.5;
      const layer = isInner ? 'wing_inner' : 'wing_outer';
      
      const baseSize = isInner ? (6 + Math.random() * 4) : (10 + Math.random() * 8);
      const roundedSize = Math.round(baseSize * scale); // Rounding for optimization

      const opacity = isInner ? 0.4 : 0.9;
      
      particles.push({
        relX: xx * 20 * scale, 
        relY: yy * 20 * scale,
        x: 0, y: 0, vx: 0, vy: 0,
        text: keywords[Math.floor(Math.random() * keywords.length)],
        size: roundedSize,
        alpha: opacity,
        rotation: (Math.random() - 0.5) * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        layer: layer
      });
    }

    // Sort particles by size to optimize batch rendering
    particles.sort((a, b) => a.size - b.size);
    return particles;
  };

  const spawnButterfly = (width: number, height: number) => {
    // Variety: 0.4 to 3.0 scale
    // Weighted to have more small/medium ones, fewer giant ones?
    // Let's just do random range for now as requested
    // "Variety... largest 3x"
    // Let's say base is 1.0. Range 0.5 to 3.0
    const scale = 0.5 + Math.pow(Math.random(), 1.5) * 2.5; 
    
    const butterfly: Butterfly = {
      id: Date.now() + Math.random(),
      x: Math.random() * width,
      y: height + 150, 
      baseY: height + 150,
      scale,
      riseSpeed: (CONFIG.riseSpeed.min + Math.random() * (CONFIG.riseSpeed.max - CONFIG.riseSpeed.min)) * (1/Math.sqrt(scale)), // Large ones move slightly slower?
      swayPhase: Math.random() * Math.PI * 2,
      swayFreq: CONFIG.swayFrequency.min + Math.random() * (CONFIG.swayFrequency.max - CONFIG.swayFrequency.min),
      particles: generateButterflyParticles(scale),
      isBroken: false,
      opacity: 1,
    };
    butterfliesRef.current.push(butterfly);
  };

  const update = (width: number, height: number) => {
    // Spawn logic
    if (Math.random() < CONFIG.spawnChance) {
      spawnButterfly(width, height);
    }

    const now = Date.now();

    // Update existing butterflies
    butterfliesRef.current.forEach(b => {
      if (!b.isBroken) {
        // Rise
        b.baseY -= b.riseSpeed;
        
        // Sway
        b.x += Math.cos(now * 0.002 + b.swayPhase) * 0.5; 
        b.y = b.baseY;

        // Check Collision with Mouse
        if (mouseRef.current.isActive) {
          const dx = b.x - mouseRef.current.x;
          const dy = b.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const hitRadius = 80 * b.scale; // Slightly generous hit box
          
          if (dist < hitRadius) {
            b.isBroken = true;
            b.particles.forEach(p => {
              p.x = b.x + p.relX;
              p.y = b.y + p.relY;
              p.vx = (Math.random() - 0.5) * 2; 
              p.vy = (Math.random() - 0.5) * 2;
            });
          }
        }
      } else {
        // Broken Physics
        b.opacity -= 0.005;
        
        // Loop optimization: pre-calculate common values if possible, 
        // but for array traversal, simple for loop is fastest, forEach is fine.
        for (let i = 0; i < b.particles.length; i++) {
            const p = b.particles[i];
            // Gravity
            p.vy += CONFIG.gravity;
            // Air Resistance
            p.vx *= CONFIG.friction;
            p.vy *= CONFIG.friction;
            // Flutter
            p.vx += Math.sin(now * 0.01 + p.rotation) * CONFIG.flutterStrength;
            // Move
            p.x += p.vx;
            p.y += p.vy;
            // Rotate
            p.rotation += p.rotationSpeed;
            // Fade
            p.alpha -= 0.008; // Fade slightly faster to clear buffer
        }
      }
    });

    // Cleanup
    // Optimization: Filter in place or less frequently? 
    // Filter every frame is okay for < 100 items.
    butterfliesRef.current = butterfliesRef.current.filter(b => {
      const isVisible = b.opacity > 0 && b.particles[0]?.alpha > 0; // Check first particle as proxy? or just b.opacity
      // Check last particle alpha is safer or just use a general fade timer
      const hasVisibleParticles = b.isBroken ? b.particles.some(p => p.alpha > 0) : true;
      const isOnScreen = b.y > -200;
      return (b.isBroken ? hasVisibleParticles : isOnScreen);
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Optimization: Minimize state changes
    // But since butterflies are at different depths/positions, we can't batch globally easily without z-sorting problems?
    // Actually, butterflies don't overlap z-index in 2D canvas implicitly (draw order).
    // We can just draw them.
    
    let currentFontSize = 0;
    
    butterfliesRef.current.forEach(b => {
      // Optimization: if broken, we iterate particles.
      // If not broken, we iterate particles.
      
      const isBroken = b.isBroken;
      const particles = b.particles;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.alpha <= 0) continue;

        // Skip saving context if possible? 
        // Rotation requires transform.
        // We can optimize by grouping same-size particles if we sorted them during generation.
        // We did sort them!
        
        // Font state change check
        if (p.size !== currentFontSize) {
            ctx.font = `${p.size}px monospace`;
            currentFontSize = p.size;
        }
        
        ctx.save();
        
        let drawX, drawY;
        if (isBroken) {
            drawX = p.x;
            drawY = p.y;
        } else {
            drawX = b.x + p.relX;
            drawY = b.y + p.relY;
        }

        ctx.translate(drawX, drawY);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.fillText(p.text, 0, 0);
        
        ctx.restore();
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency in background if possible? Actually we need clearRect.
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      if (canvas) {
        update(canvas.width, canvas.height);
        draw(ctx, canvas.width, canvas.height);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
        if (containerRef.current && canvas) {
            // High DPI support can cause more lag, maybe keep 1:1 for performance if struggling?
            // For this ethereal look, 1:1 is fine.
            canvas.width = containerRef.current.clientWidth;
            canvas.height = containerRef.current.clientHeight;
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); 
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = (e as React.MouseEvent).clientX;
        clientY = (e as React.MouseEvent).clientY;
    }

    mouseRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        isActive: true
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.isActive = false;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
      />
      
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none z-10 px-4">
        <p className="text-white/40 text-sm md:text-base font-light font-mono tracking-widest uppercase opacity-80 mix-blend-difference">
          An interactive visualization where ethereal code fragments coalesce into wings and dissipate upon touch.
        </p>
      </div>
    </div>
  );
};

export default CodeButterflies;
