import { useEffect } from 'react';
import type { FlowSourceRules, PickerDef, SourceDependency } from '@/types/document';

interface FlowTypeVisibilityDialogProps {
  scenarios: PickerDef[];
  flowSources: PickerDef[];
  flowTypes: PickerDef[];
  scenarioExclusions: Record<string, string[]>;
  sourceExclusions: Record<string, string[]>;
  sourceRules: FlowSourceRules;
  onChangeScenario: (next: Record<string, string[]>) => void;
  onChangeSource: (next: Record<string, string[]>) => void;
  onChangeSourceRules: (next: FlowSourceRules) => void;
  onClose: () => void;
}

function ExclusionGrid({ label, rows, columns, exclusions, onChange }: {
  label: string;
  rows: PickerDef[];
  columns: PickerDef[];
  exclusions: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
}) {
  const colCount = columns.length;
  return (
    <div style={{ marginBottom: 20 }}>
      <div className="ftv-grid__section-title">{label}</div>
      {/* Column headers */}
      <div className="ftv-grid" style={{ gridTemplateColumns: `140px repeat(${colCount}, 1fr)` }}>
        <span />
        {columns.map((col) => (
          <span key={col.id} className="ftv-grid__col-header" title={col.label}>
            {col.label}
          </span>
        ))}
        {/* Rows */}
        {rows.map((row) => {
          const excl = exclusions[row.id] ?? [];
          return [
            <span key={`${row.id}-label`} className="ftv-grid__row-label" title={row.label}>{row.label}</span>,
            ...columns.map((col) => {
              const hidden = excl.includes(col.id);
              return (
                <div key={`${row.id}-${col.id}`} className="ftv-grid__cell">
                  <input
                    type="checkbox"
                    checked={!hidden}
                    aria-label={`Show ${col.label} for ${row.label}`}
                    onChange={() => {
                      const next = hidden ? excl.filter((id) => id !== col.id) : [...excl, col.id];
                      onChange({ ...exclusions, [row.id]: next });
                    }}
                  />
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

/* ── Mutual Exclusion Groups editor ────────────────── */
function MutualExclusionEditor({ groups, sources, onChange }: {
  groups: string[][];
  sources: PickerDef[];
  onChange: (next: string[][]) => void;
}) {
  function toggleSourceInGroup(gi: number, sourceId: string) {
    const updated = groups.map((g, i) => {
      if (i !== gi) return g;
      return g.includes(sourceId) ? g.filter((s) => s !== sourceId) : [...g, sourceId];
    });
    onChange(updated);
  }
  function addGroup() { onChange([...groups, []]); }
  function removeGroup(gi: number) { onChange(groups.filter((_, i) => i !== gi)); }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="ftv-grid__section-title">Mutual Exclusion Groups</div>
      <p className="ftv-dialog__hint" style={{ margin: '0 0 8px' }}>Sources in the same group act like radio buttons — selecting one deselects the others.</p>
      {groups.map((group, gi) => (
        <div key={gi} className="ftv-rule-row">
          <div className="ftv-rule-row__chips">
            {sources.map((s) => (
              <button
                key={s.id}
                className={`ftv-chip${group.includes(s.id) ? ' is-active' : ''}`}
                onClick={() => toggleSourceInGroup(gi, s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button className="ui-button ftv-rule-row__remove" onClick={() => removeGroup(gi)} aria-label="Remove group">✕</button>
        </div>
      ))}
      <button className="ui-button" style={{ fontSize: 11, marginTop: 4 }} onClick={addGroup}>+ Add Group</button>
    </div>
  );
}

/* ── Dependencies editor ──────────────────────────── */
function DependenciesEditor({ deps, sources, scenarios, onChange }: {
  deps: SourceDependency[];
  sources: PickerDef[];
  scenarios: PickerDef[];
  onChange: (next: SourceDependency[]) => void;
}) {
  function updateDep(i: number, patch: Partial<SourceDependency>) {
    onChange(deps.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  }
  function removeDep(i: number) { onChange(deps.filter((_, j) => j !== i)); }
  function addDep() { onChange([...deps, { source: sources[0]?.id ?? '', requires: sources[0]?.id ?? '' }]); }
  function toggleScenario(i: number, scenarioId: string) {
    const current = deps[i].scenarios ?? [];
    const next = current.includes(scenarioId) ? current.filter((s) => s !== scenarioId) : [...current, scenarioId];
    updateDep(i, { scenarios: next.length > 0 ? next : undefined });
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="ftv-grid__section-title">Source Dependencies</div>
      <p className="ftv-dialog__hint" style={{ margin: '0 0 8px' }}>A source is disabled until its required source is active. Leave scenarios empty to apply in all scenarios.</p>
      {deps.map((dep, i) => (
        <div key={i} className="ftv-dep-row">
          <div className="ftv-dep-row__selects">
            <select value={dep.source} onChange={(e) => updateDep(i, { source: e.target.value })} aria-label="Dependent source">
              {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <span className="ftv-dep-row__arrow">requires</span>
            <select value={dep.requires} onChange={(e) => updateDep(i, { requires: e.target.value })} aria-label="Required source">
              {sources.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="ftv-dep-row__scenarios">
            <span className="ftv-dep-row__scenarios-label">In scenarios:</span>
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                className={`ftv-chip ftv-chip--small${(dep.scenarios ?? []).includes(sc.id) ? ' is-active' : ''}`}
                onClick={() => toggleScenario(i, sc.id)}
              >
                {sc.label}
              </button>
            ))}
            {(!dep.scenarios || dep.scenarios.length === 0) && <span className="ftv-dep-row__all-label">All</span>}
          </div>
          <button className="ui-button ftv-rule-row__remove" onClick={() => removeDep(i)} aria-label="Remove dependency">✕</button>
        </div>
      ))}
      <button className="ui-button" style={{ fontSize: 11, marginTop: 4 }} onClick={addDep}>+ Add Dependency</button>
    </div>
  );
}

export default function FlowTypeVisibilityDialog({
  scenarios, flowSources, flowTypes,
  scenarioExclusions, sourceExclusions, sourceRules,
  onChangeScenario, onChangeSource, onChangeSourceRules, onClose,
}: FlowTypeVisibilityDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="shortcut-dialog-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Flow-Type Visibility">
      <div className="ftv-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-dialog__header">
          <span>Flow-Type Visibility</span>
          <button className="shortcut-dialog__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ftv-dialog__body">
          <p className="ftv-dialog__hint">Uncheck a flow type to hide it when that scenario or source is active.</p>
          <ExclusionGrid
            label="By Scenario"
            rows={scenarios}
            columns={flowTypes}
            exclusions={scenarioExclusions}
            onChange={onChangeScenario}
          />
          <ExclusionGrid
            label="By Traffic Source"
            rows={flowSources}
            columns={flowTypes}
            exclusions={sourceExclusions}
            onChange={onChangeSource}
          />

          <hr className="ftv-divider" />

          <MutualExclusionEditor
            groups={sourceRules.mutualExclusionGroups ?? []}
            sources={flowSources}
            onChange={(groups) => onChangeSourceRules({ ...sourceRules, mutualExclusionGroups: groups })}
          />
          <DependenciesEditor
            deps={sourceRules.dependencies ?? []}
            sources={flowSources}
            scenarios={scenarios}
            onChange={(dependencies) => onChangeSourceRules({ ...sourceRules, dependencies })}
          />
        </div>
      </div>
    </div>
  );
}
