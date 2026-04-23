import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Settings2, Download, Check, AlertCircle, X, Search, Upload } from 'lucide-react';
import { conversionGraph } from '../lib/format-router/graph';
import { FormatDef } from '../lib/format-router/types';

interface UniversalConverterProps {
  onConverted: (filename: string, bin: Uint8Array) => void;
}

export const UniversalConverter: React.FC<UniversalConverterProps> = ({ onConverted }) => {
  const [file, setFile] = useState<File | null>(null);
  const [inFormat, setInFormat] = useState<string>('');
  const [outFormat, setOutFormat] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchIn, setSearchIn] = useState('');
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
    let detected = Array.from(conversionGraph.formats.values()).find(f => f.mimeTypes.includes(newFile.type));
    
    // Fallback exactly to extensions
    if (!detected) {
      const ext = '.' + newFile.name.split('.').pop()?.toLowerCase();
      detected = Array.from(conversionGraph.formats.values()).find(f => f.extensions.includes(ext));
    }

    if (detected) {
      setInFormat(detected.id);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    if (e.clipboardData?.files.length) {
      handleNewFile(e.clipboardData.files[0]);
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

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
        } catch (e) {
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
  const filteredIn = allFormats.filter(f => f.name.toLowerCase().includes(searchIn.toLowerCase()) || f.id.includes(searchIn.toLowerCase()));
  const filteredOut = allFormats.filter(f => f.name.toLowerCase().includes(searchOut.toLowerCase()) || f.id.includes(searchOut.toLowerCase()));

  // Render search list dropdown helper inline purely for visual block space since we lack native custom select components here
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
            <div className="flex items-center space-x-3 bg-white p-3 rounded-md shadow-sm border border-zinc-100 z-20">
              <span className="font-semibold text-zinc-800 text-sm">{file.name}</span>
              <span className="text-xs text-zinc-400">({(file.size / 1024).toFixed(1)} KB)</span>
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); }} 
                className="hover:text-red-500 transition-colors p-1 rounded-sm"
              ><X className="w-4 h-4 text-zinc-400 hover:text-red-500" /></button>
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

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        {/* IN FORMAT */}
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Input Format</label>
          <div className="relative">
             <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
             <input type="text" placeholder="Search..." value={searchIn} onChange={e => setSearchIn(e.target.value)} className="w-full text-xs pl-8 pr-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 focus:bg-white mb-2 outline-none" />
          </div>
          <select 
            size={4}
            value={inFormat} 
            onChange={(e) => setInFormat(e.target.value)} 
            className="w-full text-sm border border-zinc-200 rounded-md bg-white p-2 outline-none"
          >
            {filteredIn.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.extensions.join(', ')})</option>
            ))}
          </select>
        </div>

        <div className="flex justify-center rotate-90 md:rotate-0 text-zinc-300">
          <ArrowRight className="w-6 h-6" />
        </div>

        {/* OUT FORMAT */}
        <div className="flex flex-col">
          <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-2">Output Format</label>
          <div className="relative">
             <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
             <input type="text" placeholder="Search..." value={searchOut} onChange={e => setSearchOut(e.target.value)} className="w-full text-xs pl-8 pr-3 py-2 border border-zinc-200 rounded-md bg-zinc-50 focus:bg-white mb-2 outline-none" />
          </div>
          <select 
             size={4}
             value={outFormat} 
             onChange={(e) => setOutFormat(e.target.value)} 
             className="w-full text-sm border border-zinc-200 rounded-md bg-white p-2 outline-none"
          >
            {filteredOut.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.extensions.join(', ')})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex-1 mr-4">
          {progressMsg && <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md inline-block">{progressMsg}</p>}
          {errorMsg && <p className="text-xs font-mono text-red-600 bg-red-50 px-3 py-1.5 rounded-md inline-block flex items-center space-x-1.5"><AlertCircle className="w-3.5 h-3.5" /><span>{errorMsg}</span></p>}
        </div>
        
        <button 
          onClick={runConvert}
          disabled={!file || !inFormat || !outFormat || isProcessing}
          className="bg-black hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center space-x-2"
        >
          {isProcessing ? (
             <span className="flex items-center space-x-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>Routing...</span></span>
          ) : (
            <span>Convert Matrix</span>
          )}
        </button>
      </div>
     </div>
    </div>
  );
};
