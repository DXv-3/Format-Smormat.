import { create } from 'zustand';
import { ProcessedFile, ConversionStatus, IRGraph, IRNode, IREvent, IREdge } from '../../types';

interface FileStore {
  files: ProcessedFile[];
  copiedAll: boolean;
  menuOpen: boolean;
  cinematicFileId: string | null;
  appReady: boolean;
  irGraph: IRGraph;
  setFiles: (files: ProcessedFile[] | ((prev: ProcessedFile[]) => ProcessedFile[])) => void;
  setCopiedAll: (copied: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setCinematicFileId: (id: string | null) => void;
  setAppReady: (ready: boolean) => void;
  addFiles: (incomingFiles: File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  updateFile: (id: string, updates: Partial<ProcessedFile>) => void;
  getCompletedFiles: () => ProcessedFile[];
  generateMergedContent: () => string;
  addIRNode: (node: IRNode) => void;
  addIREdge: (edge: IREdge) => void;
  addIREvent: (event: Omit<IREvent, 'id' | 'timestamp'>) => void;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  copiedAll: false,
  menuOpen: false,
  cinematicFileId: null,
  appReady: false,
  irGraph: { nodes: {}, edges: [], views: {}, events: [] },

  setFiles: (updater) => set((state) => ({
    files: typeof updater === 'function' ? updater(state.files) : updater
  })),
  setCopiedAll: (copied) => set({ copiedAll: copied }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setCinematicFileId: (id) => set({ cinematicFileId: id }),
  setAppReady: (ready) => set({ appReady: ready }),

  addFiles: (incomingFiles) => {
    const newEntries: ProcessedFile[] = incomingFiles.map(file => ({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      originalName: file.name,
      markdownName: file.name,
      content: '',
      originalSize: file.size,
      status: ConversionStatus.ANALYZING_INGESTION,
      timestamp: Date.now(),
      rawFile: file
    }));
    set((state) => ({ files: [...newEntries, ...state.files] }));
  },

  removeFile: (id) => {
    set((state) => {
      const fileToRemove = state.files.find(f => f.id === id);
      if (fileToRemove) {
        if (fileToRemove.pdfUrl) URL.revokeObjectURL(fileToRemove.pdfUrl);
        if (fileToRemove.fillablePdfUrl) URL.revokeObjectURL(fileToRemove.fillablePdfUrl);
      }
      return { files: state.files.filter(f => f.id !== id) };
    });
  },

  clearAll: () => {
    set((state) => {
      state.files.forEach(f => {
        if (f.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
        if (f.fillablePdfUrl) URL.revokeObjectURL(f.fillablePdfUrl);
      });
      return { files: [], irGraph: { nodes: {}, edges: [], views: {}, events: [] } };
    });
  },

  updateFile: (id, updates) => {
    set((state) => ({
      files: state.files.map(f => f.id === id ? { ...f, ...updates } : f)
    }));
  },

  getCompletedFiles: () => {
    return get().files.filter(f => f.status === ConversionStatus.COMPLETED);
  },

  generateMergedContent: () => {
    const completedFiles = get().getCompletedFiles();
    if (completedFiles.length === 0) return '';

    let mergedContent = `# Merged Output\n\n`;
    completedFiles.forEach(file => {
      mergedContent += `## Source: ${file.originalName}\n\n${file.content}\n\n---\n\n`;
    });
    return mergedContent;
  },

  addIRNode: (node) => {
    set((state) => ({
      irGraph: { ...state.irGraph, nodes: { ...state.irGraph.nodes, [node.id]: node } }
    }));
  },

  addIREdge: (edge) => {
    set((state) => ({
      irGraph: { ...state.irGraph, edges: [...state.irGraph.edges, edge] }
    }));
  },

  addIREvent: (eventParams) => {
    const newEvent: IREvent = {
      ...eventParams,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      timestamp: Date.now()
    };
    set((state) => ({
      irGraph: { ...state.irGraph, events: [...state.irGraph.events, newEvent] }
    }));
  }
}));
