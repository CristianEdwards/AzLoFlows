import { useEffect, useRef } from 'react';
import { colorSwatches } from '@/features/palette/paletteData';
import { nodeIconList } from '@/lib/icons/nodeIcons';
import { getConnectorStyleOptions, getSelectedEntity, useEditorStore } from '@/state/useEditorStore';
import type { ConnectorStyle } from '@/types/document';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

const FONT_SIZE_PRESETS = [12, 16, 20, 24, 32, 48, 64];

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

  const currentFontSize =
    selectedArea ? (selectedArea.fontSize ?? 24) :
    selectedNode ? (selectedNode.fontSize ?? 16) :
    selectedText ? selectedText.fontSize :
    null;

  const setFontSize = (size: number) => {
    if (selectedArea) updateArea(selectedArea.id, { fontSize: size });
    else if (selectedNode) updateNode(selectedNode.id, { fontSize: size });
    else if (selectedText) updateText(selectedText.id, { fontSize: size });
  };

  const currentColor =
    selectedArea ? selectedArea.glowColor :
    selectedNode ? selectedNode.glowColor :
    selectedConnector ? selectedConnector.color :
    selectedPipe ? selectedPipe.color :
    null;

  const setColor = (color: string) => {
    if (selectedArea) updateArea(selectedArea.id, { glowColor: color, borderColor: color });
    else if (selectedNode) updateNode(selectedNode.id, { glowColor: color });
    else if (selectedConnector) updateConnector(selectedConnector.id, { color });
    else if (selectedPipe) updatePipe(selectedPipe.id, { color });
  };

  return (
    <div ref={menuRef} className="context-menu" style={{ left: x, top: y }} role="menu" aria-label="Entity context menu">
      <div className="context-menu__header">
        {selection.type.charAt(0).toUpperCase() + selection.type.slice(1)}
      </div>

      {/* ── Font Size (areas, nodes, text) ── */}
      {currentFontSize !== null && (
        <div className="context-menu__section">
          <span className="context-menu__section-label">Font Size</span>
          <div className="context-menu__font-sizes">
            {FONT_SIZE_PRESETS.map((size) => (
              <button
                key={size}
                className={`context-menu__font-btn${currentFontSize === size ? ' is-active' : ''}`}
                onClick={action(() => setFontSize(size))}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Color swatches (all except text) ── */}
      {currentColor !== null && (
        <div className="context-menu__section">
          <span className="context-menu__section-label">Color</span>
          <div className="context-menu__swatches">
            {colorSwatches.map((c) => (
              <button
                key={c.id}
                title={c.id}
                className={`swatch ${c.className}${currentColor === c.value ? ' is-active' : ''}`}
                onClick={action(() => setColor(c.value))}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Connector Style ── */}
      {selectedConnector && (
        <div className="context-menu__section">
          <span className="context-menu__section-label">Style</span>
          <div className="context-menu__row">
            {getConnectorStyleOptions().map((style) => (
              <button
                key={style}
                className={`context-menu__item${selectedConnector.style === style ? ' is-active' : ''}`}
                onClick={action(() => updateConnector(selectedConnector.id, { style: style as ConnectorStyle }))}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Connector Tunnel ── */}
      {selectedConnector && (
        <button
          className={`context-menu__item${selectedConnector.tunnel ? ' is-active' : ''}`}
          onClick={action(() => updateConnector(selectedConnector.id, { tunnel: !selectedConnector.tunnel }))}
        >
          {selectedConnector.tunnel ? '✓ ' : ''}Tunnel
        </button>
      )}

      {/* ── Node Icon ── */}
      {selectedNode && (
        <div className="context-menu__section">
          <span className="context-menu__section-label">Icon</span>
          <div className="context-menu__icon-grid">
            <button
              className={`context-menu__icon-btn${!selectedNode.icon ? ' is-active' : ''}`}
              onClick={action(() => updateNode(selectedNode.id, { icon: undefined }))}
            >
              None
            </button>
            {nodeIconList.map((ic) => (
              <button
                key={ic.id}
                className={`context-menu__icon-btn${selectedNode.icon === ic.id ? ' is-active' : ''}`}
                onClick={action(() => updateNode(selectedNode.id, { icon: ic.id }))}
              >
                {ic.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Node Rotate Text ── */}
      {selectedNode && (
        <button
          className={`context-menu__item${selectedNode.textRotated ? ' is-active' : ''}`}
          onClick={action(() => updateNode(selectedNode.id, { textRotated: !selectedNode.textRotated }))}
        >
          {selectedNode.textRotated ? '✓ ' : ''}Rotate Text
        </button>
      )}

      {/* ── Area Locked ── */}
      {selectedArea && (
        <button
          className={`context-menu__item${selectedArea.locked ? ' is-active' : ''}`}
          onClick={action(() => updateArea(selectedArea.id, { locked: !selectedArea.locked }))}
        >
          {selectedArea.locked ? '✓ ' : ''}Locked
        </button>
      )}

      {/* ── Text Rotate ── */}
      {selectedText && (
        <button
          className={`context-menu__item${selectedText.rotated ? ' is-active' : ''}`}
          onClick={action(() => updateText(selectedText.id, { rotated: !selectedText.rotated }))}
        >
          {selectedText.rotated ? '✓ ' : ''}Rotated
        </button>
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
