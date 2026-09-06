import React, { useCallback, useEffect, useState } from 'react';
import { FileDiff, Download, Copy, Check, Menu, X, Network, CloudUpload } from 'lucide-react';
import DropZone from './components/DropZone';
import FileItem from './components/FileItem';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ConversionStatus } from './types';
import { processUniversalFile } from './services/converter';
import { extractDocumentMetadata } from './services/ai';
import { conversionGraph } from './lib/format-router/graph';
import { bootstrapFormatRouter } from './lib/format-router/bootstrap';

import { CinematicTransformationView } from './components/CinematicTransformationView';
import { Preloader } from './components/Preloader';
import { HeroSequence } from './components/HeroSequence';
import { IngestionEngine } from './components/IngestionEngine';
import { useFileStore } from './src/stores/useFileStore';
import { GoogleDriveIntegration } from './components/GoogleDriveIntegration';
import { initAuth, getAccessToken, uploadFileToDrive } from './services/googleDrive';

const App: React.FC = () => {
  const {
    files,
    copiedAll,
    menuOpen,
    cinematicFileId,
    appReady,
    showClearModal,
    setCopiedAll,
    setMenuOpen,
    setCinematicFileId,
    setAppReady,
    setShowClearModal,
    addFiles,
    removeFile,
    clearAll,
    generateMergedContent,
    updateFile
  } = useFileStore();

  // Re-introducing scroll controls for the arc sequence
  const { scrollYProgress } = useScroll();
  const appBgColor = useTransform(
    scrollYProgress,
    [0, 0.5, 0.8, 1],
    ['#F9F9F7', '#F9F9F7', '#eef2f3', '#e0e5ec']
  );

  const dragDropOpacity = useTransform(scrollYProgress, [0.4, 0.6], [0, 1]);
  const dragDropY = useTransform(scrollYProgress, [0.4, 0.6], [100, 0]);

  const [driveAuthed, setDriveAuthed] = useState(false);
  const [exportingToDrive, setExportingToDrive] = useState(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    bootstrapFormatRouter();
    conversionGraph.initAllSupported();

    const unsubscribe = initAuth(
      () => setDriveAuthed(true),
      () => setDriveAuthed(false)
    );
    return () => unsubscribe();
  }, []);

  const handleSaveMergedToDrive = async () => {
    const token = getAccessToken();
    if (!token) {
      alert('Please connect to Google Drive first using the panel below.');
      return;
    }
    const mergedContent = generateMergedContent();
    if (!mergedContent) return;

    setExportingToDrive(true);
    setDriveExportSuccess(null);
    try {
      const fileName = `merged_output_${Date.now()}.md`;
      await uploadFileToDrive(token, fileName, mergedContent, 'text/markdown');
      setDriveExportSuccess('Merged Markdown saved to Google Drive!');
      setTimeout(() => setDriveExportSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save to Google Drive: ' + (err.message || String(err)));
    } finally {
      setExportingToDrive(false);
    }
  };

  const handleSaveGraphToDrive = async () => {
    const token = getAccessToken();
    if (!token) {
      alert('Please connect to Google Drive first using the panel below.');
      return;
    }
    const { irGraph } = useFileStore.getState();

    setExportingToDrive(true);
    setDriveExportSuccess(null);
    try {
      const fileName = `ir-knowledge-graph_${Date.now()}.json`;
      await uploadFileToDrive(token, fileName, JSON.stringify(irGraph, null, 2), 'application/json');
      setDriveExportSuccess('IR Knowledge Graph saved to Google Drive!');
      setTimeout(() => setDriveExportSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save to Google Drive: ' + (err.message || String(err)));
    } finally {
      setExportingToDrive(false);
    }
  };

  const handleProcessFile = useCallback(async (id: string, action: string, customInstruction?: string) => {
    const fileEntry = files.find(f => f.id === id);
    if (!fileEntry || !fileEntry.rawFile) return;

    updateFile(id, { status: ConversionStatus.PROCESSING, performedAction: action });
    
    try {
      const result = await processUniversalFile(fileEntry.rawFile, action, customInstruction);
      
      const { addIRNode, addIREdge } = useFileStore.getState();
      const resultNodeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      
      // Determine what kind of node we got back
      let nodeKind: 'MARKDOWN' | 'ENTITIES' | 'JSON' | 'CSV' | 'VECTOR' | 'IMAGE' | 'RAW_FILE' = 'MARKDOWN';
      if (result.images && result.images.length > 0) nodeKind = 'IMAGE';
      
      addIRNode({
        id: resultNodeId,
        kind: nodeKind,
        content: result.markdown || { images: result.images, pdfUrl: result.pdfUrl, fillable: result.fillablePdfUrl },
        metadata: { source: fileEntry.originalName, action, customInstruction },
        timestamp: Date.now()
      });
      
      // Link back to original if we had an IRNode for the original. Currently original doesn't get an IR Node until it completes... Wait, Phase A says "Every file immediately becomes an IRNode".
      // Let's just create an edge if fileEntry.irNodeId exists
      if (fileEntry.irNodeId) {
        addIREdge({
          sourceId: fileEntry.irNodeId,
          targetId: resultNodeId,
          relation: 'TRANSFORMED_BY_ACTION'
        });
      }

      updateFile(id, { 
        status: ConversionStatus.COMPLETED,
        content: result.markdown || '',
        markdownName: result.smartName || fileEntry.originalName,
        pdfUrl: result.pdfUrl,
        images: result.images,
        fillablePdfUrl: result.fillablePdfUrl,
        irNodeId: resultNodeId
      });
    } catch (err) {
      console.error(err);
      updateFile(id, { status: ConversionStatus.ERROR, errorMessage: 'Processing failed' });
    }
  }, [files, updateFile]);

  const handleAnalyzeFile = useCallback((id: string) => {
    const fileEntry = files.find(f => f.id === id);
    if (!fileEntry || !fileEntry.content) return;

    updateFile(id, { aiStatus: 'ANALYZING' as any });

    extractDocumentMetadata(fileEntry.content, fileEntry.originalName).then(metadata => {
      updateFile(id, { aiStatus: 'COMPLETED' as any, aiMetadata: metadata });
    }).catch(err => {
      console.error(err);
      updateFile(id, { aiStatus: 'ERROR' as any });
    });
  }, [files, updateFile]);

  const handleClearAll = () => {
    setShowClearModal(true);
  };

  const handleDownloadAll = () => {
    const mergedContent = generateMergedContent();
    if (!mergedContent) return;

    const blob = new Blob([mergedContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merged_output_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportGraph = () => {
    const { irGraph } = useFileStore.getState();
    const blob = new Blob([JSON.stringify(irGraph, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ir-knowledge-graph_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = async () => {
    const mergedContent = generateMergedContent();
    if (!mergedContent) return;

    try {
      await navigator.clipboard.writeText(mergedContent);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (cinematicFileId) {
    const file = files.find(f => f.id === cinematicFileId);
    if (file) {
      return (
        <div className="bg-white min-h-screen relative">
          <button 
            onClick={() => setCinematicFileId(null)}
            className="fixed top-8 right-8 z-[100] bg-white text-zinc-900 px-6 py-2 rounded-full shadow-lg border border-zinc-200 font-medium text-sm hover:scale-105 transition-transform"
          >
            Close Sequence
          </button>
          <CinematicTransformationView file={file} onClose={() => setCinematicFileId(null)} />
        </div>
      );
    }
  }

  return (
    <motion.div style={{ backgroundColor: appBgColor }} className="relative w-full min-h-screen text-[#111111] font-sans selection:bg-zinc-200 overflow-x-hidden">
      {!appReady && <Preloader onComplete={() => setAppReady(true)} />}
      {appReady && (
        <>
          {/* Refined Navigation Menu */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 bg-[#F9F9F7]/90 backdrop-blur-md border-b border-zinc-200/60"
          >
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-black text-white flex items-center justify-center rounded-sm">
                  <FileDiff className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-semibold tracking-wide uppercase">FMT</span>
              </div>
              
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-zinc-900 hover:text-zinc-500 transition-colors p-2"
                aria-label="Toggle Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </motion.header>

      {/* Full-screen Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-[#F9F9F7] pt-24 px-6 md:px-12"
          >
            <div className="max-w-6xl mx-auto">
              <nav className="flex flex-col space-y-8">
                <a href="#" className="group flex flex-col border-b border-zinc-200 pb-6">
                  <span className="text-3xl font-serif text-zinc-900 group-hover:text-zinc-500 transition-colors">Documentation</span>
                  <span className="text-sm text-zinc-500 mt-2">Read the technical specifications and API guidelines.</span>
                </a>
                <a href="#" className="group flex flex-col border-b border-zinc-200 pb-6">
                  <span className="text-3xl font-serif text-zinc-900 group-hover:text-zinc-500 transition-colors">Source Code</span>
                  <span className="text-sm text-zinc-500 mt-2">View the repository on GitHub.</span>
                </a>
                <a href="#" className="group flex flex-col border-b border-zinc-200 pb-6">
                  <span className="text-3xl font-serif text-zinc-900 group-hover:text-zinc-500 transition-colors">Settings</span>
                  <span className="text-sm text-zinc-500 mt-2">Configure default conversion behaviors.</span>
                </a>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showClearModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-50 p-8 max-w-md w-full border-4 border-zinc-900 shadow-[12px_12px_0px_0px_rgba(24,24,27,1)]"
            >
              <h3 className="text-3xl font-serif font-black uppercase text-zinc-900 mb-2 tracking-tight">Erase Memory</h3>
              <p className="text-zinc-600 mb-8 font-mono text-sm font-medium">Are you sure you want to completely erase the IR graph and all ingested artifacts? This cannot be undone.</p>
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowClearModal(false)} className="px-5 py-2.5 border-2 border-zinc-900 text-zinc-900 font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none">Cancel</button>
                <button onClick={() => clearAll()} className="px-5 py-2.5 border-2 border-zinc-900 bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-colors shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none">Obliterate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Sequence */}
      <HeroSequence />

      {/* Main Content Area - Native Scroll overlapping from bottom */}
      <main className="relative z-20 max-w-5xl mx-auto px-6 pb-32 flex flex-col mt-[-100vh] pt-[45vh]">
        <div className="w-full flex-1">
          {/* Semantic text underneath the converging animated title */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-16 max-w-3xl mx-auto px-4"
          >
            <p className="text-zinc-800 text-xl md:text-2xl leading-relaxed tracking-tight font-serif italic">
              "The universal bottleneck solver. It doesn't matter what the fuck it is. I can make it all talk. I can make it all make sense. Take a breath and just let me format schmformat it."
            </p>
          </motion.div>

          <motion.div
            style={{ 
              opacity: dragDropOpacity,
              y: dragDropY,
            }}
          >
            {/* Drag & Drop Area - Available if no active ingestion is blocking */}
            {files.every(f => f.status !== ConversionStatus.ANALYZING_INGESTION) && (
              <div className="mb-16 space-y-8">
                <div className="shadow-2xl shadow-zinc-200/50">
                  <DropZone onFilesDropped={addFiles} acceptAllFiles={true} />
                </div>
                <GoogleDriveIntegration onFilesImported={addFiles} />
              </div>
            )}

            {/* Ingestion Engine and Results List */}
            <div className="space-y-12">
              <AnimatePresence mode="popLayout">
                {files.map(file => {
                  if (file.status === ConversionStatus.ANALYZING_INGESTION) {
                    return (
                      <motion.div 
                        key={file.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="w-full"
                      >
                        <IngestionEngine 
                          file={file} 
                          onExecuteSpecialist={handleProcessFile} 
                          onAnalyze={handleAnalyzeFile}
                          onExecuteUniversal={async (id, name, buf, kind) => {
                            const nodeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
                            useFileStore.getState().addIRNode({
                              id: nodeId,
                              kind: kind as 'MARKDOWN' | 'RAW_FILE' | 'JSON' | 'CSV',
                              content: new TextDecoder().decode(buf), // we can refine this later
                              metadata: { source: name },
                              timestamp: Date.now()
                            });
                            updateFile(id, {
                              status: ConversionStatus.COMPLETED,
                              content: 'Universal Binary Object generated.',
                              markdownName: name,
                              pdfUrl: URL.createObjectURL(new Blob([buf])),
                              irNodeId: nodeId
                            });
                          }} 
                        />
                      </motion.div>
                    );
                  }
                  
                  return (
                    <motion.div 
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4 }}
                    >
                      <FileItem 
                        file={file} 
                        onRemove={removeFile} 
                        onAnalyze={handleAnalyzeFile}
                        onCinematic={setCinematicFileId} 
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            
            {files.some(f => f.status === ConversionStatus.COMPLETED) && (
              <div className="mt-8 pt-6 border-t border-zinc-200 flex justify-between items-center">
                 <button 
                  onClick={handleCopyAll}
                  className="flex items-center space-x-1.5 text-sm border-2 border-zinc-900 bg-zinc-100 text-zinc-900 px-4 py-2 hover:bg-zinc-900 hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none uppercase"
                >
                  {copiedAll ? <Check className="w-4 h-4" strokeWidth={2} /> : <Copy className="w-4 h-4" strokeWidth={2} />}
                  <span>{copiedAll ? 'COPIED' : 'COPY ALL'}</span>
                </button>
                <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4">
                  <button 
                    onClick={handleClearAll}
                    className="text-sm text-zinc-500 hover:text-red-600 transition-colors font-bold uppercase tracking-wider px-3"
                  >
                    Clear All
                  </button>
                  {driveAuthed && (
                    <>
                      <button 
                        onClick={handleSaveGraphToDrive}
                        disabled={exportingToDrive}
                        className="flex items-center space-x-1.5 text-sm bg-blue-50 border-2 border-zinc-900 text-blue-900 px-4 py-2 hover:bg-zinc-900 hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none uppercase disabled:opacity-50"
                      >
                        <CloudUpload className="w-4 h-4" strokeWidth={2} />
                        <span>{exportingToDrive ? 'SAVING...' : 'SAVE GRAPH TO DRIVE'}</span>
                      </button>
                      <button 
                        onClick={handleSaveMergedToDrive}
                        disabled={exportingToDrive}
                        className="flex items-center space-x-1.5 text-sm bg-green-50 border-2 border-zinc-900 text-green-900 px-4 py-2 hover:bg-zinc-900 hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none uppercase disabled:opacity-50"
                      >
                        <CloudUpload className="w-4 h-4" strokeWidth={2} />
                        <span>{exportingToDrive ? 'SAVING...' : 'SAVE MERGED TO DRIVE'}</span>
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handleExportGraph}
                    className="flex items-center space-x-1.5 text-sm bg-white border-2 border-zinc-900 text-zinc-900 px-5 py-2 hover:bg-zinc-900 hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none uppercase"
                  >
                    <Network className="w-4 h-4" strokeWidth={2} />
                    <span>Export Graph</span>
                  </button>
                  <button 
                    onClick={handleDownloadAll}
                    className="flex items-center space-x-1.5 text-sm bg-zinc-900 border-2 border-zinc-900 hover:bg-white text-white hover:text-zinc-900 px-5 py-2 transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-1 active:shadow-none uppercase"
                  >
                    <Download className="w-4 h-4" strokeWidth={2} />
                    <span>Download Merged</span>
                  </button>
                </div>
              </div>
            )}
            
            {driveExportSuccess && (
              <div className="mt-4 p-3 bg-green-50 border-2 border-green-600 text-green-800 font-mono text-xs text-right shadow-[4px_4px_0px_0px_rgba(22,101,52,0.2)]">
                {driveExportSuccess}
              </div>
            )}
          </motion.div>
        </div >
      </main >
      
      {/* Footer */}
      <footer className="py-8 text-center text-zinc-400 text-xs tracking-widest uppercase border-t border-zinc-200/50">
        <p>Pure Client-Side Processing • 2026</p>
      </footer>
        </>
      )}
    </motion.div>
  );
};

export default App;