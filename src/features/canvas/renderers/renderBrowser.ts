import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric browser / app window.
 * Tilted back (screen rises from the front-bottom edge of the isoQuad).
 * Has a title bar with dots and an address bar, then a content area.
 * Inspired by the "Live App" panel and dashboard reference images.
 */
export function renderBrowser(
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
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // Browser window: rises vertically from the front edge (lb→rb)
  const windowH = node.height * 0.7 * camera.zoom;
  const tiltBack = node.width * 0.06 * camera.zoom;

  // Window corners (bottom = lb→rb, top = above that)
  const wbl = lb;
  const wbr = rb;
  const wtl = { x: lb.x + by.x * tiltBack, y: lb.y - windowH + by.y * tiltBack };
  const wtr = { x: rb.x + by.x * tiltBack, y: rb.y - windowH + by.y * tiltBack };

  // Thin side depth (thickness of the window frame)
  const sideDepth = 4 * camera.zoom;
  const wtlD = { x: wtl.x - bx.x * sideDepth, y: wtl.y - bx.y * sideDepth };
  const wblD = { x: wbl.x - bx.x * sideDepth, y: wbl.y - bx.y * sideDepth };

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [wbl, wbr, wtr, wtl]);
    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left edge thickness ──
  drawPolygon(ctx, [wtl, wbl, wblD, wtlD]);
  ctx.fillStyle = light ? darkenHex(deepTone, 0.7) : hexToRgba(faceFill, 0.12);
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.2 : 0.1);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Main window face ──
  const winFace = [wtl, wtr, wbr, wbl];
  drawPolygon(ctx, winFace);
  const winGrad = ctx.createLinearGradient(wtl.x, wtl.y, wbl.x, wbl.y);
  if (light) {
    winGrad.addColorStop(0, deepToneLit);
    winGrad.addColorStop(0.3, deepToneMid);
    winGrad.addColorStop(1, deepTone);
  } else {
    winGrad.addColorStop(0, hexToRgba(faceFill, 0.72));
    winGrad.addColorStop(0.3, hexToRgba(faceFill, 0.45));
    winGrad.addColorStop(1, hexToRgba(faceFill, 0.18));
  }
  ctx.fillStyle = winGrad;
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.30 : 0.45) * pulse);
  ctx.shadowBlur = light ? (selected ? 20 : 14) : (selected ? 26 : 18);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Window border
  drawPolygon(ctx, winFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.82 : 0.68));
  ctx.lineWidth = (selected ? 3 : 2) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, winFace);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.15));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Title bar (top ~8% of window) ──
  const tbFrac = 0.08;
  const tbBL = {
    x: wtl.x + (wbl.x - wtl.x) * tbFrac,
    y: wtl.y + (wbl.y - wtl.y) * tbFrac,
  };
  const tbBR = {
    x: wtr.x + (wbr.x - wtr.x) * tbFrac,
    y: wtr.y + (wbr.y - wtr.y) * tbFrac,
  };
  drawPolygon(ctx, [wtl, wtr, tbBR, tbBL]);
  ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.12) : hexToRgba(node.glowColor, 0.08);
  ctx.fill();

  // Title bar separator
  ctx.beginPath();
  ctx.moveTo(tbBL.x, tbBL.y);
  ctx.lineTo(tbBR.x, tbBR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.3 : 0.18);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  // Traffic light dots
  const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
  for (let i = 0; i < 3; i++) {
    const t = 0.04 + i * 0.03;
    const dotX = wtl.x + (wtr.x - wtl.x) * t + (wbl.x - wtl.x) * tbFrac * 0.5;
    const dotY = wtl.y + (wtr.y - wtl.y) * t + (wbl.y - wtl.y) * tbFrac * 0.5;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 1.8 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.7 : 0.5);
    ctx.fill();
  }

  // ── Address bar (next ~6% below title bar) ──
  const abFrac = tbFrac + 0.06;
  const abBL = {
    x: wtl.x + (wbl.x - wtl.x) * abFrac,
    y: wtl.y + (wbl.y - wtl.y) * abFrac,
  };
  const abBR = {
    x: wtr.x + (wbr.x - wtr.x) * abFrac,
    y: wtr.y + (wbr.y - wtr.y) * abFrac,
  };
  // Address bar background
  const abTL = tbBL;
  const abTR = tbBR;
  // Address input box
  const abInL = {
    x: abTL.x + (abTR.x - abTL.x) * 0.08 + (abBL.x - abTL.x) * 0.2,
    y: abTL.y + (abTR.y - abTL.y) * 0.08 + (abBL.y - abTL.y) * 0.2,
  };
  const abInR = {
    x: abTL.x + (abTR.x - abTL.x) * 0.92 + (abBL.x - abTL.x) * 0.2,
    y: abTL.y + (abTR.y - abTL.y) * 0.92 + (abBL.y - abTL.y) * 0.2,
  };
  const abInL2 = {
    x: abTL.x + (abTR.x - abTL.x) * 0.08 + (abBL.x - abTL.x) * 0.8,
    y: abTL.y + (abTR.y - abTL.y) * 0.08 + (abBL.y - abTL.y) * 0.8,
  };
  const abInR2 = {
    x: abTL.x + (abTR.x - abTL.x) * 0.92 + (abBL.x - abTL.x) * 0.8,
    y: abTL.y + (abTR.y - abTL.y) * 0.92 + (abBL.y - abTL.y) * 0.8,
  };
  drawPolygon(ctx, [abInL, abInR, abInR2, abInL2]);
  ctx.fillStyle = light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // Address bar bottom separator
  ctx.beginPath();
  ctx.moveTo(abBL.x, abBL.y);
  ctx.lineTo(abBR.x, abBR.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.15 : 0.08);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── Leading edge glow ──
  ctx.beginPath();
  ctx.moveTo(wtl.x, wtl.y);
  ctx.lineTo(wbl.x, wbl.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.92);
  ctx.lineWidth = 2.4 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.4);
  ctx.shadowBlur = (light ? 3 : 8) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Content area: faint placeholder rectangles ──
  const contentTop = abFrac + 0.04;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const top = contentTop + row * 0.22;
      const left = 0.06 + col * 0.46;
      const boxW = 0.42;
      const boxH = 0.16;
      const bTL = {
        x: wtl.x + (wtr.x - wtl.x) * left + (wbl.x - wtl.x) * top,
        y: wtl.y + (wtr.y - wtl.y) * left + (wbl.y - wtl.y) * top,
      };
      const bTR = {
        x: wtl.x + (wtr.x - wtl.x) * (left + boxW) + (wbl.x - wtl.x) * top,
        y: wtl.y + (wtr.y - wtl.y) * (left + boxW) + (wbl.y - wtl.y) * top,
      };
      const bBR = {
        x: wtl.x + (wtr.x - wtl.x) * (left + boxW) + (wbl.x - wtl.x) * (top + boxH),
        y: wtl.y + (wtr.y - wtl.y) * (left + boxW) + (wbl.y - wtl.y) * (top + boxH),
      };
      const bBL = {
        x: wtl.x + (wtr.x - wtl.x) * left + (wbl.x - wtl.x) * (top + boxH),
        y: wtl.y + (wtr.y - wtl.y) * left + (wbl.y - wtl.y) * (top + boxH),
      };
      drawPolygon(ctx, [bTL, bTR, bBR, bBL]);
      ctx.fillStyle = light ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)';
      ctx.fill();
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.08 : 0.04);
      ctx.lineWidth = 0.5 * bScale;
      ctx.stroke();
    }
  }

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const winCX = (wtl.x + wtr.x + wbl.x + wbr.x) / 4;
  const winCY = (wtl.y + wtr.y + wbl.y + wbr.y) / 4;
  // Basis along the top edge of the window
  const winBasisX = bx;

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, windowH / camera.zoom) * NODE_ICON_SCALE * camera.zoom * 1.2;
    ctx.save();
    ctx.translate(winCX, winCY);
    ctx.transform(winBasisX.x, winBasisX.y, 0, 1, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.75;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePt = { x: winCX, y: winCY + windowH * 0.18 };
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.85);

    drawTransformedText(ctx, node.title, titlePt, winBasisX, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `700 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = { x: titlePt.x, y: titlePt.y + scaledSize * 1.2 };
      drawTransformedText(ctx, node.subtitle, subPt, winBasisX, { x: 0, y: 1 },
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}
