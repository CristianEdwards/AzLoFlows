import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/state/useEditorStore';

interface SearchDialogProps {
  onClose: () => void;
}

interface SearchResult {
  id: string;
  type: 'area' | 'node' | 'connector' | 'text' | 'pipe';
  label: string;
  x?: number;
  y?: number;
}

export default function SearchDialog({ onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const document = useEditorStore((s) => s.document);
  const selectEntities = useEditorStore((s) => s.selectEntities);
  const setCamera = useEditorStore((s) => s.setCamera);
  const camera = useEditorStore((s) => s.camera);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const results: SearchResult[] = (() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];
    for (const a of document.areas) {
      if (a.label.toLowerCase().includes(q)) out.push({ id: a.id, type: 'area', label: a.label, x: a.x + a.width / 2, y: a.y + a.height / 2 });
    }
    for (const n of document.nodes) {
      if (n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q))
        out.push({ id: n.id, type: 'node', label: n.title, x: n.x + n.width / 2, y: n.y + n.height / 2 });
    }
    for (const c of document.connectors) {
      if (c.label.toLowerCase().includes(q)) out.push({ id: c.id, type: 'connector', label: c.label });
    }
    for (const t of document.texts ?? []) {
      if (t.label.toLowerCase().includes(q)) out.push({ id: t.id, type: 'text', label: t.label, x: t.x, y: t.y });
    }
    for (const p of document.pipes ?? []) {
      const pLabel = `Pipe (${Math.round(p.x)}, ${Math.round(p.y)})`;
      if (pLabel.toLowerCase().includes(q)) out.push({ id: p.id, type: 'pipe', label: pLabel, x: p.x + p.width / 2, y: p.y + p.height / 2 });
    }
    return out.slice(0, 20);
  })();

  const handleSelect = useCallback((result: SearchResult) => {
    selectEntities(result.type, [result.id]);
    if (result.x != null && result.y != null) {
      setCamera({
        x: -result.x * camera.zoom + window.innerWidth / 2,
        y: -result.y * camera.zoom + window.innerHeight / 2,
      });
    }
    onClose();
  }, [selectEntities, setCamera, camera.zoom, onClose]);

  return (
    <div className="search-dialog-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search entities">
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-dialog__input"
          type="text"
          placeholder="Search entities by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className="search-dialog__results">
            {results.map((r) => (
              <button key={r.id} className="search-dialog__result" onClick={() => handleSelect(r)}>
                <span className="search-dialog__badge">{r.type[0].toUpperCase()}</span>
                <span className="search-dialog__label">{r.label}</span>
              </button>
            ))}
          </div>
        )}
        {query.length > 0 && results.length === 0 && (
          <div className="search-dialog__empty">No matching entities found</div>
        )}
      </div>
    </div>
  );
}
