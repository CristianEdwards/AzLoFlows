import { useEffect, useMemo, useRef, useState } from 'react';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_SENSITIVITY, MAX_DPR, ARROW_NUDGE_FINE, ARROW_NUDGE_COARSE, SNAP_THRESHOLD } from '@/lib/config';
import CanvasOverlay from '@/features/canvas/CanvasOverlay';
import ContextMenu from '@/features/canvas/ContextMenu';
import { getClosestAnchor } from '@/lib/geometry/anchors';
import { hitTestNode, hitTestNodeScreen, hitTestConnectorScreen } from '@/lib/geometry/bounds';
import { screenToWorld, type ViewportSize } from '@/lib/geometry/iso';
import type { ResizeHandle } from '@/lib/geometry/resize';
import { normalizeBounds } from '@/lib/geometry/selection';
import { renderScene } from '@/features/canvas/renderers/renderScene';
import { useEditorStore } from '@/state/useEditorStore';
import type { AnchorId } from '@/types/document';

interface CanvasViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onCursorWorldChange: (point: { x: number; y: number } | null) => void;
  onViewportChange: (viewport: ViewportSize) => void;
}

type ReconnectDraft = {
  connectorId: string;
  end: 'source' | 'target';
  fixedNodeId: string;
  fixedAnchor: AnchorId;
  currentWorld: { x: number; y: number };
};

type InteractionState =
  | { mode: 'idle' }
  | { mode: 'pan'; startX: number; startY: number; cameraX: number; cameraY: number }
  | { mode: 'drag'; lastWorld: { x: number; y: number }; snapOffset: { x: number; y: number } }
  | { mode: 'resize'; handle: ResizeHandle }
  | { mode: 'waypoint'; index: number }
  | { mode: 'connector'; sourceId: string; sourceAnchor: AnchorId; currentWorld: { x: number; y: number } }
  | { mode: 'reconnect'; draft: ReconnectDraft }
  | { mode: 'marquee'; startScreen: { x: number; y: number }; startWorld: { x: number; y: number }; currentScreen: { x: number; y: number }; currentWorld: { x: number; y: number } };

export default function CanvasViewport({ canvasRef, onCursorWorldChange, onViewportChange }: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<InteractionState>({ mode: 'idle' });
  const spacePressedRef = useRef(false);
  const [viewport, setViewport] = useState<ViewportSize>({ width: 1000, height: 700 });
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectorDraft, setConnectorDraft] = useState<{ sourceId: string; sourceAnchor: AnchorId; currentWorld: { x: number; y: number } } | null>(null);
  const [reconnectDraft, setReconnectDraft] = useState<ReconnectDraft | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [alignGuides, setAlignGuides] = useState<{ axis: 'x' | 'y'; value: number }[]>([]);

  const document = useEditorStore((state) => state.document);
  const selection = useEditorStore((state) => state.selection);
  const camera = useEditorStore((state) => state.camera);
  const presentMode = useEditorStore((state) => state.presentMode);
  const setCamera = useEditorStore((state) => state.setCamera);
  const addShape = useEditorStore((state) => state.addShape);
  const moveSelection = useEditorStore((state) => state.moveSelection);
  const selectAtPoint = useEditorStore((state) => state.selectAtPoint);
  const selectEntities = useEditorStore((state) => state.selectEntities);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const resizeSelection = useEditorStore((state) => state.resizeSelection);
  const moveConnectorWaypoint = useEditorStore((state) => state.moveConnectorWaypoint);
  const selectWithinRect = useEditorStore((state) => state.selectWithinRect);
  const commitHistorySnapshot = useEditorStore((state) => state.commitHistorySnapshot);
  const createConnectorBetween = useEditorStore((state) => state.createConnectorBetween);
  const updateConnector = useEditorStore((state) => state.updateConnector);
  const activeScenario = useEditorStore((state) => state.activeScenario);
  const activeFlowSources = useEditorStore((state) => state.activeFlowSources);
  const activeFlowTypes = useEditorStore((state) => state.activeFlowTypes);
  const theme = useEditorStore((state) => state.theme);

  const tagFilter = useMemo(() => ({
    scenario: activeScenario,
    sources: activeFlowSources,
    types: activeFlowTypes,
  }), [activeScenario, activeFlowSources, activeFlowTypes]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const nextViewport = { width: element.clientWidth, height: element.clientHeight };
      setViewport(nextViewport);
      onViewportChange(nextViewport);
    });
    observer.observe(element);
    const nextViewport = { width: element.clientWidth, height: element.clientHeight };
    setViewport(nextViewport);
    onViewportChange(nextViewport);
    return () => observer.disconnect();
  }, [onViewportChange]);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressedRef.current = true;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const tag = (event.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement)?.isContentEditable) return;
        useEditorStore.getState().deleteSelection();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        useEditorStore.getState().duplicateSelection();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        useEditorStore.getState().undo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        useEditorStore.getState().redo();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        // Trigger explicit save and toast
        const s = useEditorStore.getState();
        try {
          const { saveDocument: save } = await import('@/lib/serialization/storage');
          save(s.document);
          s.pushToast('Diagram saved', 'success');
        } catch {
          s.pushToast('Save failed', 'error');
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        const s = useEditorStore.getState();
        if (s.selection.type && s.selection.ids.length > 0) {
          event.preventDefault();
          s.copySelection();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        useEditorStore.getState().pasteClipboard();
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        const tag = (event.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement)?.isContentEditable) return;
        const store = useEditorStore.getState();
        const { selection, snapEnabled } = store;
        if (selection.type && selection.ids.length > 0) {
          event.preventDefault();
          const fine = !event.shiftKey;
          const step = fine ? ARROW_NUDGE_FINE : ARROW_NUDGE_COARSE;
          const delta = { x: 0, y: 0 };
          if (event.key === 'ArrowUp') delta.y = -step;
          if (event.key === 'ArrowDown') delta.y = step;
          if (event.key === 'ArrowLeft') delta.x = -step;
          if (event.key === 'ArrowRight') delta.x = step;
          store.moveSelection(delta, fine);
        }
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let frame = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    const render = (time: number) => {
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderScene({ ctx: context, viewport, document, selection, camera, time, tagFilter, theme });
      frame = window.requestAnimationFrame(render);
    };

    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [tagFilter, camera, canvasRef, document, selection, viewport, theme]);

  function pointerToWorld(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, camera, viewport);
  }

  function pointerToScreen(event: React.PointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    setContextMenuPos(null);
    // Blur any focused input so keyboard shortcuts (arrow keys, delete, etc.) work on the canvas
    if (window.document.activeElement instanceof HTMLElement && window.document.activeElement !== event.currentTarget) {
      window.document.activeElement.blur();
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    // Remove focus from inspector inputs so arrow-key movement works
    if (globalThis.document.activeElement instanceof HTMLElement && globalThis.document.activeElement !== event.currentTarget) {
      globalThis.document.activeElement.blur();
    }
    if (event.button === 1 || spacePressedRef.current) {
      interactionRef.current = { mode: 'pan', startX: event.clientX, startY: event.clientY, cameraX: camera.x, cameraY: camera.y };
      return;
    }

    const world = pointerToWorld(event);
    const screen = pointerToScreen(event);
    onCursorWorldChange(world);
    // Use isometric screen-space hit test for accurate node selection
    const isoNode = hitTestNodeScreen(document.nodes, screen, camera, viewport);
    if (isoNode) {
      selectEntities('node', [isoNode.id], event.shiftKey || event.ctrlKey || event.metaKey);
    } else {
      // Try screen-space connector hit test before falling back to world-space
      const isoConnector = hitTestConnectorScreen(document.connectors, document.nodes, screen, camera, viewport);
      if (isoConnector) {
        selectEntities('connector', [isoConnector.id], event.shiftKey || event.ctrlKey || event.metaKey);
      } else {
        selectAtPoint(world, event.shiftKey || event.ctrlKey || event.metaKey);
      }
    }
    const currentSelection = useEditorStore.getState().selection;
    if (currentSelection.ids.length > 0 && (currentSelection.type === 'node' || currentSelection.type === 'area' || currentSelection.type === 'text' || currentSelection.type === 'pipe')) {
      commitHistorySnapshot();
      interactionRef.current = { mode: 'drag', lastWorld: world, snapOffset: { x: 0, y: 0 } };
      return;
    }
    if (currentSelection.ids.length > 0 && currentSelection.type === 'connector') {
      interactionRef.current = { mode: 'idle' };
      return;
    }
    clearSelection();
    interactionRef.current = { mode: 'pan', startX: event.clientX, startY: event.clientY, cameraX: camera.x, cameraY: camera.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const world = pointerToWorld(event);
    const screen = pointerToScreen(event);
    onCursorWorldChange(world);
    const hoveredNode = hitTestNodeScreen(document.nodes, screen, camera, viewport) ?? hitTestNode(document.nodes, world);
    setHoveredNodeId(hoveredNode?.id ?? null);
    const interaction = interactionRef.current;
    if (interaction.mode === 'pan') {
      setCamera({ x: interaction.cameraX + (event.clientX - interaction.startX), y: interaction.cameraY + (event.clientY - interaction.startY) });
      return;
    }
    if (interaction.mode === 'drag') {
      const delta = { x: world.x - interaction.lastWorld.x, y: world.y - interaction.lastWorld.y };
      const prevSnap = interaction.snapOffset;

      // Read entity positions (still include previous snap offset)
      const state = useEditorStore.getState();
      const selIds = new Set(state.selection.ids);
      const selType = state.selection.type;
      const guides: { axis: 'x' | 'y'; value: number }[] = [];
      const newSnap = { x: 0, y: 0 };

      // Gather selected entity bounds (current store position includes prevSnap)
      const selEntities: { x: number; y: number; w: number; h: number }[] = [];
      if (selType === 'area') state.document.areas.filter((e) => selIds.has(e.id)).forEach((e) => selEntities.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
      else if (selType === 'node') state.document.nodes.filter((e) => selIds.has(e.id)).forEach((e) => selEntities.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
      else if (selType === 'text') (state.document.texts ?? []).filter((e) => selIds.has(e.id)).forEach((e) => selEntities.push({ x: e.x, y: e.y, w: 0, h: 0 }));
      else if (selType === 'pipe') (state.document.pipes ?? []).filter((e) => selIds.has(e.id)).forEach((e) => selEntities.push({ x: e.x, y: e.y, w: e.width, h: e.height }));

      if (selEntities.length > 0) {
        const se = selEntities[0];
        // Compute the "free" (unsnapped) position: current pos - prevSnap + delta
        const freeX = se.x - prevSnap.x + delta.x;
        const freeY = se.y - prevSnap.y + delta.y;
        const freeCenterX = freeX + se.w / 2;
        const freeCenterY = freeY + se.h / 2;
        const freeEdges = { left: freeX, right: freeX + se.w, top: freeY, bottom: freeY + se.h };

        // Gather other entities to align against
        const others: { x: number; y: number; w: number; h: number }[] = [];
        state.document.areas.filter((e) => !selIds.has(e.id)).forEach((e) => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
        state.document.nodes.filter((e) => !selIds.has(e.id)).forEach((e) => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
        (state.document.texts ?? []).filter((e) => !selIds.has(e.id)).forEach((e) => others.push({ x: e.x, y: e.y, w: 0, h: 0 }));
        (state.document.pipes ?? []).filter((e) => !selIds.has(e.id)).forEach((e) => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));

        // Find the closest alignment snap for each axis
        let bestX: { offset: number; guideValue: number } | null = null;
        let bestY: { offset: number; guideValue: number } | null = null;

        for (const o of others) {
          const oCenterX = o.x + o.w / 2;
          const oCenterY = o.y + o.h / 2;

          // X-axis candidates: offset = how much to shift entity to align
          const xCandidates = [
            { offset: oCenterX - freeCenterX, guideValue: oCenterX },
            { offset: o.x - freeEdges.left, guideValue: o.x },
            { offset: (o.x + o.w) - freeEdges.right, guideValue: o.x + o.w },
            { offset: o.x - freeEdges.right, guideValue: o.x },
            { offset: (o.x + o.w) - freeEdges.left, guideValue: o.x + o.w },
          ];
          for (const c of xCandidates) {
            if (Math.abs(c.offset) < SNAP_THRESHOLD && (!bestX || Math.abs(c.offset) < Math.abs(bestX.offset))) {
              bestX = c;
            }
          }

          // Y-axis candidates
          const yCandidates = [
            { offset: oCenterY - freeCenterY, guideValue: oCenterY },
            { offset: o.y - freeEdges.top, guideValue: o.y },
            { offset: (o.y + o.h) - freeEdges.bottom, guideValue: o.y + o.h },
            { offset: o.y - freeEdges.bottom, guideValue: o.y },
            { offset: (o.y + o.h) - freeEdges.top, guideValue: o.y + o.h },
          ];
          for (const c of yCandidates) {
            if (Math.abs(c.offset) < SNAP_THRESHOLD && (!bestY || Math.abs(c.offset) < Math.abs(bestY.offset))) {
              bestY = c;
            }
          }
        }

        if (bestX) { newSnap.x = bestX.offset; guides.push({ axis: 'x', value: bestX.guideValue }); }
        if (bestY) { newSnap.y = bestY.offset; guides.push({ axis: 'y', value: bestY.guideValue }); }
      }

      // Single combined move: undo prevSnap, apply raw delta, apply newSnap
      const combinedDelta = { x: delta.x - prevSnap.x + newSnap.x, y: delta.y - prevSnap.y + newSnap.y };
      if (combinedDelta.x !== 0 || combinedDelta.y !== 0) {
        moveSelection(combinedDelta, true);
      }

      interactionRef.current = { mode: 'drag', lastWorld: world, snapOffset: newSnap };
      setAlignGuides(guides);
      return;
    }
    if (interaction.mode === 'resize') {
      resizeSelection(interaction.handle, world);

      // Compute size-match and edge alignment guides during resize
      const state = useEditorStore.getState();
      const selId = state.selection.ids[0];
      const selType = state.selection.type;
      const guides: { axis: 'x' | 'y'; value: number }[] = [];

      let sel: { x: number; y: number; w: number; h: number } | null = null;
      if (selType === 'node') { const e = state.document.nodes.find(n => n.id === selId); if (e) sel = { x: e.x, y: e.y, w: e.width, h: e.height }; }
      else if (selType === 'area') { const e = state.document.areas.find(a => a.id === selId); if (e) sel = { x: e.x, y: e.y, w: e.width, h: e.height }; }
      else if (selType === 'pipe') { const e = (state.document.pipes ?? []).find(p => p.id === selId); if (e) sel = { x: e.x, y: e.y, w: e.width, h: e.height }; }

      if (sel) {
        const selEdges = { left: sel.x, right: sel.x + sel.w, top: sel.y, bottom: sel.y + sel.h };
        const selCenterX = sel.x + sel.w / 2;
        const selCenterY = sel.y + sel.h / 2;

        const others: { x: number; y: number; w: number; h: number }[] = [];
        state.document.areas.filter(e => e.id !== selId).forEach(e => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
        state.document.nodes.filter(e => e.id !== selId).forEach(e => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));
        (state.document.pipes ?? []).filter(e => e.id !== selId).forEach(e => others.push({ x: e.x, y: e.y, w: e.width, h: e.height }));

        for (const o of others) {
          const oCenterX = o.x + o.w / 2;
          const oCenterY = o.y + o.h / 2;
          // Edge alignment
          if (Math.abs(selEdges.left - o.x) < SNAP_THRESHOLD) guides.push({ axis: 'x', value: o.x });
          if (Math.abs(selEdges.right - (o.x + o.w)) < SNAP_THRESHOLD) guides.push({ axis: 'x', value: o.x + o.w });
          if (Math.abs(selEdges.top - o.y) < SNAP_THRESHOLD) guides.push({ axis: 'y', value: o.y });
          if (Math.abs(selEdges.bottom - (o.y + o.h)) < SNAP_THRESHOLD) guides.push({ axis: 'y', value: o.y + o.h });
          // Center alignment
          if (Math.abs(selCenterX - oCenterX) < SNAP_THRESHOLD) guides.push({ axis: 'x', value: oCenterX });
          if (Math.abs(selCenterY - oCenterY) < SNAP_THRESHOLD) guides.push({ axis: 'y', value: oCenterY });
          // Size-match: show guide when width or height matches another entity
          if (Math.abs(sel.w - o.w) < SNAP_THRESHOLD) {
            guides.push({ axis: 'x', value: selEdges.right });
            guides.push({ axis: 'x', value: o.x + o.w });
          }
          if (Math.abs(sel.h - o.h) < SNAP_THRESHOLD) {
            guides.push({ axis: 'y', value: selEdges.bottom });
            guides.push({ axis: 'y', value: o.y + o.h });
          }
        }
      }
      setAlignGuides(guides);
      return;
    }
    if (interaction.mode === 'waypoint') {
      moveConnectorWaypoint(interaction.index, world);
      return;
    }
    if (interaction.mode === 'connector') {
      interactionRef.current = { ...interaction, currentWorld: world };
      setConnectorDraft({ sourceId: interaction.sourceId, sourceAnchor: interaction.sourceAnchor, currentWorld: world });
      return;
    }
    if (interaction.mode === 'reconnect') {
      const updatedDraft = { ...interaction.draft, currentWorld: world };
      interactionRef.current = { mode: 'reconnect', draft: updatedDraft };
      setReconnectDraft(updatedDraft);
      return;
    }
    if (interaction.mode === 'marquee') {
      interactionRef.current = { ...interaction, currentScreen: screen, currentWorld: world };
      setMarqueeRect({
        x: Math.min(interaction.startScreen.x, screen.x),
        y: Math.min(interaction.startScreen.y, screen.y),
        width: Math.abs(screen.x - interaction.startScreen.x),
        height: Math.abs(screen.y - interaction.startScreen.y),
      });
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (interactionRef.current.mode === 'connector') {
      const draft = interactionRef.current;
      const targetNode = hoveredNodeId && hoveredNodeId !== draft.sourceId
        ? document.nodes.find((node) => node.id === hoveredNodeId)
        : document.nodes.find((node) => {
            if (node.id === draft.sourceId) return false;
            const center = { x: node.x + node.width * 0.5, y: node.y + node.height * 0.5 };
            return Math.abs(center.x - draft.currentWorld.x) <= node.width && Math.abs(center.y - draft.currentWorld.y) <= node.height;
          });
      if (targetNode && targetNode.id !== draft.sourceId) {
        const targetAnchor = getClosestAnchor(targetNode, draft.currentWorld);
        createConnectorBetween(draft.sourceId, draft.sourceAnchor, targetNode.id, targetAnchor);
      }
      setConnectorDraft(null);
    }
    if (interactionRef.current.mode === 'reconnect') {
      const { draft } = interactionRef.current;
      const dropNode = hoveredNodeId
        ? document.nodes.find((node) => node.id === hoveredNodeId)
        : document.nodes.find((node) => {
            const center = { x: node.x + node.width * 0.5, y: node.y + node.height * 0.5 };
            return Math.abs(center.x - draft.currentWorld.x) <= node.width && Math.abs(center.y - draft.currentWorld.y) <= node.height;
          });
      if (dropNode && dropNode.id !== draft.fixedNodeId) {
        const newAnchor = getClosestAnchor(dropNode, draft.currentWorld);
        if (draft.end === 'source') {
          updateConnector(draft.connectorId, { sourceId: dropNode.id, sourceAnchor: newAnchor });
        } else {
          updateConnector(draft.connectorId, { targetId: dropNode.id, targetAnchor: newAnchor });
        }
      }
      setReconnectDraft(null);
    }
    if (interactionRef.current.mode === 'marquee') {
      const bounds = normalizeBounds(interactionRef.current.startWorld, interactionRef.current.currentWorld);
      if (bounds.width > 8 || bounds.height > 8) {
        selectWithinRect(bounds, event.shiftKey || event.ctrlKey || event.metaKey);
      }
      setMarqueeRect(null);
    }
    interactionRef.current = { mode: 'idle' };
    setAlignGuides([]);
  }

  function onWheel(event: React.WheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom - event.deltaY * ZOOM_SENSITIVITY));
    setCamera({ zoom: nextZoom });
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const shape = event.dataTransfer.getData('application/x-isoflow-shape');
    if (shape !== 'area' && shape !== 'node' && shape !== 'text' && shape !== 'pipe') {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const world = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, camera, viewport);
    const templateJson = event.dataTransfer.getData('application/x-isoflow-template');
    let templateOverrides: { title?: string; subtitle?: string; fill?: string; glowColor?: string; icon?: string } | undefined;
    if (templateJson) {
      try {
        const parsed = JSON.parse(templateJson);
        if (parsed && typeof parsed === 'object') {
          templateOverrides = {
            title: typeof parsed.title === 'string' ? parsed.title : undefined,
            subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : undefined,
            fill: typeof parsed.fill === 'string' ? parsed.fill : undefined,
            glowColor: typeof parsed.glowColor === 'string' ? parsed.glowColor : undefined,
            icon: typeof parsed.icon === 'string' ? parsed.icon : undefined,
          };
        }
      } catch { /* ignore malformed JSON */ }
    }
    addShape(shape, world, templateOverrides);
  }

  return (
    <div className={`canvas-stage${presentMode ? ' is-present' : ''}`} ref={containerRef} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
      <canvas
        ref={canvasRef}
        className="diagram-canvas"
        role="img"
        aria-label="Isometric diagram canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={(event) => {
          const related = event.relatedTarget as Element | null;
          if (related?.closest?.('.canvas-overlay')) return;
          onCursorWorldChange(null);
          setHoveredNodeId(null);
        }}
        onWheel={onWheel}
        onContextMenu={(event) => {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
          const world = screenToWorld(screen, camera, viewport);
          // Screen-space hits for isometric accuracy
          const isoNode = hitTestNodeScreen(document.nodes, screen, camera, viewport);
          if (isoNode) {
            selectEntities('node', [isoNode.id]);
          } else {
            const isoConnector = hitTestConnectorScreen(document.connectors, document.nodes, screen, camera, viewport);
            if (isoConnector) {
              selectEntities('connector', [isoConnector.id]);
            } else {
              selectAtPoint(world);
            }
          }
          const sel = useEditorStore.getState().selection;
          if (sel.type && sel.ids.length > 0) {
            const stageRect = containerRef.current?.getBoundingClientRect();
            setContextMenuPos({
              x: event.clientX - (stageRect?.left ?? 0),
              y: event.clientY - (stageRect?.top ?? 0),
            });
          }
        }}
      />
      <CanvasOverlay
        document={document}
        selection={selection}
        camera={camera}
        viewport={viewport}
        hoveredNodeId={hoveredNodeId}
        marqueeRect={marqueeRect}
        connectorDraft={connectorDraft}
        reconnectDraft={reconnectDraft}
        alignGuides={alignGuides}
        onResizeHandlePointerDown={(handle, event) => {
          event.stopPropagation();
          commitHistorySnapshot();
          interactionRef.current = { mode: 'resize', handle };
        }}
        onWaypointPointerDown={(index, event) => {
          event.stopPropagation();
          commitHistorySnapshot();
          interactionRef.current = { mode: 'waypoint', index };
        }}
        onAnchorPointerDown={(nodeId, anchorIndex, event) => {
          event.stopPropagation();
          event.preventDefault();
          const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
          const screenPoint = rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 };
          const currentWorld = screenToWorld(screenPoint, camera, viewport);
          interactionRef.current = { mode: 'connector', sourceId: nodeId, sourceAnchor: anchorIndex, currentWorld };
          setConnectorDraft({ sourceId: nodeId, sourceAnchor: anchorIndex, currentWorld });
          if (canvasRef.current) {
            canvasRef.current.setPointerCapture(event.pointerId);
          }
        }}
        onConnectorEndpointPointerDown={(connectorId, end, event) => {
          event.stopPropagation();
          event.preventDefault();
          const connector = document.connectors.find((c) => c.id === connectorId);
          if (!connector) return;
          const fixedNodeId = end === 'source' ? connector.targetId : connector.sourceId;
          const fixedAnchor = end === 'source' ? connector.targetAnchor : connector.sourceAnchor;
          const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
          const screenPoint = rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : { x: 0, y: 0 };
          const currentWorld = screenToWorld(screenPoint, camera, viewport);
          const draft: ReconnectDraft = { connectorId, end, fixedNodeId, fixedAnchor, currentWorld };
          interactionRef.current = { mode: 'reconnect', draft };
          setReconnectDraft(draft);
          if (canvasRef.current) {
            canvasRef.current.setPointerCapture(event.pointerId);
          }
        }}
      />
      {contextMenuPos && (
        <ContextMenu x={contextMenuPos.x} y={contextMenuPos.y} onClose={() => setContextMenuPos(null)} />
      )}
    </div>
  );
}