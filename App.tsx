import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Github, FileDiff, Download, Copy, Check, Menu, X, ArrowRightLeft } from 'lucide-react';
import DropZone from './components/DropZone';
import FileItem from './components/FileItem';
import { UniversalConverter } from './components/UniversalConverter';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ProcessedFile, ConversionStatus } from './types';
import { processUniversalFile } from './services/converter';
import { conversionGraph } from './lib/format-router/graph';
import { bootstrapFormatRouter } from './lib/format-router/bootstrap';

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'specialists' | 'universal'>('specialists');

  // Re-introducing scroll controls for the arc sequence
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bootstrapFormatRouter();
    conversionGraph.initAllSupported();
  }, []);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const titleScale = useTransform(scrollYProgress, [0, 0.2, 0.6, 1], [1, 1, 0.8, 0.8]);

  // Format (Left Arc)
  const formatX = useTransform(scrollYProgress, [0, 0.2, 0.6, 1], ["0vw", "-35vw", "-1vw", "-1vw"]);
  const formatY = useTransform(scrollYProgress, [0, 0.2, 0.6, 1], ["0vh", "25vh", "-35vh", "-35vh"]);
  const formatRotate = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 1], [0, -45, -15, 0, 0]);

  // Smormat (Right Arc)
  const smormatX = useTransform(scrollYProgress, [0, 0.2, 0.6, 1], ["0vw", "35vw", "1vw", "1vw"]);
  const smormatY = formatY; 
  const smormatRotate = useTransform(scrollYProgress, [0, 0.2, 0.4, 0.6, 1], [0, 45, 15, 0, 0]);

  // Hint text at the beginning
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  const processFiles = useCallback((incomingFiles: File[]) => {
    const newEntries: ProcessedFile[] = incomingFiles.map(file => ({
      id: crypto.randomUUID(),
      originalName: file.name,
      markdownName: file.name,
      content: '',
      originalSize: file.size,
      status: ConversionStatus.AWAITING_ACTION,
      timestamp: Date.now(),
      rawFile: file
    }));

    setFiles(prev => [...newEntries, ...prev]);
  }, []);

  const handleProcessFile = async (id: string, action: string) => {
    const fileEntry = files.find(f => f.id === id);
    if (!fileEntry || !fileEntry.rawFile) return;

    setFiles(current => current.map(f => f.id === id ? { ...f, status: ConversionStatus.PROCESSING, performedAction: action } : f));

    try {
      const result = await processUniversalFile(fileEntry.rawFile, action);
      
      setFiles(current => current.map(f => f.id === id ? { 
        ...f, 
        status: ConversionStatus.COMPLETED,
        content: result.markdown || '',
        markdownName: result.smartName || f.originalName,
        pdfUrl: result.pdfUrl,
        images: result.images,
        fillablePdfUrl: result.fillablePdfUrl
      } : f));
    } catch (err) {
      console.error(err);
      setFiles(current => current.map(f => f.id === id ? { ...f, status: ConversionStatus.ERROR, errorMessage: 'Processing failed' } : f));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        if (fileToRemove.pdfUrl) URL.revokeObjectURL(fileToRemove.pdfUrl);
        if (fileToRemove.fillablePdfUrl) URL.revokeObjectURL(fileToRemove.fillablePdfUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all converted files?')) {
      files.forEach(f => {
        if (f.pdfUrl) URL.revokeObjectURL(f.pdfUrl);
        if (f.fillablePdfUrl) URL.revokeObjectURL(f.fillablePdfUrl);
      });
      setFiles([]);
    }
  };

  const generateMergedContent = () => {
    const completedFiles = files.filter(f => f.status === ConversionStatus.COMPLETED);
    if (completedFiles.length === 0) return '';

    let mergedContent = `# Merged Output\n\n`;
    completedFiles.forEach(file => {
      mergedContent += `## Source: ${file.originalName}\n\n${file.content}\n\n---\n\n`;
    });
    return mergedContent;
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

  return (
    <div className="relative w-full min-h-screen bg-[#F9F9F7] text-[#111111] font-sans selection:bg-zinc-200 overflow-x-hidden">
      
      {/* Refined Navigation Menu */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.1, duration: 0.8, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 bg-[#F9F9F7]/90 backdrop-blur-md border-b border-zinc-200/60"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-black text-white flex items-center justify-center rounded-sm">
              <FileDiff className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-wide uppercase">Format Smormat</span>
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

      {/* Scroll-linked Hero Arc Sequence */}
      <div ref={heroRef} className="h-[250vh] relative z-10 block">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-6 pointer-events-none"
        >
          <motion.div style={{ scale: titleScale }} className="flex space-x-4 md:space-x-8 pointer-events-auto">
            {/* Left Arc Text */}
            <motion.div
              style={{ x: formatX, y: formatY, rotate: formatRotate }}
              className="text-6xl md:text-8xl lg:text-9xl font-serif font-medium tracking-tight cursor-default group"
            >
              <span className="block relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 transition-opacity duration-700 group-hover:opacity-0">
                Format
              </span>
              <span className="block absolute left-0 top-0 z-20 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-text-gradient whitespace-nowrap">
                Format
              </span>
            </motion.div>

            {/* Right Arc Text */}
            <motion.div
              style={{ x: smormatX, y: smormatY, rotate: smormatRotate }}
              className="text-6xl md:text-8xl lg:text-9xl font-serif font-medium tracking-tight cursor-default group"
            >
              <span className="block relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 transition-opacity duration-700 group-hover:opacity-0">
                Smormat
              </span>
              <span className="block absolute left-0 top-0 z-20 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-text-gradient whitespace-nowrap">
                Smormat
              </span>
            </motion.div>
          </motion.div>

          <motion.div style={{ opacity: hintOpacity }} className="absolute bottom-12 left-0 right-0 text-center">
            <div className="flex items-center justify-center space-x-2 text-xs font-medium tracking-widest uppercase text-zinc-400">
              <span className="cursor-default">Scroll to Sequence</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Download className="w-3.5 h-3.5" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Main Content Area - Native Scroll overlapping from bottom */}
      <main className="relative z-20 max-w-5xl mx-auto px-6 pb-32 flex flex-col mt-[-100vh]">
        <div className="w-full flex-1 pt-[38vh]">
          {/* Semantic text underneath the converging animated title */}
          <div className="text-center mb-16 max-w-2xl mx-auto px-4">
            <p className="text-zinc-600 text-lg md:text-xl leading-relaxed tracking-wide font-medium">
              An intelligent conduit for your data. Drop documents below to instantly extract parsed structures, convert across complex schemas, or generate exact fillable forms.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex justify-center mb-8">
            <div className="bg-white border border-zinc-200 rounded-full p-1 shadow-sm inline-flex">
              <button 
                onClick={() => setActiveTab('specialists')}
                className={`py-2 px-6 rounded-full text-sm font-medium transition-colors ${activeTab === 'specialists' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                Specialist Routing
              </button>
              <button 
                onClick={() => setActiveTab('universal')}
                className={`py-2 px-6 rounded-full text-sm font-medium transition-colors flex items-center space-x-2 ${activeTab === 'universal' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Universal Format Graph</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'specialists' ? (
              <motion.div 
                key="specialists"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Drag & Drop Area */}
                <div className="mb-16 shadow-2xl shadow-zinc-200/50">
                  <DropZone onFilesDropped={processFiles} acceptAllFiles={true} />
                </div>

                {/* Results List */}
                {files.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="flex items-center justify-between mb-6 border-b border-zinc-200 pb-4">
                      <h3 className="text-lg font-serif font-medium text-zinc-900">Processed Files ({files.length})</h3>
                      
                      <div className="flex items-center space-x-4">
                        {files.some(f => f.status === ConversionStatus.COMPLETED) && (
                          <>
                            <button 
                              onClick={handleCopyAll}
                              className="flex items-center space-x-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition-colors font-medium"
                            >
                              {copiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedAll ? 'Copied' : 'Copy All'}</span>
                            </button>
                            <button 
                              onClick={handleDownloadAll}
                              className="flex items-center space-x-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-sm transition-colors font-medium"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Merged</span>
                            </button>
                          </>
                        )}
                        <div className="w-px h-4 bg-zinc-300 mx-1"></div>
                        <button 
                          onClick={clearAll}
                          className="text-xs text-zinc-400 hover:text-red-600 transition-colors uppercase tracking-widest font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {files.map(file => (
                        <FileItem 
                          key={file.id} 
                          file={file} 
                          onRemove={removeFile} 
                          onProcess={handleProcessFile} 
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="universal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="mb-4">
                  <p className="text-sm tracking-wide text-zinc-500 text-center font-medium bg-gradient-to-r from-pink-500/10 via-teal-500/10 to-amber-500/10 p-4 border border-zinc-200/50 rounded-lg inline-block w-full">
                    The Universal Constructor utilizes Dijkstra's pathfinding algorithm to route exotic or cross-system media formats through multi-step handler conversions automatically.
                  </p>
                </div>
                <UniversalConverter 
                  onConverted={(filename, buffer) => {
                    const blob = new Blob([buffer]);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-8 text-center text-zinc-400 text-xs tracking-widest uppercase border-t border-zinc-200">
        <p>Pure Client-Side Processing • 2026</p>
      </footer>
    </div>
  );
};

export default App;