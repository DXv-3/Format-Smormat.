import React, { useState, useCallback } from 'react';
import { Layers, Github, Sparkles, FileDiff } from 'lucide-react';
import DropZone from './components/DropZone';
import FileItem from './components/FileItem';
import { ProcessedFile, ConversionStatus } from './types';
import { convertHtmlToMarkdown, getSmartFilename } from './services/converter';

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const processFiles = useCallback(async (incomingFiles: File[]) => {
    // 1. Create initial entries with READING status
    const newEntries: ProcessedFile[] = incomingFiles.map(file => ({
      id: crypto.randomUUID(),
      originalName: file.name,
      markdownName: 'Analysing...', // Placeholder while reading
      content: '',
      originalSize: file.size,
      status: ConversionStatus.READING,
      timestamp: Date.now()
    }));

    setFiles(prev => [...newEntries, ...prev]);

    // 2. Process each file sequentially in the UI logic (parallel execution)
    newEntries.forEach(async (entry, index) => {
      const file = incomingFiles[index];
      
      try {
        // Step A: Read the file content
        const text = await readFileAsText(file);

        // Step B: Determine the name FIRST
        // We artificially pause here briefly so the user sees the "Reading" phase if it's instant
        await new Promise(r => setTimeout(r, 400));
        
        const smartName = getSmartFilename(file.name, text);
        
        // Update state to show the new name and switch to PROCESSING status
        setFiles(currentFiles => 
          currentFiles.map(f => 
            f.id === entry.id 
              ? { ...f, markdownName: smartName, status: ConversionStatus.PROCESSING } 
              : f
          )
        );

        // Artificial delay to visualize the "Naming -> Converting" transition
        await new Promise(r => setTimeout(r, 600));

        // Step C: Start Converting
        const markdown = convertHtmlToMarkdown(text);
        
        // Step D: Complete
        setFiles(currentFiles => 
          currentFiles.map(f => 
            f.id === entry.id 
              ? { ...f, content: markdown, status: ConversionStatus.COMPLETED } 
              : f
          )
        );

      } catch (err) {
        console.error(err);
        setFiles(currentFiles => 
          currentFiles.map(f => 
            f.id === entry.id 
              ? { ...f, status: ConversionStatus.ERROR, errorMessage: 'Failed to process file' } 
              : f
          )
        );
      }
    });
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all converted files?')) {
      setFiles([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex-none border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileDiff className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Format Smormat
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
             <a href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium flex items-center gap-2">
               <Github className="w-4 h-4" />
               <span className="hidden sm:inline">Source</span>
             </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-3xl mx-auto px-6 py-12 pb-32">
          
          {/* Intro Text */}
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
              Format? <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Smormat.</span>
            </h2>
            <p className="text-zinc-400 max-w-lg mx-auto text-lg">
              The universal converter. <br/>
              <span className="text-sm text-zinc-500 mt-2 block">
                (Currently converting HTML to Markdown. More formats arriving soon.)
              </span>
            </p>
          </div>

          {/* Drag & Drop Area */}
          <div className="mb-12">
            <DropZone onFilesDropped={processFiles} />
          </div>

          {/* Results List */}
          {files.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-lg font-semibold text-zinc-200">Converted Files ({files.length})</h3>
                </div>
                <button 
                  onClick={clearAll}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider font-semibold"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-4">
                {files.map(file => (
                  <FileItem 
                    key={file.id} 
                    file={file} 
                    onRemove={removeFile} 
                  />
                ))}
              </div>
            </div>
          )}
          
        </div>
      </main>
      
      {/* Footer */}
      <footer className="flex-none py-6 text-center text-zinc-600 text-sm border-t border-zinc-900 bg-zinc-950">
        <p>Built by AURA. Pure Client-Side Processing.</p>
      </footer>
    </div>
  );
};

export default App;