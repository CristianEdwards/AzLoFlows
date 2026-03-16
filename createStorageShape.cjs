const fs = require('fs');

let code = fs.readFileSync('src/features/canvas/renderers/renderDatabase.ts', 'utf8');

const replacement = `export function renderDatabase(
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
  const depth = (NODE_DEPTH * 1.5) * camera.zoom; // Tall shape
  const pulse = 0.7 + Math.sin(time * 0.0015 + node.zIndex) * 0.18;

  const topEdgeLength = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
  const leftEdgeLength = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;
  const bScale = Math.min(1, Math.max(0.35, (topEdgeLength + leftEdgeLength) * 0.25 / 120));

  const bx = { x: (rightTop.x - leftTop.x) / topEdgeLength, y: (rightTop.y - leftTop.y) / topEdgeLength };
  const by = { x: (leftBottom.x - leftTop.x) / leftEdgeLength, y: (leftBottom.y - leftTop.y) / leftEdgeLength };

  const center = {
    x: (leftTop.x + rightTop.x + rightBottom.x + leftBottom.x) / 4,
    y: (leftTop.y + rightTop.y + rightBottom.y + leftBottom.y) / 4,
  };
  const halfX = { x: (rightTop.x - leftTop.x) / 2, y: (rightTop.y - leftTop.y) / 2 };
  const halfY = { x: (leftBottom.x - leftTop.x) / 2, y: (leftBottom.y - leftTop.y) / 2 };
  
  // Storage logic
  // Draw base drop shadow
  const botCenter = { x: center.x, y: center.y + depth };

  if (light) {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * Math.PI * 2;
      const px = botCenter.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
      const py = botCenter.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fill();
    ctx.shadowOffsetY = 0;
  }

  const gradientBody = ctx.createLinearGradient(
    center.x - halfX.x, center.y - halfX.y,
    center.x + halfX.x, center.y + halfX.y
  );
  if (light) {
    gradientBody.addColorStop(0, lightenHex(node.glowColor, 0.15));
    gradientBody.addColorStop(0.5, node.glowColor);
    gradientBody.addColorStop(1, darkenHex(node.glowColor, 0.45));
  } else {
    gradientBody.addColorStop(0, hexToRgba(node.glowColor, 0.85));
    gradientBody.addColorStop(0.5, hexToRgba(node.glowColor, 0.65));
    gradientBody.addColorStop(1, hexToRgba(node.glowColor, 0.40));
  }

  // Draw the entire tall body as one cylinder block first
  ctx.beginPath();
  const tbTopRight = { x: center.x + halfX.x, y: center.y + halfX.y };
  const tbBotRight = { x: botCenter.x + halfX.x, y: botCenter.y + halfX.y };
  const tbTopLeft = { x: center.x - halfX.x, y: center.y - halfX.y };
  
  ctx.moveTo(tbTopRight.x, tbTopRight.y);
  ctx.lineTo(tbBotRight.x, tbBotRight.y);
  for (let i = 0; i <= 24; i++) { // Front bottom edge
      const t = (i / 48) * Math.PI * 2;
      const px = botCenter.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
      const py = botCenter.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
      ctx.lineTo(px, py);
  }
  ctx.lineTo(tbTopLeft.x, tbTopLeft.y);
  ctx.closePath();
  ctx.fillStyle = gradientBody;
  ctx.fill();

  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 0.95 : (light ? 0.6 : 0.85));
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  // Draw the horizontal separator bands
  const bands = 3;
  const bandDepth = depth / bands;

  for (let b = 1; b < bands; b++) {
    const bandY = center.y + (b * bandDepth);
    const bandCenter = { x: center.x, y: bandY };

    ctx.beginPath();
    for (let i = 0; i <= 24; i++) { // Only draw visible front curve
      const t = (i / 48) * Math.PI * 2;
      const px = bandCenter.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
      const py = bandCenter.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    
    // Shadow under the band (thin darker line)
    ctx.strokeStyle = light ? darkenHex(node.glowColor, 0.4) : hexToRgba(node.glowColor, 0.1);
    ctx.lineWidth = 3 * bScale * camera.zoom;
    ctx.stroke();
    
    // Bright band line to create illusion of separate stacked block
    ctx.strokeStyle = light ? lightenHex(node.glowColor, 0.2) : hexToRgba(node.glowColor, 0.85);
    ctx.lineWidth = 1 * bScale * camera.zoom;
    ctx.stroke();

    // Storage dots on the left face for each lower band
    const dotAngle = Math.PI * 0.76;
    const dotX = bandCenter.x + Math.cos(dotAngle) * halfX.x * 0.95 + Math.sin(dotAngle) * halfY.x * 0.95;
    const dotY = bandCenter.y + Math.cos(dotAngle) * halfX.y * 0.95 + Math.sin(dotAngle) * halfY.y * 0.95 - (bandDepth * 0.5);

    ctx.beginPath();
    const rx = 3 * camera.zoom;
    const ry = 1.5 * camera.zoom;
    for (let i = 0; i <= 24; i++) {
        const theta = (i / 24) * Math.PI * 2;
        const eX = dotX + rx * Math.cos(theta);
        const eY = dotY + ry * Math.sin(theta);
        if (i === 0) ctx.moveTo(eX, eY);
        else ctx.lineTo(eX, eY);
    }
    ctx.closePath();
    ctx.fillStyle = '#ffc107'; // Yellow dot
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill(); // inner highlight on dot
    ctx.strokeStyle = '#e0a800';
    ctx.lineWidth = 0.5 * camera.zoom;
    ctx.stroke();
  }

  // Define Top dot since the loop misses the top band
  const dotAngleTop = Math.PI * 0.76;
  const dotXTop = center.x + (1 * bandDepth) * 0 + Math.cos(dotAngleTop) * halfX.x * 0.95 + Math.sin(dotAngleTop) * halfY.x * 0.95;
  const dotYTop = center.y + (1 * bandDepth) * 0 + Math.cos(dotAngleTop) * halfX.y * 0.95 + Math.sin(dotAngleTop) * halfY.y * 0.95 + (bandDepth * 0.5);
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const rx = 3 * camera.zoom;
    const ry = 1.5 * camera.zoom;
    const theta = (i / 24) * Math.PI * 2;
    const eX = dotXTop + rx * Math.cos(theta);
    const eY = dotYTop + ry * Math.sin(theta);
    if (i === 0) ctx.moveTo(eX, eY);
    else ctx.lineTo(eX, eY);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffc107'; 
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.strokeStyle = '#e0a800';
  ctx.lineWidth = 0.5 * camera.zoom;
  ctx.stroke();


  // Draw ultimate Top face
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const px = center.x + Math.cos(t) * halfX.x + Math.sin(t) * halfY.x;
    const py = center.y + Math.cos(t) * halfX.y + Math.sin(t) * halfY.y;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const topGrad = ctx.createLinearGradient(
    center.x - halfX.x, center.y - halfX.y,
    center.x + halfX.x, center.y + halfX.y
  );
  if (light) {
    topGrad.addColorStop(0, lightenHex(node.glowColor, 0.2));
    topGrad.addColorStop(1, lightenHex(node.glowColor, 0.05));
  } else {
    topGrad.addColorStop(0, hexToRgba(node.glowColor, 1.0));
    topGrad.addColorStop(1, hexToRgba(node.glowColor, 0.7));
  }
  ctx.fillStyle = topGrad;
  ctx.fill();
  
  ctx.strokeStyle = hexToRgba(node.glowColor, selected ? 1.0 : 0.85);
  ctx.lineWidth = (selected ? 2.5 : 1.5) * bScale;
  ctx.stroke();

  // Highlight on top surface
  ctx.beginPath();
  for (let i = 2; i <= 22; i++) { // partial front edge inner
    const t = (i / 48) * Math.PI * 2;
    const px = center.x + Math.cos(t) * halfX.x * 0.85 + Math.sin(t) * halfY.x * 0.85;
    const py = center.y + Math.cos(t) * halfX.y * 0.85 + Math.sin(t) * halfY.y * 0.85;
    if (i === 2) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1 * bScale;
  ctx.stroke();

  const showDetail = camera.zoom >= DETAIL_ZOOM_THRESHOLD;
  if (showDetail && node.title !== 'New Node') {
    const { x: rx, y: ry } = getTextRatios(node, 0.50);
    const titlePt = {
      x: leftTop.x + (rightTop.x - leftTop.x) * rx + (leftBottom.x - leftTop.x) * ry,
      y: leftTop.y + (rightTop.y - leftTop.y) * rx + (leftBottom.y - leftTop.y) * ry + depth + 10 * camera.zoom
    };

    const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
    const scaledSize = Math.round(fontSize * camera.zoom * 0.82);
    drawTransformedText(ctx, node.title, titlePt, bx, { x: 0, y: 1 },
      light ? 'rgba(255,255,255,0.90)' : hexToRgba(node.glowColor, 0.95),
      \`600 \${scaledSize}px Inter, sans-serif\`);
  }
}`;

const modified = code.replace(/export function renderDatabase\([\s\S]+$/, replacement);
fs.writeFileSync('src/features/canvas/renderers/renderDatabase.ts', modified);
console.log('done');
