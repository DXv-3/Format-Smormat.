// ============================================================
// FORMAT-SMORMAT — ZUSTAND IR STORE
// Hot cache for the IR graph + legacy file surface.
// "We never get ready; we are always already ready."
// ============================================================
import { create } from 'zustand';
import {
  ProcessedFile,
  ConversionStatus,
  IRGraph,
  IRNode,
  IREdge,
  IRView,
  IREvent,
  IREventType,
  IRNodeKind,
  SuggestedAction,
} from '../../types';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
}

function now(): number {
  return Date.now();
}

function emitEvent(
  graph: IRGraph,
  type: IREventType,
  extras: Partial<Omit<IREvent, 'id' | 'type' | 'timestamp'>> = {}
): IRGraph {
  const event: IREvent = { id: uid(), type, timestamp: now(), ...extras };
  return { ...graph, events: [...graph.events, event] };
}

// ─── EMPTY GRAPH ─────────────────────────────────────────────────────────────

function emptyGraph(): IRGraph {
  return { nodes: {}, edges: {}, views: {}, events: [] };
}

// ─── STORE INTERFACE ─────────────────────────────────────────────────────────

interface FileStore {
  // ── Legacy surface (UI compatibility) ──
  files: ProcessedFile[];
  copiedAll: boolean;
  menuOpen: boolean;
  cinematicFileId: string | null;
  appReady: boolean;

  // ── IR brain ──
  irGraph: IRGraph;

  // ── Legacy setters ──
  setFiles: (files: ProcessedFile[] | ((prev: ProcessedFile[]) => ProcessedFile[])) => void;
  setCopiedAll: (copied: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setCinematicFileId: (id: string | null) => void;
  setAppReady: (ready: boolean) => void;

  // ── File lifecycle ──
  addFiles: (incomingFiles: File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  updateFile: (id: string, updates: Partial<ProcessedFile>) => void;
  getCompletedFiles: () => ProcessedFile[];
  generateMergedContent: () => string;

  // ── IR operations ──
  upsertNode: (node: IRNode) => void;
  upsertEdge: (edge: IREdge) => void;
  upsertView: (view: IRView) => void;
  applyIRPatch: (patch: Partial<IRGraph>) => void;
  getNodeById: (id: string) => IRNode | undefined;
  getViewsForNode: (nodeId: string) => IRView[];
  getEdgesForNode: (nodeId: string) => IREdge[];
  getEventLog: () => IREvent[];
  resetGraph: () => void;

  // ── Intake pipeline dispatch ──
  dispatchInputIngested: (fileId: string, fileName: string, size: number) => void;
  dispatchParsedToIR: (fileId: string, nodeKind: IRNodeKind, label: string) => void;
  dispatchRelationsDiscovered: (nodeId: string, edges: IREdge[]) => void;
  dispatchViewsPrepared: (nodeId: string, viewIds: string[]) => void;
  setSuggestedActions: (fileId: string, actions: SuggestedAction[]) => void;
}

// ─── STORE ───────────────────────────────────────────────────────────────────

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  copiedAll: false,
  menuOpen: false,
  cinematicFileId: null,
  appReady: false,
  irGraph: emptyGraph(),

  // ── Legacy setters ──────────────────────────────────────────────────────────

  setFiles: (updater) =>
    set((state) => ({
      files: typeof updater === 'function' ? updater(state.files) : updater,
    })),
  setCopiedAll: (copied) => set({ copiedAll: copied }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setCinematicFileId: (id) => set({ cinematicFileId: id }),
  setAppReady: (ready) => set({ appReady: ready }),

  // ── File lifecycle ──────────────────────────────────────────────────────────

  addFiles: (incomingFiles) => {
    const newEntries: ProcessedFile[] = incomingFiles.map((file) => ({
      id: uid(),
      originalName: file.name,
      markdownName: file.name,
      content: '',
      originalSize: file.size,
      status: ConversionStatus.ANALYZING_INGESTION,
      timestamp: now(),
      rawFile: file,
    }));
    set((state) => {
      let graph = state.irGraph;
      for (const entry of newEntries) {
        graph = emitEvent(graph, 'InputIngested', {
          nodeId: entry.id,
          payload: { fileName: entry.originalName, size: entry.originalSize },
        });
      }
      return { files: [...newEntries, ...state.files], irGraph: graph };
    });
  },

  removeFile: (id) =>
    set((state) => {
      const f = state.files.find((f) => f.id === id);
      if (f?.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
      if (f?.fillablePdfUrl) URL.revokeObjectURL(f.fillablePdfUrl);
      return { files: state.files.filter((f) => f.id !== id) };
    }),

  clearAll: () =>
    set((state) => {
      state.files.forEach((f) => {
        if (f.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
        if (f.fillablePdfUrl) URL.revokeObjectURL(f.fillablePdfUrl);
      });
      return { files: [], irGraph: emptyGraph() };
    }),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  getCompletedFiles: () =>
    get().files.filter((f) => f.status === ConversionStatus.COMPLETED),

  generateMergedContent: () => {
    const completed = get().getCompletedFiles();
    if (completed.length === 0) return '';
    return (
      '# Merged Output\n\n' +
      completed
        .map((f) => `## Source: ${f.originalName}\n\n${f.content}\n\n---`)
        .join('\n\n')
    );
  },

  // ── IR Operations ───────────────────────────────────────────────────────────

  upsertNode: (node) =>
    set((state) => ({
      irGraph: emitEvent(
        { ...state.irGraph, nodes: { ...state.irGraph.nodes, [node.id]: node } },
        'IRUpdated',
        { nodeId: node.id }
      ),
    })),

  upsertEdge: (edge) =>
    set((state) => ({
      irGraph: {
        ...state.irGraph,
        edges: { ...state.irGraph.edges, [edge.id]: edge },
      },
    })),

  upsertView: (view) =>
    set((state) => ({
      irGraph: {
        ...state.irGraph,
        views: { ...state.irGraph.views, [view.id]: view },
      },
    })),

  applyIRPatch: (patch) =>
    set((state) => {
      const g = state.irGraph;
      const merged: IRGraph = {
        nodes: { ...g.nodes, ...(patch.nodes ?? {}) },
        edges: { ...g.edges, ...(patch.edges ?? {}) },
        views: { ...g.views, ...(patch.views ?? {}) },
        events: [...g.events, ...(patch.events ?? [])],
      };
      return { irGraph: merged };
    }),

  getNodeById: (id) => get().irGraph.nodes[id],

  getViewsForNode: (nodeId) =>
    Object.values(get().irGraph.views).filter((v) => v.nodeIds.includes(nodeId)),

  getEdgesForNode: (nodeId) =>
    Object.values(get().irGraph.edges).filter(
      (e) => e.from === nodeId || e.to === nodeId
    ),

  getEventLog: () => get().irGraph.events,

  resetGraph: () => set({ irGraph: emptyGraph() }),

  // ── Intake Pipeline Dispatch ─────────────────────────────────────────────────

  dispatchInputIngested: (fileId, fileName, size) =>
    set((state) => ({
      irGraph: emitEvent(state.irGraph, 'InputIngested', {
        nodeId: fileId,
        payload: { fileName, size },
      }),
    })),

  dispatchParsedToIR: (fileId, nodeKind, label) => {
    const node: IRNode = {
      id: fileId,
      kind: nodeKind,
      label,
      payload: { type: 'empty' },
      attributes: { createdAt: now() },
      viewIds: [],
    };
    set((state) => ({
      irGraph: emitEvent(
        { ...state.irGraph, nodes: { ...state.irGraph.nodes, [fileId]: node } },
        'ParsedToIR',
        { nodeId: fileId }
      ),
    }));
  },

  dispatchRelationsDiscovered: (nodeId, edges) =>
    set((state) => {
      const edgeMap: Record<string, IREdge> = {};
      for (const e of edges) edgeMap[e.id] = e;
      return {
        irGraph: emitEvent(
          { ...state.irGraph, edges: { ...state.irGraph.edges, ...edgeMap } },
          'RelationsDiscovered',
          { nodeId, payload: { count: edges.length } }
        ),
      };
    }),

  dispatchViewsPrepared: (nodeId, viewIds) =>
    set((state) => {
      const g = state.irGraph;
      const node = g.nodes[nodeId];
      if (!node) return {};
      const updated: IRNode = {
        ...node,
        viewIds: [...new Set([...node.viewIds, ...viewIds])],
      };
      return {
        irGraph: emitEvent(
          { ...g, nodes: { ...g.nodes, [nodeId]: updated } },
          'ViewsPrepared',
          { nodeId, payload: { viewIds } }
        ),
      };
    }),

  setSuggestedActions: (fileId, actions) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, suggestedActions: actions } : f
      ),
    })),
}));
