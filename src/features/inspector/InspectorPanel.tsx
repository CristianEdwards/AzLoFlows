import GlassPanel from '@/components/ui/GlassPanel';
import { nodeIconList } from '@/lib/icons/nodeIcons';
import { colorSwatches, textColorSwatches } from '@/features/palette/paletteData';
import { companionFillForGlow } from '@/lib/rendering/tokens';
import { getDocScenarios, getDocFlowSources, getDocFlowTypes } from '@/types/document';
import type { AreaEntity, NodeShape, PickerDef } from '@/types/document';
import { getConnectorStyleOptions, getSelectedEntity, useEditorStore } from '@/state/useEditorStore';

function PickerDefEditor({ label, items, onChange }: { label: string; items: PickerDef[]; onChange: (next: PickerDef[]) => void }) {
  function updateItem(index: number, patch: Partial<PickerDef>) {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  }
  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function addItem() {
    const id = `custom-${Date.now()}`;
    onChange([...items, { id, label: 'New item' }]);
  }
  return (
    <div className="inspector-section" style={{ marginBottom: 8 }}>
      <span className="field__label" style={{ fontWeight: 600, fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 3 }}>
          <input
            style={{ flex: 1, minWidth: 0 }}
            value={item.label}
            onChange={(e) => updateItem(i, { label: e.target.value })}
            title={`id: ${item.id}`}
          />
          <input
            style={{ width: 90 }}
            value={item.id}
            onChange={(e) => updateItem(i, { id: e.target.value })}
            placeholder="id"
          />
          <button className="ui-button" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => removeItem(i)}>✕</button>
        </div>
      ))}
      <button className="ui-button" style={{ marginTop: 4, fontSize: 11 }} onClick={addItem}>+ Add {label.replace(/s$/, '')}</button>
    </div>
  );
}

function buildTagOptions(scenarios: PickerDef[], flowSources: PickerDef[], flowTypes: PickerDef[]) {
  return [
    ...scenarios.map((s) => ({ value: s.id, label: s.label })),
    ...flowSources.map((f) => ({ value: `flow:${f.id}`, label: `Source: ${f.label}` })),
    ...flowTypes.map((t) => ({ value: `type:${t.id}`, label: `Type: ${t.label}` })),
  ];
}

export default function InspectorPanel() {
  const selection = useEditorStore((state) => state.selection);
  const document = useEditorStore((state) => state.document);
  const updateArea = useEditorStore((state) => state.updateArea);
  const updateNode = useEditorStore((state) => state.updateNode);
  const updateConnector = useEditorStore((state) => state.updateConnector);
  const updateText = useEditorStore((state) => state.updateText);
  const updatePipe = useEditorStore((state) => state.updatePipe);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const addConnectorWaypoint = useEditorStore((state) => state.addConnectorWaypoint);
  const removeLastConnectorWaypoint = useEditorStore((state) => state.removeLastConnectorWaypoint);
  const setNodeArea = useEditorStore((state) => state.setNodeArea);
  const bringToFront = useEditorStore((state) => state.bringToFront);
  const sendToBack = useEditorStore((state) => state.sendToBack);
  const updateDocumentDefs = useEditorStore((state) => state.updateDocumentDefs);

  const scenarios = getDocScenarios(document);
  const flowSources = getDocFlowSources(document);
  const flowTypes = getDocFlowTypes(document);
  const TAG_OPTIONS = buildTagOptions(scenarios, flowSources, flowTypes);

  const selectedArea = selection.type === 'area' ? getSelectedEntity(document.areas, selection) : null;
  const selectedNode = selection.type === 'node' ? getSelectedEntity(document.nodes, selection) : null;
  const selectedConnector = selection.type === 'connector' ? getSelectedEntity(document.connectors, selection) : null;
  const selectedText = selection.type === 'text' ? getSelectedEntity(document.texts, selection) : null;
  const selectedPipe = selection.type === 'pipe' ? getSelectedEntity(document.pipes ?? [], selection) : null;

  return (
    <div className="inspector-stack">
      <GlassPanel title="Document">
        <label className="field">
          <span>Name</span>
          <input value={document.name} onChange={(event) => renameDocument(event.target.value)} />
        </label>
      </GlassPanel>
      <GlassPanel title="Diagram Pickers" collapsed>
        <PickerDefEditor label="Scenarios" items={scenarios} onChange={(next) => updateDocumentDefs({ scenarios: next })} />
        <PickerDefEditor label="Traffic Sources" items={flowSources} onChange={(next) => updateDocumentDefs({ flowSources: next })} />
        <PickerDefEditor label="Traffic Types" items={flowTypes} onChange={(next) => updateDocumentDefs({ flowTypes: next })} />
      </GlassPanel>
      <GlassPanel title="Inspector">
        {selection.ids.length === 0 ? <p className="empty-copy">Select an area, node, or connector to edit its properties.</p> : null}
        {selection.ids.length > 1 ? <p className="empty-copy">Batch editing is reserved for the next increment. Use duplicate, delete, or connect from the toolbar.</p> : null}

        {selectedArea ? (
          <div className="inspector-section">
            <label className="field">
              <span>Label</span>
              <input value={selectedArea.label} onChange={(event) => updateArea(selectedArea.id, { label: event.target.value })} />
            </label>
            <label className="field field--inline">
              <span>Locked</span>
              <input type="checkbox" checked={selectedArea.locked} onChange={(event) => updateArea(selectedArea.id, { locked: event.target.checked })} />
            </label>
            <div className="field-row">
              <label className="field">
                <span>X</span>
                <input type="number" value={Math.round(selectedArea.x)} onChange={(e) => updateArea(selectedArea.id, { x: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Y</span>
                <input type="number" value={Math.round(selectedArea.y)} onChange={(e) => updateArea(selectedArea.id, { y: Number(e.target.value) })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Width</span>
                <input type="number" min={60} value={Math.round(selectedArea.width)} onChange={(e) => updateArea(selectedArea.id, { width: Math.max(60, Number(e.target.value)) })} />
              </label>
              <label className="field">
                <span>Height</span>
                <input type="number" min={40} value={Math.round(selectedArea.height)} onChange={(e) => updateArea(selectedArea.id, { height: Math.max(40, Number(e.target.value)) })} />
              </label>
            </div>
            <label className="field">
              <span>Font Size</span>
              <input type="number" min={10} max={120} value={selectedArea.fontSize ?? 24} onChange={(event) => updateArea(selectedArea.id, { fontSize: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Icon</span>
              <select value={selectedArea.icon ?? ''} onChange={(event) => updateArea(selectedArea.id, { icon: event.target.value || undefined })}>
                <option value="">None</option>
                {nodeIconList.map((ic) => (
                  <option key={ic.id} value={ic.id}>{ic.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Label Corner</span>
              <select value={selectedArea.labelAnchor ?? 'bottom-left'} onChange={(event) => updateArea(selectedArea.id, { labelAnchor: event.target.value as AreaEntity['labelAnchor'] })}>
                <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
              </select>
            </label>
            <label className="field">
              <span>Glow</span>
              <div className="swatch-row">
                {colorSwatches.map((color) => (
                  <button key={color.id} className={`swatch ${color.className}${selectedArea.glowColor === color.value ? ' is-active' : ''}`} onClick={() => updateArea(selectedArea.id, { glowColor: color.value, borderColor: color.value })} />
                ))}
              </div>
            </label>
            <label className="field">
              <span>Tags</span>
              <div className="tag-pills">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedArea.tags?.includes(tag.value) ?? false;
                  return (
                    <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => {
                      const current = selectedArea.tags ?? [];
                      updateArea(selectedArea.id, { tags: active ? current.filter((t) => t !== tag.value) : [...current, tag.value] });
                    }}>{tag.label}</button>
                  );
                })}
              </div>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea rows={3} value={selectedArea.notes ?? ''} onChange={(e) => updateArea(selectedArea.id, { notes: e.target.value })} placeholder="Add notes…" />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={bringToFront}>Bring to Front</button>
              <button className="ui-button" onClick={sendToBack}>Send to Back</button>
            </div>
          </div>
        ) : null}

        {selectedNode ? (
          <div className="inspector-section">
            <label className="field">
              <span>Title</span>
              <input value={selectedNode.title} onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })} />
            </label>
            <label className="field">
              <span>Subtitle</span>
              <input value={selectedNode.subtitle} onChange={(event) => updateNode(selectedNode.id, { subtitle: event.target.value })} />
            </label>
            <div className="field-row">
              <label className="field">
                <span>X</span>
                <input type="number" value={Math.round(selectedNode.x)} onChange={(e) => updateNode(selectedNode.id, { x: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Y</span>
                <input type="number" value={Math.round(selectedNode.y)} onChange={(e) => updateNode(selectedNode.id, { y: Number(e.target.value) })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Width</span>
                <input type="number" min={40} value={Math.round(selectedNode.width)} onChange={(e) => updateNode(selectedNode.id, { width: Math.max(40, Number(e.target.value)) })} />
              </label>
              <label className="field">
                <span>Height</span>
                <input type="number" min={30} value={Math.round(selectedNode.height)} onChange={(e) => updateNode(selectedNode.id, { height: Math.max(30, Number(e.target.value)) })} />
              </label>
            </div>
            <label className="field">
              <span>Glow</span>
              <div className="swatch-row">
                {colorSwatches.map((color) => (
                  <button key={color.id} className={`swatch ${color.className}${selectedNode.glowColor === color.value ? ' is-active' : ''}`} onClick={() => updateNode(selectedNode.id, { glowColor: color.value, fill: companionFillForGlow(color.value) })} />
                ))}
              </div>
            </label>
            <label className="field">
              <span>Container</span>
              <select value={selectedNode.parentAreaId ?? ''} onChange={(event) => setNodeArea(selectedNode.id, event.target.value || undefined)}>
                <option value="">Detached</option>
                {document.areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Shape</span>
              <select value={selectedNode.shape ?? 'box'} onChange={(event) => updateNode(selectedNode.id, { shape: (event.target.value || 'box') as NodeShape })}>
                <option value="box">Box</option>
                <option value="storage">Storage</option>
                <option value="monitor">Monitor</option>
                <option value="serverRack">Server Rack</option>
                <option value="diamond">Diamond</option>
                <option value="cloud">Cloud</option>
                <option value="card">Card / Panel</option>
                <option value="platform">Platform</option>
                <option value="laptop">Laptop</option>
                <option value="browser">Browser</option>
                <option value="shield">Shield</option>
                <option value="hexagon">Hexagon</option>
                <option value="dashboard">Dashboard</option>
                <option value="storage">Storage</option>
                <option value="chartPanel">Chart Panel</option>
              </select>
            </label>
            <label className="field">
                <span>Text Position</span>
                <select value={selectedNode.textPosition || "center"} onChange={(event) => updateNode(selectedNode.id, { textPosition: event.target.value as any })}>
                  <option value="center">Center</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                </select>
              </label>
              <label className="field">
                <span>Icon</span>
                <select value={selectedNode.icon || ""} onChange={(event) => updateNode(selectedNode.id, { icon: event.target.value || undefined })}>
                <option value="">None</option>
                {nodeIconList.map((ic) => (
                  <option key={ic.id} value={ic.id}>{ic.label}</option>
                ))}
              </select>
            </label>
            <label className="field field--inline">
              <span>Rotate Text</span>
              <input type="checkbox" checked={!!selectedNode.textRotated} onChange={(event) => updateNode(selectedNode.id, { textRotated: event.target.checked })} />
            </label>
            <label className="field">
              <span>Font Size</span>
              <input type="number" min={8} max={120} value={selectedNode.fontSize ?? 16} onChange={(event) => updateNode(selectedNode.id, { fontSize: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Tags</span>
              <div className="tag-pills">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedNode.tags?.includes(tag.value) ?? false;
                  return (
                    <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => {
                      const current = selectedNode.tags ?? [];
                      updateNode(selectedNode.id, { tags: active ? current.filter((t) => t !== tag.value) : [...current, tag.value] });
                    }}>{tag.label}</button>
                  );
                })}
              </div>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea rows={3} value={selectedNode.notes ?? ''} onChange={(e) => updateNode(selectedNode.id, { notes: e.target.value })} placeholder="Add notes…" />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={bringToFront}>Bring to Front</button>
              <button className="ui-button" onClick={sendToBack}>Send to Back</button>
            </div>
          </div>
        ) : null}

        {selectedConnector ? (
          <div className="inspector-section">
            <label className="field">
              <span>Label</span>
              <input value={selectedConnector.label} onChange={(event) => updateConnector(selectedConnector.id, { label: event.target.value })} />
            </label>
            <label className="field">
              <span>Style</span>
              <select value={selectedConnector.style} onChange={(event) => updateConnector(selectedConnector.id, { style: event.target.value as (typeof selectedConnector)['style'] })}>
                {getConnectorStyleOptions().map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Color</span>
              <div className="swatch-row">
                {colorSwatches.map((color) => (
                  <button key={color.id} className={`swatch ${color.className}${selectedConnector.color === color.value ? ' is-active' : ''}`} onClick={() => updateConnector(selectedConnector.id, { color: color.value })} />
                ))}
              </div>
            </label>
            <label className="field">
              <span>Tunnel</span>
              <input type="checkbox" checked={selectedConnector.tunnel ?? false} onChange={(event) => updateConnector(selectedConnector.id, { tunnel: event.target.checked })} />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={addConnectorWaypoint}>Add Bend</button>
              <button className="ui-button" onClick={removeLastConnectorWaypoint} disabled={selectedConnector.waypoints.length === 0}>Remove Bend</button>
            </div>
            <label className="field">
              <span>Tags</span>
              <div className="tag-pills">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedConnector.tags?.includes(tag.value) ?? false;
                  return (
                    <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => {
                      const current = selectedConnector.tags ?? [];
                      updateConnector(selectedConnector.id, { tags: active ? current.filter((t) => t !== tag.value) : [...current, tag.value] });
                    }}>{tag.label}</button>
                  );
                })}
              </div>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea rows={3} value={selectedConnector.notes ?? ''} onChange={(e) => updateConnector(selectedConnector.id, { notes: e.target.value })} placeholder="Add notes…" />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={bringToFront}>Bring to Front</button>
              <button className="ui-button" onClick={sendToBack}>Send to Back</button>
            </div>
          </div>
        ) : null}

        {selectedText ? (
          <div className="inspector-section">
            <label className="field">
              <span>Label</span>
              <textarea rows={3} value={selectedText.label} onChange={(event) => updateText(selectedText.id, { label: event.target.value })} />
            </label>
            <label className="field">
              <span>Font Size</span>
              <input type="number" min={10} max={120} value={selectedText.fontSize} onChange={(event) => updateText(selectedText.id, { fontSize: Number(event.target.value) })} />
            </label>
            <label className="field">
              <span>Rotate</span>
              <input type="checkbox" checked={!!selectedText.rotated} onChange={(event) => updateText(selectedText.id, { rotated: event.target.checked })} />
            </label>
            <label className="field">
              <span>Color</span>
              <div className="swatch-row">
                {textColorSwatches.map((color) => (
                  <button key={color.id} className={`swatch ${color.className}${selectedText.color === color.value ? ' is-active' : ''}`} onClick={() => updateText(selectedText.id, { color: color.value })} />
                ))}
              </div>
            </label>
            <label className="field">
              <span>Tags</span>
              <div className="tag-pills">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedText.tags?.includes(tag.value) ?? false;
                  return (
                    <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => {
                      const current = selectedText.tags ?? [];
                      updateText(selectedText.id, { tags: active ? current.filter((t) => t !== tag.value) : [...current, tag.value] });
                    }}>{tag.label}</button>
                  );
                })}
              </div>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea rows={3} value={selectedText.notes ?? ''} onChange={(e) => updateText(selectedText.id, { notes: e.target.value })} placeholder="Add notes…" />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={bringToFront}>Bring to Front</button>
              <button className="ui-button" onClick={sendToBack}>Send to Back</button>
            </div>
          </div>
        ) : null}

        {selectedPipe ? (
          <div className="inspector-section">
            <div className="field-row">
              <label className="field">
                <span>X</span>
                <input type="number" value={Math.round(selectedPipe.x)} onChange={(e) => updatePipe(selectedPipe.id, { x: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Y</span>
                <input type="number" value={Math.round(selectedPipe.y)} onChange={(e) => updatePipe(selectedPipe.id, { y: Number(e.target.value) })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Width</span>
                <input type="number" min={40} value={Math.round(selectedPipe.width)} onChange={(e) => updatePipe(selectedPipe.id, { width: Math.max(40, Number(e.target.value)) })} />
              </label>
              <label className="field">
                <span>Height</span>
                <input type="number" min={20} value={Math.round(selectedPipe.height)} onChange={(e) => updatePipe(selectedPipe.id, { height: Math.max(20, Number(e.target.value)) })} />
              </label>
            </div>
            <label className="field">
              <span>Color</span>
              <div className="swatch-row">
                {colorSwatches.map((color) => (
                  <button key={color.id} className={`swatch ${color.className}${selectedPipe.color === color.value ? ' is-active' : ''}`} onClick={() => updatePipe(selectedPipe.id, { color: color.value })} />
                ))}
              </div>
            </label>
            <label className="field">
              <span>Tags</span>
              <div className="tag-pills">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedPipe.tags?.includes(tag.value) ?? false;
                  return (
                    <button key={tag.value} className={`tag-pill${active ? ' is-active' : ''}`} onClick={() => {
                      const current = selectedPipe.tags ?? [];
                      updatePipe(selectedPipe.id, { tags: active ? current.filter((t) => t !== tag.value) : [...current, tag.value] });
                    }}>{tag.label}</button>
                  );
                })}
              </div>
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea rows={3} value={selectedPipe.notes ?? ''} onChange={(e) => updatePipe(selectedPipe.id, { notes: e.target.value })} placeholder="Add notes…" />
            </label>
            <div className="toolbar-group toolbar-group--inspector">
              <button className="ui-button" onClick={bringToFront}>Bring to Front</button>
              <button className="ui-button" onClick={sendToBack}>Send to Back</button>
            </div>
          </div>
        ) : null}
      </GlassPanel>
    </div>
  );
}