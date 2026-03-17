import { useEffect, useRef } from 'react';
import { colorSwatches, textColorSwatches } from '@/features/palette/paletteData';
import { nodeIconList } from '@/lib/icons/nodeIcons';
import { companionFillForGlow } from '@/lib/rendering/tokens';
import { getDocScenarios, getDocFlowSources, getDocFlowTypes } from '@/types/document';
import type { AreaEntity, NodeShape, PickerDef } from '@/types/document';
import { getConnectorStyleOptions, getSelectedEntity, useEditorStore } from '@/state/useEditorStore';
import type { ConnectorStyle } from '@/types/document';

function buildTagOptions(scenarios: PickerDef[], flowSources: PickerDef[], flowTypes: PickerDef[]) {
  return [
    ...scenarios.map((s) => ({ value: s.id, label: s.label })),
    ...flowSources.map((f) => ({ value: `flow:${f.id}`, label: `Source: ${f.label}` })),
    ...flowTypes.map((t) => ({ value: `type:${t.id}`, label: `Type: ${t.label}` })),
  ];
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export default function ContextMenu({ x, y, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const selection = useEditorStore((s) => s.selection);
  const document = useEditorStore((s) => s.document);
  const updateArea = useEditorStore((s) => s.updateArea);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateConnector = useEditorStore((s) => s.updateConnector);
  const updateText = useEditorStore((s) => s.updateText);
  const updatePipe = useEditorStore((s) => s.updatePipe);
  const deleteSelection = useEditorStore((s) => s.deleteSelection);
  const duplicateSelection = useEditorStore((s) => s.duplicateSelection);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const setNodeArea = useEditorStore((s) => s.setNodeArea);
  const addConnectorWaypoint = useEditorStore((s) => s.addConnectorWaypoint);
  const removeLastConnectorWaypoint = useEditorStore((s) => s.removeLastConnectorWaypoint);

  const scenarios = getDocScenarios(document);
  const flowSources = getDocFlowSources(document);
  const flowTypes = getDocFlowTypes(document);
  const TAG_OPTIONS = buildTagOptions(scenarios, flowSources, flowTypes);

  const selectedArea = selection.type === 'area' ? getSelectedEntity(document.areas, selection) : null;
  const selectedNode = selection.type === 'node' ? getSelectedEntity(document.nodes, selection) : null;
  const selectedConnector = selection.type === 'connector' ? getSelectedEntity(document.connectors, selection) : null;
  const selectedText = selection.type === 'text' ? getSelectedEntity(document.texts, selection) : null;
  const selectedPipe = selection.type === 'pipe' ? getSelectedEntity(document.pipes ?? [], selection) : null;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Clamp menu position so it doesn't overflow the viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.right > window.innerWidth) el.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) el.style.top = `${y - rect.height}px`;
  }, [x, y]);

  if (!selection.type || selection.ids.length === 0) return null;

  const action = (fn: () => void) => () => { fn(); onClose(); };

  return (
    <div ref={menuRef} className="context-menu" style={{ left: x, top: y }} role="menu" aria-label="Entity context menu">
      <div className="context-menu__header">
        {selection.type.charAt(0).toUpperCase() + selection.type.slice(1)}
      </div>

      {/* ═══════════ AREA ═══════════ */}
      {selectedArea && (
        <>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Label</span>
            <input className="context-menu__input" value={selectedArea.label} onChange={(e) => updateArea(selectedArea.id, { label: e.target.value })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Position / Size</span>
            <div className="context-menu__field-row">
              <label>X <input type="number" className="context-menu__input context-menu__input--num" value={Math.round(selectedArea.x)} onChange={(e) => updateArea(selectedArea.id, { x: Number(e.target.value) })} /></label>
              <label>Y <input type="number" className="context-menu__input context-menu__input--num" value={Math.round(selectedArea.y)} onChange={(e) => updateArea(selectedArea.id, { y: Number(e.target.value) })} /></label>
            </div>
            <div className="context-menu__field-row">
              <label>W <input type="number" min={60} className="context-menu__input context-menu__input--num" value={Math.round(selectedArea.width)} onChange={(e) => updateArea(selectedArea.id, { width: Math.max(60, Number(e.target.value)) })} /></label>
              <label>H <input type="number" min={40} className="context-menu__input context-menu__input--num" value={Math.round(selectedArea.height)} onChange={(e) => updateArea(selectedArea.id, { height: Math.max(40, Number(e.target.value)) })} /></label>
            </div>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Font Size</span>
            <input type="number" min={10} max={120} className="context-menu__input context-menu__input--num" value={selectedArea.fontSize ?? 24} onChange={(e) => updateArea(selectedArea.id, { fontSize: Number(e.target.value) })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Icon</span>
            <select className="context-menu__select" value={selectedArea.icon ?? ''} onChange={(e) => updateArea(selectedArea.id, { icon: e.target.value || undefined })}>
              <option value="">None</option>
              {nodeIconList.map((ic) => <option key={ic.id} value={ic.id}>{ic.label}</option>)}
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Label Corner</span>
            <select className="context-menu__select" value={selectedArea.labelAnchor ?? 'bottom-left'} onChange={(e) => updateArea(selectedArea.id, { labelAnchor: e.target.value as AreaEntity['labelAnchor'] })}>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="top-right">Top Right</option>
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Glow</span>
            <div className="context-menu__swatches">
              {colorSwatches.map((c) => (
                <button key={c.id} className={`swatch ${c.className}${selectedArea.glowColor === c.value ? ' is-active' : ''}`} onClick={() => updateArea(selectedArea.id, { glowColor: c.value, borderColor: c.value })} />
              ))}
            </div>
          </div>
          <button className={`context-menu__item${selectedArea.locked ? ' is-active' : ''}`} onClick={() => updateArea(selectedArea.id, { locked: !selectedArea.locked })}>
            {selectedArea.locked ? '✓ ' : ''}Locked
          </button>
          {TAG_OPTIONS.length > 0 && (
            <div className="context-menu__section">
              <span className="context-menu__section-label">Tags</span>
              <div className="context-menu__tags">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedArea.tags?.includes(tag.value) ?? false;
                  return <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => { const cur = selectedArea.tags ?? []; updateArea(selectedArea.id, { tags: active ? cur.filter((t) => t !== tag.value) : [...cur, tag.value] }); }}>{tag.label}</button>;
                })}
              </div>
            </div>
          )}
          <div className="context-menu__section">
            <span className="context-menu__section-label">Notes</span>
            <textarea className="context-menu__textarea" rows={2} value={selectedArea.notes ?? ''} onChange={(e) => updateArea(selectedArea.id, { notes: e.target.value })} placeholder="Add notes…" />
          </div>
        </>
      )}

      {/* ═══════════ NODE ═══════════ */}
      {selectedNode && (
        <>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Title</span>
            <input className="context-menu__input" value={selectedNode.title} onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Subtitle</span>
            <input className="context-menu__input" value={selectedNode.subtitle} onChange={(e) => updateNode(selectedNode.id, { subtitle: e.target.value })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Position / Size</span>
            <div className="context-menu__field-row">
              <label>X <input type="number" className="context-menu__input context-menu__input--num" value={Math.round(selectedNode.x)} onChange={(e) => updateNode(selectedNode.id, { x: Number(e.target.value) })} /></label>
              <label>Y <input type="number" className="context-menu__input context-menu__input--num" value={Math.round(selectedNode.y)} onChange={(e) => updateNode(selectedNode.id, { y: Number(e.target.value) })} /></label>
            </div>
            <div className="context-menu__field-row">
              <label>W <input type="number" min={40} className="context-menu__input context-menu__input--num" value={Math.round(selectedNode.width)} onChange={(e) => updateNode(selectedNode.id, { width: Math.max(40, Number(e.target.value)) })} /></label>
              <label>H <input type="number" min={30} className="context-menu__input context-menu__input--num" value={Math.round(selectedNode.height)} onChange={(e) => updateNode(selectedNode.id, { height: Math.max(30, Number(e.target.value)) })} /></label>
            </div>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Shape</span>
            <select className="context-menu__select" value={selectedNode.shape ?? 'box'} onChange={(e) => updateNode(selectedNode.id, { shape: (e.target.value || 'box') as NodeShape })}>
              <option value="box">Box</option>
              <option value="storage">Storage</option>
              <option value="monitor">Monitor</option>
              <option value="serverRack">Server Rack</option>
              <option value="standingNode">Standing Node</option>
              <option value="diamond">Diamond</option>
              <option value="cloud">Cloud</option>
              <option value="card">Card / Panel</option>
              <option value="platform">Platform</option>
              <option value="laptop">Laptop</option>
              <option value="browser">Browser</option>
              <option value="browser2">Browser 2</option>
              <option value="shield">Shield</option>
              <option value="hexagon">Hexagon</option>
              <option value="dashboard">Dashboard</option>
              <option value="chartPanel">Chart Panel</option>
              <option value="analyticsPanel">Analytics Panel</option>
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Glow</span>
            <div className="context-menu__swatches">
              {colorSwatches.map((c) => (
                <button key={c.id} className={`swatch ${c.className}${selectedNode.glowColor === c.value ? ' is-active' : ''}`} onClick={() => updateNode(selectedNode.id, { glowColor: c.value, fill: companionFillForGlow(c.value) })} />
              ))}
            </div>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Icon</span>
            <select className="context-menu__select" value={selectedNode.icon ?? ''} onChange={(e) => updateNode(selectedNode.id, { icon: e.target.value || undefined })}>
              <option value="">None</option>
              {nodeIconList.map((ic) => <option key={ic.id} value={ic.id}>{ic.label}</option>)}
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Text Position</span>
            <select className="context-menu__select" value={selectedNode.textPosition || 'center'} onChange={(e) => updateNode(selectedNode.id, { textPosition: e.target.value as any })}>
              <option value="center">Center</option>
              <option value="top-left">Top Left</option>
              <option value="top-center">Top Center</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Container</span>
            <select className="context-menu__select" value={selectedNode.parentAreaId ?? ''} onChange={(e) => setNodeArea(selectedNode.id, e.target.value || undefined)}>
              <option value="">Detached</option>
              {document.areas.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
            </select>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Font Size</span>
            <input type="number" min={8} max={120} className="context-menu__input context-menu__input--num" value={selectedNode.fontSize ?? 16} onChange={(e) => updateNode(selectedNode.id, { fontSize: Number(e.target.value) })} />
          </div>
          <button className={`context-menu__item${selectedNode.textRotated ? ' is-active' : ''}`} onClick={() => updateNode(selectedNode.id, { textRotated: !selectedNode.textRotated })}>
            {selectedNode.textRotated ? '✓ ' : ''}Rotate Text
          </button>
          {TAG_OPTIONS.length > 0 && (
            <div className="context-menu__section">
              <span className="context-menu__section-label">Tags</span>
              <div className="context-menu__tags">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedNode.tags?.includes(tag.value) ?? false;
                  return <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => { const cur = selectedNode.tags ?? []; updateNode(selectedNode.id, { tags: active ? cur.filter((t) => t !== tag.value) : [...cur, tag.value] }); }}>{tag.label}</button>;
                })}
              </div>
            </div>
          )}
          <div className="context-menu__section">
            <span className="context-menu__section-label">Notes</span>
            <textarea className="context-menu__textarea" rows={2} value={selectedNode.notes ?? ''} onChange={(e) => updateNode(selectedNode.id, { notes: e.target.value })} placeholder="Add notes…" />
          </div>
        </>
      )}

      {/* ═══════════ CONNECTOR ═══════════ */}
      {selectedConnector && (
        <>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Label</span>
            <input className="context-menu__input" value={selectedConnector.label} onChange={(e) => updateConnector(selectedConnector.id, { label: e.target.value })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Style</span>
            <div className="context-menu__row">
              {getConnectorStyleOptions().map((style) => (
                <button key={style} className={`context-menu__item${selectedConnector.style === style ? ' is-active' : ''}`} onClick={() => updateConnector(selectedConnector.id, { style: style as ConnectorStyle })}>
                  {style}
                </button>
              ))}
            </div>
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Color</span>
            <div className="context-menu__swatches">
              {colorSwatches.map((c) => (
                <button key={c.id} className={`swatch ${c.className}${selectedConnector.color === c.value ? ' is-active' : ''}`} onClick={() => updateConnector(selectedConnector.id, { color: c.value })} />
              ))}
            </div>
          </div>
          <button className={`context-menu__item${selectedConnector.tunnel ? ' is-active' : ''}`} onClick={() => updateConnector(selectedConnector.id, { tunnel: !selectedConnector.tunnel })}>
            {selectedConnector.tunnel ? '✓ ' : ''}Tunnel
          </button>
          <div className="context-menu__field-row">
            <button className="context-menu__item" onClick={() => addConnectorWaypoint()}>Add Bend</button>
            <button className="context-menu__item" onClick={() => removeLastConnectorWaypoint()} disabled={selectedConnector.waypoints.length === 0}>Remove Bend</button>
          </div>
          {TAG_OPTIONS.length > 0 && (
            <div className="context-menu__section">
              <span className="context-menu__section-label">Tags</span>
              <div className="context-menu__tags">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedConnector.tags?.includes(tag.value) ?? false;
                  return <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => { const cur = selectedConnector.tags ?? []; updateConnector(selectedConnector.id, { tags: active ? cur.filter((t) => t !== tag.value) : [...cur, tag.value] }); }}>{tag.label}</button>;
                })}
              </div>
            </div>
          )}
          <div className="context-menu__section">
            <span className="context-menu__section-label">Notes</span>
            <textarea className="context-menu__textarea" rows={2} value={selectedConnector.notes ?? ''} onChange={(e) => updateConnector(selectedConnector.id, { notes: e.target.value })} placeholder="Add notes…" />
          </div>
        </>
      )}

      {/* ═══════════ TEXT ═══════════ */}
      {selectedText && (
        <>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Label</span>
            <textarea className="context-menu__textarea" rows={2} value={selectedText.label} onChange={(e) => updateText(selectedText.id, { label: e.target.value })} />
          </div>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Font Size</span>
            <input type="number" min={10} max={120} className="context-menu__input context-menu__input--num" value={selectedText.fontSize} onChange={(e) => updateText(selectedText.id, { fontSize: Number(e.target.value) })} />
          </div>
          <button className={`context-menu__item${selectedText.rotated ? ' is-active' : ''}`} onClick={() => updateText(selectedText.id, { rotated: !selectedText.rotated })}>
            {selectedText.rotated ? '✓ ' : ''}Rotated
          </button>
          <div className="context-menu__section">
            <span className="context-menu__section-label">Color</span>
            <div className="context-menu__swatches">
              {textColorSwatches.map((c) => (
                <button key={c.id} className={`swatch ${c.className}${selectedText.color === c.value ? ' is-active' : ''}`} onClick={() => updateText(selectedText.id, { color: c.value })} />
              ))}
            </div>
          </div>
          {TAG_OPTIONS.length > 0 && (
            <div className="context-menu__section">
              <span className="context-menu__section-label">Tags</span>
              <div className="context-menu__tags">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedText.tags?.includes(tag.value) ?? false;
                  return <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => { const cur = selectedText.tags ?? []; updateText(selectedText.id, { tags: active ? cur.filter((t) => t !== tag.value) : [...cur, tag.value] }); }}>{tag.label}</button>;
                })}
              </div>
            </div>
          )}
          <div className="context-menu__section">
            <span className="context-menu__section-label">Notes</span>
            <textarea className="context-menu__textarea" rows={2} value={selectedText.notes ?? ''} onChange={(e) => updateText(selectedText.id, { notes: e.target.value })} placeholder="Add notes…" />
          </div>
        </>
      )}

      {/* ═══════════ PIPE ═══════════ */}
      {selectedPipe && (
        <div className="context-menu__section">
          <span className="context-menu__section-label">Color</span>
          <div className="context-menu__swatches">
            {colorSwatches.map((c) => (
              <button key={c.id} className={`swatch ${c.className}${selectedPipe.color === c.value ? ' is-active' : ''}`} onClick={() => updatePipe(selectedPipe.id, { color: c.value })} />
            ))}
          </div>
        </div>
      )}

      <div className="context-menu__divider" />

      {/* ── Common actions ── */}
      <button className="context-menu__item" onClick={action(bringToFront)}>Bring to Front</button>
      <button className="context-menu__item" onClick={action(sendToBack)}>Send to Back</button>
      <button className="context-menu__item" onClick={action(duplicateSelection)}>Duplicate</button>
      <button className="context-menu__item context-menu__item--danger" onClick={action(deleteSelection)}>Delete</button>
    </div>
  );
}
