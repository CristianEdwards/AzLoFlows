import { useEditorStore } from '@/state/useEditorStore';
import { getDocScenarios, getDocFlowSources, getDocFlowTypes, getDocFlowTypeExclusions, getDocSourceFlowTypeExclusions, getDocFlowSourceRules, flowTypeLabel } from '@/types/document';
import type { ScenarioId, FlowSource, FlowType } from '@/types/document';

export default function ScenarioToolbar() {
  const document = useEditorStore((s) => s.document);
  const activeScenario = useEditorStore((s) => s.activeScenario);
  const activeFlowSources = useEditorStore((s) => s.activeFlowSources);
  const activeFlowTypes = useEditorStore((s) => s.activeFlowTypes);
  const setActiveScenario = useEditorStore((s) => s.setActiveScenario);
  const toggleFlowSource = useEditorStore((s) => s.toggleFlowSource);
  const toggleFlowType = useEditorStore((s) => s.toggleFlowType);

  const scenarios = getDocScenarios(document);
  const flowSources = getDocFlowSources(document);
  const allFlowTypes = getDocFlowTypes(document);
  const scenarioExclusions = getDocFlowTypeExclusions(document);
  const sourceExclusions = getDocSourceFlowTypeExclusions(document);
  const sourceRules = getDocFlowSourceRules(document);
  const scenarioExcluded = activeScenario ? scenarioExclusions[activeScenario] ?? [] : [];
  // Source exclusions use intersection: hide a flow type only if ALL active sources exclude it
  const activeSources = [...activeFlowSources];
  const sourceExcluded = activeSources.length > 0
    ? allFlowTypes.filter((ft) => activeSources.every((s) => (sourceExclusions[s] ?? []).includes(ft.id))).map((ft) => ft.id)
    : [];
  const allExcluded = new Set([...scenarioExcluded, ...sourceExcluded]);
  const flowTypes = allFlowTypes.filter((ft) => !allExcluded.has(ft.id));

  return (
    <>
      {/* ── Scenario picker — top-left of canvas ── */}
      <div className="scenario-picker">
        <div className="scenario-picker__ring" />
        <div className="scenario-picker__inner">
          <span className="scenario-picker__label">Scenario</span>
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              className={`scenario-pill${activeScenario === scenario.id ? ' is-active' : ''}`}
              onClick={() => setActiveScenario(activeScenario === scenario.id ? null : scenario.id)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Traffic source picker — below scenarios, top-left ── */}
      {activeScenario && (
        <div className="source-picker">
          <div className="source-picker__ring" />
          <div className="source-picker__inner">
            <span className="source-picker__label">Traffic source</span>
            {flowSources.map((source) => {
              // Compute disabled state from document rules
              let disabled = false;
              if (sourceRules.dependencies) {
                for (const dep of sourceRules.dependencies) {
                  if (dep.source === source.id) {
                    const appliesToScenario = !dep.scenarios || dep.scenarios.length === 0 || (activeScenario != null && dep.scenarios.includes(activeScenario));
                    if (appliesToScenario && !activeFlowSources.has(dep.requires)) { disabled = true; break; }
                  }
                }
              }
              return (
                <button
                  key={source.id}
                  className={`flow-pill${activeFlowSources.has(source.id) ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                  onClick={() => { if (!disabled) toggleFlowSource(source.id); }}
                  disabled={disabled}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Traffic type picker — bottom-right of canvas ── */}
      {activeScenario && activeFlowSources.size > 0 && (
        <div className="type-picker">
          <div className="type-picker__ring" />
          <div className="type-picker__inner">
            <span className="type-picker__label">Traffic type</span>
            {flowTypes.map((ft) => (
              <button
                key={ft.id}
                className={`flow-pill${activeFlowTypes.has(ft.id) ? ' is-active' : ''}`}
                onClick={() => toggleFlowType(ft.id)}
              >
                {flowTypeLabel(ft.id, activeScenario, flowTypes)}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
