import { create } from 'zustand';
import { ProcessedFile, ConversionStatus } from '../types';

interface FileStore {
  files: ProcessedFile[];
  copiedAll: boolean;
  menuOpen: boolean;
  cinematicFileId: string | null;
  appReady: boolean;

  // Actions
  addFiles: (incomingFiles: File[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  updateFile: (id: string, updates: Partial<ProcessedFile>) => void;
  setCinematicFileId: (id: string | null) => void;
  setAppReady: (ready: boolean) => void;
  setCopiedAll: (val: boolean) => void;
  setMenuOpen: (val: boolean) => void;

  // Derived helpers
  getCompletedFiles: () => ProcessedFile[];
  generateMergedContent: () => string;
}

export const useFileStore = create<FileStore>((set, get) => ({
  files: [],
  copiedAll: false,
  menuOpen: false,
  cinematicFileId: null,
  appReady: false,

  addFiles: (incomingFiles) => {
    const newEntries: ProcessedFile[] = incomingFiles.map(file => ({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      originalName: file.name,
      markdownName: file.name,
      content: '',
      originalSize: file.size,
      status: ConversionStatus.ANALYZING_INGESTION,
      timestamp: Date.now(),
      rawFile: file,
    }));
    set(state => ({ files: [...newEntries, ...state.files] }));
  },

  removeFile: (id) => {
    set(state => {
      const fileToRemove = state.files.find(f => f.id === id);
      if (fileToRemove) {
        if (fileToRemove.pdfUrl) URL.revokeObjectURL(fileToRemove.pdfUrl);
        if (fileToRemove.fillablePdfUrl) URL.revokeObjectURL(fileToRemove.fillablePdfUrl);
      }
      return { files: state.files.filter(f => f.id !== id) };
    });
  },

  clearAll: () => {
    // NOTE: Blocking confirm() kept for v1 compatibility. Replace with proper modal in next UI slice.
    const confirmed = confirm('Are you sure you want to clear all converted files?');
    if (!confirmed) return;

    const currentFiles = get().files;
    currentFiles.forEach(f => {
      if (f.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
      if (f.fillablePdfUrl) URL.revokeObjectURL(f.fillablePdfUrl);
    });
    set({ files: [] });
  },

  updateFile: (id, updates) => {
    set(state => ({
      files: state.files.map(f => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  setCinematicFileId: (id) => set({ cinematicFileId: id }),
  setAppReady: (ready) => set({ appReady: ready }),
  setCopiedAll: (val) => set({ copiedAll: val }),
  setMenuOpen: (val) => set({ menuOpen: val }),

  getCompletedFiles: () => get().files.filter(f => f.status === ConversionStatus.COMPLETED),

  generateMergedContent: () => {
    const completed = get().getCompletedFiles();
    if (completed.length === 0) return '';

    let merged = `# Merged Output\n\n`;
    completed.forEach(file => {
      merged += `## Source: ${file.originalName}\n\n${file.content}\n\n---\n\n`;
    });
    return merged;
  },
}));
