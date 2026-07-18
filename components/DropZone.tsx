import React, { useCallback, useState, useEffect } from 'react';
import { Upload, FileWarning, FileText, Image as ImageIcon, Archive, Edit3 } from 'lucide-react';

const MorphingTitle: React.FC<{ text: string }> = ({ text }) => {
  const [fonts, setFonts] = useState<string[]>(Array(text.length).fill('font-sans'));

  useEffect(() => {
    const interval = setInterval(() => {
      setFonts(prev => prev.map(() => Math.random() > 0.85 ? 'font-serif italic text-zinc-400' : 'font-sans'));
      setTimeout(() => {
        setFonts(Array(text.length).fill('font-sans'));
      }, 300);
    }, 1500);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <>
      {text.split('').map((char, i) => (
        <span key={i} className={`inline-block transition-all duration-300 ${fonts[i]}`}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </>
  );
}

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  acceptAllFiles?: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped, acceptAllFiles = false }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setErrorMsg(null);

    const droppedFiles: File[] = Array.from(e.dataTransfer.files);
    
    let validFiles = droppedFiles;
    
    if (!acceptAllFiles) {
      // Filter for HTML/HTM, JSON, and PDF files only
      validFiles = droppedFiles.filter(file => 
        file.type === 'text/html' || 
        file.name.endsWith('.html') || 
        file.name.endsWith('.htm') ||
        file.type === 'application/json' ||
        file.name.endsWith('.json') ||
        file.type === 'application/pdf' ||
        file.name.endsWith('.pdf')
      );

      if (validFiles.length === 0 && droppedFiles.length > 0) {
        setErrorMsg("Only HTML, JSON, and PDF files are supported in standard mode.");
        return;
      }
    }

    if (validFiles.length > 0) {
      onFilesDropped(validFiles);
    }
  }, [onFilesDropped, acceptAllFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesDropped(selectedFiles);
    }
  };

  return (
    <div className={`relative w-full p-[3px] transition-all duration-300 ${isDragActive ? 'scale-[1.01]' : ''}`}>
      {/* Solid Brutalist Border */}
      <div className="absolute inset-0 border-[3px] border-zinc-900 bg-zinc-900 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] transition-all duration-300"></div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative z-10 group cursor-pointer transition-colors duration-200 ease-out
          flex flex-col items-center justify-center text-center
          min-h-[350px] w-full bg-white overflow-hidden
          ${isDragActive ? 'bg-zinc-100' : ''}
        `}
      >
        <input 
          type="file" 
          multiple 
          accept={acceptAllFiles ? "*" : ".html,.htm,.json,.pdf"} 
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        <div className="flex flex-col items-center p-12 max-w-2xl mx-auto z-0 pointer-events-none">
          <div className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDragActive ? 'scale-110 -translate-y-2' : 'scale-100'}`}>
            {errorMsg ? (
              <div className="mb-6 text-red-600 bg-white border-2 border-red-600 p-4 shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
                 <FileWarning className="w-8 h-8 mx-auto" strokeWidth={2} />
              </div>
            ) : (
              <div className="mb-6 p-4 border-2 border-zinc-900 bg-zinc-900 text-white shadow-[4px_4px_0px_0px_rgba(24,24,27,0.2)] transition-all duration-300">
                 <Upload className="w-8 h-8 mx-auto" strokeWidth={2} />
              </div>
            )}
          </div>

          <h3 className="text-3xl md:text-5xl font-serif mb-4 tracking-tighter font-black text-zinc-900 uppercase">
            <MorphingTitle text={isDragActive ? 'DROP IT' : 'DROP ANY FILE HERE'} />
          </h3>
          
          <p className="text-sm text-zinc-600 mb-10 max-w-md leading-relaxed font-mono font-medium">
            {errorMsg ? (
              <span className="text-red-600 font-bold">{errorMsg}</span>
            ) : (
              "NO CLOUD. NO UPLOADS. ZERO BULLSHIT. WE PROCESS IT ALL CLIENT-SIDE."
            )}
          </p>

          {/* Feature Capability Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 w-full transition-opacity duration-500 ${isDragActive ? 'opacity-30' : 'opacity-100'}`}>
            
            <div className="flex flex-col items-center p-4 bg-zinc-50 border-2 border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
              <Edit3 className="w-6 h-6 mb-3 transition-colors duration-300" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1">Fillable PDF</span>
              <span className="text-[10px] opacity-70 font-mono">Auto-detect blanks</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-zinc-50 border-2 border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
              <FileText className="w-6 h-6 mb-3 transition-colors duration-300" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1">Clean MD</span>
              <span className="text-[10px] opacity-70 font-mono">Docx, HTML, PDF</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-zinc-50 border-2 border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
              <ImageIcon className="w-6 h-6 mb-3 transition-colors duration-300" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1">Image Rip</span>
              <span className="text-[10px] opacity-70 font-mono">Extracts PDF Pages</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-zinc-50 border-2 border-zinc-900 group-hover:bg-zinc-900 group-hover:text-white transition-colors duration-300">
              <Archive className="w-6 h-6 mb-3 transition-colors duration-300" strokeWidth={2} />
              <span className="text-[11px] font-bold uppercase tracking-wider mb-1">Code Dump</span>
              <span className="text-[10px] opacity-70 font-mono">Unpacks ZIPs / CRXs</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DropZone;