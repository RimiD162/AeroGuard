'use client';

import React from 'react';

const AetherBackground = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: null as number | null, y: null as number | null, radius: 180 };

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(x: number, y: number, directionX: number, directionY: number, size: number, color: string) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        if (this.x > canvas.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        // Mouse collision detection
        if (mouse.x !== null && mouse.y !== null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 3;
            this.y -= forceDirectionY * force * 3;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particles = [];
      let numberOfParticles = (canvas.height * canvas.width) / 10000;
      // Cap the number of particles to ensure high performance
      numberOfParticles = Math.min(numberOfParticles, 150);
      for (let i = 0; i < numberOfParticles; i++) {
        let size = (Math.random() * 2) + 0.5;
        let x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
        let y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
        let directionX = (Math.random() * 0.4) - 0.2;
        let directionY = (Math.random() * 0.4) - 0.2;
        // AeroGuard color is blue/cyan. Soft blues and cyans.
        let color = Math.random() > 0.5 
          ? 'rgba(37, 99, 235, 0.45)'  // Accent Blue
          : 'rgba(14, 165, 233, 0.45)'; // Info Cyan
        particles.push(new Particle(x, y, directionX, directionY, size, color));
      }
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      init();
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const connect = () => {
      let opacityValue = 1;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
            + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));

          if (distance < (canvas.width / 7) * (canvas.height / 7)) {
            opacityValue = 1 - (distance / 25000);

            let dx_mouse_a = particles[a].x - (mouse.x ?? 0);
            let dy_mouse_a = particles[a].y - (mouse.y ?? 0);
            let distance_mouse_a = Math.sqrt(dx_mouse_a * dx_mouse_a + dy_mouse_a * dy_mouse_a);

            if (mouse.x !== null && distance_mouse_a < mouse.radius) {
              ctx.strokeStyle = `rgba(37, 99, 235, ${opacityValue * 0.28})`; // Brighter blue line near mouse
            } else {
              ctx.strokeStyle = `rgba(37, 99, 235, ${opacityValue * 0.08})`;  // Soft blue connection line
            }

            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;
    };

    const handleMouseOut = () => {
      mouse.x = null;
      mouse.y = null;
    };

    // Attach mouse events to the canvas parent component for local coordinates
    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseOut);
    }

    init();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseOut);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-screen"
      style={{ zIndex: 0 }}
    />
  );
};

export default AetherBackground;
