import { useEffect, useMemo, useRef, useState } from 'react';
import { MIN_ZOOM, MAX_ZOOM } from '@/lib/config';
import Button from '@/components/ui/Button';
import GlassPanel from '@/components/ui/GlassPanel';
import ExportPreviewDialog from '@/features/export/ExportPreviewDialog';
import { exportDocumentAsJson, exportDocumentAsJsonSaveAs, exportDocumentAsSvg, exportDocumentAsSvgSaveAs, exportDocumentAsPdf, exportDocumentAsHtml, importDocumentFromFile } from '@/features/export/fileActions';
import KeyboardShortcutsDialog from '@/features/canvas/KeyboardShortcutsDialog';
import SearchDialog from '@/features/canvas/SearchDialog';
import TemplateGalleryDialog from '@/features/templates/TemplateGalleryDialog';
import type { ViewportSize } from '@/lib/geometry/iso';
import { useEditorStore } from '@/state/useEditorStore';

interface TopToolbarProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewport: ViewportSize;
}

export default function TopToolbar({ canvasRef, viewport }: TopToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const document = useEditorStore((state) => state.document);
  const camera = useEditorStore((state) => state.camera);
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const presentMode = useEditorStore((state) => state.presentMode);
  const selection = useEditorStore((state) => state.selection);
  const newDocument = useEditorStore((state) => state.newDocument);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const toggleSnap = useEditorStore((state) => state.toggleSnap);
  const togglePresentMode = useEditorStore((state) => state.togglePresentMode);
  const theme = useEditorStore((state) => state.theme);
  const toggleTheme = useEditorStore((state) => state.toggleTheme);
  const setCamera = useEditorStore((state) => state.setCamera);
  const connectSelectedNodes = useEditorStore((state) => state.connectSelectedNodes);
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection);
  const deleteSelection = useEditorStore((state) => state.deleteSelection);
  const importDocument = useEditorStore((state) => state.importDocument);
  const pushToast = useEditorStore((state) => state.pushToast);
  const fitToScreen = useEditorStore((state) => state.fitToScreen);
  const zoomToSelection = useEditorStore((state) => state.zoomToSelection);
  const activeScenario = useEditorStore((state) => state.activeScenario);
  const activeFlowSources = useEditorStore((state) => state.activeFlowSources);
  const activeFlowTypes = useEditorStore((state) => state.activeFlowTypes);
  const [pngPreview, setPngPreview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const openSearch = () => setShowSearch(true);
    const openShortcuts = () => setShowShortcuts(true);
    window.addEventListener('azlo:open-search', openSearch);
    window.addEventListener('azlo:open-shortcuts', openShortcuts);
    return () => {
      window.removeEventListener('azlo:open-search', openSearch);
      window.removeEventListener('azlo:open-shortcuts', openShortcuts);
    };
  }, []);

  const tagFilter = useMemo(() => ({
    scenario: activeScenario,
    sources: activeFlowSources,
    types: activeFlowTypes,
  }), [activeScenario, activeFlowSources, activeFlowTypes]);

  async function onImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const imported = await importDocumentFromFile(file);
      importDocument(imported);
    } catch {
      pushToast('Could not import JSON file', 'error');
    }
    event.target.value = '';
  }

  return (
    <GlassPanel className="toolbar-panel">
      <div className="brand-block">
        <div className="brand-block__dot" />
        <div>
          <div className="brand-block__kicker">AzLoFlows</div>
          <div className="brand-block__title">Isometric Diagram Builder</div>
        </div>
      </div>
      <div className="toolbar-group">
        <Button title="Create a new blank diagram" onClick={() => { if (window.confirm('Create a new diagram? Unsaved changes will be lost.')) newDocument(); }}>New</Button>
        <Button title="Open template gallery" onClick={() => setShowTemplates(true)}>Templates</Button>
        <Button title="Download diagram as JSON" onClick={() => exportDocumentAsJson(document)}>Save JSON</Button>
        <Button title="Save diagram as JSON (choose location)" onClick={() => exportDocumentAsJsonSaveAs(document)}>Save JSON As…</Button>
        <Button title="Import a diagram JSON file" onClick={() => inputRef.current?.click()}>Load JSON</Button>
        <Button title="Export diagram as PNG image" onClick={() => { if (canvasRef.current) setPngPreview(true); }}>Export PNG</Button>
        <Button title="Export diagram as SVG vector" onClick={() => exportDocumentAsSvg(document, camera, viewport, tagFilter, theme)}>Export SVG</Button>
        <Button title="Export SVG (choose location)" onClick={() => exportDocumentAsSvgSaveAs(document, camera, viewport, tagFilter, theme)}>Export SVG As…</Button>
        <Button title="Export diagram as PDF" onClick={() => exportDocumentAsPdf(canvasRef.current, `${document.name.toLowerCase().replace(/\s+/g, '-')}.pdf`)}>PDF</Button>
        <Button title="Export interactive HTML file" onClick={() => exportDocumentAsHtml(document, camera, viewport, tagFilter, theme)}>HTML</Button>
      </div>
      <div className="toolbar-group">
        <Button title="Undo last action (Ctrl+Z)" onClick={undo}>Undo</Button>
        <Button title="Redo last action (Ctrl+Shift+Z)" onClick={redo}>Redo</Button>
        <Button title="Duplicate selection (Ctrl+D)" onClick={duplicateSelection} disabled={selection.ids.length === 0}>Duplicate</Button>
        <Button title="Delete selection (Del)" onClick={deleteSelection} disabled={selection.ids.length === 0}>Delete</Button>
        <Button title="Connect two selected nodes" onClick={connectSelectedNodes} disabled={selection.type !== 'node' || selection.ids.length !== 2}>Connect</Button>
      </div>
      <div className="toolbar-group">
        <Button title="Zoom out" aria-label="Zoom out" onClick={() => setCamera({ zoom: Math.max(MIN_ZOOM, camera.zoom - 0.1) })}>-</Button>
        <Button title="Zoom in" aria-label="Zoom in" onClick={() => setCamera({ zoom: Math.min(MAX_ZOOM, camera.zoom + 0.1) })}>+</Button>
        <Button title="Fit all entities to screen (Ctrl+0)" aria-label="Fit to screen" onClick={() => fitToScreen(viewport.width, viewport.height)}>⊞</Button>
        <Button title="Zoom to 100% (Ctrl+1)" aria-label="Reset zoom" onClick={() => setCamera({ zoom: 1 })}>1:1</Button>
        <Button title="Search entities (Ctrl+F)" aria-label="Search" onClick={() => setShowSearch(true)}>🔍</Button>
        <Button title="Toggle grid snapping" active={snapEnabled} onClick={toggleSnap}>Snap</Button>
        <Button title="Toggle presentation mode" active={presentMode} onClick={togglePresentMode}>Present</Button>
        <Button title="Toggle light/dark theme" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>{theme === 'dark' ? '☀️' : '🌙'}</Button>
        <Button title="Keyboard shortcuts (?)" aria-label="Show keyboard shortcuts" onClick={() => setShowShortcuts(true)}>?</Button>
      </div>
      <input ref={inputRef} hidden type="file" accept="application/json" onChange={onImportFile} />
      {pngPreview && canvasRef.current && (
        <ExportPreviewDialog canvas={canvasRef.current} fileName="azloflows-diagram.png" onClose={() => setPngPreview(false)} />
      )}
      {showShortcuts && <KeyboardShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      {showSearch && <SearchDialog onClose={() => setShowSearch(false)} />}
      {showTemplates && <TemplateGalleryDialog onClose={() => setShowTemplates(false)} />}
    </GlassPanel>
  );
}