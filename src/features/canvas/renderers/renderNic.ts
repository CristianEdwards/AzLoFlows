import { getTextRatios } from '@/lib/geometry/textPosition';
import { NODE_DEPTH, DETAIL_ZOOM_THRESHOLD, NODE_ICON_SCALE, DEFAULT_FONT_SIZE } from '@/lib/config';
import { isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { drawPolygon, drawTransformedText } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, lightenHex, darkenHex, deepToneForGlow } from '@/lib/rendering/tokens';
import type { CameraState, NodeEntity } from '@/types/document';

/*
 * SVG reference coordinate system:
 *   PCB top-face diamond:
 *     T = (2.60, 2.00)   ← lt  (top vertex)
 *     R = (9.53, 6.00)   ← rt  (right vertex)
 *     B = (-2.60, 13.00) ← rb  (bottom vertex)
 *     L = (-9.53, 9.00)  ← lb  (left vertex)
 *
 *   u-axis (T→R): dx=6.93, dy=4.00
 *   v-axis (T→L): dx=-12.13, dy=7.00
 *
 *   Any SVG point P is: T + u*(R−T) + v*(L−T)
 *   Solving: given (px,py) relative to T,
 *     u = (px*vy − py*vx) / (ux*vy − uy*vx)
 *     v = (px*uy − py*ux) / (vx*uy − vy*ux)
 *
 * Pre-computed (u,v) fractions are used below to place every element.
 *
 * PCB depth: left side depth = 4 units, right side depth = 7 units
 * (from SVG: left-face goes from y=9 to y=13 → Δ4; right-face from y=6 to y=13 → Δ7)
 * In our renderer we use NODE_DEPTH * 0.35 (≈12px) as the screen-space depth.
 */

/**
 * Renders an isometric NIC (Network Interface Card) shape,
 * matching the reference SVG exactly.
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
  const depth = NODE_DEPTH * 0.35 * camera.zoom;

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bxDir = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const byDir = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  // Helper: map (u,v) parametric coords on the top face to screen-space point
  const uv = (u: number, v: number) => ({
    x: lt.x + (rt.x - lt.x) * u + (lb.x - lt.x) * v,
    y: lt.y + (rt.y - lt.y) * u + (lb.y - lt.y) * v,
  });

  // Helper: same as uv but shifted down by `d` pixels (for extruded faces)
  const uvD = (u: number, v: number, d: number) => {
    const p = uv(u, v);
    return { x: p.x, y: p.y + d };
  };

  // Depth-extruded corners
  const ltD = { x: lt.x, y: lt.y + depth };
  const lbD = { x: lb.x, y: lb.y + depth };
  const rbD = { x: rb.x, y: rb.y + depth };
  const rtD = { x: rt.x, y: rt.y + depth };

  // ────────────────────────────────────────────────────────────
  // 1. Ground shadow ellipse (approximated as a larger diamond)
  // ────────────────────────────────────────────────────────────
  const shadowPad = 0.12;
  const sLT = uv(-shadowPad, -shadowPad);
  const sRT = uv(1 + shadowPad, -shadowPad);
  const sRB = uv(1 + shadowPad, 1 + shadowPad);
  const sLB = uv(-shadowPad, 1 + shadowPad);
  drawPolygon(ctx, [
    { x: sLT.x, y: sLT.y + depth * 1.2 },
    { x: sRT.x, y: sRT.y + depth * 1.2 },
    { x: sRB.x, y: sRB.y + depth * 1.2 },
    { x: sLB.x, y: sLB.y + depth * 1.2 },
  ]);
  ctx.fillStyle = 'rgba(5, 10, 30, 0.15)';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 2. PCB left face  (#368c5a → darker green)
  // ────────────────────────────────────────────────────────────
  drawPolygon(ctx, [lt, lb, lbD, ltD]);
  ctx.fillStyle = light ? darkenHex(deepToneForGlow(node.glowColor), 0.35) : '#368c5a';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 3. PCB right/front face (#48BB78 → medium green)
  // ────────────────────────────────────────────────────────────
  drawPolygon(ctx, [lb, rb, rbD, lbD]);
  ctx.fillStyle = light ? darkenHex(deepToneForGlow(node.glowColor), 0.20) : '#48BB78';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 4. PCB top face (#76cc9a → bright green)
  // ────────────────────────────────────────────────────────────
  drawPolygon(ctx, points);
  ctx.fillStyle = light ? lightenHex(deepToneForGlow(node.glowColor), 0.30) : '#76cc9a';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 5. Two triangular PCB notches (top-right area)
  //    SVG: stroke="#328354" on triangles near (1.73,3.49)→(0,4.49)→(0,5.49)
  //    Parametric: notch 1 at roughly u≈0.87,v≈0.14 ; notch 2 at u≈0.93,v≈0.18
  // ────────────────────────────────────────────────────────────
  // Notch 1: (1.73,3.49)→(0,4.49)→(0,5.49) → u/v computed:
  const n1a = uv(0.869, 0.135);
  const n1b = uv(0.624, 0.227);
  const n1c = uv(0.538, 0.318);
  ctx.beginPath();
  ctx.moveTo(n1a.x, n1a.y); ctx.lineTo(n1b.x, n1b.y); ctx.lineTo(n1c.x, n1c.y);
  ctx.strokeStyle = light ? darkenHex(deepToneForGlow(node.glowColor), 0.40) : '#328354';
  ctx.lineWidth = 1.5 * bScale;
  ctx.stroke();

  // Notch 2: (2.60,3.99)→(1.73,4.49)→(1.73,5.49)
  const n2a = uv(0.993, 0.181);
  const n2b = uv(0.869, 0.227);
  const n2c = uv(0.783, 0.318);
  ctx.beginPath();
  ctx.moveTo(n2a.x, n2a.y); ctx.lineTo(n2b.x, n2b.y); ctx.lineTo(n2c.x, n2c.y);
  ctx.stroke();

  // ────────────────────────────────────────────────────────────
  // 6. Small RJ-45 port block (center of PCB)
  //    SVG 3-face box: top (#5b6270), left (#1b2330), right (#242E40)
  //    Top face: (1.73,4.30)→(4.33,5.80)→(1.73,7.30)→(-0.87,5.80)
  //    Left face: (-0.87,5.80)→(1.73,7.30)→(1.73,8.50)→(-0.87,7.00)
  //    Right face: (4.33,5.80)→(1.73,7.30)→(1.73,8.50)→(4.33,7.00)
  // ────────────────────────────────────────────────────────────
  const spt = uv(0.783, 0.209);   // 1.73,4.30
  const spr = uv(1.152, 0.345);   // 4.33,5.80
  const spb = uv(0.783, 0.482);   // 1.73,7.30
  const spl = uv(0.414, 0.345);   // -0.87,5.80
  const splD = uvD(0.414, 0.455, 0);  // -0.87,7.00
  const spbD = uvD(0.783, 0.591, 0);  // 1.73,8.50
  const sprD = uvD(1.152, 0.455, 0);  // 4.33,7.00
  // Recompute bottom points as same u,v but shifted down
  const smallPortDepth = depth * 0.35;
  const splB = { x: spl.x, y: spl.y + smallPortDepth };
  const spbB = { x: spb.x, y: spb.y + smallPortDepth };
  const sprB = { x: spr.x, y: spr.y + smallPortDepth };

  // Left face of small port
  drawPolygon(ctx, [spl, spb, spbB, splB]);
  ctx.fillStyle = light ? '#2A3040' : '#1b2330';
  ctx.fill();

  // Right face of small port
  drawPolygon(ctx, [spr, spb, spbB, sprB]);
  ctx.fillStyle = light ? '#354055' : '#242E40';
  ctx.fill();

  // Top face of small port
  drawPolygon(ctx, [spt, spr, spb, spl]);
  ctx.fillStyle = light ? '#7A8190' : '#5b6270';
  ctx.fill();

  // Port opening dark lines (6 horizontal stripes inside small port)
  ctx.strokeStyle = light ? '#1A2030' : '#0F172A';
  ctx.lineWidth = 1 * bScale;
  for (let i = 0; i < 6; i++) {
    const t1 = 0.10 + i * 0.15;
    const t2 = t1;
    const lineStart = {
      x: spt.x + (spl.x - spt.x) * 0.5 + (spb.x - spt.x) * t1,
      y: spt.y + (spl.y - spt.y) * 0.5 + (spb.y - spt.y) * t1,
    };
    const lineEnd = {
      x: spt.x + (spr.x - spt.x) * 0.5 + (spb.x - spt.x) * t2,
      y: spt.y + (spr.y - spt.y) * 0.5 + (spb.y - spt.y) * t2,
    };
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(lineEnd.x, lineEnd.y);
    ctx.stroke();
  }

  // ────────────────────────────────────────────────────────────
  // 7. Two small connector cubes (bottom-left of small port)
  //    Cube A: top at (-0.87,7.20)→(0,7.70)→(-0.87,8.20)→(-1.73,7.70)
  //    Cube B: top at (0.87,8.20)→(1.73,8.70)→(0.87,9.20)→(0,8.70)
  // ────────────────────────────────────────────────────────────
  const cubeDepth = depth * 0.23;

  // Cube A
  const caT = uv(0.414, 0.473);
  const caR = uv(0.538, 0.518);
  const caB = uv(0.414, 0.564);
  const caL = uv(0.290, 0.518);
  const caLd = { x: caL.x, y: caL.y + cubeDepth };
  const caBd = { x: caB.x, y: caB.y + cubeDepth };
  const caRd = { x: caR.x, y: caR.y + cubeDepth };
  drawPolygon(ctx, [caL, caB, caBd, caLd]);
  ctx.fillStyle = light ? '#2A3040' : '#1b2330';
  ctx.fill();
  drawPolygon(ctx, [caR, caB, caBd, caRd]);
  ctx.fillStyle = light ? '#354055' : '#242E40';
  ctx.fill();
  drawPolygon(ctx, [caT, caR, caB, caL]);
  ctx.fillStyle = light ? '#7A8190' : '#5b6270';
  ctx.fill();

  // Cube B
  const cbT = uv(0.662, 0.564);
  const cbR = uv(0.786, 0.609);
  const cbB = uv(0.662, 0.655);
  const cbL = uv(0.538, 0.609);
  const cbLd = { x: cbL.x, y: cbL.y + cubeDepth };
  const cbBd = { x: cbB.x, y: cbB.y + cubeDepth };
  const cbRd = { x: cbR.x, y: cbR.y + cubeDepth };
  drawPolygon(ctx, [cbL, cbB, cbBd, cbLd]);
  ctx.fillStyle = light ? '#2A3040' : '#1b2330';
  ctx.fill();
  drawPolygon(ctx, [cbR, cbB, cbBd, cbRd]);
  ctx.fillStyle = light ? '#354055' : '#242E40';
  ctx.fill();
  drawPolygon(ctx, [cbT, cbR, cbB, cbL]);
  ctx.fillStyle = light ? '#7A8190' : '#5b6270';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 8. Small backplate bracket (left edge, near connector cubes)
  //    SVG: top at (-5.20,7.00)→(-3.90,7.75)→(-5.20,8.50)→(-6.50,7.75)
  // ────────────────────────────────────────────────────────────
  const bkT = uv(-0.145, 0.455);
  const bkR = uv(0.041, 0.523);
  const bkB = uv(-0.145, 0.591);
  const bkL = uv(-0.331, 0.523);
  const bkBracketDepth = cubeDepth * 0.8;
  const bkLd = { x: bkL.x, y: bkL.y + bkBracketDepth };
  const bkBd = { x: bkB.x, y: bkB.y + bkBracketDepth };
  const bkRd = { x: bkR.x, y: bkR.y + bkBracketDepth };
  drawPolygon(ctx, [bkL, bkB, bkBd, bkLd]);
  ctx.fillStyle = light ? '#8590A0' : '#6f7a8a';
  ctx.fill();
  drawPolygon(ctx, [bkR, bkB, bkBd, bkRd]);
  ctx.fillStyle = light ? '#A8B5C8' : '#94A3B8';
  ctx.fill();
  drawPolygon(ctx, [bkT, bkR, bkB, bkL]);
  ctx.fillStyle = light ? '#C0CAD8' : '#afbaca';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 9. Gold connector pins along left edge (15 pins)
  //    SVG: amber (#F59E0B) small 2-face parallelogram pairs
  //    Running from roughly v=0.136 to v=0.773 along the left edge (u≈0)
  //    Each pin has a left-face and a top-face
  // ────────────────────────────────────────────────────────────
  const pinCount = 15;
  const pinVStart = 0.136;
  const pinVEnd = 0.773;
  const pinW = 0.037;   // width along v-axis
  const pinOutU = -0.035; // how far pins protrude past the left edge

  for (let i = 0; i < pinCount; i++) {
    const v = pinVStart + (i / (pinCount - 1)) * (pinVEnd - pinVStart);
    // Pin top face (small parallelogram)
    const ptA = uv(pinOutU, v);
    const ptB = uv(pinOutU, v + pinW);
    const ptC = uv(0.065, v + pinW);
    const ptD = uv(0.065, v);
    drawPolygon(ctx, [ptA, ptB, ptC, ptD]);
    ctx.fillStyle = light ? '#D4A017' : '#F59E0B';
    ctx.fill();

    // Pin left face (small vertical strip)
    const pinH = depth * 0.15;
    const ptAd = { x: ptA.x, y: ptA.y + pinH };
    const ptBd = { x: ptB.x, y: ptB.y + pinH };
    drawPolygon(ctx, [ptA, ptB, ptBd, ptAd]);
    ctx.fillStyle = light ? '#B8860B' : '#D4A017';
    ctx.fill();
  }

  // ────────────────────────────────────────────────────────────
  // 10. Two large RJ-45 port housings (big 3-face iso boxes, left side)
  //     Housing A: top at (-7.79,5.50)→(-5.20,7.00)→(-7.79,8.50)→(-10.39,7.00)
  //               depth = 5.0 units → tall block
  //     Housing B: top at (-4.33,7.50)→(-1.73,9.00)→(-4.33,10.50)→(-6.93,9.00)
  // ────────────────────────────────────────────────────────────
  // Housing A
  const haT = uv(-0.516, 0.318);
  const haR = uv(-0.145, 0.455);
  const haB = uv(-0.516, 0.591);
  const haL = uv(-0.887, 0.455);
  const housingDepth = depth * 1.5;
  const haLd = { x: haL.x, y: haL.y + housingDepth };
  const haBd = { x: haB.x, y: haB.y + housingDepth };
  const haRd = { x: haR.x, y: haR.y + housingDepth };
  // Left face
  drawPolygon(ctx, [haL, haB, haBd, haLd]);
  ctx.fillStyle = light ? '#A8AEB5' : '#98a0a9';
  ctx.fill();
  // Right face
  drawPolygon(ctx, [haR, haB, haBd, haRd]);
  ctx.fillStyle = light ? '#D5DFE8' : '#CBD5E1';
  ctx.fill();
  // Top face
  drawPolygon(ctx, [haT, haR, haB, haL]);
  ctx.fillStyle = light ? '#E5ECF2' : '#d8e0e9';
  ctx.fill();

  // Housing B
  const hbT = uv(-0.145, 0.500);
  const hbR = uv(0.228, 0.636);
  const hbB = uv(-0.145, 0.773);
  const hbL = uv(-0.516, 0.636);
  const hbLd = { x: hbL.x, y: hbL.y + housingDepth };
  const hbBd = { x: hbB.x, y: hbB.y + housingDepth };
  const hbRd = { x: hbR.x, y: hbR.y + housingDepth };
  drawPolygon(ctx, [hbL, hbB, hbBd, hbLd]);
  ctx.fillStyle = light ? '#A8AEB5' : '#98a0a9';
  ctx.fill();
  drawPolygon(ctx, [hbR, hbB, hbBd, hbRd]);
  ctx.fillStyle = light ? '#D5DFE8' : '#CBD5E1';
  ctx.fill();
  drawPolygon(ctx, [hbT, hbR, hbB, hbL]);
  ctx.fillStyle = light ? '#E5ECF2' : '#d8e0e9';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 11. Metal backplate strip (long vertical plate behind the housings)
  //     SVG: left face (-13.34,4.70)→(-2.94,10.70) to (-13.34,9.70)→(-2.94,15.70)
  //     top strip: (-12.90,4.45)→(-2.51,10.45)→(-2.94,10.70)→(-13.34,4.70)
  //     right strip: (-2.51,10.45)→(-2.94,10.70)→(-2.94,15.70)→(-2.51,15.45)
  // ────────────────────────────────────────────────────────────
  // Left face of backplate (big rectangle)
  const bpTL = uv(-1.312, 0.245);   // -13.34, 4.70
  const bpBL = uv(-1.312, 0.700);   // -13.34, 9.70
  const bpBR = uv(0.027, 1.245);    // -2.94, 15.70
  const bpTR = uv(0.027, 0.791);    // -2.94, 10.70
  const bpDepth = depth * 0.15;

  drawPolygon(ctx, [bpTL, bpTR, bpBR, bpBL]);
  ctx.fillStyle = light ? '#8590A0' : '#6f7a8a';
  ctx.fill();

  // Right face (thin edge)
  const bpTRe = { x: bpTR.x + bxDir.x * bpDepth * 0.6, y: bpTR.y + bxDir.y * bpDepth * 0.6 };
  const bpBRe = { x: bpBR.x + bxDir.x * bpDepth * 0.6, y: bpBR.y + bxDir.y * bpDepth * 0.6 };
  drawPolygon(ctx, [bpTR, bpTRe, bpBRe, bpBR]);
  ctx.fillStyle = light ? '#A8B5C8' : '#94A3B8';
  ctx.fill();

  // Top face (thin strip)
  const bpTLe = { x: bpTL.x + bxDir.x * bpDepth * 0.6, y: bpTL.y + bxDir.y * bpDepth * 0.6 };
  drawPolygon(ctx, [bpTL, bpTLe, bpTRe, bpTR]);
  ctx.fillStyle = light ? '#C0CAD8' : '#afbaca';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 12. Port openings (dark rectangles on housing faces)
  //     Housing A port: (-10.31,8.46)→(-8.58,9.46)→(-8.58,11.46)→(-10.31,10.46)
  //     Housing B port: (-6.85,10.45)→(-5.12,11.45)→(-5.12,13.45)→(-6.85,12.45)
  // ────────────────────────────────────────────────────────────
  // Port A — on left face of housing A (shifted down by housing depth)
  const paA = { x: haL.x + (haB.x - haL.x) * 0.05, y: haL.y + housingDepth * 0.28 };
  const paB = { x: haB.x + (haL.x - haB.x) * 0.05, y: haB.y + housingDepth * 0.28 };
  const paC = { x: haB.x + (haL.x - haB.x) * 0.05, y: haB.y + housingDepth * 0.88 };
  const paD = { x: haL.x + (haB.x - haL.x) * 0.05, y: haL.y + housingDepth * 0.88 };
  drawPolygon(ctx, [paA, paB, paC, paD]);
  ctx.fillStyle = light ? '#151E30' : '#0B1120';
  ctx.fill();

  // Port B — on left face of housing B
  const pbA = { x: hbL.x + (hbB.x - hbL.x) * 0.05, y: hbL.y + housingDepth * 0.28 };
  const pbB = { x: hbB.x + (hbL.x - hbB.x) * 0.05, y: hbB.y + housingDepth * 0.28 };
  const pbC = { x: hbB.x + (hbL.x - hbB.x) * 0.05, y: hbB.y + housingDepth * 0.88 };
  const pbD = { x: hbL.x + (hbB.x - hbL.x) * 0.05, y: hbL.y + housingDepth * 0.88 };
  drawPolygon(ctx, [pbA, pbB, pbC, pbD]);
  ctx.fillStyle = light ? '#151E30' : '#0B1120';
  ctx.fill();

  // Small activity LEDs above each housing port
  // Housing A LED  (at approx -9.71,8.80  → just above port)
  const ledAx = (haL.x + haB.x) * 0.5 + (haB.x - haL.x) * 0.15;
  const ledAy = haL.y + housingDepth * 0.12 + (haB.y - haL.y) * 0.15;
  drawPolygon(ctx, [
    { x: ledAx - bScale * 1.5, y: ledAy - bScale * 1 },
    { x: ledAx + bScale * 1.5, y: ledAy + bScale * 1 },
    { x: ledAx + bScale * 1.5, y: ledAy + bScale * 2.5 },
    { x: ledAx - bScale * 1.5, y: ledAy + bScale * 0.5 },
  ]);
  ctx.fillStyle = light ? '#151E30' : '#0B1120';
  ctx.fill();

  // Housing B LED
  const ledBx = (hbL.x + hbB.x) * 0.5 + (hbB.x - hbL.x) * 0.15;
  const ledBy = hbL.y + housingDepth * 0.12 + (hbB.y - hbL.y) * 0.15;
  drawPolygon(ctx, [
    { x: ledBx - bScale * 1.5, y: ledBy - bScale * 1 },
    { x: ledBx + bScale * 1.5, y: ledBy + bScale * 1 },
    { x: ledBx + bScale * 1.5, y: ledBy + bScale * 2.5 },
    { x: ledBx - bScale * 1.5, y: ledBy + bScale * 0.5 },
  ]);
  ctx.fillStyle = light ? '#151E30' : '#0B1120';
  ctx.fill();

  // ────────────────────────────────────────────────────────────
  // 13. Green LED indicators on backplate (tiny green rectangles)
  //     SVG: #b6e4c9 at (-10.05,7.91) and (-6.59,9.91)
  // ────────────────────────────────────────────────────────────
  const pulse = 0.7 + Math.sin(time * 0.002 + node.zIndex) * 0.2;
  const ledPositions = [
    { u: -0.870, v: 0.455 },  // near housing A top
    { u: -0.498, v: 0.636 },  // near housing B top
  ];
  for (const lp of ledPositions) {
    const lPos = uv(lp.u, lp.v);
    // Shift onto the backplate surface
    const lx = lPos.x - bxDir.x * 4 * bScale;
    const ly = lPos.y - bxDir.y * 4 * bScale;
    const sz = 1.8 * bScale;
    ctx.beginPath();
    ctx.moveTo(lx - sz, ly);
    ctx.lineTo(lx, ly + sz * 0.6);
    ctx.lineTo(lx + sz, ly);
    ctx.lineTo(lx, ly - sz * 0.6);
    ctx.closePath();
    ctx.fillStyle = hexToRgba('#b6e4c9', 0.6 + pulse * 0.3);
    ctx.fill();
  }

  // ────────────────────────────────────────────────────────────
  // 14. Selection border + leading edge highlight
  // ────────────────────────────────────────────────────────────
  drawPolygon(ctx, points);
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.98 : (light ? 0.55 : 0.45));
  ctx.lineWidth = (selected ? 2.8 : 1.5) * bScale;
  ctx.stroke();
  if (selected) {
    drawPolygon(ctx, points);
    ctx.strokeStyle = hexToRgba(node.glowColor, 0.20);
    ctx.lineWidth = 5 * bScale;
    ctx.stroke();
  }
  // Leading edge
  ctx.beginPath();
  ctx.moveTo(lt.x, lt.y); ctx.lineTo(lb.x, lb.y);
  ctx.strokeStyle = hexToRgba(node.glowColor, 0.85);
  ctx.lineWidth = 2 * bScale;
  ctx.stroke();

  // ────────────────────────────────────────────────────────────
  // 15. Icon + text (same card-style stack layout)
  // ────────────────────────────────────────────────────────────
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
