const fs = require('fs');
let code = fs.readFileSync('src/features/canvas/renderers/renderDatabase.ts', 'utf8');

const parts = code.split('export function renderDatabase(');
const imports = parts[0];

const newFunc = `export function renderDatabase(
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

  const topEdgeLen = Math.hypot(rt.x - lt.x, rt.y - lt.y) || 1;
  const leftEdgeLen = Math.hypot(lb.x - lt.x, lb.y - lt.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLen + leftEdgeLen) * 0.5 / 120));

  const bx = { x: (rt.x - lt.x) / topEdgeLen, y: (rt.y - lt.y) / topEdgeLen };
  const by = { x: (lb.x - lt.x) / leftEdgeLen, y: (lb.y - lt.y) / leftEdgeLen };

  const cx = (lt.x + rt.x + rb.x + lb.x) / 4;
  const cy = (lt.y + rt.y + rb.y + lb.y) / 4;
  const outerR = Math.min(topEdgeLen, leftEdgeLen) * 0.44;
  // Fully solid cylinders!
  const depth = NODE_DEPTH * 0.65 * camera.zoom; 

  const numLayers = 3;
  const spacing = depth * 1.15;
  const segments = 48;

  // Render from layer 2 (bottom, highest Y) down to layer 0 (top, lowest Y)
  for (let layer = numLayers - 1; layer >= 0; layer--) {
    const layerYOff = layer * spacing - ((numLayers * spacing) / 3); 
    
    const isoRingPt = (theta: number, r: number, yOffLocal = 0) => ({
      x: cx + bx.x * Math.cos(theta) * r + by.x * Math.sin(theta) * r,
      y: cy + bx.y * Math.cos(theta) * r + by.y * Math.sin(theta) * r + yOffLocal + layerYOff,
    });

    if (layer === numLayers - 1 && light) {
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const p = isoRingPt(a, outerR, depth);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill();
      ctx.shadowOffsetY = 0;
    }

    const topArcGrad = ctx.createLinearGradient(
      cx - outerR, cy - outerR, cx + outerR, cy + outerR
    );
    if (light) {
      topArcGrad.addColorStop(0, lightenHex(node.glowColor, 0.1));
      topArcGrad.addColorStop(1, node.glowColor);
    } else {
      topArcGrad.addColorStop(0, hexToRgba(node.glowColor, 0.95));
      topArcGrad.addColorStop(1, hexToRgba(node.glowColor, 0.65));
    }

    const depthColor = light ? darkenHex(node.glowColor, 0.45) : hexToRgba(node.glowColor, 0.85);
    const borderColor = hexToRgba(node.glowColor, selected ? 1.0 : (light ? 0.90 : 0.65));

    // Outer rim depth
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const midA = (a0 + a1) / 2;
      const viewDot = by.x * Math.cos(midA) + by.y * Math.sin(midA);
      if (viewDot < 0.05) continue; // skip back-facing
      const p0 = isoRingPt(a0, outerR);
      const p1 = isoRingPt(a1, outerR);
      const p0d = isoRingPt(a0, outerR, depth);
      const p1d = isoRingPt(a1, outerR, depth);
      drawPolygon(ctx, [p0, p1, p1d, p0d]);
      ctx.fillStyle = depthColor;
      ctx.fill();
      ctx.strokeStyle = hexToRgba(node.glowColor, light ? 0.30 : 0.20);
      ctx.lineWidth = 0.5 * bScale;
      ctx.stroke();
    }

    // Top face
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const p = isoRingPt(a, outerR);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = topArcGrad;
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = (selected ? 2 : 1.2) * bScale;
    ctx.stroke();
  }

  // Draw node title underneath
  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail && node.title !== 'New Node') {
    const { x: rx, y: ry } = getTextRatios(node, 0.50);
    const titlePt = {
      x: lt.x + (rt.x - lt.x) * rx + (lb.x - lt.x) * ry,
      y: lt.y + (rt.y - lt.y) * rx + (lb.y - lt.y) * ry + (numLayers * spacing) * 0.8 + 10 * camera.zoom
    };

    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.90)' : hexToRgba(node.glowColor, 0.95),
      \`600 \${scaledSize}px Inter, sans-serif\`);
  }
}
`;

fs.writeFileSync('src/features/canvas/renderers/renderDatabase.ts', imports + newFunc);
console.log('Update successful');
