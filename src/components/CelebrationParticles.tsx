import React, { useEffect, useRef } from 'react';

interface CelebrationParticlesProps {
  active: boolean;
  mode?: 'burst' | 'continuous';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  shape: 'diamond' | 'circle' | 'star' | 'ribbon';
}

const COLORS = [
  '#fbbf24', // Gold
  '#fde047', // Bright Yellow Gold
  '#34d399', // Emerald Green
  '#10b981', // Vibrant Green
  '#60a5fa', // Studio Blue
  '#ffffff', // Crisp White Spark
];

export const CelebrationParticles: React.FC<CelebrationParticlesProps> = ({
  active,
  mode = 'burst',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createBurst = (originX: number, originY: number, count: number) => {
      const shapes: Particle['shape'][] = ['diamond', 'star', 'circle', 'ribbon'];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 11;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          size: 5 + Math.random() * 7,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          alpha: 1,
          decay: 0.008 + Math.random() * 0.012,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.18,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
        });
      }
    };

    // Initial twin bursts from left/right studio canons + center stage
    createBurst(canvas.width * 0.5, canvas.height * 0.55, 85);
    createBurst(canvas.width * 0.25, canvas.height * 0.65, 55);
    createBurst(canvas.width * 0.75, canvas.height * 0.65, 55);

    let continuousInterval: number | null = null;
    if (mode === 'continuous') {
      continuousInterval = window.setInterval(() => {
        createBurst(
          canvas.width * (0.2 + Math.random() * 0.6),
          canvas.height * (0.25 + Math.random() * 0.4),
          50
        );
      }, 900);
    }

    const drawStar = (c: CanvasRenderingContext2D, r: number) => {
      c.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(outerAngle) * r;
        const y = Math.sin(outerAngle) * r;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.closePath();
      c.fill();
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // Gravity
        p.vx *= 0.985; // Air resistance
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > canvas.height + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;

        if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.75, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.75, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'star') {
          drawStar(ctx, p.size);
        } else if (p.shape === 'ribbon') {
          ctx.fillRect(-p.size * 0.8, -p.size * 0.35, p.size * 1.6, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0 || mode === 'continuous') {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (continuousInterval !== null) clearInterval(continuousInterval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [active, mode]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
};
