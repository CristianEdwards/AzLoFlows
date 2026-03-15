import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawRoundedPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity, Point } from '@/types/document';

/**
 * Renders an isometric server rack — individually floating glass server blades
 * stacked with visible gaps and glow bleeding between them.
 * Inspired by high-end datacenter illustration styles.
 */
export function renderServerRack(
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
  const [leftTop, rightTop, rightBottom, leftBottom] = points;
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLength = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
  const leftEdgeLength = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;
  const avgEdge = (topEdgeLength + leftEdgeLength) * 0.5;
  const bScale = Math.min(1, Math.max(0.35, avgEdge / 120));
  const cornerR = Math.min(6, avgEdge * 0.05);

  const topFaceBasisX = {
    x: (rightTop.x - leftTop.x) / topEdgeLength,
    y: (rightTop.y - leftTop.y) / topEdgeLength,
  };
  const topFaceBasisY = {
    x: (leftBottom.x - leftTop.x) / leftEdgeLength,
    y: (leftBottom.y - leftTop.y) / leftEdgeLength,
  };

  const faceFill = light ? node.glowColor : node.fill;
  const deepTone = light ? deepToneForGlow(node.glowColor) : '';
  const deepToneLit = light ? lightenHex(deepTone, 0.22) : '';
  const deepToneMid = light ? lightenHex(deepTone, 0.12) : '';

  // ── Server blade configuration ──
  const bladeCount = 4;
  const bladeDepth = NODE_DEPTH * 0.26 * camera.zoom;  // height of each blade
  const gapH = 5 * camera.zoom;  // visible gap between blades
  const totalHeight = bladeCount * bladeDepth + (bladeCount - 1) * gapH;

  // ── Drop shadow (light mode) ──
  if (light) {
    const shLB = { x: leftBottom.x, y: leftBottom.y + totalHeight };
    const shRB = { x: rightBottom.x, y: rightBottom.y + totalHeight };
    drawPolygon(ctx, [leftBottom, rightBottom, shRB, shLB]);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.30)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Draw each blade from bottom to top (back to front in draw order)
  const ledColors = ['#00ff88', '#00e5ff', node.glowColor, '#ffab00'];
  for (let blade = bladeCount - 1; blade >= 0; blade--) {
    const yOff = blade * (bladeDepth + gapH);
    const bladeAlpha = 0.75 + blade * 0.08;  // top blade brightest

    // Four corners of blade top face (shifted down by yOff)
    const blt = { x: leftTop.x, y: leftTop.y + yOff };
    const brt = { x: rightTop.x, y: rightTop.y + yOff };
    const brb = { x: rightBottom.x, y: rightBottom.y + yOff };
    const blb = { x: leftBottom.x, y: leftBottom.y + yOff };

    // Depth-shifted corners
    const bltD = { x: blt.x, y: blt.y + bladeDepth };
    const brtD = { x: brt.x, y: brt.y + bladeDepth };
    const brbD = { x: brb.x, y: brb.y + bladeDepth };
    const blbD = { x: blb.x, y: blb.y + bladeDepth };

    // ── Left face ──
    drawPolygon(ctx, [blt, blb, blbD, bltD]);
    if (light) {
      const g = ctx.createLinearGradient(blt.x, blt.y, blbD.x, blbD.y);
      g.addColorStop(0, deepToneMid);
      g.addColorStop(1, deepTone);
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(blt.x, blt.y, blbD.x, blbD.y);
      g.addColorStop(0, hexToRgba(node.glowColor, 0.45 * bladeAlpha));
      g.addColorStop(1, darkenHex(node.glowColor, 0.55));
      ctx.fillStyle = g;
    }
    ctx.fill();

    // ── Front face (with LED) ──
    drawRoundedPolygon(ctx, [blb, brb, brbD, blbD], cornerR);
    if (light) {
      const gFront = ctx.createLinearGradient(blb.x, blb.y, brbD.x, brbD.y);
      gFront.addColorStop(0, deepTone);
      gFront.addColorStop(1, darkenHex(deepTone, 0.8));
      ctx.fillStyle = gFront;
    } else {
      const gFront = ctx.createLinearGradient(blb.x, blb.y, brbD.x, brbD.y);
      gFront.addColorStop(0, darkenHex(node.glowColor, 0.40));
      gFront.addColorStop(0.5, darkenHex(node.glowColor, 0.52));
      gFront.addColorStop(1, darkenHex(node.glowColor, 0.65));
      ctx.fillStyle = gFront;
    }
    ctx.fill();

    // Front face glass specular
    ctx.beginPath();
    const fMid1 = { x: blb.x * 0.6 + brb.x * 0.4, y: blb.y * 0.6 + brb.y * 0.4 };
    const fMid2 = { x: blbD.x * 0.4 + brbD.x * 0.6, y: blbD.y * 0.4 + brbD.y * 0.6 };
    ctx.moveTo(fMid1.x, fMid1.y);
    ctx.lineTo(fMid2.x, fMid2.y);
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 2 * bScale;
    ctx.stroke();

    // Front face border
    drawRoundedPolygon(ctx, [blb, brb, brbD, blbD], cornerR);
    ctx.strokeStyle = hexToRgba(node.glowColor, (light ? 0.30 : 0.18) * pulse);
    ctx.lineWidth = 0.8 * bScale;
    ctx.stroke();

    // LED indicator on front face
    const ledT = 0.5;  // vertical center of front face
    const ledCx = blb.x + (blbD.x - blb.x) * ledT + (brb.x - blb.x) * 0.06;
    const ledCy = blb.y + (blbD.y - blb.y) * ledT + (brb.y - blb.y) * 0.06;
    const blinkPhase = Math.sin(time * 0.003 + blade * 1.7);
    const ledOn = blinkPhase > -0.3;

    ctx.beginPath();
    ctx.arc(ledCx, ledCy, 2.2 * bScale, 0, Math.PI * 2);
    ctx.fillStyle = ledOn ? hexToRgba(ledColors[blade % ledColors.length], 0.9) : 'rgba(60,60,60,0.4)';
    if (ledOn) {
      ctx.shadowColor = ledColors[blade % ledColors.length];
      ctx.shadowBlur = 6;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── Right face ──
    drawRoundedPolygon(ctx, [brt, brb, brbD, brtD], cornerR);
    if (light) {
      ctx.fillStyle = darkenHex(deepTone, 0.85);
    } else {
      ctx.fillStyle = darkenHex(node.glowColor, 0.65);
    }
    ctx.fill();

    // ── Top face (blade top surface) ──
    drawRoundedPolygon(ctx, [blt, brt, brb, blb], cornerR);
    const gTop = ctx.createLinearGradient(blt.x, blt.y, brb.x, brb.y);
    if (light) {
      gTop.addColorStop(0, deepToneLit);
      gTop.addColorStop(0.5, deepToneMid);
      gTop.addColorStop(1, deepTone);
    } else {
      gTop.addColorStop(0, hexToRgba(node.glowColor, 0.90 * bladeAlpha));
      gTop.addColorStop(0.3, hexToRgba(node.glowColor, 0.60 * bladeAlpha));
      gTop.addColorStop(0.7, darkenHex(node.glowColor, 0.30));
      gTop.addColorStop(1, darkenHex(node.glowColor, 0.50));
    }
    ctx.fillStyle = gTop;
    if (blade === 0) {
      ctx.shadowColor = hexToRgba(node.glowColor, (light ? 0.35 : 0.5) * pulse);
      ctx.shadowBlur = light ? (selected ? 22 : 16) : (selected ? 30 : 20);
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glass specular on top face
    ctx.beginPath();
    const tSpec1 = {
      x: blt.x * 0.55 + brt.x * 0.45,
      y: blt.y * 0.55 + brt.y * 0.45,
    };
    const tSpec2 = {
      x: blb.x * 0.45 + brb.x * 0.55,
      y: blb.y * 0.45 + brb.y * 0.55,
    };
    ctx.moveTo(tSpec1.x, tSpec1.y);
    ctx.lineTo(tSpec2.x, tSpec2.y);
    ctx.strokeStyle = light ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 3 * bScale;
    ctx.stroke();

    // Top face border
    drawRoundedPolygon(ctx, [blt, brt, brb, blb], cornerR);
    ctx.strokeStyle = hexToRgba(node.glowColor,
      blade === 0 ? (selected ? 0.98 : (light ? 0.88 : 0.75)) : (light ? 0.50 : 0.35));
    ctx.lineWidth = (blade === 0 ? (selected ? 3 : 2.2) : 1.2) * bScale;
    ctx.stroke();

    // ── Leading edge glow (left edge of each blade) ──
    ctx.beginPath();
    ctx.moveTo(blt.x, blt.y);
    ctx.lineTo(blb.x, blb.y);
    ctx.strokeStyle = hexToRgba(node.glowColor, blade === 0 ? 0.96 : 0.55);
    ctx.lineWidth = (blade === 0 ? 2.5 : 1.5) * bScale;
    ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.40);
    ctx.shadowBlur = (light ? 3 : 8) * bScale;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── Glow line between blades (visible in gap) ──
    if (blade < bladeCount - 1) {
      const glowY = blt.y + bladeDepth + gapH * 0.4;
      ctx.beginPath();
      ctx.moveTo(blb.x, blb.y + bladeDepth + gapH * 0.3);
      ctx.lineTo(brb.x, brb.y + bladeDepth + gapH * 0.3);
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.40 : 0.55);
      ctx.lineWidth = 1.5 * bScale;
      ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.25 : 0.50);
      ctx.shadowBlur = 6 * bScale;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Left-side gap glow
      ctx.beginPath();
      ctx.moveTo(blt.x, blt.y + bladeDepth + gapH * 0.3);
      ctx.lineTo(blb.x, blb.y + bladeDepth + gapH * 0.3);
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.30 : 0.40);
      ctx.lineWidth = 1 * bScale;
      ctx.shadowColor = hexToRgba(node.glowColor, light ? 0.15 : 0.35);
      ctx.shadowBlur = 4 * bScale;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Ventilation slot on top face (subtle line)
    if (blade === 0) {
      for (let i = 1; i <= 2; i++) {
        const t = i / 3;
        const slotStart: Point = {
          x: blt.x + (brt.x - blt.x) * 0.25 + (blb.x - blt.x) * t,
          y: blt.y + (brt.y - blt.y) * 0.25 + (blb.y - blt.y) * t,
        };
        const slotEnd: Point = {
          x: blt.x + (brt.x - blt.x) * 0.75 + (blb.x - blt.x) * t,
          y: blt.y + (brt.y - blt.y) * 0.75 + (blb.y - blt.y) * t,
        };
        ctx.beginPath();
        ctx.moveTo(slotStart.x, slotStart.y);
        ctx.lineTo(slotEnd.x, slotEnd.y);
        ctx.strokeStyle = light ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.8 * bScale;
        ctx.stroke();
      }
    }
  }

  // ── Outer glow on top blade ──
  drawRoundedPolygon(ctx, points, cornerR);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.28 : (light ? 0.12 : 0.18));
  ctx.lineWidth = (selected ? 7 : 5) * bScale;
  ctx.stroke();

  // ── Icon + text ──
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  const textDirection = node.textRotated ? topFaceBasisX : topFaceBasisY;
  const textStackDirection = node.textRotated
    ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
    : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

  if (node.icon && nodeIconCatalog[node.icon] && showDetail) {
    const iconDef = nodeIconCatalog[node.icon];
    const iconSize = Math.min(node.width, node.height) * NODE_ICON_SCALE * camera.zoom;
    const iconCenter = worldToScreen(
      { x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 },
      camera, viewport,
    );
    ctx.save();
    ctx.translate(iconCenter.x, iconCenter.y);
    ctx.transform(topFaceBasisY.x, topFaceBasisY.y, -topFaceBasisX.x, -topFaceBasisX.y, 0, 0);
    const scale = iconSize / 32;
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);
    ctx.globalAlpha = light ? 0.9 : 0.7;
    ctx.fillStyle = light ? lightenHex(node.glowColor, 0.55) : hexToRgba(node.glowColor, 1.0);
    for (const d of iconDef.paths) ctx.fill(new Path2D(d));
    ctx.restore();
  }

  if (showDetail) {
    const titlePoint = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
    const nodeTitleSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLength = node.textRotated ? topEdgeLength : leftEdgeLength;
    const nodeTopEdge = textEdgeLength * 0.85;
    ctx.font = `600 ${scaledTitleSize}px Inter, sans-serif`;
    const titleTextWidth = ctx.measureText(node.title).width * 0.87;
    const clampedSize = titleTextWidth > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / titleTextWidth)))
      : scaledTitleSize;

    drawTransformedText(ctx, node.title, titlePoint, textDirection, textStackDirection,
      light ? 'rgba(255,255,255,0.95)' : '#ffffff',
      `${light ? 700 : 600} ${clampedSize}px Inter, sans-serif`);

    if (node.subtitle) {
      const subtitlePoint = {
        x: titlePoint.x + textStackDirection.x * 18,
        y: titlePoint.y + textStackDirection.y * 18,
      };
      drawTransformedText(ctx, node.subtitle, subtitlePoint, textDirection, textStackDirection,
        light ? 'rgba(255,255,255,0.75)' : hexToRgba(node.glowColor, 0.95),
        `${light ? 600 : 500} ${Math.round(clampedSize * 0.8125)}px Inter, sans-serif`);
    }
  }
}
