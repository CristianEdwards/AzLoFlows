import { useEffect, useState } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { useEditorStore } from '@/state/useEditorStore';
import { normalizeDocument } from '@/lib/serialization/storage';

interface ScenarioEntry {
  file: string;
  label: string;
}

const MANIFEST_URL = `${import.meta.env.BASE_URL}PredefinedScenarios/manifest.json`;

export default function PredefinedScenariosPicker() {
  const [entries, setEntries] = useState<ScenarioEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const importDocument = useEditorStore((s) => s.importDocument);
  const fitToScreen = useEditorStore((s) => s.fitToScreen);
  const newDocument = useEditorStore((s) => s.newDocument);

  useEffect(() => {
    fetch(`${MANIFEST_URL}?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: ScenarioEntry[]) => setEntries(data))
      .catch(() => setEntries([]));
  }, []);

  async function loadScenario(entry: ScenarioEntry) {
    if (activeFile === entry.file) {
      // Deselect — go back to empty canvas
      setActiveFile(null);
      newDocument();
      return;
    }
    setLoading(true);
    try {
      const url = `${import.meta.env.BASE_URL}PredefinedScenarios/${encodeURIComponent(entry.file)}?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const doc = normalizeDocument(json);
      importDocument(doc);
      setActiveFile(entry.file);
      // Fit imported scenario to the visible canvas area
      requestAnimationFrame(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          fitToScreen(canvas.clientWidth, canvas.clientHeight);
        }
      });
    } catch {
      useEditorStore.getState().pushToast('Failed to load scenario', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (entries.length === 0) return null;

  return (
    <GlassPanel title="Predefined Scenarios">
      <div className="predefined-scenario-list">
        {entries.map((entry) => (
          <button
            key={entry.file}
            className={`predefined-scenario-btn${activeFile === entry.file ? ' is-active' : ''}`}
            onClick={() => loadScenario(entry)}
            disabled={loading}
          >
            {entry.label}
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}
