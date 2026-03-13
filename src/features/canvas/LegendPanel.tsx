import GlassPanel from '@/components/ui/GlassPanel';

const legendRows = [
  { key: 'cyan', label: 'Primary routed flow' },
  { key: 'green', label: 'Service handoff' },
  { key: 'purple', label: 'Private or protected path' },
  { key: 'pink', label: 'Escalated or bypass route' },
];

export default function LegendPanel() {
  return (
    <GlassPanel className="legend-panel" title="Legend">
      <div className="legend-list">
        {legendRows.map((row) => (
          <div key={row.key} className="legend-row">
            <span className={`legend-row__line legend-row__line--${row.key}`} />
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}