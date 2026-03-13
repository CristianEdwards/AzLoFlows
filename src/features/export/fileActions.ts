import { ISO_ANGLE_DEG, ISO_Y_SCALE, ISO_SCALE, CONNECTOR_STUB, NODE_DEPTH, PIPE_DEPTH, GRID_SIZE } from '@/lib/config';
import { getScreenAnchorPoint, parseAnchorId } from '@/lib/geometry/anchors';
import { buildIsoPath, isoQuad, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { nodeIconCatalog } from '@/lib/icons/nodeIcons';
import { hexToRgba, darkenHex } from '@/lib/rendering/tokens';
import type { CameraState, ConnectorEntity, DiagramDocument, FlowSource, FlowType, NodeEntity, Point, TagFilter } from '@/types/document';
import { getDocScenarios, getDocFlowSources, getDocFlowTypes, flowTypeLabel } from '@/types/document';

export function exportDocumentAsJson(document: DiagramDocument): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${document.name.toLowerCase().replace(/\s+/g, '-')}.json`);
}

export async function exportDocumentAsJsonSaveAs(document: DiagramDocument): Promise<void> {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
  await saveBlobAs(blob, `${document.name.toLowerCase().replace(/\s+/g, '-')}.json`, [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]);
}

export async function importDocumentFromFile(file: File): Promise<DiagramDocument> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('File does not contain a valid diagram');
  }
  return parsed as DiagramDocument;
}

export function exportCanvasAsPng(canvas: HTMLCanvasElement | null, fileName: string): void {
  if (!canvas) {
    return;
  }
  canvas.toBlob((blob) => {
    if (!blob) {
      return;
    }
    downloadBlob(blob, fileName);
  });
}

export async function exportCanvasAsPngSaveAs(canvas: HTMLCanvasElement | null, fileName: string): Promise<void> {
  if (!canvas) return;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve));
  if (!blob) return;
  await saveBlobAs(blob, fileName, [{ description: 'PNG Images', accept: { 'image/png': ['.png'] } }]);
}

/* ── SVG helper utilities ───────────────────────────────────────────── */

function pts(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function hexComponents(hex: string): { r: number; g: number; b: number } {
  const v = Number.parseInt(hex.replace('#', ''), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function svgSmoothPath(points: Point[], radius: number, skipFirst: boolean, skipLast: boolean): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    if ((skipFirst && i === 1) || (skipLast && i === points.length - 2)) {
      d += ` L${points[i].x},${points[i].y}`;
      continue;
    }
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const prevDx = cur.x - prev.x;
    const prevDy = cur.y - prev.y;
    const nextDx = cur.x - next.x;
    const nextDy = cur.y - next.y;
    const prevLen = Math.hypot(prevDx, prevDy);
    const nextLen = Math.hypot(nextDx, nextDy);
    const r = Math.min(radius, prevLen * 0.45, nextLen * 0.45);
    if (r < 1) {
      d += ` L${cur.x},${cur.y}`;
      continue;
    }
    const start = { x: cur.x - (prevDx / prevLen) * r, y: cur.y - (prevDy / prevLen) * r };
    const end = { x: cur.x - (nextDx / nextLen) * r, y: cur.y - (nextDy / nextLen) * r };
    d += ` L${start.x},${start.y} Q${cur.x},${cur.y} ${end.x},${end.y}`;
  }
  d += ` L${points[points.length - 1].x},${points[points.length - 1].y}`;
  return d;
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/* ── Connector screen-space routing (mirrors canvas renderConnector) ─ */

function buildConnectorScreenPath(connector: ConnectorEntity, source: NodeEntity, target: NodeEntity, camera: CameraState, viewport: ViewportSize): Point[] {
  const start = getScreenAnchorPoint(source, connector.sourceAnchor, camera, viewport);
  const end = getScreenAnchorPoint(target, connector.targetAnchor, camera, viewport);

  const _ANG = (ISO_ANGLE_DEG * Math.PI) / 180;
  const _C = Math.cos(_ANG);
  const _S = Math.sin(_ANG);
  const _YS = ISO_Y_SCALE;
  const _IS = ISO_SCALE;
  const ixR = { x: _C * _IS, y: _S * _YS * _IS };
  const iyR = { x: -_S * _IS, y: _C * _YS * _IS };
  const ixL = Math.hypot(ixR.x, ixR.y);
  const iyL = Math.hypot(iyR.x, iyR.y);
  const ixU = { x: ixR.x / ixL, y: ixR.y / ixL };
  const iyU = { x: iyR.x / iyL, y: iyR.y / iyL };

  const STUB = CONNECTOR_STUB;
  function stubOffset(side: string): Point {
    switch (side) {
      case 'top': return { x: -iyU.x * STUB, y: -iyU.y * STUB };
      case 'bottom': return { x: iyU.x * STUB, y: iyU.y * STUB };
      case 'left': return { x: -ixU.x * STUB, y: -ixU.y * STUB };
      case 'right': return { x: ixU.x * STUB, y: ixU.y * STUB };
      default: return { x: 0, y: 0 };
    }
  }

  const sOff = stubOffset(parseAnchorId(connector.sourceAnchor).side);
  const tOff = stubOffset(parseAnchorId(connector.targetAnchor).side);
  const sourceStub = { x: start.x + sOff.x, y: start.y + sOff.y };
  const targetStub = { x: end.x + tOff.x, y: end.y + tOff.y };

  const screenPath: Point[] = [start, sourceStub];
  if (connector.waypoints.length > 0) {
    const screenWPs = connector.waypoints.map((wp) => worldToScreen(wp, camera, viewport));
    let prev = sourceStub;
    for (const wp of screenWPs) {
      const seg = buildIsoPath(prev, wp, camera);
      screenPath.push(...seg.slice(1));
      prev = wp;
    }
    const lastSeg = buildIsoPath(prev, targetStub, camera);
    screenPath.push(...lastSeg.slice(1));
  } else {
    const mainSeg = buildIsoPath(sourceStub, targetStub, camera);
    screenPath.push(...mainSeg.slice(1));
  }
  screenPath.push(end);
  return screenPath;
}

/* ── Main SVG export ────────────────────────────────────────────────── */

function isVisibleForExport(tags: string[] | undefined, filter: TagFilter): boolean {
  if (!tags || tags.length === 0) return true;
  if (!filter.scenario) return false;

  const entityScenarios = tags.filter((t) => !t.startsWith('flow:') && !t.startsWith('type:'));
  const entitySources = tags.filter((t) => t.startsWith('flow:')).map((t) => t.slice(5));
  const entityTypes = tags.filter((t) => t.startsWith('type:')).map((t) => t.slice(5));

  if (entityScenarios.length > 0 && !entityScenarios.includes(filter.scenario)) return false;
  if (entitySources.length > 0 && !entitySources.some((s) => filter.sources.has(s as any))) return false;
  if (entityTypes.length > 0 && !entityTypes.some((t) => filter.types.has(t as any))) return false;

  return true;
}

export function exportDocumentAsSvg(document: DiagramDocument, camera: CameraState, viewport: ViewportSize, tagFilter: TagFilter, theme: 'dark' | 'light' = 'dark'): void {
  const svgString = buildSvgString(document, camera, viewport, tagFilter, theme);
  downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), `${document.name.toLowerCase().replace(/\s+/g, '-')}.svg`);
}

function buildSvgString(document: DiagramDocument, camera: CameraState, viewport: ViewportSize, tagFilter: TagFilter, theme: 'dark' | 'light' = 'dark'): string {
  const light = theme === 'light';
  const svg: string[] = [];
  let defIds = 0;
  const uid = () => `_${++defIds}`;

  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewport.width} ${viewport.height}" width="${viewport.width}" height="${viewport.height}">`);

  // ── Defs: filters, gradients added inline ──
  svg.push('<defs>');
  if (light) {
    svg.push('<filter id="softGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
    svg.push('<filter id="edgeGlow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  } else {
    svg.push('<filter id="softGlow"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
    svg.push('<filter id="edgeGlow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  }
  svg.push('</defs>');

  // Background
  svg.push(`<rect width="100%" height="100%" fill="${light ? '#f0f2f8' : '#030413'}" />`);

  // Build a unified render list sorted by global zIndex
  type SvgRenderItem =
    | { kind: 'area'; entity: typeof document.areas[number] }
    | { kind: 'connector'; entity: typeof document.connectors[number] }
    | { kind: 'node'; entity: typeof document.nodes[number] }
    | { kind: 'pipe'; entity: NonNullable<typeof document.pipes>[number] }
    | { kind: 'text'; entity: NonNullable<typeof document.texts>[number] };

  const renderItems: SvgRenderItem[] = [];
  const visibleNodes = document.nodes.filter((e) => isVisibleForExport(e.tags, tagFilter));
  for (const e of document.areas) if (isVisibleForExport(e.tags, tagFilter)) renderItems.push({ kind: 'area', entity: e });
  for (const e of document.connectors) if (isVisibleForExport(e.tags, tagFilter)) renderItems.push({ kind: 'connector', entity: e });
  for (const e of visibleNodes) renderItems.push({ kind: 'node', entity: e });
  for (const e of (document.pipes ?? [])) if (isVisibleForExport(e.tags, tagFilter)) renderItems.push({ kind: 'pipe', entity: e });
  for (const e of (document.texts ?? [])) if (isVisibleForExport(e.tags, tagFilter)) renderItems.push({ kind: 'text', entity: e });
  renderItems.sort((a, b) => a.entity.zIndex - b.entity.zIndex);

  for (const item of renderItems) {
    switch (item.kind) {
      case 'area': {
    const area = item.entity;
    const quad = isoQuad(area.x, area.y, area.width, area.height, camera, viewport);
    const topLeft = quad[0];
    const topRight = quad[1];
    const bottomLeft = quad[3];
    const topEdgeLen = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) || 1;
    const leftEdgeLen = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) || 1;
    const basisX = { x: (bottomLeft.x - topLeft.x) / leftEdgeLen, y: (bottomLeft.y - topLeft.y) / leftEdgeLen };
    const basisY = { x: -(topRight.x - topLeft.x) / topEdgeLen, y: -(topRight.y - topLeft.y) / topEdgeLen };

    // Gradient fill
    const gId = uid();
    svg.push(`<defs><linearGradient id="ag${gId}" x1="${quad[0].x}" y1="${quad[0].y}" x2="${quad[2].x}" y2="${quad[2].y}" gradientUnits="userSpaceOnUse">`);
    svg.push(`<stop offset="0" stop-color="${area.fill}" stop-opacity="${light ? 0.85 : 0.76}"/>`);
    svg.push(`<stop offset="0.5" stop-color="${area.fill}" stop-opacity="${light ? 0.60 : 0.34}"/>`);
    svg.push(`<stop offset="1" stop-color="${area.fill}" stop-opacity="${light ? 0.42 : 0.2}"/>`);
    svg.push('</linearGradient></defs>');
    if (light) svg.push(`<polygon points="${pts(quad)}" fill="rgba(255,255,255,0.82)" />`);
    svg.push(`<polygon points="${pts(quad)}" fill="url(#ag${gId})" />`);

    // Border + outer glow
    svg.push(`<polygon points="${pts(quad)}" fill="none" stroke="${hexToRgba(area.borderColor, light ? 0.92 : 0.85)}" stroke-width="12" />`);
    svg.push(`<polygon points="${pts(quad)}" fill="none" stroke="${hexToRgba(area.glowColor, light ? 0.06 : 0.10)}" stroke-width="18" />`);

    // Grid lines (clipped)
    const clipId = uid();
    svg.push(`<defs><clipPath id="ac${clipId}"><polygon points="${pts(quad)}" /></clipPath></defs>`);
    svg.push(`<g clip-path="url(#ac${clipId})" stroke="${hexToRgba(area.glowColor, light ? 0.12 : 0.05)}" stroke-width="${light ? 0.9 : 0.7}">`);
    const step = GRID_SIZE;
    for (let x = area.x + step; x < area.x + area.width; x += step) {
      const s = worldToScreen({ x, y: area.y }, camera, viewport);
      const e = worldToScreen({ x, y: area.y + area.height }, camera, viewport);
      svg.push(`<line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" />`);
    }
    for (let y = area.y + step; y < area.y + area.height; y += step) {
      const s = worldToScreen({ x: area.x, y }, camera, viewport);
      const e = worldToScreen({ x: area.x + area.width, y }, camera, viewport);
      svg.push(`<line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" />`);
    }
    svg.push('</g>');

    // Icon + label positioned at the chosen corner
    const hasAreaIcon = area.icon && nodeIconCatalog[area.icon];
    const corner = area.labelAnchor ?? 'bottom-left';
    const xR = corner.includes('right') ? 0.82 : 0.18;
    const yR = corner.includes('top') ? 0.14 : 0.86;
    const stackSign = corner.includes('top') ? 1 : -1;
    const anchorPt = worldToScreen({ x: area.x + area.width * xR, y: area.y + area.height * yR }, camera, viewport);
    if (hasAreaIcon) {
      const iconDef = nodeIconCatalog[area.icon!];
      const iconSize = Math.min(area.width, area.height) * 0.14 * camera.zoom;
      const sc = iconSize / 32;
      const topFaceBasisX_x = (topRight.x - topLeft.x) / topEdgeLen;
      const topFaceBasisX_y = (topRight.y - topLeft.y) / topEdgeLen;
      const topFaceBasisY_x = (bottomLeft.x - topLeft.x) / leftEdgeLen;
      const topFaceBasisY_y = (bottomLeft.y - topLeft.y) / leftEdgeLen;
      const m00 = topFaceBasisY_x * sc;
      const m01 = topFaceBasisY_y * sc;
      const m10 = -topFaceBasisX_x * sc;
      const m11 = -topFaceBasisX_y * sc;
      const itx = anchorPt.x - m00 * 16 - m10 * 16;
      const ity = anchorPt.y - m01 * 16 - m11 * 16;
      svg.push(`<g transform="matrix(${m00},${m01},${m10},${m11},${itx},${ity})" fill="${light ? darkenHex(area.borderColor, 0.55) : area.borderColor}" opacity="${light ? 1.0 : 0.6}">`);
      for (const d of iconDef.paths) {
        svg.push(`<path d="${d}" />`);
      }
      svg.push('</g>');
    }
    // Label offset from icon
    const iconOffPx = hasAreaIcon ? Math.min(area.width, area.height) * 0.14 * camera.zoom * 0.7 : 0;
    const textStackDir = { x: -(topRight.x - topLeft.x) / topEdgeLen, y: -(topRight.y - topLeft.y) / topEdgeLen };
    const labelPt = { x: anchorPt.x + textStackDir.x * iconOffPx * stackSign, y: anchorPt.y + textStackDir.y * iconOffPx * stackSign };
    svg.push(`<text transform="matrix(${basisX.x},${basisX.y},${basisY.x},${basisY.y},${labelPt.x},${labelPt.y})" fill="${light ? '#0d0d1a' : '#ffffff'}" font-family="Rajdhani, sans-serif" font-weight="700" font-size="16" text-anchor="middle" dominant-baseline="central">${escapeXml(area.label)}</text>`);
    break;
      }
      case 'connector': {
    const connector = item.entity;
    const source = document.nodes.find((n) => n.id === connector.sourceId);
    const target = document.nodes.find((n) => n.id === connector.targetId);
    if (!source || !target) continue;

    const rawPath = buildConnectorScreenPath(connector, source, target, camera, viewport);
    const smoothD = svgSmoothPath(rawPath, 6, true, true);
    const color = light ? darkenHex(connector.color, 0.55) : connector.color;

    // Tunnel clipping
    let tunnelClipId = '';
    if (connector.tunnel) {
      const nodeDepth = NODE_DEPTH * camera.zoom;
      const obstaclePolys: string[] = [];
      for (const node of visibleNodes) {
        if (node.id === source.id || node.id === target.id) continue;
        const q = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
        const ob: Point[] = [
          { x: q[0].x, y: q[0].y - nodeDepth },
          { x: q[1].x, y: q[1].y - nodeDepth },
          { x: q[1].x, y: q[1].y + nodeDepth },
          q[2],
          q[3],
          { x: q[0].x, y: q[0].y + nodeDepth },
        ];
        obstaclePolys.push(`M${ob.map((p) => `${p.x},${p.y}`).join(' L')} Z`);
      }
      if (obstaclePolys.length > 0) {
        tunnelClipId = `tc${uid()}`;
        svg.push(`<defs><clipPath id="${tunnelClipId}" clip-rule="evenodd">`);
        svg.push(`<path d="M0,0 H${viewport.width} V${viewport.height} H0 Z ${obstaclePolys.join(' ')}" fill-rule="evenodd" />`);
        svg.push('</clipPath></defs>');
      }
    }

    const gOpen = tunnelClipId ? `<g clip-path="url(#${tunnelClipId})">` : '<g>';
    svg.push(gOpen);

    // Outer glow (dark mode only — match canvas)
    if (!light) {
      svg.push(`<path d="${smoothD}" fill="none" stroke="${hexToRgba(color, 0.04)}" stroke-width="14" filter="url(#softGlow)" />`);
    }

    // Main stroke
    if (connector.style === 'dashed') {
      svg.push(`<path d="${smoothD}" fill="none" stroke="${hexToRgba(color, light ? 0.72 : 0.35)}" stroke-width="${light ? 3 : 2.5}" stroke-dasharray="10 8" />`);
    } else {
      svg.push(`<path d="${smoothD}" fill="none" stroke="${hexToRgba(color, light ? 0.72 : 0.35)}" stroke-width="${light ? 3 : 2.5}" />`);
    }
    // Inner bright stroke — give it an id when animated so dots can follow it
    const pathId = connector.style === 'animated' ? `cp${uid()}` : '';
    if (pathId) {
      svg.push(`<path id="${pathId}" d="${smoothD}" fill="none" stroke="${hexToRgba(color, light ? 0.98 : 0.82)}" stroke-width="${light ? 1.6 : 1.2}" />`);
    } else {
      svg.push(`<path d="${smoothD}" fill="none" stroke="${hexToRgba(color, light ? 0.98 : 0.82)}" stroke-width="${light ? 1.6 : 1.2}" />`);
    }

    // Animated dots with <animateMotion> along the connector path
    if (connector.style === 'animated' && pathId) {
      const rand = seededRandom(hashString(connector.id));
      const count = 3 + Math.floor(rand() * 4);
      const { r: cr, g: cg, b: cb } = hexComponents(color);
      for (let i = 0; i < count; i++) {
        const phase = rand();
        const bright = 0.6 + rand() * 0.4;
        const speed = 0.7 * (0.6 + rand() * 0.7);
        const size = 2 + rand() * 2.5;
        // Canvas: t increments by 0.00024*speed per ms → full cycle = 1/(0.00024*speed) ms
        const dur = 1 / (0.00024 * speed);
        const durS = (dur / 1000).toFixed(2);
        const beginS = ((-phase * dur) / 1000).toFixed(2);
        const bloomR = size * (light ? 4 : 8);

        // Bloom glow circle following the path
        const bgId = uid();
        svg.push(`<defs><radialGradient id="bg${bgId}" cx="0.5" cy="0.5" r="0.5">`);
        svg.push(`<stop offset="0" stop-color="rgba(${cr},${cg},${cb},${((light ? 0.18 : 0.45) * bright).toFixed(3)})" />`);
        svg.push(`<stop offset="0.15" stop-color="rgba(${cr},${cg},${cb},${((light ? 0.06 : 0.15) * bright).toFixed(3)})" />`);
        svg.push(`<stop offset="1" stop-color="rgba(${cr},${cg},${cb},0)" />`);
        svg.push('</radialGradient></defs>');
        svg.push(`<circle r="${bloomR}" fill="url(#bg${bgId})">`);
        svg.push(`<animateMotion dur="${durS}s" begin="${beginS}s" repeatCount="indefinite" rotate="auto"><mpath href="#${pathId}" /></animateMotion>`);
        svg.push('</circle>');

        // Core bright dot following the path
        svg.push(`<circle r="${size * 0.8}" fill="${hexToRgba(color, (light ? 0.85 : 0.95) * bright)}">`);
        svg.push(`<animateMotion dur="${durS}s" begin="${beginS}s" repeatCount="indefinite" rotate="auto"><mpath href="#${pathId}" /></animateMotion>`);
        svg.push('</circle>');
      }
    }

    svg.push('</g>');
    break;
      }
      case 'pipe': {
    const pipe = item.entity;
    const pQuad = isoQuad(pipe.x, pipe.y, pipe.width, pipe.height, camera, viewport);
    const pDepth = PIPE_DEPTH * camera.zoom;
    const topLeft = pQuad[0];
    const topRight = pQuad[1];
    const bottomRight = pQuad[2];
    const bottomLeft = pQuad[3];
    const rTopLeft = { x: topLeft.x, y: topLeft.y - pDepth };
    const rTopRight = { x: topRight.x, y: topRight.y - pDepth };
    const rBottomRight = { x: bottomRight.x, y: bottomRight.y - pDepth };
    const rBottomLeft = { x: bottomLeft.x, y: bottomLeft.y - pDepth };
    const color = pipe.color;

    // Clipping: exclude node volumes
    const nodeDepth = NODE_DEPTH * camera.zoom;
    const obstaclePolys: string[] = [];
    for (const node of visibleNodes) {
      const q = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
      const ob: Point[] = [
        { x: q[0].x, y: q[0].y - nodeDepth },
        { x: q[1].x, y: q[1].y - nodeDepth },
        { x: q[1].x, y: q[1].y + nodeDepth },
        q[2],
        q[3],
        { x: q[0].x, y: q[0].y + nodeDepth },
      ];
      obstaclePolys.push(`M${ob.map((p) => `${p.x},${p.y}`).join(' L')} Z`);
    }
    let pipeClipAttr = '';
    if (obstaclePolys.length > 0) {
      const pcId = uid();
      svg.push(`<defs><clipPath id="pc${pcId}" clip-rule="evenodd">`);
      svg.push(`<path d="M0,0 H${viewport.width} V${viewport.height} H0 Z ${obstaclePolys.join(' ')}" fill-rule="evenodd" />`);
      svg.push('</clipPath></defs>');
      pipeClipAttr = ` clip-path="url(#pc${pcId})"`;
    }

    svg.push(`<g${pipeClipAttr}>`);
    // Bottom face
    svg.push(`<polygon points="${pts(pQuad)}" fill="${hexToRgba(color, light ? 0.62 : 0.08)}" />`);
    svg.push(`<polygon points="${pts(pQuad)}" fill="none" stroke="${hexToRgba(color, light ? 0.90 : 0.3)}" stroke-width="1" />`);
    // Left wall
    svg.push(`<polygon points="${pts([topLeft, rTopLeft, rBottomLeft, bottomLeft])}" fill="${hexToRgba(color, light ? 0.70 : 0.072)}" stroke="${hexToRgba(color, light ? 0.90 : 0.4)}" stroke-width="1.5" />`);
    // Right wall
    svg.push(`<polygon points="${pts([bottomRight, rBottomRight, rTopRight, topRight])}" fill="${hexToRgba(color, light ? 0.65 : 0.06)}" stroke="${hexToRgba(color, light ? 0.90 : 0.4)}" stroke-width="1.5" />`);
    // Top face (roof)
    svg.push(`<polygon points="${pts([rTopLeft, rTopRight, rBottomRight, rBottomLeft])}" fill="${hexToRgba(color, light ? 0.55 : 0.036)}" stroke="${hexToRgba(color, light ? 0.72 : 0.5)}" stroke-width="1.5" />`);
    // Vertical edges
    for (const [a, b] of [[topLeft, rTopLeft], [topRight, rTopRight], [bottomRight, rBottomRight], [bottomLeft, rBottomLeft]]) {
      svg.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${hexToRgba(color, light ? 0.72 : 0.5)}" stroke-width="1.2" />`);
    }
    svg.push('</g>');
    break;
      }
      case 'node': {
    const node = item.entity;
    const quad = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
    const leftTop = quad[0];
    const rightTop = quad[1];
    const rightBottom = quad[2];
    const leftBottom = quad[3];
    const depth = 34 * camera.zoom;
    const leftTopDepth = { x: leftTop.x, y: leftTop.y + depth };
    const frontLeftBottom = { x: leftBottom.x, y: leftBottom.y + depth };
    const frontRightBottom = { x: rightBottom.x, y: rightBottom.y + depth };
    const rightTopDepth = { x: rightTop.x, y: rightTop.y + depth };

    const topEdgeLen = Math.hypot(rightTop.x - leftTop.x, rightTop.y - leftTop.y) || 1;
    const leftEdgeLen = Math.hypot(leftBottom.x - leftTop.x, leftBottom.y - leftTop.y) || 1;
    const topFaceBasisX = { x: (rightTop.x - leftTop.x) / topEdgeLen, y: (rightTop.y - leftTop.y) / topEdgeLen };
    const topFaceBasisY = { x: (leftBottom.x - leftTop.x) / leftEdgeLen, y: (leftBottom.y - leftTop.y) / leftEdgeLen };
    const textDir = node.textRotated ? topFaceBasisX : topFaceBasisY;
    const textStack = node.textRotated
      ? { x: topFaceBasisY.x, y: topFaceBasisY.y }
      : { x: -topFaceBasisX.x, y: -topFaceBasisX.y };

    svg.push('<g>');

    // In light mode, paint white bases on all faces so colours pop
    if (light) {
      for (const face of [
        pts([leftTop, leftBottom, frontLeftBottom, leftTopDepth]),
        pts([leftBottom, rightBottom, frontRightBottom, frontLeftBottom]),
        pts([rightTop, rightBottom, frontRightBottom, rightTopDepth]),
        pts(quad),
      ]) {
        svg.push(`<polygon points="${face}" fill="rgba(255,255,255,0.88)" />`);
      }
    }

    // Left depth face
    svg.push(`<polygon points="${pts([leftTop, leftBottom, frontLeftBottom, leftTopDepth])}" fill="${hexToRgba(node.fill, light ? 0.92 : 0.22)}" stroke="${hexToRgba(node.glowColor, light ? 0.48 : 0.34)}" stroke-width="1.6" />`);
    // Front depth face
    svg.push(`<polygon points="${pts([leftBottom, rightBottom, frontRightBottom, frontLeftBottom])}" fill="${hexToRgba(node.fill, light ? 0.98 : 0.42)}" stroke="${hexToRgba(node.glowColor, light ? 0.48 : 0.34)}" stroke-width="1.6" />`);
    // Right depth face
    svg.push(`<polygon points="${pts([rightTop, rightBottom, frontRightBottom, rightTopDepth])}" fill="${hexToRgba(node.fill, light ? 0.95 : 0.28)}" stroke="${hexToRgba(node.glowColor, light ? 0.42 : 0.3)}" stroke-width="1.4" />`);

    // Top face with gradient
    const tgId = uid();
    svg.push(`<defs><linearGradient id="ng${tgId}" x1="${quad[0].x}" y1="${quad[0].y}" x2="${quad[2].x}" y2="${quad[2].y}" gradientUnits="userSpaceOnUse">`);
    svg.push(`<stop offset="0" stop-color="${node.fill}" stop-opacity="${light ? 0.98 : 0.84}"/>`);
    svg.push(`<stop offset="0.5" stop-color="${node.fill}" stop-opacity="${light ? 0.88 : 0.46}"/>`);
    svg.push(`<stop offset="1" stop-color="${node.fill}" stop-opacity="${light ? 0.72 : 0.24}"/>`);
    svg.push('</linearGradient></defs>');
    svg.push(`<polygon points="${pts(quad)}" fill="url(#ng${tgId})" filter="url(#softGlow)" />`);

    // Glow border
    svg.push(`<polygon points="${pts(quad)}" fill="none" stroke="${hexToRgba(node.glowColor, light ? 0.88 : 0.78)}" stroke-width="2.4" />`);
    // Outer glow border
    svg.push(`<polygon points="${pts(quad)}" fill="none" stroke="${hexToRgba(node.glowColor, light ? 0.12 : 0.18)}" stroke-width="5" />`);

    // Edge highlights
    const allEdges = [
      [leftTop, rightTop], [leftTop, leftBottom], [rightTop, rightBottom],
      [leftBottom, frontLeftBottom], [frontLeftBottom, frontRightBottom], [rightBottom, frontRightBottom],
    ];
    for (const [a, b] of allEdges) {
      svg.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}" stroke-width="1" />`);
    }

    // Top edge highlight
    svg.push(`<line x1="${leftTop.x}" y1="${leftTop.y}" x2="${rightTop.x}" y2="${rightTop.y}" stroke="${hexToRgba(node.glowColor, 0.72)}" stroke-width="2.2" />`);
    svg.push(`<line x1="${leftTop.x}" y1="${leftTop.y}" x2="${rightTop.x}" y2="${rightTop.y}" stroke="${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'}" stroke-width="1" />`);

    // Left edge highlight (strongest glow)
    svg.push(`<line x1="${leftTop.x}" y1="${leftTop.y}" x2="${leftBottom.x}" y2="${leftBottom.y}" stroke="${hexToRgba(node.glowColor, 0.96)}" stroke-width="2.8" filter="url(#edgeGlow)" />`);
    svg.push(`<line x1="${leftTop.x}" y1="${leftTop.y}" x2="${leftBottom.x}" y2="${leftBottom.y}" stroke="${light ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'}" stroke-width="1" />`);

    // Bottom-left vertical edge
    svg.push(`<line x1="${leftBottom.x}" y1="${leftBottom.y}" x2="${frontLeftBottom.x}" y2="${frontLeftBottom.y}" stroke="${hexToRgba(node.glowColor, 0.72)}" stroke-width="2.2" />`);
    svg.push(`<line x1="${leftBottom.x}" y1="${leftBottom.y}" x2="${frontLeftBottom.x}" y2="${frontLeftBottom.y}" stroke="${light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)'}" stroke-width="1" />`);

    // Icon
    if (node.icon && nodeIconCatalog[node.icon]) {
      const iconDef = nodeIconCatalog[node.icon];
      const iconSize = Math.min(node.width, node.height) * 0.34 * camera.zoom;
      const iconCenter = worldToScreen({ x: node.x + node.width * 0.75, y: node.y + node.height * 0.5 }, camera, viewport);
      const scale = iconSize / 32;
      // Perpendicular orientation: use topFaceBasisY as X, -topFaceBasisX as Y (same as canvas)
      const m00 = topFaceBasisY.x * scale;
      const m01 = topFaceBasisY.y * scale;
      const m10 = -topFaceBasisX.x * scale;
      const m11 = -topFaceBasisX.y * scale;
      // Translate to center the 32×32 viewBox
      const tx = iconCenter.x - m00 * 16 - m10 * 16;
      const ty = iconCenter.y - m01 * 16 - m11 * 16;
      svg.push(`<g transform="matrix(${m00},${m01},${m10},${m11},${tx},${ty})" fill="${hexToRgba(node.glowColor, light ? 0.5 : 1.0)}" opacity="${light ? 1.0 : 0.7}">`);
      for (const d of iconDef.paths) {
        svg.push(`<path d="${d}" />`);
      }
      svg.push('</g>');
    }

    // Title text — honour node.fontSize, scale by zoom, and clamp to fit
    const nodeTitleSize = node.fontSize ?? 16;
    const scaledTitleSize = Math.round(nodeTitleSize * camera.zoom);
    const textEdgeLen = node.textRotated ? topEdgeLen : leftEdgeLen;
    const nodeTopEdge = textEdgeLen * 0.85;
    // Approximate text width: charCount × fontSize × 0.6 (Inter avg) × 0.87 (iso compression)
    const approxTitleW = node.title.length * scaledTitleSize * 0.6 * 0.87;
    const clampedTitleSize = approxTitleW > nodeTopEdge
      ? Math.max(8, Math.floor(scaledTitleSize * (nodeTopEdge / approxTitleW)))
      : scaledTitleSize;
    const clampedSubSize = Math.round(clampedTitleSize * 0.8125);
    const titlePt = worldToScreen({ x: node.x + node.width * 0.5, y: node.y + node.height * 0.46 }, camera, viewport);
    svg.push(`<text transform="matrix(${textDir.x},${textDir.y},${textStack.x},${textStack.y},${titlePt.x},${titlePt.y})" fill="#ffffff" font-family="Inter, sans-serif" font-weight="600" font-size="${clampedTitleSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(node.title)}</text>`);

    // Subtitle text
    if (node.subtitle) {
      const subtitlePt = { x: titlePt.x + textStack.x * 18, y: titlePt.y + textStack.y * 18 };
      svg.push(`<text transform="matrix(${textDir.x},${textDir.y},${textStack.x},${textStack.y},${subtitlePt.x},${subtitlePt.y})" fill="${light ? 'rgba(255,255,255,0.9)' : hexToRgba(node.glowColor, 0.95)}" font-family="Inter, sans-serif" font-weight="${light ? 600 : 500}" font-size="${clampedSubSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(node.subtitle)}</text>`);
    }

    svg.push('</g>');
    break;
      }
      case 'text': {
    const text = item.entity;
    const refQuad = isoQuad(text.x, text.y, 100, 100, camera, viewport);
    const tl = refQuad[0];
    const tr = refQuad[1];
    const bl = refQuad[3];
    const topEdgeLen = Math.hypot(tr.x - tl.x, tr.y - tl.y) || 1;
    const leftEdgeLen = Math.hypot(bl.x - tl.x, bl.y - tl.y) || 1;
    const basisXDefault = { x: (bl.x - tl.x) / leftEdgeLen, y: (bl.y - tl.y) / leftEdgeLen };
    const basisYDefault = { x: -(tr.x - tl.x) / topEdgeLen, y: -(tr.y - tl.y) / topEdgeLen };
    const basisX = text.rotated ? { x: (tr.x - tl.x) / topEdgeLen, y: (tr.y - tl.y) / topEdgeLen } : basisXDefault;
    const basisY = text.rotated ? { x: (bl.x - tl.x) / leftEdgeLen, y: (bl.y - tl.y) / leftEdgeLen } : basisYDefault;
    const origin = worldToScreen({ x: text.x, y: text.y }, camera, viewport);
    const scaledSize = Math.round(text.fontSize * camera.zoom);
    const effectiveColor = light ? '#0d0d1a' : '#ffffff';
    const lines = text.label.split('\n');
    if (lines.length <= 1) {
      svg.push(`<text transform="matrix(${basisX.x},${basisX.y},${basisY.x},${basisY.y},${origin.x},${origin.y})" fill="${effectiveColor}" font-family="Rajdhani, sans-serif" font-weight="700" font-size="${scaledSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(text.label)}</text>`);
    } else {
      const lineHeight = scaledSize;
      const totalHeight = (lines.length - 1) * lineHeight;
      const startDy = -totalHeight / 2;
      svg.push(`<text transform="matrix(${basisX.x},${basisX.y},${basisY.x},${basisY.y},${origin.x},${origin.y})" fill="${effectiveColor}" font-family="Rajdhani, sans-serif" font-weight="700" font-size="${scaledSize}" text-anchor="middle" dominant-baseline="central">`);
      for (let i = 0; i < lines.length; i++) {
        const dy = i === 0 ? startDy : lineHeight;
        svg.push(`<tspan x="0" dy="${dy}">${escapeXml(lines[i])}</tspan>`);
      }
      svg.push('</text>');
    }
    break;
      }
    }
  }

  // ── Picker bars — same positions as canvas UI ──
  // CSS positions: scenario → top:8 left:8, source → top:52 left:8, type → bottom:8 right:8
  const pillH = 26;
  const pillR = 12;
  const pillGap = 8;
  const pillPadX = 12;
  const pillPadY = 6;
  const labelFontSize = 11;
  const pillFontSize = 12;
  const innerBg = light ? 'rgba(255,255,255,0.92)' : 'rgba(8,10,28,0.92)';
  const pillBorder = light ? 'rgba(0,0,0,0.12)' : 'rgba(206,147,216,0.2)';
  const pillActiveBg = light ? 'rgba(156,39,176,0.18)' : 'rgba(156,39,176,0.35)';
  const pillActiveBorder = light ? '#9c27b0' : '#ce93d8';
  const pillText = light ? 'rgba(26,26,46,0.72)' : 'rgba(230,238,255,0.72)';
  const pillActiveText = light ? '#4a148c' : '#f3e5f5';
  const labelColor = light ? 'rgba(106,27,154,0.8)' : 'rgba(206,147,216,0.7)';
  const ringBorder = 3;
  const innerR = 15;
  const outerR = 18;

  /** Build a picker bar and return the SVG group + measured width */
  function buildPickerBar(
    label: string,
    items: { id: string; label: string }[],
    isActive: (id: string) => boolean,
  ): { svg: string; width: number; height: number } {
    const charW = pillFontSize * 0.58;
    let totalW = pillPadX; // left padding
    const parts: string[] = [];
    // label
    const labelW = label.length * (labelFontSize * 0.6) + 8;
    totalW += labelW + pillGap;
    // pills
    const pillMetrics: { x: number; w: number; label: string; active: boolean }[] = [];
    for (const item of items) {
      const pw = item.label.length * charW + 20;
      pillMetrics.push({ x: totalW, w: pw, label: item.label, active: isActive(item.id) });
      totalW += pw + pillGap;
    }
    totalW += pillPadX - pillGap; // right padding
    const barH = pillH + pillPadY * 2;

    // gradient ring (outer rect)
    parts.push(`<rect width="${totalW + ringBorder * 2}" height="${barH + ringBorder * 2}" rx="${outerR}" fill="url(#pickerRing)" />`);
    // inner background
    parts.push(`<rect x="${ringBorder}" y="${ringBorder}" width="${totalW}" height="${barH}" rx="${innerR}" fill="${innerBg}" />`);
    // label text
    parts.push(`<text x="${ringBorder + pillPadX}" y="${ringBorder + barH / 2}" fill="${labelColor}" font-family="Inter, sans-serif" font-weight="600" font-size="${labelFontSize}" letter-spacing="0.06em" dominant-baseline="central">${escapeXml(label.toUpperCase())}</text>`);
    // pills
    for (const pm of pillMetrics) {
      const px = ringBorder + pm.x;
      const py = ringBorder + pillPadY;
      parts.push(`<rect x="${px}" y="${py}" width="${pm.w}" height="${pillH}" rx="${pillR}" fill="${pm.active ? pillActiveBg : 'transparent'}" stroke="${pm.active ? pillActiveBorder : pillBorder}" stroke-width="1" />`);
      parts.push(`<text x="${px + pm.w / 2}" y="${py + pillH / 2}" fill="${pm.active ? pillActiveText : pillText}" font-family="Inter, sans-serif" font-weight="${pm.active ? 600 : 400}" font-size="${pillFontSize}" text-anchor="middle" dominant-baseline="central">${escapeXml(pm.label)}</text>`);
    }
    return { svg: parts.join('\n'), width: totalW + ringBorder * 2, height: barH + ringBorder * 2 };
  }

  // Add purple gradient ring def
  svg.splice(
    svg.indexOf('</defs>'),
    0,
    `<linearGradient id="pickerRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6a1b9a"/><stop offset="50%" stop-color="#ce93d8"/><stop offset="100%" stop-color="#6a1b9a"/></linearGradient>`,
  );

  // Scenario picker — top: 8, left: 8
  if (tagFilter.scenario) {
    const docScenarios = getDocScenarios(document);
    const docFlowSources = getDocFlowSources(document);
    const docFlowTypes = getDocFlowTypes(document);
    const bar = buildPickerBar('Scenario', docScenarios, (id) => tagFilter.scenario === id);
    svg.push(`<g transform="translate(8, 8)">${bar.svg}</g>`);

    // Source picker — top: 52, left: 8
    if (tagFilter.sources.size > 0) {
      const srcBar = buildPickerBar('Traffic source', docFlowSources as { id: string; label: string }[], (id) => tagFilter.sources.has(id as FlowSource));
      svg.push(`<g transform="translate(8, 52)">${srcBar.svg}</g>`);
    }

    // Type picker — bottom: 8, right: 8
    if (tagFilter.sources.size > 0) {
      const scenarioTypes = docFlowTypes.map((ft) => ({ id: ft.id, label: flowTypeLabel(ft.id, tagFilter.scenario, docFlowTypes) }));
      const typeBar = buildPickerBar('Traffic type', scenarioTypes as { id: string; label: string }[], (id) => tagFilter.types.has(id as FlowType));
      const tx = viewport.width - typeBar.width - 8;
      const ty = viewport.height - typeBar.height - 8;
      svg.push(`<g transform="translate(${tx}, ${ty})">${typeBar.svg}</g>`);
    }
  }

  svg.push('</svg>');
  return svg.join('\n');
}

export async function exportDocumentAsSvgSaveAs(document: DiagramDocument, camera: CameraState, viewport: ViewportSize, tagFilter: TagFilter, theme: 'dark' | 'light' = 'dark'): Promise<void> {
  // Build SVG string using the same logic, then save via picker
  const svgString = buildSvgString(document, camera, viewport, tagFilter, theme);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  await saveBlobAs(blob, `${document.name.toLowerCase().replace(/\s+/g, '-')}.svg`, [{ description: 'SVG Files', accept: { 'image/svg+xml': ['.svg'] } }]);
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Delay revocation so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}

async function saveBlobAs(blob: Blob, suggestedName: string, types: FilePickerType[]): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({ suggestedName, types });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      // User cancelled the picker
      if (err?.name === 'AbortError') return;
    }
  }
  // Fallback for browsers without File System Access API
  downloadBlob(blob, suggestedName);
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}