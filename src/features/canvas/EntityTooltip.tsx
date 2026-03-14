import { useMemo } from 'react';
import { useEditorStore } from '@/state/useEditorStore';
import type { AreaEntity, NodeEntity } from '@/types/document';

interface EntityTooltipProps {
  entityId: string | null;
  screenX: number;
  screenY: number;
}

export default function EntityTooltip({ entityId, screenX, screenY }: EntityTooltipProps) {
  const document = useEditorStore((s) => s.document);

  const info = useMemo(() => {
    if (!entityId) return null;

    const area = document.areas.find((a) => a.id === entityId);
    if (area) return areaInfo(area);

    const node = document.nodes.find((n) => n.id === entityId);
    if (node) return nodeInfo(node, document.areas);

    return null;
  }, [entityId, document]);

  if (!info) return null;

  // Position tooltip to the right and below cursor, clamped to viewport
  const left = Math.min(screenX + 16, window.innerWidth - 280);
  const top = Math.min(screenY + 16, window.innerHeight - 160);

  return (
    <div className="entity-tooltip" style={{ left, top }}>
      <div className="entity-tooltip__title">{info.title}</div>
      {info.subtitle && <div className="entity-tooltip__subtitle">{info.subtitle}</div>}
      {info.notes && <div className="entity-tooltip__notes">{info.notes}</div>}
      {info.details.length > 0 && (
        <div className="entity-tooltip__details">
          {info.details.map((d, i) => (
            <div key={i} className="entity-tooltip__detail">
              <span className="entity-tooltip__detail-label">{d.label}:</span>
              <span className="entity-tooltip__detail-value">{d.value}</span>
            </div>
          ))}
        </div>
      )}
      {info.tags && info.tags.length > 0 && (
        <div className="entity-tooltip__tags">
          {info.tags.map((t) => <span key={t} className="entity-tooltip__tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

interface TooltipInfo {
  title: string;
  subtitle?: string;
  notes?: string;
  details: { label: string; value: string }[];
  tags?: string[];
}

function areaInfo(area: AreaEntity): TooltipInfo {
  return {
    title: area.label,
    subtitle: area.locked ? '🔒 Locked' : undefined,
    notes: area.notes,
    details: [
      { label: 'Size', value: `${area.width} × ${area.height}` },
      { label: 'Position', value: `(${Math.round(area.x)}, ${Math.round(area.y)})` },
    ],
    tags: area.tags,
  };
}

function nodeInfo(node: NodeEntity, areas: AreaEntity[]): TooltipInfo {
  const parent = node.parentAreaId ? areas.find((a) => a.id === node.parentAreaId) : null;
  const details: { label: string; value: string }[] = [
    { label: 'Size', value: `${node.width} × ${node.height}` },
    { label: 'Position', value: `(${Math.round(node.x)}, ${Math.round(node.y)})` },
  ];
  if (parent) details.push({ label: 'Container', value: parent.label });
  if (node.icon) details.push({ label: 'Icon', value: node.icon });
  return {
    title: node.title,
    subtitle: node.subtitle || undefined,
    notes: node.notes,
    details,
    tags: node.tags,
  };
}
