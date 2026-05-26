import React, { useRef, useEffect } from 'react';
import { FileDiff, Download, Copy, Check, Menu, X } from 'lucide-react';
import DropZone from './components/DropZone';
import FileItem from './components/FileItem';
import { UniversalConverter } from './components/UniversalConverter';
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

const App: React.FC = () => {
  // Global file state now lives in Zustand (first refactor slice)
  const {
    files,
    copiedAll,
    menuOpen,
    cinematicFileId,
    appReady,
    addFiles,
    removeFile,
    clearAll,
    updateFile,
    setCinematicFileId,
    setAppReady,
    setCopiedAll,
    setMenuOpen,
    getCompletedFiles,
    generateMergedContent,
  } = useFileStore();

  // Scroll transforms for the arc sequence (kept in App — pure UI/animation)
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const appBgColor = useTransform(
    scrollYProgress,
    [0, 0.5, 0.8, 1],
    ['#F9F9F7', '#F9F9F7', '#eef2f3', '#e0e5ec']
  );

  const dragDropOpacity = useTransform(scrollYProgress, [0.4, 0.6], [0, 1]);
  const dragDropY = useTransform(scrollYProgress, [0.4, 0.6], [100, 0]);

  useEffect(() => {
    bootstrapFormatRouter();
    conversionGraph.initAllSupported();
  }, []);

  // Thin wrappers for async processing — call store.updateFile after work.
  // (Later slices can move these into hooks + TanStack Query)
  const handleProcessFile = async (id: string, action: string, customInstruction?: string) => {
    const fileEntry = files.find(f => f.id === id);
    if (!fileEntry || !fileEntry.rawFile) return;

    updateFile(id, { status: ConversionStatus.PROCESSING, performedAction: action });

    try {
      const result = await processUniversalFile(fileEntry.rawFile, action, customInstruction);
      updateFile(id, {
        status: ConversionStatus.COMPLETED,
        content: result.markdown || '',
        markdownName: result.smartName || fileEntry.originalName,
        pdfUrl: result.pdfUrl,
        images: result.images,
        fillablePdfUrl: result.fillablePdfUrl,
      });
    } catch (err) {
      console.error(err);
      updateFile(id, { status: ConversionStatus.ERROR, errorMessage: 'Processing failed' });
    }
  };

  const handleAnalyzeFile = (id: string) => {
    const fileEntry = files.find(f => f.id === id);
    if (!fileEntry || !fileEntry.content) return;

    updateFile(id, { aiStatus: 'ANALYZING' as any });

    extractDocumentMetadata(fileEntry.content, fileEntry.originalName)
      .then(metadata => {
        updateFile(id, { aiStatus: 'COMPLETED' as any, aiMetadata: metadata });
      })
      .catch(err => {
        console.error(err);
        updateFile(id, { aiStatus: 'ERROR' as any });
      });
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

          {/* Hero Sequence */}
          <HeroSequence />

          {/* Main Content Area */}
          <main className="relative z-20 max-w-5xl mx-auto px-6 pb-32 flex flex-col mt-[-100vh] pt-[45vh]">
            <div className="w-full flex-1">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-center mb-16 max-w-2xl mx-auto px-4"
              >
                <p className="text-zinc-600 text-lg md:text-xl leading-relaxed tracking-wide font-medium">
                  An intelligent conduit for your data. Drop documents below to instantly extract parsed structures, convert across complex schemas, or generate exact fillable forms.
                </p>
              </motion.div>

              <motion.div
                style={{ 
                  opacity: dragDropOpacity,
                  y: dragDropY,
                }}
              >
                {files.every(f => f.status !== ConversionStatus.ANALYZING_INGESTION) && (
                  <div className="mb-16 shadow-2xl shadow-zinc-200/50">
                    <DropZone onFilesDropped={addFiles} acceptAllFiles={true} />
                  </div>
                )}

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
                              onExecuteUniversal={async (id, name, buf) => {
                                updateFile(id, {
                                  status: ConversionStatus.COMPLETED,
                                  content: 'Universal Binary Object generated.',
                                  markdownName: name,
                                  pdfUrl: URL.createObjectURL(new Blob([buf])),
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
                            onProcess={handleProcessFile}
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
                      className="flex items-center space-x-1.5 text-sm text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
                    >
                      {copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedAll ? 'Copied' : 'Copy All Content'}</span>
                    </button>
                    <div className="flex space-x-4">
                      <button 
                        onClick={clearAll}
                        className="text-sm text-zinc-500 hover:text-red-600 transition-colors font-medium"
                      >
                        Clear All
                      </button>
                      <button 
                        onClick={handleDownloadAll}
                        className="flex items-center space-x-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2 rounded-lg transition-colors font-medium shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Merged</span>
                      </button>
                    </div>
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
