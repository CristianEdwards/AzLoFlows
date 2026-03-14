import { useCallback, useMemo, useRef } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { useEditorStore } from '@/state/useEditorStore';

const SVG_W = 220;
const SVG_H = 140;
const PAD = 20;
const INNER_W = SVG_W - PAD * 2;
const INNER_H = SVG_H - PAD * 2;

export default function Minimap() {
  const document = useEditorStore((state) => state.document);
  const camera = useEditorStore((state) => state.camera);
  const setCamera = useEditorStore((state) => state.setCamera);
  const svgRef = useRef<SVGSVGElement>(null);

  const bounds = useMemo(() => {
    const xs = [...document.areas.flatMap((a) => [a.x, a.x + a.width]), ...document.nodes.flatMap((n) => [n.x, n.x + n.width])];
    const ys = [...document.areas.flatMap((a) => [a.y, a.y + a.height]), ...document.nodes.flatMap((n) => [n.y, n.y + n.height])];
    if (xs.length === 0 || ys.length === 0) return null;
    const minX = xs.reduce((a, b) => Math.min(a, b), Infinity);
    const maxX = xs.reduce((a, b) => Math.max(a, b), -Infinity);
    const minY = ys.reduce((a, b) => Math.min(a, b), Infinity);
    const maxY = ys.reduce((a, b) => Math.max(a, b), -Infinity);
    return { minX, maxX, minY, maxY };
  }, [document]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!bounds || !svgRef.current) return null;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = (clientX - rect.left) / rect.width * SVG_W;
      const sy = (clientY - rect.top) / rect.height * SVG_H;
      const rangeX = Math.max(bounds.maxX - bounds.minX, 1);
      const rangeY = Math.max(bounds.maxY - bounds.minY, 1);
      const worldX = ((sx - PAD) / INNER_W) * rangeX + bounds.minX;
      const worldY = ((sy - PAD) / INNER_H) * rangeY + bounds.minY;
      return { x: worldX, y: worldY };
    },
    [bounds],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const pt = toWorld(e.clientX, e.clientY);
      if (!pt) return;
      setCamera({ x: -pt.x * camera.zoom + window.innerWidth / 2, y: -pt.y * camera.zoom + window.innerHeight / 2 });
    },
    [toWorld, setCamera, camera.zoom],
  );

  // Viewport indicator
  const viewportRect = useMemo(() => {
    if (!bounds) return null;
    const rangeX = Math.max(bounds.maxX - bounds.minX, 1);
    const rangeY = Math.max(bounds.maxY - bounds.minY, 1);
    const vx = -camera.x / camera.zoom;
    const vy = -camera.y / camera.zoom;
    const vw = window.innerWidth / camera.zoom;
    const vh = window.innerHeight / camera.zoom;
    return {
      x: ((vx - bounds.minX) / rangeX) * INNER_W + PAD,
      y: ((vy - bounds.minY) / rangeY) * INNER_H + PAD,
      width: (vw / rangeX) * INNER_W,
      height: (vh / rangeY) * INNER_H,
    };
  }, [bounds, camera]);

  return (
    <GlassPanel className="minimap" title="Minimap">
      <svg ref={svgRef} viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="minimap__svg" style={{ cursor: 'crosshair' }} onClick={handleClick}>
        <rect x="0" y="0" width={SVG_W} height={SVG_H} rx="14" fill="rgba(3, 6, 18, 0.7)" stroke="rgba(140, 180, 255, 0.14)" />
        {bounds
          ? document.areas.map((area) => {
              const rangeX = Math.max(bounds.maxX - bounds.minX, 1);
              const rangeY = Math.max(bounds.maxY - bounds.minY, 1);
              const x = ((area.x - bounds.minX) / rangeX) * INNER_W + PAD;
              const y = ((area.y - bounds.minY) / rangeY) * INNER_H + PAD;
              const w = (area.width / rangeX) * INNER_W;
              const h = (area.height / rangeY) * INNER_H;
              return <rect key={area.id} x={x} y={y} width={w} height={h} fill={area.fill} opacity="0.4" stroke={area.borderColor} />;
            })
          : null}
        {bounds
          ? document.nodes.map((node) => {
              const rangeX = Math.max(bounds.maxX - bounds.minX, 1);
              const rangeY = Math.max(bounds.maxY - bounds.minY, 1);
              const x = ((node.x - bounds.minX) / rangeX) * INNER_W + PAD;
              const y = ((node.y - bounds.minY) / rangeY) * INNER_H + PAD;
              const w = (node.width / rangeX) * INNER_W;
              const h = (node.height / rangeY) * INNER_H;
              return <rect key={node.id} x={x} y={y} width={w} height={h} fill={node.glowColor} opacity="0.7" />;
            })
          : null}
        {viewportRect && (
          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={viewportRect.width}
            height={viewportRect.height}
            fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
            rx="2"
            pointerEvents="none"
          />
        )}
      </svg>
    </GlassPanel>
  );
}