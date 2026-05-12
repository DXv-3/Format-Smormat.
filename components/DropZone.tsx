import React, { useCallback, useState, useEffect } from 'react';
import { Upload, FileCode, FileWarning, FileText, Image as ImageIcon, Archive, Edit3 } from 'lucide-react';

const MorphingTitle: React.FC<{ text: string }> = ({ text }) => {
  const [fonts, setFonts] = useState<string[]>(Array(text.length).fill('font-sans'));

  useEffect(() => {
    const interval = setInterval(() => {
      setFonts(prev => prev.map(() => Math.random() > 0.85 ? 'font-serif italic text-pink-500/80' : 'font-sans'));
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
    <div className={`relative w-full rounded-2xl p-[3px] transition-all duration-500 hover:scale-[1.01] ${isDragActive ? 'scale-[1.02]' : ''}`}>
      {/* Neon Glow Layer */}
      <div 
        className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-teal-400 to-amber-400 blur-xl transition-all duration-500 animate-border-flow
        ${isDragActive ? 'opacity-100 shadow-[0_0_40px_rgba(74,222,128,0.8)]' : 'opacity-40 group-hover:opacity-80'}`}
      ></div>
      {/* Solid Neon Border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500 via-teal-400 to-amber-400 animate-border-flow"></div>

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative z-10 group cursor-pointer transition-colors duration-300 ease-out
          flex flex-col items-center justify-center text-center rounded-[13px]
          min-h-[400px] w-full bg-white overflow-hidden
          ${isDragActive ? 'bg-white/90 backdrop-blur-sm' : ''}
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
              <div className="mb-6 text-red-600 bg-red-50 p-4 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                 <FileWarning className="w-8 h-8 mx-auto" strokeWidth={1.5} />
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-full transition-all duration-300 bg-gradient-to-r from-pink-500 to-teal-400 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                 <Upload className="w-8 h-8 mx-auto" strokeWidth={1.5} />
              </div>
            )}
          </div>

          <h3 className="text-2xl font-serif mb-3 tracking-tight font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-teal-400 to-amber-400 animate-text-gradient">
            <MorphingTitle text={isDragActive ? 'Drop to initialize sequence' : 'Drag & Drop documents here'} />
          </h3>
          
          <p className="text-sm text-zinc-500 mb-10 max-w-md leading-relaxed">
            {errorMsg ? (
              <span className="text-red-600 font-medium">{errorMsg}</span>
            ) : (
              "Browse or drop your files securely. All processing happens entirely inside your browser sandbox."
            )}
          </p>

          {/* Feature Capability Grid */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 w-full transition-opacity duration-500 ${isDragActive ? 'opacity-30' : 'opacity-100'}`}>
            
            <div className="flex flex-col items-center p-4 bg-[#F9F9F7] border border-zinc-200/60 rounded-md group-hover:border-teal-200 transition-colors">
              <Edit3 className="w-5 h-5 text-teal-500 mb-2" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider mb-1">Fillable PDF</span>
              <span className="text-[10px] text-zinc-500">Auto-detect blanks</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-[#F9F9F7] border border-zinc-200/60 rounded-md group-hover:border-pink-200 transition-colors">
              <FileText className="w-5 h-5 text-pink-500 mb-2" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider mb-1">Clean MD</span>
              <span className="text-[10px] text-zinc-500">Docx, HTML, PDF</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-[#F9F9F7] border border-zinc-200/60 rounded-md group-hover:border-amber-200 transition-colors">
              <ImageIcon className="w-5 h-5 text-amber-500 mb-2" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider mb-1">Image Rip</span>
              <span className="text-[10px] text-zinc-500">Extracts PDF Pages</span>
            </div>

            <div className="flex flex-col items-center p-4 bg-[#F9F9F7] border border-zinc-200/60 rounded-md group-hover:border-teal-200 transition-colors">
              <Archive className="w-5 h-5 text-teal-600 mb-2" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-zinc-900 uppercase tracking-wider mb-1">Code Dump</span>
              <span className="text-[10px] text-zinc-500">Unpacks ZIPs / CRXs</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DropZone;