import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a proper isometric 3D tablet/device with dashboard content.
 * Solid colored body + glass screen on top face with sidebar,
 * title bar, and 2×2 widget cards.
 */
export function renderDashboard(
  ctx: CanvasRenderingContext2D,
  node: NodeEntity,
  selected: boolean,
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const points = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
  const [lt, rt, rb, lb] = points;
  const depth = NODE_DEPTH * 0.30 * camera.zoom;
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));
  const cornerR = Math.min(8, (topEdgeLen + leftEdgeLen) * 0.035);

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  const deepTone = light ? deepToneForGlow(node.glowColor) : '';

  const tp = (u: number, v: number) => ({
    x: lt.x + (rt.x - lt.x) * u + (lb.x - lt.x) * v,
    y: lt.y + (rt.y - lt.y) * u + (lb.y - lt.y) * v,
  });

  // ── Left side face ──
  drawRoundedPolygon(ctx, [lt, lb, lbD, ltD], cornerR);
  const gLeft = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
  gLeft.addColorStop(0, light ? darkenHex(deepTone, 0.45) : darkenHex(node.glowColor, 0.25));
  gLeft.addColorStop(1, light ? darkenHex(deepTone, 0.65) : darkenHex(node.glowColor, 0.50));
  ctx.fillStyle = gLeft; ctx.fill();

  // ── Front face ──
  drawRoundedPolygon(ctx, [lb, rb, rbD, lbD], cornerR);
  const gFront = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
  gFront.addColorStop(0, light ? darkenHex(deepTone, 0.55) : darkenHex(node.glowColor, 0.40));
  gFront.addColorStop(1, light ? darkenHex(deepTone, 0.75) : darkenHex(node.glowColor, 0.60));
  ctx.fillStyle = gFront; ctx.fill();

  // ── Right side face ──
  drawRoundedPolygon(ctx, [rt, rb, rbD, rtD], cornerR);
  const gRight = ctx.createLinearGradient(rt.x, rt.y, rbD.x, rbD.y);
  gRight.addColorStop(0, light ? darkenHex(deepTone, 0.50) : darkenHex(node.glowColor, 0.30));
  gRight.addColorStop(1, light ? darkenHex(deepTone, 0.70) : darkenHex(node.glowColor, 0.55));
  ctx.fillStyle = gRight; ctx.fill();

  // ── Top face: device body ──
  drawRoundedPolygon(ctx, points, cornerR);
  const gTop = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  gTop.addColorStop(0, light ? darkenHex(deepTone, 0.30) : darkenHex(node.glowColor, 0.15));
  gTop.addColorStop(1, light ? darkenHex(deepTone, 0.42) : darkenHex(node.glowColor, 0.30));
  ctx.fillStyle = gTop;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.30 : 0.50) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 12) : (selected ? 30 : 18);
  ctx.fill(); ctx.shadowBlur = 0;

  // ── Glass screen inset ──
  const si = 0.06;
  const screen = [tp(si, si), tp(1 - si, si), tp(1 - si, 1 - si), tp(si, 1 - si)];
  drawRoundedPolygon(ctx, screen, cornerR * 0.6);
  ctx.fillStyle = light ? 'rgba(200,230,255,0.12)' : hexToRgba(lightenHex(node.glowColor, 0.40), 0.10);
  ctx.fill();

  // Diagonal reflection
  ctx.beginPath();
  ctx.moveTo(tp(0.62, 0.10).x, tp(0.62, 0.10).y);
  ctx.lineTo(tp(0.18, 0.78).x, tp(0.18, 0.78).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 6 * bScale; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tp(0.68, 0.08).x, tp(0.68, 0.08).y);
  ctx.lineTo(tp(0.24, 0.76).x, tp(0.24, 0.76).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 3 * bScale; ctx.stroke();

  // ── Top face border ──
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.80 : 0.65));
  ctx.lineWidth = (selected ? 2.8 : 2) * bScale; ctx.stroke();
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.20 : 0.10);
  ctx.lineWidth = (selected ? 5 : 3.5) * bScale; ctx.stroke();

  // ── Edge highlights ──
  ctx.beginPath(); ctx.moveTo(lt.x, lt.y); ctx.lineTo(rt.x, rt.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.75); ctx.lineWidth = 2 * bScale; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(lt.x, lt.y); ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.90); ctx.lineWidth = 2.5 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.12 : 0.40);
  ctx.shadowBlur = (light ? 3 : 8) * bScale; ctx.stroke(); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.moveTo(lb.x, lb.y); ctx.lineTo(lbD.x, lbD.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.60); ctx.lineWidth = 1.8 * bScale; ctx.stroke();

  // ── Dashboard content ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;

  // Title bar
  const hdr = 0.10;
  drawPolygon(ctx, [tp(si, si), tp(1 - si, si), tp(1 - si, si + hdr), tp(si, si + hdr)]);
  ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.10 : 0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tp(si, si + hdr).x, tp(si, si + hdr).y);
  ctx.lineTo(tp(1 - si, si + hdr).x, tp(1 - si, si + hdr).y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.18);
  ctx.lineWidth = 0.8 * bScale; ctx.stroke();

  if (showDetail) {
    // Traffic lights
    const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
    for (let i = 0; i < 3; i++) {
      const d = tp(si + 0.03 + i * 0.04, si + hdr * 0.5);
      ctx.beginPath(); ctx.arc(d.x, d.y, 2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.75 : 0.55); ctx.fill();
    }

    // Sidebar divider (vertical line along u-axis)
    const sideW = 0.18;
    ctx.beginPath();
    ctx.moveTo(tp(si + sideW, si + hdr).x, tp(si + sideW, si + hdr).y);
    ctx.lineTo(tp(si + sideW, 1 - si).x, tp(si + sideW, 1 - si).y);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.12);
    ctx.lineWidth = 0.6 * bScale; ctx.stroke();

    // Sidebar nav items
    for (let i = 0; i < 4; i++) {
      const iy = si + hdr + 0.04 + i * 0.08;
      const navL = tp(si + 0.02, iy);
      const navR = tp(si + sideW - 0.02, iy + 0.04);
      drawPolygon(ctx, [tp(si + 0.02, iy), tp(si + sideW - 0.02, iy), navR, tp(si + 0.02, iy + 0.04)]);
      ctx.fillStyle = hexToRgba(node.glowColor, i === 0 ? 0.10 : 0.03);
      ctx.fill();
    }

    // 2×2 widget cards in the main content area
    const contentLeft = si + sideW + 0.03;
    const contentTop = si + hdr + 0.04;
    const cardW = (1 - 2 * si - sideW - 0.06) / 2;
    const cardH = (1 - 2 * si - hdr - 0.08) / 2;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const cl = contentLeft + col * (cardW + 0.02);
        const ct2 = contentTop + row * (cardH + 0.02);
        drawPolygon(ctx, [tp(cl, ct2), tp(cl + cardW, ct2), tp(cl + cardW, ct2 + cardH), tp(cl, ct2 + cardH)]);
        ctx.fillStyle = light ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
        ctx.fill();
        ctx.strokeStyle = hexToRgba(node.glowColor, 0.08);
        ctx.lineWidth = 0.4 * bScale; ctx.stroke();

        // Mini chart line in each widget
        ctx.beginPath();
        for (let p = 0; p <= 4; p++) {
          const px = cl + 0.03 + (cardW - 0.06) * (p / 4);
          const py = ct2 + cardH * 0.3 + Math.sin(p * 1.8 + row * 2 + col * 3) * cardH * 0.2;
          const pt = tp(px, py);
          if (p === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = hexToRgba(node.glowColor, 0.35);
        ctx.lineWidth = 1.2 * bScale; ctx.lineJoin = 'round'; ctx.stroke();
      }
    }
  }

  // ── Icon + text ──
  const titlePoint = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
  const textDir = by;
  const textStack = { x: -bx.x, y: -bx.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const ic = worldToScreen({ x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 }, camera, viewport);
    ctx.save(); ctx.translate(ic.x, ic.y);
    ctx.transform(by.x, by.y, -bx.x, -bx.y, 0, 0);
    const s = iconSize / 32; ctx.scale(s, s); ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.85 : 0.65;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const fs = node.fontSize ?? DEFAULT_FONT_SIZE;
    const ss = Math.round(fs * camera.zoom);
    drawTransformedText(ctx, node.title, titlePoint, textDir, textStack, light ? 'rgba(255,255,255,0.95)' : '#fff', `600 ${ss}px Inter, sans-serif`);
    if (node.subtitle) {
      const sp = { x: titlePoint.x + textStack.x * 18, y: titlePoint.y + textStack.y * 18 };
      drawTransformedText(ctx, node.subtitle, sp, textDir, textStack, light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95), `600 ${Math.round(ss * 0.8)}px Inter, sans-serif`);
    }
  }
}
