import React, { useState, useEffect } from 'react';
import { Settings2, AlertCircle, X, Search, Upload } from 'lucide-react';
import { conversionGraph } from '../lib/format-router/graph';

interface UniversalConverterProps {
  onConverted: (filename: string, bin: Uint8Array) => void;
  initialFile?: File;
}

export const UniversalConverter: React.FC<UniversalConverterProps> = ({ onConverted, initialFile }) => {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [inFormat, setInFormat] = useState<string>('');
  const [outFormat, setOutFormat] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchOut, setSearchOut] = useState('');
  
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleNewFile(dropped);
  };

  const handleNewFile = (newFile: File) => {
    setFile(newFile);
    setErrorMsg('');
    setProgressMsg('');
    
    // Auto-detect by mime
    let detected = Array.from(conversionGraph.formats.values()).find(f => f.mimeTypes && f.mimeTypes.includes(newFile.type));
    
    // Fallback exactly to extensions
    if (!detected) {
      const ext = '.' + newFile.name.split('.').pop()?.toLowerCase();
      detected = Array.from(conversionGraph.formats.values()).find(f => f.extensions && f.extensions.includes(ext));
    }

    if (detected) {
      setInFormat(detected.id);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files.length) {
        handleNewFile(e.clipboardData.files[0]);
      }
    };
    
    document.addEventListener('paste', handlePaste);
    if (initialFile) {
      handleNewFile(initialFile);
    }
    return () => document.removeEventListener('paste', handlePaste);
  }, [initialFile]);

  const runConvert = async () => {
    if (!file || !inFormat || !outFormat) return;
    setIsProcessing(true);
    setErrorMsg('');
    setProgressMsg('Calculating optimal path...');

    try {
      if (conversionGraph.handlers.size === 0) {
        // Safe lazy load
        const { bootstrapFormatRouter } = await import('../lib/format-router/bootstrap');
        bootstrapFormatRouter();
        await conversionGraph.initAllSupported();
      }

      const paths = Array.from(conversionGraph.yieldPaths(inFormat, outFormat));
      if (paths.length === 0) {
        throw new Error('No conversion paths found between these formats.');
      }

      // Try paths sequentially
      let successBuf: Uint8Array | null = null;
      let winningPath = null;

      const buffer = new Uint8Array(await file.arrayBuffer());

      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        try {
          setProgressMsg(`Executing Route: ${[inFormat, ...path.steps.map(s => s.toFormat)].join(' → ')}`);
          successBuf = await conversionGraph.runPath(buffer, path);
          if (successBuf) {
            winningPath = path;
            break;
          }
        } catch {
          // Log and continue to next path
          console.warn(`Path failed, trying next...`);
        }
      }

      if (!successBuf || !winningPath) {
        throw new Error('All possible conversion paths failed.');
      }

      setProgressMsg('Conversion complete!');
      setTimeout(() => setProgressMsg(''), 3000);
      
      const outExt = conversionGraph.formats.get(outFormat)?.extensions[0] || `.${outFormat}`;
      const newName = file.name.split('.').slice(0, -1).join('.') + outExt;
      
      onConverted(newName, successBuf);

    } catch (err: any) {
      setErrorMsg(err.message || 'Conversion failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const allFormats = Array.from(conversionGraph.formats.values());
  const possibleOutFormats = inFormat ? allFormats.filter(f => f.id !== inFormat && f.name.toLowerCase().includes(searchOut.toLowerCase())) : [];

  return (
    <div className={`relative mt-8 rounded-[18px] p-[2px] transition-all duration-500 group ${isDragActive ? 'scale-[1.01]' : 'hover:scale-[1.01]'}`}>
      
      {/* Glow Layer */}
      <div className={`absolute inset-0 rounded-[18px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 blur-lg transition-all duration-500 animate-border-flow ${isDragActive ? 'opacity-80 shadow-[0_0_30px_rgba(168,85,247,0.6)]' : 'opacity-20 group-hover:opacity-60'}`}></div>
      
      {/* Border Layer */}
      <div className="absolute inset-0 rounded-[18px] bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-border-flow"></div>

      {/* Main Card Content */}
      <div className="relative z-10 bg-white rounded-[16px] p-6 shadow-sm flex flex-col">
        <div className="flex items-center space-x-2 text-zinc-900 mb-6 font-serif">
          <Settings2 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xl font-medium tracking-tight">Universal Constructor Node</h3>
        </div>

        <div 
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`w-full min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors mb-6 ${isDragActive ? 'bg-indigo-50/50 border-indigo-400 backdrop-blur-sm' : 'bg-[#F9F9F7] border-zinc-200 hover:border-indigo-300'}`}
          onClick={() => document.getElementById('uv-file')?.click()}
        >
          <input type="file" id="uv-file" className="hidden" onChange={(e) => e.target.files && handleNewFile(e.target.files[0])} />
          {file ? (
            <div className="flex flex-col items-center z-20">
              <div className="flex items-center space-x-3 bg-white p-3 rounded-md shadow-sm border border-zinc-100">
                <span className="font-semibold text-zinc-800 text-sm">{file.name}</span>
                <span className="text-xs text-zinc-400">({(file.size / 1024).toFixed(1)} KB)</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setInFormat(''); setOutFormat(''); }} 
                  className="hover:text-red-500 transition-colors p-1 rounded-sm"
                ><X className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
              </div>
              {inFormat && (
                <div className="mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium border border-indigo-100">
                  Detected Input Format: {conversionGraph.formats.get(inFormat)?.name || inFormat}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 px-4 z-0 pointer-events-none">
              <div className={`transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDragActive ? 'scale-110 -translate-y-2' : 'scale-100'}`}>
                <div className="mb-4 p-4 rounded-full transition-all duration-300 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                   <Upload className="w-7 h-7 mx-auto" strokeWidth={1.5} />
                </div>
              </div>

              <h3 className="text-2xl font-serif mb-2 tracking-tight font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 animate-text-gradient">
                {isDragActive ? 'Drop to load buffer' : 'Drag & Drop documents here'}
              </h3>
              
              <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                Browse or drop your files here to load them into the Universal Graph routing engine.
              </p>
            </div>
          )}
        </div>

        {file && inFormat && (
          <div className="flex flex-col mt-2">
            <div className="flex justify-between items-end mb-4">
               <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Select Output Format Target</label>
               <div className="relative w-48">
                 <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-zinc-400" />
                 <input type="text" placeholder="Filter targets..." value={searchOut} onChange={e => setSearchOut(e.target.value)} className="w-full text-xs pl-8 pr-3 py-1.5 border border-zinc-200 rounded-full bg-zinc-50 focus:bg-white outline-none focus:border-indigo-300 transition-colors" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2 pb-2">
              {possibleOutFormats.map(f => (
                <button
                  key={f.id}
                  onClick={() => setOutFormat(f.id)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${outFormat === f.id ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' : 'border-zinc-200 hover:border-indigo-300 hover:bg-zinc-50 bg-white'}`}
                >
                  <span className={`text-sm font-semibold mb-1 ${outFormat === f.id ? 'text-indigo-700' : 'text-zinc-800'}`}>{f.name}</span>
                  <span className={`text-[10px] ${outFormat === f.id ? 'text-indigo-500' : 'text-zinc-400'}`}>Ext: {f.extensions.join(', ')}</span>
                </button>
              ))}
              {possibleOutFormats.length === 0 && (
                <div className="col-span-full py-8 text-center text-zinc-400 text-sm">No target formats match your filter.</div>
              )}
            </div>
          </div>
        )}

        {file && inFormat && (
          <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
            <div className="flex-1 mr-4">
              {progressMsg && <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md inline-block">{progressMsg}</p>}
              {errorMsg && <p className="text-xs font-mono text-red-600 bg-red-50 px-3 py-1.5 rounded-md inline-block flex items-center space-x-1.5"><AlertCircle className="w-3.5 h-3.5" /><span>{errorMsg}</span></p>}
            </div>
            
            <button 
              onClick={runConvert}
              disabled={!outFormat || isProcessing}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center space-x-2 shadow-sm"
            >
              {isProcessing ? (
                 <span className="flex items-center space-x-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>Routing...</span></span>
              ) : (
                <span>{outFormat ? `Convert to ${conversionGraph.formats.get(outFormat)?.name}` : 'Select target format'}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
