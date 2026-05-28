import React, { useState } from 'react';
import { ProcessedFile } from '../types';
import { callWorker } from '../services/ai';
import { useFileStore } from '../src/stores/useFileStore';
import { Network, FileText, Code, Database, Brain, Sparkles, Image as ImageIcon } from 'lucide-react';
import DotLoader from './DotLoader';

interface LensSelectorProps {
  file: ProcessedFile;
}

const LENSES = [
  { id: 'markdown', icon: FileText, label: 'Document' },
  { id: 'json', icon: Database, label: 'Data Spec' },
  { id: 'entities', icon: Network, label: 'Entities' },
  { id: 'code', icon: Code, label: 'Code Blocks' },
  { id: 'vision', icon: ImageIcon, label: 'Vision Map' },
  { id: 'summary', icon: Brain, label: 'Summary' },
  { id: 'enrich', icon: Sparkles, label: 'Magic Enrich' },
];

export const LensSelector: React.FC<LensSelectorProps> = ({ file }) => {
  const [activeLens, setActiveLens] = useState('markdown');
  const [loading, setLoading] = useState(false);
  const [lensData, setLensData] = useState<Record<string, string>>({});
  
  const addIREvent = useFileStore(state => state.addIREvent);
  const addIRNode = useFileStore(state => state.addIRNode);

  const handleLensSelect = async (lensId: string) => {
    setActiveLens(lensId);
    
    if (lensData[lensId] && lensId !== 'enrich') {
      return;
    }

    setLoading(true);
    addIREvent({ type: 'LENS_ACTIVATED', payload: { fileId: file.id, lensId } });

    try {
      if (lensId === 'markdown') {
        setLensData(prev => ({ ...prev, [lensId]: file.content }));
      } else {
        const response = await callWorker<{ text: string }>({
          mode: 'lens_render',
          lensId,
          fileName: file.originalName,
          content: file.content
        });
        
        setLensData(prev => ({ ...prev, [lensId]: response.text }));
        
        // Also capture this output into the IR Graph
        addIRNode({
          // eslint-disable-next-line react-hooks/purity
          id: `${file.id}-${lensId}-${Date.now()}`,
          kind: lensId === 'json' ? 'JSON' : lensId === 'entities' ? 'ENTITIES' : 'MARKDOWN',
          content: response.text,
          metadata: { lens: lensId, fileId: file.id },
          // eslint-disable-next-line react-hooks/purity
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error("Lens failed", e);
      addIREvent({ type: 'LENS_ERROR', payload: { fileId: file.id, lensId, error: String(e) } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex border-b border-zinc-800 p-1 flex-wrap gap-1 bg-zinc-950">
        {LENSES.map(lens => {
          const Icon = lens.icon;
          const isActive = activeLens === lens.id;
          return (
            <button
              key={lens.id}
              onClick={() => handleLensSelect(lens.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-blue-400' : ''} />
              {lens.label}
            </button>
          );
        })}
      </div>
      
      <div className="p-4 bg-zinc-900 min-h-[120px] max-h-[400px] overflow-y-auto text-sm text-zinc-300 font-mono">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <DotLoader />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">
            {lensData[activeLens] || "Click a lens to analyze"}
          </div>
        )}
      </div>
    </div>
  );
};
