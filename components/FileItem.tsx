import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, FileText, ChevronDown, ChevronUp, Trash2, FileType, Image as ImageIcon, Edit3, Sparkles } from 'lucide-react';
import { ProcessedFile, ConversionStatus } from '../types';
import DotLoader from './DotLoader';
import { downloadMarkdown, downloadPdf, downloadFillablePdf, downloadImages } from './file/downloadUtils';

interface FileItemProps {
  file: ProcessedFile;
  onRemove: (id: string) => void;
  onProcess: (id: string, action: string) => void;
  onAnalyze?: (id: string) => void;
  onCinematic?: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = React.memo(({ file, onRemove, onProcess, onAnalyze, onCinematic }) => {
  const [expanded, setExpanded] = useState(false);
  const [showFullMarkdown, setShowFullMarkdown] = useState(false);

  useEffect(() => {
    return () => {
    };
  }, []);

interface ActionButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  icon: any;
  children: React.ReactNode;
  isProcessing?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, disabled, className, title, icon: Icon, children, isProcessing }) => (
  <motion.button 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    disabled={disabled}
    className={`
      relative overflow-hidden flex items-center space-x-1.5 px-3 py-1.5 font-medium text-xs rounded-sm transition-all shadow-sm
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}
    title={title}
  >
    {isProcessing && (
        <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
    )}
    <Icon className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
    <span className="hidden sm:inline z-10">{children}</span>
  </motion.button>
);

  useEffect(() => {
    if (file.aiStatus === 'ANALYZING' && !expanded) {
      setExpanded(true);
    }
  }, [file.aiStatus, expanded]);

  const handleDownload = () => downloadMarkdown(file.content, file.markdownName);
  const handleDownloadPdf = () => { if (file.pdfUrl) downloadPdf(file.pdfUrl, file.originalName); };
  const handleDownloadFillable = () => { if (file.fillablePdfUrl) downloadFillablePdf(file.fillablePdfUrl, file.originalName); };
  const handleDownloadPngs = () => { if (file.images) downloadImages(file.images, file.originalName); };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderStatusIcon = () => {
    switch (file.status) {
      case ConversionStatus.AWAITING_ACTION:
        return <FileText className="w-4 h-4 text-zinc-400" />;
      case ConversionStatus.PROCESSING:
        return <DotLoader />;
      case ConversionStatus.READING:
        return <DotLoader />;
      case ConversionStatus.ERROR:
        return <FileText className="w-4 h-4" />; 
      case ConversionStatus.COMPLETED:
        return <Check className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (file.status) {
      case ConversionStatus.AWAITING_ACTION:
        return 'text-zinc-500 bg-zinc-100';
      case ConversionStatus.COMPLETED:
        return 'text-emerald-600 bg-emerald-50';
      case ConversionStatus.ERROR:
        return 'text-red-600 bg-red-50';
      case ConversionStatus.PROCESSING:
        return 'text-blue-600 bg-blue-50';
      case ConversionStatus.READING:
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-zinc-500 bg-zinc-100';
    }
  };

  const getStatusText = () => {
    switch (file.status) {
      case ConversionStatus.AWAITING_ACTION:
        return 'Action Required';
      case ConversionStatus.READING:
        return 'Reading...';
      case ConversionStatus.PROCESSING:
        return 'Converting...';
      case ConversionStatus.COMPLETED:
        return 'Finished';
      case ConversionStatus.ERROR:
        return 'Error';
      default:
        return 'Waiting';
    }
  };

  return (
    <div className="bg-white border border-zinc-200 overflow-hidden transition-all duration-300 hover:border-zinc-300 group shadow-sm">
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Left: Icon & Info */}
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className={`
            w-8 h-8 flex items-center justify-center shrink-0 transition-colors duration-300 rounded-sm
            ${getStatusColor()}
          `}>
             {renderStatusIcon()}
          </div>
          
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-medium text-zinc-900 truncate pr-4" title={file.status === ConversionStatus.AWAITING_ACTION ? 'Awaiting Action...' : file.markdownName}>
              {file.status === ConversionStatus.AWAITING_ACTION ? file.originalName : file.markdownName}
            </h4>
            <div className="flex items-center space-x-2 text-[11px] text-zinc-500 mt-0.5 uppercase tracking-wider">
              <span>{formatSize(file.originalSize)}</span>
              <span>&mdash;</span>
              <span className={file.status === ConversionStatus.READING || file.status === ConversionStatus.PROCESSING || file.status === ConversionStatus.AWAITING_ACTION ? "text-zinc-800 font-medium" : "text-zinc-500"}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        {file.status === ConversionStatus.AWAITING_ACTION ? (
          <div className="w-full mt-4 pt-4 border-t border-zinc-100">
            <h5 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-3">Specialist Recommendations</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(() => {
                const ext = file.originalName.split('.').pop()?.toLowerCase();
                if (ext === 'pdf') {
                  return (
                    <>
                      <button onClick={() => onProcess(file.id, 'pdf_fillable')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-teal-200/50 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <Edit3 className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Form Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Auto-detects blank spaces and converts them into an interactive fillable PDF document.</p>
                      </button>
                      
                      <button onClick={() => onProcess(file.id, 'extract_images')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-amber-200/50 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <ImageIcon className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Visual Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Rips the document apart to extract graphical assets or page-by-page PNG renders.</p>
                      </button>

                      <button onClick={() => onProcess(file.id, 'markdown_raw')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-pink-200/50 hover:border-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-pink-500" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Content Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Extracts the core textual content into raw, universally usable Markdown structures.</p>
                      </button>
                    </>
                  );
                }
                if (ext === 'html' || ext === 'htm') {
                  return (
                    <>
                      <button onClick={() => onProcess(file.id, 'markdown_smart')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-pink-200/50 hover:border-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-pink-500" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Article Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Strips out HTML boilerplate, nav, and footers, extracting only the clean article semantic content.</p>
                      </button>
                      <button onClick={() => onProcess(file.id, 'markdown_raw')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-zinc-200/50 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(161,161,170,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-zinc-600" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Raw Extraction</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Dumps the raw HTML conversion without filtering or removing boilerplate logic.</p>
                      </button>
                    </>
                  );
                }
                if (ext === 'docx') {
                  return (
                    <>
                      <button onClick={() => onProcess(file.id, 'markdown_raw')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-pink-200/50 hover:border-pink-400 hover:shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileText className="w-4 h-4 text-pink-500" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Content Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Extracts all text, lists, and tables into cleanly parsed structure Markdown.</p>
                      </button>
                      <button onClick={() => onProcess(file.id, 'docx_to_pdf')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-teal-200/50 hover:border-teal-400 hover:shadow-[0_0_15px_rgba(45,212,191,0.15)] transition-all group/btn">
                        <div className="flex items-center space-x-2 mb-1">
                          <FileType className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Format Specialist</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Lossless locked formatting conversion directly from Word to PDF.</p>
                      </button>
                    </>
                  );
                }
                return (
                  <button onClick={() => onProcess(file.id, 'markdown_raw')} className="flex flex-col text-left p-3 rounded-md bg-[#F9F9F7] border border-zinc-200/50 hover:border-zinc-400 hover:shadow-[0_0_15px_rgba(161,161,170,0.15)] transition-all group/btn">
                    <div className="flex items-center space-x-2 mb-1">
                      <Check className="w-4 h-4 text-zinc-600" />
                      <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wide">Default Process</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">Initiates the standard pipeline parsing.</p>
                  </button>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-y-2 justify-end w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-zinc-100">
            {file.status === ConversionStatus.COMPLETED && (
              <>
                <button
                  onClick={() => onCinematic?.(file.id)}
                  className="flex flex-col text-left p-1.5 hover:bg-zinc-100 text-indigo-500 hover:text-indigo-600 transition-colors hidden sm:block rounded-sm"
                  title="Cinematic Sequence"
                >
                  <div className="flex items-center gap-1 font-semibold text-xs uppercase tracking-wider">
                    <span>Cinematic View</span>
                  </div>
                </button>
              
                {file.content && (
                  <>
                    <ActionButton 
                      onClick={() => onAnalyze?.(file.id)}
                      disabled={file.aiStatus === 'ANALYZING' || file.aiStatus === 'COMPLETED'}
                      isProcessing={file.aiStatus === 'ANALYZING'}
                      className={`text-white ${file.aiStatus === 'COMPLETED' ? 'bg-purple-400 cursor-default' : 'bg-gradient-to-r from-purple-500 to-fuchsia-400 hover:from-purple-600 hover:to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]'}`}
                      title={file.aiStatus === 'COMPLETED' ? 'AI Analysis Complete' : 'Extract Insights with AI'}
                      icon={Sparkles}
                    >
                       {file.aiStatus === 'ANALYZING' ? 'Analyzing...' : file.aiStatus === 'COMPLETED' ? 'Insights Extracted' : 'Extract Insights'}
                    </ActionButton>

                    <button 
                      onClick={() => setExpanded(!expanded)}
                      className="p-1.5 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors hidden sm:block"
                      title="Preview"
                    >
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <ActionButton 
                      onClick={handleDownload}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white"
                      title="Download MD"
                      icon={Download}
                    >
                      Download MD
                    </ActionButton>
                  </>
                )}
                
                {file.pdfUrl && (
                  <ActionButton 
                    onClick={handleDownloadPdf}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200"
                    title="Download as PDF"
                    icon={FileType}
                  >
                    PDF
                  </ActionButton>
                )}

                {file.fillablePdfUrl && (
                  <ActionButton 
                    onClick={handleDownloadFillable}
                    className="bg-gradient-to-r from-teal-500 to-teal-400 text-white shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                    title="Download Interactive Fillable PDF"
                    icon={Edit3}
                  >
                    Fillable
                  </ActionButton>
                )}

                {file.images && file.images.length > 0 && (
                  <ActionButton 
                    onClick={handleDownloadPngs}
                    className="bg-gradient-to-r from-amber-400 to-amber-500 text-white shadow-[0_0_10px_rgba(251,191,36,0.3)]"
                    title="Download PNGs"
                    icon={ImageIcon}
                  >
                    PNGs
                  </ActionButton>
                )}
              </>
            )}

            <button 
              onClick={() => onRemove(file.id)}
              className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors ml-2 rounded-sm"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {expanded && file.status === ConversionStatus.COMPLETED && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 sm:p-6">
          {file.aiMetadata && (
            <div className="mb-6 bg-white border border-fuchsia-100 rounded-lg shadow-sm overflow-hidden p-0">
               <div className="bg-gradient-to-r from-fuchsia-50 to-purple-50 px-4 py-3 border-b border-fuchsia-100 flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-purple-500" />
                 <span className="text-xs font-semibold text-purple-900 uppercase tracking-widest">AI Insights</span>
               </div>
               <div className="p-4 sm:p-5">
                 <div className="mb-4">
                   <p className="text-sm text-zinc-700 leading-relaxed">{file.aiMetadata.summary}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                     <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Document Type</span>
                     <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-800 text-xs font-medium rounded">{file.aiMetadata.documentType}</span>
                   </div>
                   <div>
                     <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Sentiment / Tone</span>
                     <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-800 text-xs font-medium rounded">{file.aiMetadata.sentiment}</span>
                   </div>
                 </div>

                 {file.aiMetadata.keyEntities && file.aiMetadata.keyEntities.length > 0 && (
                   <div className="mb-4">
                     <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Key Entities</span>
                     <div className="flex flex-wrap gap-2">
                       {file.aiMetadata.keyEntities.map((entity: string, i: number) => (
                         <span key={i} className="px-2 py-1 border border-zinc-200 text-zinc-600 text-[11px] rounded bg-zinc-50">{entity}</span>
                       ))}
                     </div>
                   </div>
                 )}

                 {file.aiMetadata.tags && file.aiMetadata.tags.length > 0 && (
                   <div>
                     <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Tags</span>
                     <div className="flex flex-wrap gap-2">
                       {file.aiMetadata.tags.map((tag: string, i: number) => (
                         <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full border border-blue-100">#{tag}</span>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Markdown Preview</span>
            <button 
              onClick={() => setShowFullMarkdown(!showFullMarkdown)}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            >
              {showFullMarkdown ? 'Show Less' : `Show Full Output (${(file.content.length / 1000).toFixed(1)}kb)`}
            </button>
          </div>
          <pre className={`text-xs leading-relaxed text-zinc-700 font-mono whitespace-pre-wrap break-all bg-white p-4 border border-zinc-200 overflow-y-auto mb-6 shadow-sm ${showFullMarkdown ? 'max-h-[600px]' : 'max-h-48'}`}>
            {showFullMarkdown ? file.content : file.content.slice(0, 500)}
            {!showFullMarkdown && file.content.length > 500 && '...'}
          </pre>
          
          {file.images && file.images.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Extracted Images ({file.images.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto p-4 bg-white border border-zinc-200 shadow-sm">
                {file.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-[3/4] overflow-hidden border border-zinc-200 bg-zinc-50 group-hover:border-zinc-300 transition-colors">
                    <img src={img} alt={`Page ${idx + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-1.5 text-center border-t border-zinc-200">
                      <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Page {idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default FileItem;