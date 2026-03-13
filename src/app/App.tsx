import { useEffect, useRef, useState } from 'react';
import AppShell from '@/app/layout/AppShell';
import StatusBar from '@/app/layout/StatusBar';
import TopToolbar from '@/app/layout/TopToolbar';
import MeshBackground from '@/components/ui/MeshBackground';
import ToastHost from '@/components/ui/ToastHost';
import CanvasViewport from '@/features/canvas/CanvasViewport';
import InspectorPanel from '@/features/inspector/InspectorPanel';
import LayersPanel from '@/features/layers/LayersPanel';
import ShapePalette from '@/features/palette/ShapePalette';
import ScenarioToolbar from '@/features/scenarios/ScenarioToolbar';
import type { ViewportSize } from '@/lib/geometry/iso';
import { saveDocument } from '@/lib/serialization/storage';
import { useEditorStore } from '@/state/useEditorStore';

const SAVE_DEBOUNCE_MS = 400;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const document = useEditorStore((state) => state.document);
  const presentMode = useEditorStore((state) => state.presentMode);
  const theme = useEditorStore((state) => state.theme);
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1280, height: 720 });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveDocument(document), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimerRef.current);
  }, [document]);

  useEffect(() => {
    window.document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <MeshBackground />
      <AppShell
        toolbar={<TopToolbar canvasRef={canvasRef} viewport={viewport} />}
        sidebar={!presentMode ? <ShapePalette /> : <div />}
        inspector={!presentMode ? <div className="sidebar-stack"><InspectorPanel /><LayersPanel /></div> : <div />}
        statusbar={!presentMode ? <StatusBar cursorWorld={cursorWorld} /> : <div className="present-pill">Presentation mode</div>}
      >
        <CanvasViewport canvasRef={canvasRef} onCursorWorldChange={setCursorWorld} onViewportChange={setViewport} />
        <ScenarioToolbar />
      </AppShell>
      <ToastHost />
    </>
  );
}