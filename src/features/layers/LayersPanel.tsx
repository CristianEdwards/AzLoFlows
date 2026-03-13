import { useState } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { useEditorStore } from '@/state/useEditorStore';

const SHAPE_TYPES = ['area', 'node', 'connector', 'text', 'pipe'] as const;
type ShapeType = (typeof SHAPE_TYPES)[number];

const TYPE_LABELS: Record<ShapeType, string> = {
  area: 'A',
  node: 'N',
  connector: 'C',
  text: 'T',
  pipe: 'P',
};

export default function LayersPanel() {
  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const selectEntities = useEditorStore((state) => state.selectEntities);
  const [search, setSearch] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<ShapeType>>(new Set());

  function toggleType(type: ShapeType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  const rows = [
    ...document.areas.map((area) => ({ id: area.id, title: area.label, kind: 'area' as ShapeType, zIndex: area.zIndex })),
    ...document.nodes.map((node) => ({ id: node.id, title: node.title, kind: 'node' as ShapeType, zIndex: node.zIndex })),
    ...document.connectors.map((connector) => ({ id: connector.id, title: connector.label || 'Connector', kind: 'connector' as ShapeType, zIndex: connector.zIndex })),
    ...(document.texts ?? []).map((text) => ({ id: text.id, title: text.label || 'Text', kind: 'text' as ShapeType, zIndex: text.zIndex })),
    ...(document.pipes ?? []).map((pipe) => ({ id: pipe.id, title: 'Pipe', kind: 'pipe' as ShapeType, zIndex: pipe.zIndex })),
  ].sort((a, b) => b.zIndex - a.zIndex);

  const needle = search.toLowerCase();
  const filtered = rows.filter((r) => {
    if (activeTypes.size > 0 && !activeTypes.has(r.kind)) return false;
    if (needle && !r.title.toLowerCase().includes(needle) && !r.kind.includes(needle)) return false;
    return true;
  });

  return (
    <GlassPanel title="Layers" className="layers-panel">
      <div className="layer-type-filters">
        {SHAPE_TYPES.map((type) => (
          <button
            key={type}
            className={`layer-type-btn${activeTypes.has(type) ? ' is-active' : ''}`}
            onClick={() => toggleType(type)}
            title={type}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="layers-search"
        placeholder="Filter layers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="layer-list">
        {filtered.map((row) => (
          <button
            key={row.id}
            className={`layer-row${selection.type === row.kind && selection.ids.includes(row.id) ? ' is-active' : ''}`}
            onClick={() => selectEntities(row.kind, [row.id])}
          >
            <small className="layer-row__kind">{TYPE_LABELS[row.kind]}</small>
            <span className="layer-row__title">{row.title}</span>
            <small className="layer-row__z">z{row.zIndex}</small>
          </button>
        ))}
        {filtered.length === 0 && <div className="layer-list__empty">No matches</div>}
      </div>
    </GlassPanel>
  );
}