import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessedFile } from '../types';
import { Network, Zap, Binary, Workflow, CheckCircle, BrainCircuit } from 'lucide-react';
import { conversionGraph } from '../lib/format-router/graph';
import { UniversalConverter } from './UniversalConverter';

interface IngestionEngineProps {
  file: ProcessedFile;
  onExecuteSpecialist: (id: string, action: string, customInstruction?: string) => void;
  onExecuteUniversal: (id: string, extOut: string, buf: Uint8Array, irNodeKind: string) => void;
  onAnalyze: (id: string) => void;
}

export const IngestionEngine: React.FC<IngestionEngineProps> = ({ file, onExecuteSpecialist, onExecuteUniversal, onAnalyze }) => {
  const [phase, setPhase] = useState<'analyzing' | 'gameplan'>('analyzing');
  const [analysisSteps, setAnalysisSteps] = useState<string[]>([]);
  const [showUniversal, setShowUniversal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    onAnalyze(file.id);

    const steps = [
      'Deconstructing binary headers...',
      'Mapping semantic heuristic graph...',
      'Evaluating cross-modality capabilities...',
      'Generating Universal Game Plan.'
    ];

    let stepIndex = 0;
    const interval = setInterval(() => {
      setAnalysisSteps(prev => {
        if (prev.length <= steps.length) {
          return [...prev, steps[stepIndex]];
        }
        return prev;
      });
      stepIndex++;
      if (stepIndex === steps.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('gameplan'), 50);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [file.id, onAnalyze]);

  const getGamePlanOptions = () => {
    const ext = file.originalName.split('.').pop()?.toLowerCase();
    const options = [];
    
    // Dynamic Analysis-based options
    if (file.aiMetadata) {
      if (file.aiMetadata.documentType === 'Invoice') {
        options.push({
          id: 'extract_financials',
          icon: <Binary className="w-5 h-5" />,
          title: 'Extract Financial Schema',
          desc: 'Automatically map line items and totals to structured JSON or CSV.',
          color: 'teal'
        });
      }
      if (file.aiMetadata.sentiment === 'Negative') {
        options.push({
          id: 'tone_neutralizer',
          icon: <BrainCircuit className="w-5 h-5" />,
          title: 'Neutralize Tone',
          desc: 'Rewrite document content to be formal and neutral.',
          color: 'indigo'
        });
      }
    }

    if (ext === 'pdf') {
      options.push({
        id: 'pdf_fillable',
        icon: <Workflow className="w-5 h-5" />,
        title: 'Generate Fillable Form Matrix',
        desc: 'Detects blank spaces and automatically synthesizes an interactive fillable PDF document.',
        color: 'teal'
      });
      options.push({
        id: 'extract_images',
        icon: <Zap className="w-5 h-5" />,
        title: 'Rendition & Image Extraction',
        desc: 'Rip the document apart to extract graphical assets or page-by-page PNG renders.',
        color: 'amber'
      });
    }

    if (ext === 'html' || ext === 'htm') {
      options.push({
        id: 'markdown_smart',
        icon: <Zap className="w-5 h-5" />,
        title: 'Smart Article Extraction',
        desc: 'Uses Mozilla Readability to strip ads and sidebars, extracting only the core article content into Markdown.',
        color: 'indigo'
      });
    }

    if (ext === 'docx') {
      options.push({
        id: 'docx_to_pdf',
        icon: <Workflow className="w-5 h-5" />,
        title: 'DOCX to PDF Engine',
        desc: 'Renders the DOCX layout and synthesizes a flattened PDF document.',
        color: 'teal'
      });
    }

    options.push({
      id: 'ai_second_brain',
      icon: <BrainCircuit className="w-5 h-5" />,
      title: 'Add to 2nd Brain (PKM)',
      desc: 'Optimizes document for Obsidian/Notion. Extracts metadata, tags, bidirectional links, and a frontmatter YAML block.',
      color: 'indigo'
    });

    options.push({
      id: 'ai_insights_deep',
      icon: <Network className="w-5 h-5" />,
      title: 'Deep AI Perspective Analysis',
      desc: 'Dives deep and gets its hands dirty. Specify a persona or topic focus, and Gemini will workshop the document to extract specialized insights.',
      color: 'amber'
    });

    options.push({
      id: 'ai_llm_prompt',
      icon: <Workflow className="w-5 h-5" />,
      title: 'LLM-Optimized Prompt Constructor',
      desc: 'Reformat the document into a strict System Prompt framework ready to inject into standard instruction-tuned contextual LLMs.',
      color: 'teal'
    });

    options.push({
      id: 'ai_custom',
      icon: <Binary className="w-5 h-5" />,
      title: 'Custom AI Transformation',
      desc: 'Let Gemini strictly enforce a custom structure exactly how you want it. Requires input in the field below.',
      color: 'pink'
    });

    // Default markdown raw for everything
    options.push({
      id: 'markdown_raw',
      icon: <Binary className="w-5 h-5" />,
      title: 'Structural Content Rip',
      desc: 'Extract raw text or source content directly into uniformly parseable Markdown.',
      color: 'pink'
    });

    return options;
  };

  const gamePlanOptions = getGamePlanOptions();

  const detectInitialFormat = () => {
    if (!file.rawFile) return null;
    let detected = Array.from(conversionGraph.formats.values()).find(f => f.mimeTypes && f.mimeTypes.includes(file.rawFile!.type));
    if (!detected) {
      const ext = '.' + file.rawFile.name.split('.').pop()?.toLowerCase();
      detected = Array.from(conversionGraph.formats.values()).find(f => f.extensions && f.extensions.includes(ext));
    }
    return detected;
  };

  const detectedFormat = detectInitialFormat();

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'teal': return 'bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white border-teal-200/50 hover:border-teal-400 group-hover:shadow-[0_0_15px_rgba(45,212,191,0.2)]';
      case 'amber': return 'bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white border-amber-200/50 hover:border-amber-400 group-hover:shadow-[0_0_15px_rgba(251,191,36,0.2)]';
      case 'indigo': return 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white border-indigo-200/50 hover:border-indigo-400 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]';
      case 'pink': return 'bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white border-pink-200/50 hover:border-pink-400 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.2)]';
      default: return 'bg-zinc-50 text-zinc-600 group-hover:bg-zinc-500 group-hover:text-white border-zinc-200 hover:border-zinc-400';
    }
  };

  if (showUniversal) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full bg-white border border-zinc-200 shadow-xl rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 font-bold">
            Universal Routing Node
          </h3>
          <button onClick={() => setShowUniversal(false)} className="text-zinc-400 hover:text-zinc-800 text-sm font-medium">
            ← Back to Game Plan
          </button>
        </div>
        <UniversalConverter 
          initialFile={file.rawFile} 
          onConverted={(filename, buf, kind) => onExecuteUniversal(file.id, filename, buf, kind)} 
        />
      </motion.div>
    );
  }

  return (
    <div className="w-full min-h-[400px] flex items-center justify-center p-6 relative overflow-hidden bg-white/50 backdrop-blur-xl border border-zinc-200/60 rounded-[24px] shadow-2xl">
      <AnimatePresence mode="wait">
        {phase === 'analyzing' ? (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
            className="flex flex-col items-center max-w-md w-full"
          >
            <div className="relative w-32 h-32 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-l-2 border-indigo-500/50"
              />
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full border-b-2 border-r-2 border-cyan-400/50"
              />
              <motion.div 
                animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 blur-xl"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-8 h-8 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
              </div>
            </div>

            <h3 className="text-2xl font-serif tracking-tight mb-6 font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-800 to-zinc-500">
              Ingesting Topography
            </h3>

            <div className="w-full space-y-3">
              {analysisSteps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center space-x-3 text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="font-mono text-zinc-600">{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="gameplan"
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            className="w-full flex flex-col pt-4"
          >
            <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-6">
              <div>
                <h2 className="text-3xl font-serif tracking-tight font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500 mb-2">
                  The Game Plan
                </h2>
                <div className="flex items-center space-x-2 text-sm text-zinc-500 font-mono">
                  <span>{file.originalName}</span>
                  <span>•</span>
                  <span>{(file.originalSize / 1024).toFixed(1)} KB</span>
                  {detectedFormat && (
                    <>
                      <span>•</span>
                      <span className="text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/50">
                        {detectedFormat.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {gamePlanOptions.map((opt) => (
                <div key={opt.id} className="flex flex-col space-y-2">
                  <button 
                    onClick={() => onExecuteSpecialist(file.id, opt.id, customPrompt)}
                    disabled={(opt.id === 'ai_custom' || opt.id === 'ai_insights_deep') && !customPrompt.trim()}
                    className={`group relative overflow-hidden rounded-2xl bg-white border p-6 text-left transition-all duration-500 shadow-sm disabled:opacity-50 hover:shadow-xl ${getColorClasses(opt.color)}`}
                  >
                    <div className="relative z-10 flex flex-col space-y-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-white/50 shadow-sm border border-black/5">
                        {opt.icon}
                      </div>
                      <h3 className="text-lg font-bold tracking-tight">{opt.title}</h3>
                      <p className="text-sm opacity-80 leading-relaxed font-medium">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                  {(opt.id === 'ai_custom' || opt.id === 'ai_insights_deep') && (
                    <div className="px-1">
                      <input 
                        type="text" 
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        placeholder={opt.id === 'ai_custom' ? "E.g. Transform into a CSV with 3 columns" : "E.g. Evaluate from a cybersecurity perspective..."} 
                        className={`w-full text-sm p-3 bg-white/50 border rounded-xl focus:outline-none focus:ring-2 transition-all font-medium placeholder:text-zinc-400 ${opt.id === 'ai_custom' ? 'border-pink-200/50 text-pink-900 focus:ring-pink-300' : 'border-amber-200/50 text-amber-900 focus:ring-amber-300'}`}
                      />
                    </div>
                  )}
                </div>
              ))}

              <button 
                onClick={() => setShowUniversal(true)}
                className="group relative md:col-span-2 overflow-hidden rounded-2xl bg-[#0A0A0A] border border-zinc-800 p-6 text-left hover:border-zinc-500 transition-all duration-500 shadow-lg hover:shadow-2xl hover:shadow-zinc-900/50"
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-900 to-black group-hover:from-zinc-700/40 transition-colors duration-500" />
                <div className="absolute -right-10 -top-10 opacity-10 group-hover:opacity-20 transition-opacity duration-700 blur-2xl">
                  <Network className="w-64 h-64 text-cyan-500" />
                </div>
                <div className="relative z-10 flex flex-col space-y-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:scale-110 group-hover:text-white transition-all duration-300">
                     <Network className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 tracking-tight">Deploy Universal Constructor Node</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                    Push the data through Dijkstra's pathfinding graph. The engine will evaluate multi-step handler conversions automatically to mutate your file into exotic formats.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
