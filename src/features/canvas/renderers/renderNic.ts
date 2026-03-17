import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders an isometric NIC (Network Interface Card) shape.
 * Green PCB board with gold connector pins along one edge,
 * two 3-D RJ-45 port blocks, a backplate strip, and LED indicators.
 */
export function renderNic(
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
  const depth = NODE_DEPTH * 0.20 * camera.zoom; // thin PCB slab
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bxDir = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const byDir = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  // Depth-extruded corners
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  // PCB base colour: green from glowColor, gold from amber/yellow
  const pcbGreen = light ? deepToneForGlow(node.glowColor) : node.glowColor;
  const pcbFill = node.fill;
  const goldColor = '#D4A017';
  const portGray = light ? '#8A8A8A' : '#6B7280';
  const darkPort = light ? '#3A3A3A' : '#1F2937';

  // ── Drop shadow (light mode) ──
  if (light) {
    drawPolygon(ctx, [lb, rb, rbD, lbD]);
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left face (medium PCB green) ──
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  if (light) {
    const g = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    g.addColorStop(0, darkenHex(pcbGreen, 0.55));
    g.addColorStop(1, darkenHex(pcbGreen, 0.70));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    g.addColorStop(0, hexToRgba(node.glowColor, 0.45));
    g.addColorStop(1, darkenHex(node.glowColor, 0.55));
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Front face (darker PCB green) ──
  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  if (light) {
    const g = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    g.addColorStop(0, darkenHex(pcbGreen, 0.50));
    g.addColorStop(1, darkenHex(pcbGreen, 0.65));
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    g.addColorStop(0, darkenHex(node.glowColor, 0.45));
    g.addColorStop(1, darkenHex(node.glowColor, 0.65));
    ctx.fillStyle = g;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Top face (PCB surface — brightest green) ──
  drawPolygon(ctx, points);
  const grad = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    grad.addColorStop(0, lightenHex(pcbGreen, 0.35));
    grad.addColorStop(0.5, lightenHex(pcbGreen, 0.25));
    grad.addColorStop(1, lightenHex(pcbGreen, 0.15));
  } else {
    grad.addColorStop(0, hexToRgba(node.glowColor, 0.80));
    grad.addColorStop(0.4, hexToRgba(node.glowColor, 0.55));
    grad.addColorStop(1, darkenHex(node.glowColor, 0.30));
  }
  ctx.fillStyle = grad;
  ctx.fill();

  // ── PCB circuit-trace lines (subtle detail on top face) ──
  ctx.save();
  ctx.globalAlpha = light ? 0.10 : 0.08;
  ctx.strokeStyle = light ? darkenHex(pcbGreen, 0.3) : lightenHex(node.glowColor, 0.5);
  ctx.lineWidth = 0.7 * bScale;
  for (let i = 1; i <= 4; i++) {
    const t = i * 0.2;
    const p1 = { x: lt.x + (lb.x - lt.x) * t, y: lt.y + (lb.y - lt.y) * t };
    const p2 = { x: rt.x + (rb.x - rt.x) * t, y: rt.y + (rb.y - rt.y) * t };
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  for (let i = 1; i <= 3; i++) {
    const t = i * 0.25;
    const p1 = { x: lt.x + (rt.x - lt.x) * t, y: lt.y + (rt.y - lt.y) * t };
    const p2 = { x: lb.x + (rb.x - lb.x) * t, y: lb.y + (rb.y - lb.y) * t };
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();

  // ── Gold connector pins along the left edge (like PCB edge connector) ──
  const pinCount = 8;
  for (let i = 0; i < pinCount; i++) {
    const t = 0.12 + (i / (pinCount - 1)) * 0.76;
    const pinBase = {
      x: lt.x + (lb.x - lt.x) * t,
      y: lt.y + (lb.y - lt.y) * t,
    };
    const pinOut = {
      x: pinBase.x - bxDir.x * 3 * bScale,
      y: pinBase.y - bxDir.y * 3 * bScale,
    };
    const pinW = 2 * bScale;
    ctx.beginPath();
    ctx.moveTo(pinBase.x - byDir.x * pinW, pinBase.y - byDir.y * pinW);
    ctx.lineTo(pinBase.x + byDir.x * pinW, pinBase.y + byDir.y * pinW);
    ctx.lineTo(pinOut.x + byDir.x * pinW, pinOut.y + byDir.y * pinW);
    ctx.lineTo(pinOut.x - byDir.x * pinW, pinOut.y - byDir.y * pinW);
    ctx.closePath();
    ctx.fillStyle = light ? '#C8962E' : goldColor;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // ── Two RJ-45 port blocks (3-D extruded rectangles on top face) ──
  const portDepth = depth * 1.4;
  for (let pi = 0; pi < 2; pi++) {
    const portXStart = 0.55 + pi * 0.22;
    const portXEnd = portXStart + 0.16;
    const portYStart = 0.20;
    const portYEnd = 0.55;

    // four corners of port on top face
    const pLT = {
      x: lt.x + (rt.x - lt.x) * portXStart + (lb.x - lt.x) * portYStart,
      y: lt.y + (rt.y - lt.y) * portXStart + (lb.y - lt.y) * portYStart,
    };
    const pRT = {
      x: lt.x + (rt.x - lt.x) * portXEnd + (lb.x - lt.x) * portYStart,
      y: lt.y + (rt.y - lt.y) * portXEnd + (lb.y - lt.y) * portYStart,
    };
    const pRB = {
      x: lt.x + (rt.x - lt.x) * portXEnd + (lb.x - lt.x) * portYEnd,
      y: lt.y + (rt.y - lt.y) * portXEnd + (lb.y - lt.y) * portYEnd,
    };
    const pLB = {
      x: lt.x + (rt.x - lt.x) * portXStart + (lb.x - lt.x) * portYEnd,
      y: lt.y + (rt.y - lt.y) * portXStart + (lb.y - lt.y) * portYEnd,
    };

    // extruded top of port block
    const pLTu = { x: pLT.x, y: pLT.y - portDepth };
    const pRTu = { x: pRT.x, y: pRT.y - portDepth };
    const pRBu = { x: pRB.x, y: pRB.y - portDepth };
    const pLBu = { x: pLB.x, y: pLB.y - portDepth };

    // Front face of port block
    drawPolygon(ctx, [pLB, pRB, pRBu, pLBu]);
    ctx.fillStyle = light ? '#9CA3AF' : '#4B5563';
    ctx.fill();
    ctx.strokeStyle = hexToRgba('#000000', 0.2);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // Right face of port block
    drawPolygon(ctx, [pRB, pRT, pRTu, pRBu]);
    ctx.fillStyle = light ? '#8A8F96' : '#3E4451';
    ctx.fill();
    ctx.strokeStyle = hexToRgba('#000000', 0.2);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // Top face of port block
    drawPolygon(ctx, [pLTu, pRTu, pRBu, pLBu]);
    ctx.fillStyle = light ? '#B0B5BC' : '#6B7280';
    ctx.fill();
    ctx.strokeStyle = hexToRgba('#000000', 0.15);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // Dark port opening inset on top face of port block
    const inset = 0.15;
    const iLT = {
      x: pLTu.x + (pRTu.x - pLTu.x) * inset + (pLBu.x - pLTu.x) * inset,
      y: pLTu.y + (pRTu.y - pLTu.y) * inset + (pLBu.y - pLTu.y) * inset,
    };
    const iRT = {
      x: pLTu.x + (pRTu.x - pLTu.x) * (1 - inset) + (pLBu.x - pLTu.x) * inset,
      y: pLTu.y + (pRTu.y - pLTu.y) * (1 - inset) + (pLBu.y - pLTu.y) * inset,
    };
    const iRB = {
      x: pLTu.x + (pRTu.x - pLTu.x) * (1 - inset) + (pLBu.x - pLTu.x) * (1 - inset),
      y: pLTu.y + (pRTu.y - pLTu.y) * (1 - inset) + (pLBu.y - pLTu.y) * (1 - inset),
    };
    const iLB = {
      x: pLTu.x + (pRTu.x - pLTu.x) * inset + (pLBu.x - pLTu.x) * (1 - inset),
      y: pLTu.y + (pRTu.y - pLTu.y) * inset + (pLBu.y - pLTu.y) * (1 - inset),
    };
    drawPolygon(ctx, [iLT, iRT, iRB, iLB]);
    ctx.fillStyle = darkPort;
    ctx.fill();
  }

  // ── Backplate strip along the right edge ──
  const bpStart = 0.88;
  const bpLT = {
    x: lt.x + (rt.x - lt.x) * bpStart,
    y: lt.y + (rt.y - lt.y) * bpStart,
  };
  const bpRT = { x: rt.x, y: rt.y };
  const bpRB = { x: rb.x, y: rb.y };
  const bpLB = {
    x: lb.x + (rb.x - lb.x) * bpStart,
    y: lb.y + (rb.y - lb.y) * bpStart,
  };
  drawPolygon(ctx, [bpLT, bpRT, bpRB, bpLB]);
  ctx.fillStyle = light ? '#A0A4AA' : hexToRgba('#9CA3AF', 0.45);
  ctx.fill();
  ctx.strokeStyle = hexToRgba('#000000', 0.15);
  ctx.lineWidth = 0.5 * bScale;
  ctx.stroke();

  // ── LED indicators (top-left corner of PCB) ──
  const leds = [
    { t: 0.12, color: '#22C55E' }, // green — link
    { t: 0.22, color: '#F59E0B' }, // amber — activity
  ];
  for (const led of leds) {
    const ledPos = {
      x: lt.x + (rt.x - lt.x) * 0.08 + (lb.x - lt.x) * led.t,
      y: lt.y + (rt.y - lt.y) * 0.08 + (lb.y - lt.y) * led.t,
    };
    ctx.beginPath();
    ctx.arc(ledPos.x, ledPos.y, 2.2 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(led.color, 0.5 + pulse * 0.35);
    ctx.fill();
    // glow ring
    ctx.beginPath();
    ctx.arc(ledPos.x, ledPos.y, 3.5 * bScale, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(led.color, 0.25 * pulse);
    ctx.lineWidth = 1 * bScale;
    ctx.stroke();
  }

  // ── Top face border ──
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.82 : 0.68));
  ctx.lineWidth = (selected ? 2.8 : 2) * bScale;
  ctx.stroke();
  // Outer glow
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.14));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Leading edge highlight ──
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y);
  ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.92);
  ctx.lineWidth = 2.4 * bScale;
  ctx.stroke();

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? bxDir : byDir;
  const textStackDirection = node.textRotated
    ? { x: byDir.x, y: byDir.y }
    : { x: -bxDir.x, y: -bxDir.y };

  if (showDetail) {
    const hasIcon = !!(node.icon && nodeIconCatalog[node.icon]);
    const hasSub = !!node.subtitle;

    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLen : leftEdgeLen;
    const nodeTopEdge = textEdgeLength * 0.85;
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
      : scaledTitleSize;

    const gap = 4 * camera.zoom;
    let iconSize = hasIcon
      ? Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom * 0.35
      : 0;
    const subtitleFontSize = hasSub ? Math.round(clampedSize * 0.8125) : 0;

    const aboveTitle = clampedSize / 2;
    let belowTitle = clampedSize / 2;
    if (hasIcon) belowTitle += gap + iconSize;
    if (hasSub) belowTitle += gap + subtitleFontSize;
    let totalStack = aboveTitle + belowTitle;

    const stackEdgeLen = node.textRotated ? leftEdgeLen : topEdgeLen;
    const maxStack = stackEdgeLen * 0.75;
    if (totalStack > maxStack && hasIcon) {
      iconSize = Math.max(8, iconSize - (totalStack - maxStack));
      belowTitle = clampedSize / 2 + gap + iconSize + (hasSub ? gap + subtitleFontSize : 0);
      totalStack = aboveTitle + belowTitle;
    }

    const baseRatios = getTextRatios(node, 0.48);
    let rx = baseRatios.x;
    let ry = baseRatios.y;

    if (node.textRotated) {
      const aboveFrac = aboveTitle / leftEdgeLen;
      const belowFrac = belowTitle / leftEdgeLen;
      ry = Math.max(0.25 + aboveFrac, Math.min(0.92 - belowFrac, ry));
      rx = Math.max(0.10, Math.min(0.90, rx));
    } else {
      const aboveFrac = aboveTitle / topEdgeLen;
      const belowFrac = belowTitle / topEdgeLen;
      rx = Math.max(0.05 + belowFrac, Math.min(0.95 - aboveFrac, rx));
      ry = Math.max(0.25, Math.min(0.88, ry));
    }

    const titlePoint = worldToScreen(
      { x: node.x + node.width * rx, y: node.y + node.height * ry },
      camera, viewport,
    );

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);

    if (hasIcon) {
      const iconDef = nodeIconCatalog[node.icon!];
      const iconOffset = clampedSize / 2 + gap + iconSize / 2;
      const iconPt = {
        x: titlePoint.x + textStackDirection.x * iconOffset,
        y: titlePoint.y + textStackDirection.y * iconOffset,
      };
      ctx.save();
      ctx.translate(iconPt.x, iconPt.y);
      ctx.transform(byDir.x, byDir.y, -bxDir.x, -bxDir.y, 0, 0);
      const scale = iconSize / 32;
      ctx.scale(scale, scale);
      ctx.translate(-16, -16);
      ctx.globalAlpha = light ? 0.9 : 0.7;
      ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
      for (const d of iconDef.paths) ctx.fill(new Path2D(d));
      ctx.restore();
    }

    if (hasSub) {
      const subtitleOffset = hasIcon
        ? clampedSize / 2 + gap + iconSize + gap + subtitleFontSize / 2
        : clampedSize / 2 + gap + subtitleFontSize / 2;
      const subtitlePoint = {
        x: titlePoint.x + textStackDirection.x * subtitleOffset,
        y: titlePoint.y + textStackDirection.y * subtitleOffset,
      };
      drawTransformedText(ctx, node.subtitle, subtitlePoint, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${subtitleFontSize}px Inter, sans-serif`);
    }
  }
}
