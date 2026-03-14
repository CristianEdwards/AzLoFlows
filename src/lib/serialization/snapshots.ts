import type { DiagramDocument } from '@/types/document';

const SNAPSHOTS_KEY = 'isoflows.snapshots';
const MAX_SNAPSHOTS = 30;

export interface VersionSnapshot {
  id: string;
  name: string;
  documentId: string;
  timestamp: number;
  data: DiagramDocument;
}

export function saveSnapshot(document: DiagramDocument, name?: string): VersionSnapshot {
  const snapshots = loadSnapshots();
  const snapshot: VersionSnapshot = {
    id: crypto.randomUUID(),
    name: name ?? `Snapshot ${new Date().toLocaleString()}`,
    documentId: document.id,
    timestamp: Date.now(),
    data: structuredClone(document),
  };
  const updated = [snapshot, ...snapshots].slice(0, MAX_SNAPSHOTS);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  return snapshot;
}

export function loadSnapshots(): VersionSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function loadSnapshotsForDocument(documentId: string): VersionSnapshot[] {
  return loadSnapshots().filter((s) => s.documentId === documentId);
}

export function deleteSnapshot(id: string): void {
  const snapshots = loadSnapshots().filter((s) => s.id !== id);
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots));
}
