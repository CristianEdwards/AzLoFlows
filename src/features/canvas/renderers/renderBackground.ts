import type { ViewportSize } from '@/lib/geometry/iso';

export function renderBackground(ctx: CanvasRenderingContext2D, viewport: ViewportSize, theme: 'dark' | 'light' = 'dark'): void {
  if (theme === 'light') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const wash = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
    wash.addColorStop(0, 'rgba(248, 250, 252, 0.95)');
    wash.addColorStop(0.45, 'rgba(241, 245, 249, 0.6)');
    wash.addColorStop(1, 'rgba(248, 250, 252, 0.95)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    paintGlow(ctx, viewport.width * 0.18, viewport.height * 0.18, Math.max(viewport.width, viewport.height) * 0.42, 'rgba(6, 182, 212, 0.025)');
    paintGlow(ctx, viewport.width * 0.82, viewport.height * 0.14, Math.max(viewport.width, viewport.height) * 0.36, 'rgba(56, 189, 248, 0.025)');
    paintGlow(ctx, viewport.width * 0.9, viewport.height * 0.78, Math.max(viewport.width, viewport.height) * 0.34, 'rgba(139, 92, 246, 0.03)');

    const vignette = ctx.createRadialGradient(
      viewport.width * 0.5,
      viewport.height * 0.46,
      Math.max(viewport.width, viewport.height) * 0.12,
      viewport.width * 0.5,
      viewport.height * 0.5,
      Math.max(viewport.width, viewport.height) * 0.86,
    );
    vignette.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vignette.addColorStop(1, 'rgba(210, 210, 225, 0.12)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    for (let x = 24; x < viewport.width; x += 36) {
      for (let y = 24; y < viewport.height; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const wash = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
  wash.addColorStop(0, 'rgba(15, 23, 42, 0.92)');
  wash.addColorStop(0.45, 'rgba(15, 23, 42, 0.32)');
  wash.addColorStop(1, 'rgba(15, 23, 42, 0.94)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  paintGlow(ctx, viewport.width * 0.18, viewport.height * 0.18, Math.max(viewport.width, viewport.height) * 0.42, 'rgba(34, 211, 238, 0.07)');
  paintGlow(ctx, viewport.width * 0.82, viewport.height * 0.14, Math.max(viewport.width, viewport.height) * 0.36, 'rgba(56, 189, 248, 0.08)');
  paintGlow(ctx, viewport.width * 0.9, viewport.height * 0.78, Math.max(viewport.width, viewport.height) * 0.34, 'rgba(139, 92, 246, 0.09)');
  paintGlow(ctx, viewport.width * 0.55, viewport.height * 0.5, Math.max(viewport.width, viewport.height) * 0.48, 'rgba(15, 23, 42, 0.34)');

  const vignette = ctx.createRadialGradient(
    viewport.width * 0.5,
    viewport.height * 0.46,
    Math.max(viewport.width, viewport.height) * 0.12,
    viewport.width * 0.5,
    viewport.height * 0.5,
    Math.max(viewport.width, viewport.height) * 0.86,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(2, 2, 16, 0.56)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.008)';
  for (let x = 24; x < viewport.width; x += 36) {
    for (let y = 24; y < viewport.height; y += 36) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.45, color.replace(/0?\.[0-9]+\)/, '0.03)'));
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
