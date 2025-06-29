'use client';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowRight, Github } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingText = 'Visualize Your Spotify Experience';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const stars: { x: number; y: number; z: number }[] = [];
    const mouse = { x: 0, y: 0 };
    const numStars = 250;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const star of stars) {
        star.z -= 0.6;
        if (star.z <= 0) {
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
          star.z = width;
        }

        const k = 128 / star.z;
        const px = star.x * k + width / 2;
        const py = star.y * k + height / 2;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const size = (1 - star.z / width) * 4;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `oklch(from var(--primary-foreground) l c h / ${
            1 - star.z / width
          })`;
          ctx.fill();

          // Draw lines to nearby stars
          for (const other of stars) {
            if (star === other) continue;
            const other_k = 128 / other.z;
            const other_px = other.x * other_k + width / 2;
            const other_py = other.y * other_k + height / 2;

            const dist = Math.sqrt(
              Math.pow(px - other_px, 2) + Math.pow(py - other_py, 2),
            );

            if (dist < 100) {
              const mouse_dist = Math.sqrt(
                Math.pow(px - mouse.x, 2) + Math.pow(py - mouse.y, 2),
              );
              const opacity = 1 - mouse_dist / 300;

              if (opacity > 0) {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(other_px, other_py);
                ctx.strokeStyle = `oklch(from var(--primary) 0.9 0.02 h / ${
                  opacity * 0.1
                })`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="visualizer-bg relative flex flex-1 flex-col items-center justify-center overflow-hidden text-center">
      <div className="grid-overlay" />
      <canvas ref={canvasRef} id="constellation-canvas" />
      <div className="spotlight" />
      <div
        className={cn(
          'glass-pane z-10 flex flex-col items-center p-6 md:p-12',
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="flex animate-pulse items-center gap-2 duration-3000">
            <Image
              src="/img/icon-light.png"
              alt="spicetify-viz Logo"
              width={48}
              height={48}
              className="dark:hidden"
              priority
            />
            <Image
              src="/img/icon-dark.png"
              alt="spicetify-viz Logo"
              width={48}
              height={48}
              className="hidden dark:block"
              priority
            />
          </div>
          <h1
            className="text-glitch animate-fade-in-up text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl"
            data-text={headingText}
          >
            {headingText}
          </h1>
          <p className="max-w-[700px] animate-fade-in-up text-lg text-muted-foreground animation-delay-200">
            Bring your Spotify data to life with stunning, interactive, and
            customizable visualizations.
          </p>
        </div>
        <div className="mt-8 flex animate-fade-in-up flex-col gap-4 animation-delay-400 sm:flex-row">
          <Link
            href="/docs"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'gap-2 animate-pulse duration-2000',
            )}
          >
            Get Started
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="https://github.com/spicetify/spicetify-marketplace"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'gap-2 animate-pulse duration-2000 animation-delay-200',
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github className="size-4" />
            View on GitHub
          </Link>
        </div>
      </div>

      <div className="absolute bottom-12 left-0 right-0 h-24">
        <div className="equalizer mx-auto">
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
          <div className="equalizer-bar" />
        </div>
      </div>
    </div>
  );
}
