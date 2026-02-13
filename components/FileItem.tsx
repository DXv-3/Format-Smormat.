import React, { useState } from 'react';
import { Check, Download, FileText, ChevronDown, ChevronUp, Trash2, RefreshCw, ScanLine } from 'lucide-react';
import { ProcessedFile, ConversionStatus } from '../types';

interface FileItemProps {
  file: ProcessedFile;
  onRemove: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove }) => {
  const [expanded, setExpanded] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.markdownName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderStatusIcon = () => {
    switch (file.status) {
      case ConversionStatus.PROCESSING:
        return <RefreshCw className="w-5 h-5 animate-spin" />;
      case ConversionStatus.READING:
        return <ScanLine className="w-5 h-5 animate-pulse" />;
      case ConversionStatus.ERROR:
        // Although the icon color changes in the container, we just return the generic file icon or specific error icon here
        return <FileText className="w-5 h-5" />; 
      case ConversionStatus.COMPLETED:
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case ConversionStatus.COMPLETED:
        return 'bg-emerald-500/10 text-emerald-500';
      case ConversionStatus.ERROR:
        return 'bg-red-500/10 text-red-500';
      case ConversionStatus.PROCESSING:
        return 'bg-blue-500/10 text-blue-500';
      case ConversionStatus.READING:
        return 'bg-purple-500/10 text-purple-400';
      default:
        return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case ConversionStatus.READING:
        return 'Reading & Naming...';
      case ConversionStatus.PROCESSING:
        return 'Converting...';
      case ConversionStatus.COMPLETED:
        return 'Markdown';
      case ConversionStatus.ERROR:
        return 'Error';
      default:
        return 'Waiting';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300 hover:border-zinc-700 group">
      <div className="p-4 flex items-center justify-between">
        
        {/* Left: Icon & Info */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className={`
            w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300
            ${getStatusColor()}
          `}>
             {renderStatusIcon()}
          </div>
          
          <div className="flex flex-col min-w-0">
            <h4 className="font-medium text-zinc-200 truncate pr-4" title={file.status === ConversionStatus.READING ? 'Scanning content...' : file.markdownName}>
              {file.status === ConversionStatus.READING ? file.originalName : file.markdownName}
            </h4>
            <div className="flex items-center space-x-2 text-xs text-zinc-500">
              <span>{formatSize(file.originalSize)}</span>
              <span>&rarr;</span>
              <span className={file.status === ConversionStatus.READING || file.status === ConversionStatus.PROCESSING ? "text-zinc-300" : "text-zinc-400"}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {file.status === ConversionStatus.COMPLETED && (
            <>
              <button 
                onClick={() => setExpanded(!expanded)}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors hidden sm:block"
                title="Preview"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button 
                onClick={handleDownload}
                className="flex items-center space-x-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-lg shadow-zinc-900/20 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </>
          )}

          <button 
            onClick={() => onRemove(file.id)}
            className="p-2 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {expanded && file.status === ConversionStatus.COMPLETED && (
        <div className="border-t border-zinc-800 bg-zinc-950/50 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Markdown Preview</span>
            <span className="text-xs text-zinc-600">First 500 chars</span>
          </div>
          <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 max-h-40 overflow-y-auto">
            {file.content.slice(0, 500)}
            {file.content.length > 500 && '...'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FileItem;