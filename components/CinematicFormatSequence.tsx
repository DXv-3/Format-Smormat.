// components/CinematicFormatSequence.tsx
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ProcessedFile } from '../types';
import { FileText, Image as ImageIcon, FileType, CheckCircle, Sparkles } from 'lucide-react';

interface CinematicFormatSequenceProps {
  file: ProcessedFile;
}

export const CinematicFormatSequence: React.FC<CinematicFormatSequenceProps> = ({ file }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // We'll track the scroll progress over a tall container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // 0 - 20%: Initial State
  const initialOpacity = useTransform(scrollYProgress, [0, 0.15, 0.2], [1, 1, 0]);
  const initialScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // 20 - 40%: Raw / Meta
  const rawOpacity = useTransform(scrollYProgress, [0.15, 0.25, 0.35, 0.4], [0, 1, 1, 0]);
  const rawY = useTransform(scrollYProgress, [0.15, 0.25, 0.35, 0.4], [50, 0, 0, -50]);

  // 40 - 60%: Primary Format (Markdown or Images)
  const primaryOpacity = useTransform(scrollYProgress, [0.35, 0.45, 0.55, 0.6], [0, 1, 1, 0]);
  const primaryScale = useTransform(scrollYProgress, [0.35, 0.45, 0.55, 0.6], [0.9, 1, 1, 1.1]);

  // 60 - 80%: Secondary Format
  const secondaryOpacity = useTransform(scrollYProgress, [0.55, 0.65, 0.75, 0.8], [0, 1, 1, 0]);
  const secondaryFilter = useTransform(scrollYProgress, [0.55, 0.65, 0.75, 0.8], ['blur(10px)', 'blur(0px)', 'blur(0px)', 'blur(10px)']);

  // 80 - 100%: Completed / Export State
  const finalOpacity = useTransform(scrollYProgress, [0.75, 0.85, 1], [0, 1, 1]);
  const finalY = useTransform(scrollYProgress, [0.75, 0.85, 1], [50, 0, 0]);

  return (
    <div ref={containerRef} className="relative w-full h-[400vh]">
      {/* Sticky viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center bg-zinc-50 border-y border-zinc-200">
        
        {/* Progress scrub bar */}
        <div className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 z-50 origin-left" 
          style={{ width: '100%', scaleX: scrollYProgress as any }} />

        {/* 0-20%: Initial State */}
        <motion.div 
          style={{ opacity: initialOpacity, scale: initialScale }}
          className="absolute inset-0 flex flex-col items-center justify-center p-8"
        >
          <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <FileType className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-3xl font-serif text-zinc-900 tracking-tight font-medium mb-2">{file.originalName}</h2>
          <p className="text-zinc-500 font-mono text-sm tracking-wider uppercase">Scroll to Sequence Formats</p>
        </motion.div>

        {/* 20-40%: Raw Content & AI Insights */}
        <motion.div 
          style={{ opacity: rawOpacity, y: rawY }}
          className="absolute inset-x-4 md:inset-x-8 max-w-5xl mx-auto top-[15%] bottom-[15%] bg-white border border-zinc-200 shadow-xl rounded-xl p-8 flex flex-col md:flex-row gap-8"
        >
          {file.aiMetadata && (
            <div className="w-full md:w-1/3 flex flex-col border-b md:border-b-0 md:border-r border-zinc-100 pb-6 md:pb-0 md:pr-8">
               <div className="flex items-center space-x-2 mb-6 text-purple-600">
                 <Sparkles className="w-5 h-5" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">AI Intelligence</h3>
               </div>
               <p className="text-zinc-700 text-sm leading-relaxed mb-6">{file.aiMetadata.summary}</p>
               
               <div className="space-y-4">
                 <div>
                   <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Type</span>
                   <span className="inline-block px-2 py-1 bg-zinc-100 text-zinc-800 text-xs font-medium rounded">{file.aiMetadata.documentType}</span>
                 </div>
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
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-zinc-100">
              <FileText className="w-6 h-6 text-zinc-600" />
              <h3 className="text-xl font-medium text-zinc-800">Raw Content Structure</h3>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 z-10 pointer-events-none" />
              <pre className="text-xs font-mono text-zinc-500 whitespace-pre-wrap break-words leading-relaxed h-full pr-4 pb-12 overflow-y-auto">
                {file.content || 'Generating content architecture...'}
              </pre>
            </div>
          </div>
        </motion.div>

        {/* 40-60%: Primary Render */}
        <motion.div 
          style={{ opacity: primaryOpacity, scale: primaryScale }}
          className="absolute inset-0 flex items-center justify-center p-12 bg-zinc-900 text-white"
        >
          <div className="max-w-3xl w-full text-center">
            <h3 className="text-4xl font-serif mb-8 text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
              Primary Extraction Render
            </h3>
            <div className="aspect-video bg-zinc-800 rounded-xl border border-zinc-700 shadow-2xl overflow-hidden flex items-center justify-center">
              {file.images && file.images.length > 0 ? (
                <img src={file.images[0]} alt="Extracted preview" className="w-full h-full object-contain" />
              ) : (
                <FileText className="w-24 h-24 text-zinc-700" />
              )}
            </div>
          </div>
        </motion.div>

        {/* 60-80%: Secondary Format */}
        <motion.div 
          style={{ opacity: secondaryOpacity, filter: secondaryFilter }}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-tr from-indigo-500/10 to-teal-400/10"
        >
          <div className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl p-12 text-center max-w-lg">
            <ImageIcon className="w-12 h-12 text-teal-500 mx-auto mb-6" />
            <h3 className="text-2xl font-semibold text-zinc-800 mb-4">Secondary Manifests</h3>
            <div className="flex gap-4 justify-center">
               <div className="px-4 py-2 bg-[#F9F9F7] border border-zinc-200 rounded-md text-sm font-medium text-zinc-600">
                 {file.images?.length || 0} Assets Ripped
               </div>
               {file.pdfUrl && <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-md text-sm font-medium text-rose-600">PDF Ready</div>}
            </div>
          </div>
        </motion.div>

        {/* 80-100%: Completed */}
        <motion.div 
          style={{ opacity: finalOpacity, y: finalY }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-white"
        >
          <CheckCircle className="w-20 h-20 text-emerald-500 mb-8" strokeWidth={1} />
          <h2 className="text-4xl font-serif text-zinc-900 mb-4">Sequence Completed</h2>
          <p className="text-zinc-500 text-lg mb-8">All permutations are primed for export.</p>
          <div className="flex gap-4">
             <button className="px-8 py-3 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition-colors shadow-lg">
               Download Target Array
             </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
