import { selectionLabel } from '@/lib/geometry/bounds';
import { useEditorStore } from '@/state/useEditorStore';

interface StatusBarProps {
  cursorWorld: { x: number; y: number } | null;
}

export default function StatusBar({ cursorWorld }: StatusBarProps) {
  const camera = useEditorStore((state) => state.camera);
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const selection = useEditorStore((state) => state.selection);
  const document = useEditorStore((state) => state.document);

  return (
    <div className="status-bar">
      <span>{selectionLabel(selection, document)}</span>
      <span>Zoom {Math.round(camera.zoom * 100)}%</span>
      <span>{snapEnabled ? 'Snap on' : 'Snap off'}</span>
      <span>
        Cursor {cursorWorld ? `${Math.round(cursorWorld.x)}, ${Math.round(cursorWorld.y)}` : '--'}
      </span>
    </div>
  );
}