import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/**
 * Renders a proper isometric 3D analytics panel – a thick slab with
 * header bar, traffic-light dots, line chart, and pie chart drawn
 * directly on the isometric top face.  Uses the same depth-extruded
 * box geometry as the default node/card shapes.
 */
export function renderAnalyticsPanel(
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
  const depth = NODE_DEPTH * 0.35 * camera.zoom;
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));
  const cornerR = Math.min(10, (topEdgeLen + leftEdgeLen) * 0.04);

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  // Depth-extruded corners
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.30) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.18) : '';

  // Helper: point on the isometric top face by (u, v) in [0,1]
  const tp = (u: number, v: number) => ({
    x: lt.x + (rt.x - lt.x) * u + (lb.x - lt.x) * v,
    y: lt.y + (rt.y - lt.y) * u + (lb.y - lt.y) * v,
  });

  // ── Drop shadow ──
  if (light) {
    drawPolygon(ctx, [lb, rb, rbD, lbD]);
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ── Left side face (medium tone) ──
  drawRoundedPolygon(ctx, [lt, lb, lbD, ltD], cornerR);
  if (light) {
    const gSide = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    gSide.addColorStop(0, darkenHex(deepTone, 0.55));
    gSide.addColorStop(1, darkenHex(deepTone, 0.70));
    ctx.fillStyle = gSide;
  } else {
    const gSide = ctx.createLinearGradient(lt.x, lt.y, lbD.x, lbD.y);
    gSide.addColorStop(0, hexToRgba(node.glowColor, 0.50));
    gSide.addColorStop(0.5, darkenHex(node.glowColor, 0.40));
    gSide.addColorStop(1, darkenHex(node.glowColor, 0.60));
    ctx.fillStyle = gSide;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // Specular on left face
  ctx.beginPath();
  const lm1 = { x: lt.x * 0.5 + ltD.x * 0.5, y: lt.y * 0.5 + ltD.y * 0.5 };
  const lm2 = { x: lb.x * 0.5 + lbD.x * 0.5, y: lb.y * 0.5 + lbD.y * 0.5 };
  ctx.moveTo(lm1.x, lm1.y);
  ctx.lineTo(lm2.x, lm2.y);
  ctx.strokeStyle = light ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // ── Front face (darkest) ──
  drawRoundedPolygon(ctx, [lb, rb, rbD, lbD], cornerR);
  if (light) {
    const gFront = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    gFront.addColorStop(0, darkenHex(deepTone, 0.60));
    gFront.addColorStop(1, darkenHex(deepTone, 0.80));
    ctx.fillStyle = gFront;
  } else {
    const gFront = ctx.createLinearGradient(lb.x, lb.y, rbD.x, rbD.y);
    gFront.addColorStop(0, darkenHex(node.glowColor, 0.45));
    gFront.addColorStop(0.5, darkenHex(node.glowColor, 0.55));
    gFront.addColorStop(1, darkenHex(node.glowColor, 0.70));
    ctx.fillStyle = gFront;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.18);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Right side face (darker side) ──
  drawRoundedPolygon(ctx, [rt, rb, rbD, rtD], cornerR);
  if (light) {
    const gRight = ctx.createLinearGradient(rt.x, rt.y, rbD.x, rbD.y);
    gRight.addColorStop(0, darkenHex(deepTone, 0.65));
    gRight.addColorStop(1, darkenHex(deepTone, 0.85));
    ctx.fillStyle = gRight;
  } else {
    const gRight = ctx.createLinearGradient(rt.x, rt.y, rbD.x, rbD.y);
    gRight.addColorStop(0, hexToRgba(node.glowColor, 0.35));
    gRight.addColorStop(0.5, darkenHex(node.glowColor, 0.50));
    gRight.addColorStop(1, darkenHex(node.glowColor, 0.65));
    ctx.fillStyle = gRight;
  }
  ctx.fill();
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.20 : 0.12);
  ctx.lineWidth = 0.6 * bScale;
  ctx.stroke();

  // ── Top face (panel surface — dark glass with glow) ──
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.fillStyle = 'rgba(8, 14, 28, 0.92)';
  ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.55) * pulse);
  ctx.shadowBlur = light ? (selected ? 22 : 14) : (selected ? 32 : 22);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Subtle color overlay gradient
  drawRoundedPolygon(ctx, points, cornerR);
  const topGrad = ctx.createLinearGradient(lt.x, lt.y, rb.x, rb.y);
  if (light) {
    topGrad.addColorStop(0, deepToneLit);
    topGrad.addColorStop(0.5, deepToneMid);
    topGrad.addColorStop(1, deepTone);
  } else {
    topGrad.addColorStop(0, hexToRgba(node.glowColor, 0.16));
    topGrad.addColorStop(0.4, hexToRgba(node.glowColor, 0.06));
    topGrad.addColorStop(1, hexToRgba(node.glowColor, 0.12));
  }
  ctx.fillStyle = topGrad;
  ctx.fill();

  // Glass specular highlights
  ctx.beginPath();
  ctx.moveTo(tp(0.55, 0.15).x, tp(0.55, 0.15).y);
  ctx.lineTo(tp(0.35, 0.75).x, tp(0.35, 0.75).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tp(0.60, 0.12).x, tp(0.60, 0.12).y);
  ctx.lineTo(tp(0.40, 0.72).x, tp(0.40, 0.72).y);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  // ── Top face border + glow ──
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.85 : 0.72));
  ctx.lineWidth = (selected ? 3 : 2.2) * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.40);
  ctx.shadowBlur = (light ? 4 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.25 : (light ? 0.10 : 0.15));
  ctx.lineWidth = (selected ? 6 : 4) * bScale;
  ctx.stroke();

  // ── Side face edge strokes ──
  drawRoundedPolygon(ctx, [lt, lb, lbD, ltD], cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.40 : 0.30);
  ctx.lineWidth = 1.4 * bScale;
  ctx.stroke();

  drawRoundedPolygon(ctx, [lb, rb, rbD, lbD], cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.40 : 0.30);
  ctx.lineWidth = 1.4 * bScale;
  ctx.stroke();

  drawRoundedPolygon(ctx, [rt, rb, rbD, rtD], cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.35 : 0.25);
  ctx.lineWidth = 1.2 * bScale;
  ctx.stroke();

  // ── Edge highlight lines ──
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y); ctx.lineTo(rt.x, rt.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.72);
  ctx.lineWidth = 2.2 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y); ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.96);
  ctx.lineWidth = 2.8 * bScale;
  ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.45);
  ctx.shadowBlur = (light ? 3 : 10) * bScale;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(lb.x, lb.y); ctx.lineTo(lbD.x, lbD.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.72);
  ctx.lineWidth = 2.2 * bScale;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(lbD.x, lbD.y); ctx.lineTo(rbD.x, rbD.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.40);
  ctx.lineWidth = 1.4 * bScale;
  ctx.stroke();

  // ── Panel content on isometric top face ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;

  // Header bar (top ~15% of face, along the v-axis from lt→lb)
  const hdrFrac = 0.15;
  drawPolygon(ctx, [tp(0, 0), tp(1, 0), tp(1, hdrFrac), tp(0, hdrFrac)]);
  ctx.fillStyle = light ? hexToRgba(node.glowColor, 0.14) : hexToRgba(node.glowColor, 0.10);
  ctx.fill();

  // Header separator line
  ctx.beginPath();
  ctx.moveTo(tp(0, hdrFrac).x, tp(0, hdrFrac).y);
  ctx.lineTo(tp(1, hdrFrac).x, tp(1, hdrFrac).y);
  ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.30 : 0.20);
  ctx.lineWidth = 0.8 * bScale;
  ctx.stroke();

  if (showDetail) {
    // Traffic light dots (in header)
    const dotColors = ['#ff5f57', '#ffbd2e', '#28c840'];
    for (let i = 0; i < 3; i++) {
      const d = tp(0.04 + i * 0.045, hdrFrac * 0.5);
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(dotColors[i], light ? 0.75 : 0.55);
      ctx.fill();
    }

    // Address bar placeholder
    const abTL = tp(0.22, hdrFrac * 0.22);
    const abTR = tp(0.72, hdrFrac * 0.22);
    const abBR = tp(0.72, hdrFrac * 0.78);
    const abBL = tp(0.22, hdrFrac * 0.78);
    drawPolygon(ctx, [abTL, abTR, abBR, abBL]);
    ctx.fillStyle = light ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.12 : 0.08);
    ctx.lineWidth = 0.5 * bScale;
    ctx.stroke();

    // ── Content area ──
    const contentTop = hdrFrac + 0.04;

    // Subtle horizontal grid lines
    for (let i = 0; i < 4; i++) {
      const gv = contentTop + i * 0.18;
      ctx.beginPath();
      ctx.moveTo(tp(0.06, gv).x, tp(0.06, gv).y);
      ctx.lineTo(tp(0.94, gv).x, tp(0.94, gv).y);
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.06 : 0.04);
      ctx.lineWidth = 0.5 * bScale;
      ctx.stroke();
    }

    // ── Line chart (left portion of content) ──
    const chartPts = [
      { u: 0.06, v: contentTop + 0.55 },
      { u: 0.14, v: contentTop + 0.38 },
      { u: 0.22, v: contentTop + 0.45 },
      { u: 0.30, v: contentTop + 0.22 },
      { u: 0.38, v: contentTop + 0.30 },
      { u: 0.46, v: contentTop + 0.14 },
    ];

    ctx.beginPath();
    const p0 = tp(chartPts[0].u, chartPts[0].v);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < chartPts.length; i++) {
      const p = tp(chartPts[i].u, chartPts[i].v);
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.85 : 0.70);
    ctx.lineWidth = 2 * bScale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Data point dots
    for (const cp of chartPts) {
      const p = tp(cp.u, cp.v);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 * bScale, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(node.glowColor, light ? 0.90 : 0.65);
      ctx.fill();
    }

    // ── Pie chart (right portion of content) ──
    const pieCenter = tp(0.74, contentTop + 0.36);
    const pieR = Math.min(topEdgeLen, leftEdgeLen) * 0.10;
    const slices = [
      { start: 0, end: 0.38, color: node.glowColor, alpha: light ? 0.85 : 0.65 },
      { start: 0.38, end: 0.62, color: '#ff5f57', alpha: light ? 0.80 : 0.55 },
      { start: 0.62, end: 0.80, color: '#ffbd2e', alpha: light ? 0.80 : 0.55 },
      { start: 0.80, end: 0.92, color: '#28c840', alpha: light ? 0.80 : 0.55 },
      { start: 0.92, end: 1.0, color: '#a78bfa', alpha: light ? 0.80 : 0.55 },
    ];
    for (const s of slices) {
      ctx.beginPath();
      ctx.moveTo(pieCenter.x, pieCenter.y);
      ctx.arc(pieCenter.x, pieCenter.y, pieR,
        s.start * Math.PI * 2 - Math.PI / 2,
        s.end * Math.PI * 2 - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(s.color, s.alpha);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(pieCenter.x, pieCenter.y, pieR, 0, Math.PI * 2);
    ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.25 : 0.15);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();
  }

  // ── Icon + Title/Subtitle (below the isometric slab) ──
  const titlePoint = worldToScreen(
    { x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 },
    camera, viewport,
  );
  const textDirection = by;
  const textStackDirection = { x: -bx.x, y: -bx.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(by.x, by.y, -bx.x, -bx.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom);

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `600 ${scaledSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subPt = {
        x: titlePoint.x + textStackDirection.x * 18,
        y: titlePoint.y + textStackDirection.y * 18,
      };
      drawTransformedText(ctx, node.subtitle, subPt, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `600 ${Math.round(scaledSize * 0.8)}px Inter, sans-serif`);
    }
  }
}
