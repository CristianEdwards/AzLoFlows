import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/* ── tiny inline SVG icons (16×16) ─────────────────────── */
const Icon = {
  undo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h6a4 4 0 1 1 0 8H8"/><path d="M6 4 3 7l3 3"/></svg>,
  redo: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7H7a4 4 0 1 0 0 8h1"/><path d="m10 4 3 3-3 3"/></svg>,
  duplicate: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M2 11V2.5A.5.5 0 0 1 2.5 2H11"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4h11M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4m1.5 0-.5 9a1.5 1.5 0 0 1-1.5 1.4H5.5A1.5 1.5 0 0 1 4 13l-.5-9"/></svg>,
  link: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1"/></svg>,
  zoomIn: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5"/><path d="m13 13-2.5-2.5M7 5v4M5 7h4"/></svg>,
  zoomOut: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5"/><path d="m13 13-2.5-2.5M5 7h4"/></svg>,
  fit: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>,
  snap: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1v3M8 12v3M5.5 5 3 3M10.5 5 13 3"/><path d="M4 8a4 4 0 0 0 8 0"/><rect x="6" y="6" width="4" height="4" rx="1"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="5"/><path d="m13 13-2.5-2.5"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 8.5a5.5 5.5 0 0 1-8.2 4A5.5 5.5 0 0 1 8 2a4.4 4.4 0 0 0 0 3.5A4.5 4.5 0 0 0 13.5 8.5Z"/></svg>,
  present: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="3" width="13" height="9" rx="1.5"/><path d="M4 14h8"/></svg>,
  keyboard: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M4 6h1M7.5 6h1M11 6h1M4 9h8"/></svg>,
  chevron: <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 3.5 5 6l2.5-2.5"/></svg>,
  file: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 1.5H4A1.5 1.5 0 0 0 2.5 3v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5Z"/><path d="M9 1.5V6h4.5"/></svg>,
  exportIcon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10v3a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13v-3"/><path d="M11 5 8 2 5 5"/><path d="M8 2v9"/></svg>,
};

/* ── dropdown menu component ────────────────────────────── */
function ToolbarMenu({ label, icon, items }: {
  label: string;
  icon: React.ReactNode;
  items: { label: string; shortcut?: string; onClick: () => void; disabled?: boolean; separator?: never } | { separator: true; label?: never; shortcut?: never; onClick?: never; disabled?: never }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    globalThis.addEventListener('mousedown', onClickOutside);
    globalThis.addEventListener('keydown', onEsc);
    return () => {
      globalThis.removeEventListener('mousedown', onClickOutside);
      globalThis.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div className="tb-menu" ref={ref}>
      <button
        className={`tb-menu__trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="true"
        title={label}
      >
        {icon}
        <span className="tb-menu__label">{label}</span>
        {Icon.chevron}
      </button>
      {open && (
        <div className="tb-menu__dropdown" role="menu">
          {(items as any[]).map((item, i) =>
            item.separator
              ? <div key={i} className="tb-menu__sep" role="separator" />
              : <button
                  key={i}
                  className="tb-menu__item"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => { item.onClick(); setOpen(false); }}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <kbd className="tb-menu__kbd">{item.shortcut}</kbd>}
                </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const activeScenario = useEditorStore((state) => state.activeScenario);
  const activeFlowSources = useEditorStore((state) => state.activeFlowSources);
  const activeFlowTypes = useEditorStore((state) => state.activeFlowTypes);
  const [pngPreview, setPngPreview] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
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

  const onImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importDocumentFromFile(file);
      importDocument(imported);
    } catch {
      pushToast('Could not import JSON file', 'error');
    }
    event.target.value = '';
  }, [importDocument, pushToast]);

  const hasSelection = selection.ids.length > 0;
  const canConnect = selection.type === 'node' && selection.ids.length === 2;
  const zoomPct = `${Math.round(camera.zoom * 100)}%`;

  const fileItems = [
    { label: 'New diagram', shortcut: '', onClick: () => { if (window.confirm('Create a new diagram? Unsaved changes will be lost.')) newDocument(); } },
    { label: 'Templates…', onClick: () => setShowTemplates(true) },
    { separator: true as const },
    { label: 'Save JSON', shortcut: 'Ctrl+S', onClick: () => exportDocumentAsJson(document) },
    { label: 'Save JSON As…', shortcut: 'Ctrl+Shift+S', onClick: () => exportDocumentAsJsonSaveAs(document) },
    { label: 'Open JSON…', onClick: () => inputRef.current?.click() },
  ];

  const exportItems = [
    { label: 'PNG image…', onClick: () => { if (canvasRef.current) { setCanvasEl(canvasRef.current); setPngPreview(true); } } },
    { label: 'SVG vector', onClick: () => exportDocumentAsSvg(document, camera, viewport, tagFilter, theme) },
    { label: 'SVG vector As…', onClick: () => exportDocumentAsSvgSaveAs(document, camera, viewport, tagFilter, theme) },
    { separator: true as const },
    { label: 'PDF document', onClick: () => exportDocumentAsPdf(canvasRef.current, `${document.name.toLowerCase().replace(/\s+/g, '-')}.pdf`) },
    { label: 'Interactive HTML', onClick: () => exportDocumentAsHtml(document, camera, viewport, tagFilter, theme) },
  ];

  return (
    <GlassPanel className="toolbar-panel">
      {/* ── Brand ────────────────── */}
      <div className="brand-block">
        <img className="brand-block__icon" src={`${import.meta.env.BASE_URL}favicon.svg`} alt="AzLoFlows" />
        <div>
          <div className="brand-block__kicker">AzLoFlows <span className="brand-block__version">v{__APP_VERSION__}</span></div>
          <div className="brand-block__title">Isometric Diagram Builder</div>
        </div>
      </div>

      <div className="tb-divider" />

      {/* ── File & Export menus ──── */}
      <div className="toolbar-group">
        <ToolbarMenu label="File" icon={Icon.file} items={fileItems as any} />
        <ToolbarMenu label="Export" icon={Icon.exportIcon} items={exportItems as any} />
      </div>

      <div className="tb-divider" />

      {/* ── Edit actions ─────────── */}
      <div className="toolbar-group">
        <Button variant="ghost" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={undo}>{Icon.undo}</Button>
        <Button variant="ghost" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" onClick={redo}>{Icon.redo}</Button>
        <div className="tb-divider--subtle" />
        <Button variant="ghost" title="Duplicate (Ctrl+D)" aria-label="Duplicate" onClick={duplicateSelection} disabled={!hasSelection}>{Icon.duplicate}</Button>
        <Button variant="ghost" title="Delete (Del)" aria-label="Delete" onClick={deleteSelection} disabled={!hasSelection}>{Icon.trash}</Button>
        <Button variant="ghost" title="Connect selected nodes" aria-label="Connect" onClick={connectSelectedNodes} disabled={!canConnect}>{Icon.link}</Button>
      </div>

      {/* ── Spacer ───────────────── */}
      <div className="tb-spacer" />

      {/* ── Zoom controls ────────── */}
      <div className="toolbar-group tb-zoom">
        <Button variant="ghost" title="Zoom out" aria-label="Zoom out" onClick={() => setCamera({ zoom: Math.max(MIN_ZOOM, camera.zoom - 0.1) })}>{Icon.zoomOut}</Button>
        <button className="tb-zoom__pct" title="Reset to 100%" onClick={() => setCamera({ zoom: 1 })}>{zoomPct}</button>
        <Button variant="ghost" title="Zoom in" aria-label="Zoom in" onClick={() => setCamera({ zoom: Math.min(MAX_ZOOM, camera.zoom + 0.1) })}>{Icon.zoomIn}</Button>
        <Button variant="ghost" title="Fit to screen (Ctrl+0)" aria-label="Fit to screen" onClick={() => fitToScreen(viewport.width, viewport.height)}>{Icon.fit}</Button>
      </div>

      <div className="tb-divider" />

      {/* ── Toggles & utilities ──── */}
      <div className="toolbar-group">
        <Button variant="ghost" title="Toggle snap to grid" aria-label="Snap" active={snapEnabled} onClick={toggleSnap}>{Icon.snap}</Button>
        <Button variant="ghost" title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} aria-label="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? Icon.sun : Icon.moon}</Button>
        <Button variant="ghost" title="Presentation mode" aria-label="Present" active={presentMode} onClick={togglePresentMode}>{Icon.present}</Button>
      </div>

      <div className="tb-divider" />

      <div className="toolbar-group">
        <Button variant="ghost" title="Search (Ctrl+F)" aria-label="Search" onClick={() => setShowSearch(true)}>{Icon.search}</Button>
        <Button variant="ghost" title="Keyboard shortcuts (?)" aria-label="Shortcuts" onClick={() => setShowShortcuts(true)}>{Icon.keyboard}</Button>
      </div>

      <input ref={inputRef} hidden type="file" accept="application/json" onChange={onImportFile} />
      {pngPreview && canvasEl && (
        <ExportPreviewDialog canvas={canvasEl} fileName="azloflows-diagram.png" onClose={() => setPngPreview(false)} />
      )}
      {showShortcuts && <KeyboardShortcutsDialog onClose={() => setShowShortcuts(false)} />}
      {showSearch && <SearchDialog onClose={() => setShowSearch(false)} />}
      {showTemplates && <TemplateGalleryDialog onClose={() => setShowTemplates(false)} />}
    </GlassPanel>
  );
}