import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProcessedFile } from '../types';
import { FileText, FileType, Sparkles, Image as ImageIcon, CheckCircle, ChevronRight, Download } from 'lucide-react';

interface CinematicTransformationViewProps {
  file: ProcessedFile;
  onClose: () => void;
}

const steps = [
  { id: 'raw', title: 'Content Extraction', description: 'Parsing document blocks...', icon: FileText },
  { id: 'analysis', title: 'AI Intelligence', description: 'Unfolding structural semantics...', icon: Sparkles },
  { id: 'render', title: 'Primary Render', description: 'Formatting typography...', icon: FileType },
  { id: 'assets', title: 'Asset Manifest', description: 'Cataloging extracted media...', icon: ImageIcon },
  { id: 'complete', title: 'Ready for Export', description: 'Pipeline finalized.', icon: CheckCircle },
];

export const CinematicTransformationView: React.FC<CinematicTransformationViewProps> = ({ file, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F9F7] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <h2 className="text-xl font-serif text-zinc-900">{file.originalName}</h2>
        <button onClick={onClose} className="px-4 py-2 border border-zinc-200 rounded-full text-sm font-medium hover:bg-zinc-100 transition-all duration-300">Close</button>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={steps[currentStep].id}
            initial={{ opacity: 0, clipPath: 'inset(10% 50% 10% 50%)' }}
            animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
            exit={{ opacity: 0, clipPath: 'inset(10% 50% 10% 50%)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-4xl bg-gradient-to-br from-white to-zinc-50 shadow-2xl rounded-2xl p-12 border border-zinc-100 flex flex-col items-center justify-center min-h-[400px]"
          >
            {(() => {
                const Icon = steps[currentStep].icon;
                return <Icon className="w-16 h-16 text-indigo-500 mb-6" />;
            })()}
            <h3 className="text-4xl font-serif text-zinc-900 mb-2">{steps[currentStep].title}</h3>
            <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase mb-8">{steps[currentStep].description}</p>
            
            <div className="w-full bg-zinc-50 rounded-lg p-6 border border-zinc-100 text-sm leading-relaxed text-zinc-700">
                {currentStep === 0 && <pre className="font-mono text-xs">{file.content.slice(0, 500)}...</pre>}
                {currentStep === 1 && <p>{file.aiMetadata?.summary || 'No AI insights available.'}</p>}
                {currentStep === 2 && <div className="aspect-video bg-zinc-200 rounded flex items-center justify-center">Primary Preview</div>}
                
                {currentStep === 4 && (
                    <button className="flex items-center gap-2 mx-auto px-8 py-3 bg-zinc-900 text-white rounded-full font-medium">
                        <Download className="w-4 h-4" /> Download Result
                    </button>
                )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer / Progression */}
      <div className="p-8 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex gap-2">
          {steps.map((step, i) => (
             <div key={step.id} className={`w-3 h-3 rounded-full ${i <= currentStep ? 'bg-indigo-600' : 'bg-zinc-200'}`} />
          ))}
        </div>
        <button 
           onClick={nextStep}
           disabled={currentStep === steps.length - 1}
           className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-full font-medium hover:bg-zinc-800 transition"
        >
          {currentStep === steps.length - 1 ? 'Finish' : 'Next Stage'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
