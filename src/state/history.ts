import type { DiagramDocument } from '@/types/document';

export const MAX_UNDO_STACK = 50;

export interface HistoryState {
  past: DiagramDocument[];
  future: DiagramDocument[];
}

export function cloneDocument(document: DiagramDocument): DiagramDocument {
  const clone = structuredClone(document);
  if (!clone.texts) clone.texts = [];
  if (!clone.pipes) clone.pipes = [];
  return clone;
}

export function withCommittedHistory(history: HistoryState, document: DiagramDocument): HistoryState {
  const past = [...history.past, cloneDocument(document)];
  // Cap undo stack to prevent memory bloat
  if (past.length > MAX_UNDO_STACK) past.splice(0, past.length - MAX_UNDO_STACK);
  return { past, future: [] };
}