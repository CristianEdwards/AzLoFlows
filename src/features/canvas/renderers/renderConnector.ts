import { ISO_ANGLE_DEG, ISO_Y_SCALE, ISO_SCALE, CONNECTOR_STUB, NODE_DEPTH } from '@/lib/config';
import { getScreenAnchorPoint, parseAnchorId } from '@/lib/geometry/anchors';
import { buildIsoPath, worldToScreen, type ViewportSize } from '@/lib/geometry/iso';
import { drawArrowHead, drawPolyline, roundRectPath } from '@/lib/rendering/canvasPrimitives';
import { hexToRgba, darkenHex } from '@/lib/rendering/tokens';
import { isoQuad } from '@/lib/geometry/iso';
import type { AreaEntity, CameraState, ConnectorEntity, NodeEntity, Point } from '@/types/document';

export function renderConnector(
  ctx: CanvasRenderingContext2D,
  connector: ConnectorEntity,
  source: NodeEntity,
  target: NodeEntity,
  selected: boolean,
  nodes: NodeEntity[],
  areas: AreaEntity[],
  camera: CameraState,
  viewport: ViewportSize,
  time: number,
  theme: 'dark' | 'light' = 'dark',
): void {
  const light = theme === 'light';
  const start = getScreenAnchorPoint(source, connector.sourceAnchor, camera, viewport);
  const end = getScreenAnchorPoint(target, connector.targetAnchor, camera, viewport);

  // Compute iso axis unit vectors in screen space for perpendicular stubs
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
  function stubOffset(side: string): { x: number; y: number } {
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

  let screenPath: { x: number; y: number }[];
  screenPath = [start, sourceStub];
  if (connector.waypoints.length > 0) {
    const screenWaypoints = connector.waypoints.map((wp) => worldToScreen(wp, camera, viewport));
    let prev = sourceStub;
    for (const wp of screenWaypoints) {
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

  const smoothPath = buildSmoothPath(screenPath, 6, true, true);
  const color = light ? darkenHex(connector.color, 0.55) : connector.color;

  // If tunnel mode, clip out node and area shapes so connector is hidden where it crosses them
  if (connector.tunnel) {
    ctx.save();
    const obstacleQuads: Point[][] = [];
    const nodeDepth = NODE_DEPTH * camera.zoom;
    for (const node of nodes) {
      if (node.id === source.id || node.id === target.id) continue;
      const q = isoQuad(node.x, node.y, node.width, node.height, camera, viewport);
      obstacleQuads.push([
        { x: q[0].x, y: q[0].y - nodeDepth },
        { x: q[1].x, y: q[1].y - nodeDepth },
        { x: q[1].x, y: q[1].y + nodeDepth },
        q[2],
        q[3],
        { x: q[0].x, y: q[0].y + nodeDepth },
      ]);
    }
    if (obstacleQuads.length > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, viewport.width, viewport.height);
      for (const quad of obstacleQuads) {
        ctx.moveTo(quad[quad.length - 1].x, quad[quad.length - 1].y);
        for (let i = quad.length - 2; i >= 0; i--) {
          ctx.lineTo(quad[i].x, quad[i].y);
        }
        ctx.closePath();
      }
      ctx.clip('evenodd');
    }
  }

  // Outer glow (dark mode only — skipped in light mode for a clean look)
  if (!light) {
    drawPolyline(ctx, smoothPath);
    ctx.strokeStyle = hexToRgba(color, 0.04);
    ctx.lineWidth = 14;
    
    
    ctx.stroke();
    
  }

  drawPolyline(ctx, smoothPath);
  if (connector.style === 'dashed') {
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -(time * 0.02);
  }
  ctx.strokeStyle = hexToRgba(color, selected ? 0.95 : (light ? 0.72 : 0.35));
  ctx.lineWidth = selected ? 3.5 : (light ? 3 : 2.5);
  ctx.stroke();
  ctx.setLineDash([]);

  drawPolyline(ctx, smoothPath);
  ctx.strokeStyle = hexToRgba(color, selected ? 1.0 : (light ? 0.98 : 0.82));
  ctx.lineWidth = selected ? 2 : (light ? 1.6 : 1.2);
  ctx.stroke();



  if (connector.style === 'animated') {
    const dots = getConnectorDots(connector.id);
    for (const dot of dots) {
      const t = ((dot.phase + time * 0.00024 * dot.speed) % 1 + 1) % 1;
      const point = pointAlongPath(smoothPath, t);

      // Bloom glow — smaller and dimmer in light mode
      const bloomRadius = dot.size * (light ? 4 : 8);
      const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, bloomRadius);
      glow.addColorStop(0, hexToRgba(color, (light ? 0.18 : 0.45) * dot.bright));
      glow.addColorStop(0.15, hexToRgba(color, (light ? 0.06 : 0.15) * dot.bright));
      glow.addColorStop(1, hexToRgba(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, bloomRadius, 0, Math.PI * 2);
      ctx.fill();

      // Cross-flare — suppressed in light mode
      if (!light) {
        const flareLength = dot.size * 14;
        const flareA = 0.12 * dot.bright;
        const horizontalFlare = ctx.createLinearGradient(point.x - flareLength, point.y, point.x + flareLength, point.y);
        horizontalFlare.addColorStop(0, hexToRgba(color, 0));
        horizontalFlare.addColorStop(0.35, hexToRgba(color, flareA));
        horizontalFlare.addColorStop(0.5, hexToRgba(color, flareA * 2.5));
        horizontalFlare.addColorStop(0.65, hexToRgba(color, flareA));
        horizontalFlare.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = horizontalFlare;
        ctx.fillRect(point.x - flareLength, point.y - 0.8, flareLength * 2, 1.6);

        const verticalFlare = ctx.createLinearGradient(point.x, point.y - flareLength, point.x, point.y + flareLength);
        verticalFlare.addColorStop(0, hexToRgba(color, 0));
        verticalFlare.addColorStop(0.35, hexToRgba(color, flareA));
        verticalFlare.addColorStop(0.5, hexToRgba(color, flareA * 2.5));
        verticalFlare.addColorStop(0.65, hexToRgba(color, flareA));
        verticalFlare.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = verticalFlare;
        ctx.fillRect(point.x - 0.8, point.y - flareLength, 1.6, flareLength * 2);
      }

      // Core dot — solid opaque in light mode, bright in dark
      ctx.fillStyle = hexToRgba(color, (light ? 0.85 : 0.95) * dot.bright);
      ctx.beginPath();
      ctx.arc(point.x, point.y, dot.size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Comet trail — shorter and dimmer in light mode
      const trailCount = light ? 4 : 7;
      for (let trail = 1; trail <= trailCount; trail += 1) {
        let trailT = t - trail * 0.012;
        if (trailT < 0) {
          trailT += 1;
        }
        const trailPoint = pointAlongPath(smoothPath, trailT);
        const alpha = ((light ? 0.22 : 0.35) - trail * 0.045) * dot.bright;
        const trailSize = dot.size * (1 - trail * 0.1);
        if (alpha <= 0 || trailSize <= 0) {
          continue;
        }
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.beginPath();
        ctx.arc(trailPoint.x, trailPoint.y, trailSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (connector.tunnel) {
    ctx.restore();
  }
}

function buildSmoothPath(points: { x: number; y: number }[], radius: number, skipFirst = false, skipLast = false) {
  if (points.length < 3) {
    return points;
  }

  const smooth = [{ x: points[0].x, y: points[0].y }];
  for (let index = 1; index < points.length - 1; index += 1) {
    // Keep stub junctions as sharp corners so connectors arrive straight
    if ((skipFirst && index === 1) || (skipLast && index === points.length - 2)) {
      smooth.push({ x: points[index].x, y: points[index].y });
      continue;
    }
    const prev = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const prevDx = current.x - prev.x;
    const prevDy = current.y - prev.y;
    const nextDx = current.x - next.x;
    const nextDy = current.y - next.y;
    const prevLength = Math.hypot(prevDx, prevDy);
    const nextLength = Math.hypot(nextDx, nextDy);
    const curveRadius = Math.min(radius, prevLength * 0.45, nextLength * 0.45);
    if (curveRadius < 1) {
      smooth.push({ x: current.x, y: current.y });
      continue;
    }

    const start = {
      x: current.x - (prevDx / prevLength) * curveRadius,
      y: current.y - (prevDy / prevLength) * curveRadius,
    };
    const end = {
      x: current.x - (nextDx / nextLength) * curveRadius,
      y: current.y - (nextDy / nextLength) * curveRadius,
    };
    smooth.push(start);
    for (let step = 1; step < 10; step += 1) {
      const t = step / 10;
      const mt = 1 - t;
      smooth.push({
        x: mt * mt * start.x + 2 * mt * t * current.x + t * t * end.x,
        y: mt * mt * start.y + 2 * mt * t * current.y + t * t * end.y,
      });
    }
    smooth.push(end);
  }
  smooth.push(points[points.length - 1]);
  return smooth;
}

// Stable per-connector random dots cached by connector id
interface FlowDot {
  phase: number;
  speed: number;
  size: number;
  bright: number;
}

const dotCache = new Map<string, FlowDot[]>();
const MAX_DOT_CACHE_SIZE = 500;

import { seededRandom, hashString } from '@/lib/hash';

function getConnectorDots(connectorId: string): FlowDot[] {
  const cached = dotCache.get(connectorId);
  if (cached) {
    return cached;
  }
  const rand = seededRandom(hashString(connectorId));
  const count = 3 + Math.floor(rand() * 4); // 3-6 dots like v7
  const dots: FlowDot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      phase: rand(),
      speed: 0.7 * (0.6 + rand() * 0.7),
      size: 2 + rand() * 2.5,
      bright: 0.6 + rand() * 0.4,
    });
  }
  dotCache.set(connectorId, dots);
  // Evict oldest entries when cache grows too large
  if (dotCache.size > MAX_DOT_CACHE_SIZE) {
    const first = dotCache.keys().next().value;
    if (first !== undefined) dotCache.delete(first);
  }
  return dots;
}

function pointAlongPath(points: { x: number; y: number }[], t: number) {
  if (points.length === 0) {
    return { x: 0, y: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }

  const segments = [] as Array<{ start: { x: number; y: number }; end: { x: number; y: number }; length: number }>;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    segments.push({ start, end, length });
    total += length;
  }

  const target = total * t;
  let distance = 0;
  for (const segment of segments) {
    if (distance + segment.length >= target) {
      const ratio = (target - distance) / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    distance += segment.length;
  }

  return points[points.length - 1];
}
