import GlassPanel from '@/components/ui/GlassPanel';
import { colorSwatches, paletteShapes } from '@/features/palette/paletteData';
import PredefinedScenariosPicker from '@/features/scenarios/PredefinedScenariosPicker';
import { useEditorStore } from '@/state/useEditorStore';

export default function ShapePalette() {
  const preferredColor = useEditorStore((state) => state.preferredColor);
  const setPreferredColor = useEditorStore((state) => state.setPreferredColor);

  return (
    <div className="sidebar-stack">
      <PredefinedScenariosPicker />
      <GlassPanel title="Shapes">
        <div className="component-grid">
          {paletteShapes.map((shape) => (
            <button
              key={shape.id}
              className="component-tile"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-isoflow-shape', shape.nodeShape ? 'node' : shape.id);
                if (shape.nodeShape) {
                  event.dataTransfer.setData('application/x-isoflow-template', JSON.stringify({ shape: shape.nodeShape }));
                }
              }}
            >
              <div className="component-tile__icon" dangerouslySetInnerHTML={{ __html: shape.icon }} />
              <span className="component-tile__label">{shape.title}</span>
            </button>
          ))}
        </div>
      </GlassPanel>
      <GlassPanel title="Palette">
        <div className="swatch-row">
          {colorSwatches.map((color) => (
            <button
              key={color.id}
              className={`swatch ${color.className}${preferredColor === color.value ? ' is-active' : ''}`}
              onClick={() => setPreferredColor(color.value)}
              aria-label={`Select color ${color.value}`}
            />
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}