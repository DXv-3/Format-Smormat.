import React, { useCallback, useState } from 'react';
import { Upload, FileCode, FileWarning } from 'lucide-react';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped }) => {
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
    
    // Filter for HTML/HTM files strictly
    const htmlFiles = droppedFiles.filter(file => 
      file.type === 'text/html' || 
      file.name.endsWith('.html') || 
      file.name.endsWith('.htm')
    );

    if (htmlFiles.length === 0 && droppedFiles.length > 0) {
      setErrorMsg("Only HTML files are supported.");
      return;
    }

    if (htmlFiles.length > 0) {
      onFilesDropped(htmlFiles);
    }
  }, [onFilesDropped]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesDropped(selectedFiles);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer transition-all duration-300 ease-out
        border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center
        h-64 sm:h-80 w-full
        ${isDragActive 
          ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]' 
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
        }
      `}
    >
      <input 
        type="file" 
        multiple 
        accept=".html,.htm" 
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      <div className={`transition-transform duration-300 ${isDragActive ? 'scale-110' : 'scale-100'}`}>
        {errorMsg ? (
          <div className="bg-red-500/10 p-4 rounded-full mb-4">
             <FileWarning className="w-10 h-10 text-red-500" />
          </div>
        ) : (
          <div className={`${isDragActive ? 'bg-indigo-500' : 'bg-zinc-800'} p-4 rounded-full mb-4 transition-colors duration-300`}>
             <Upload className={`w-10 h-10 ${isDragActive ? 'text-white' : 'text-zinc-400'}`} />
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold text-zinc-100 mb-2">
        {isDragActive ? 'Drop files to convert' : 'Drag & Drop HTML files'}
      </h3>
      
      <p className="text-sm text-zinc-500 max-w-sm">
        {errorMsg ? (
          <span className="text-red-400">{errorMsg}</span>
        ) : (
          "Supports .html and .htm files. Multiple file selection allowed."
        )}
      </p>

      {!isDragActive && !errorMsg && (
        <div className="mt-6 flex items-center space-x-2 text-xs text-zinc-600 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
          <FileCode className="w-3 h-3" />
          <span>Powered by Turndown Engine</span>
        </div>
      )}
    </div>
  );
};

export default DropZone;