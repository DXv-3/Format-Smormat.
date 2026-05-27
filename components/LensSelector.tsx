// ============================================================
// FORMAT-SMORMAT — LENS SELECTOR
// Surfaces all available IR lenses for a given node.
// Triggers lens_render via Worker. Stores result as IRView.
// ============================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IRLensType, ProcessedFile } from '../types';
import { useFileStore } from '../src/stores/useFileStore';
import { renderLens } from '../services/ingestPipeline';

const LENSES: { id: IRLensType; label: string; desc: string; emoji: string }[] = [
  { id: 'file',               label: 'File',        desc: 'Clean Markdown output',                     emoji: '📄' },
  { id: 'agent',              label: 'Agent',       desc: 'Multi-agent workflow YAML',                 emoji: '🤖' },
  { id: 'knowledge',          label: 'Knowledge',   desc: 'Knowledge graph JSON',                      emoji: '🕸️' },
  { id: 'metaphor_biology',   label: 'Biology',     desc: 'Organism / ant colony analogy',             emoji: '🦠' },
  { id: 'metaphor_city',      label: 'City',        desc: 'Urban infrastructure analogy',              emoji: '🏙️' },
  { id: 'metaphor_swarm',     label: 'Swarm',       desc: 'Swarm intelligence analogy',                emoji: '🐝' },
  { id: 'metaphor_orchestra', label: 'Orchestra',   desc: 'Orchestral arrangement analogy',            emoji: '🎼' },
];

interface LensSelectorProps {
  file: ProcessedFile;
}

export const LensSelector: React.FC<LensSelectorProps> = ({ file }) => {
  const { upsertView, dispatchViewsPrepared } = useFileStore();
  const [activeLens, setActiveLens] = useState<IRLensType | null>(null);
  const [loading, setLoading] = useState<IRLensType | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleLens = async (lens: IRLensType) => {
    if (loading) return;
    // If already rendered, just toggle display
    if (results[lens]) {
      setActiveLens(activeLens === lens ? null : lens);
      return;
    }
    setLoading(lens);
    setError(null);
    try {
      const text = await renderLens(file.originalName, file.content, lens);
      const viewId = `${file.id}-${lens}-${Date.now()}`;
      upsertView({
        id: viewId,
        lens,
        nodeIds: [file.id],
        artifact: { type: 'markdown', content: text },
        generatedAt: Date.now(),
      });
      dispatchViewsPrepared(file.id, [viewId]);
      setResults((prev) => ({ ...prev, [lens]: text }));
      setActiveLens(lens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lens render failed');
    } finally {
      setLoading(null);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
        Lenses
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {LENSES.map((l) => (
          <button
            key={l.id}
            onClick={() => handleLens(l.id)}
            title={l.desc}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
              activeLens === l.id
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
            } ${loading === l.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
          >
            <span>{l.emoji}</span>
            <span>{loading === l.id ? 'Rendering…' : l.label}</span>
            {results[l.id] && activeLens !== l.id && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3">{error}</p>
      )}

      <AnimatePresence>
        {activeLens && results[activeLens] && (
          <motion.div
            key={activeLens}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="relative bg-zinc-950 rounded-xl p-4">
              <button
                onClick={() => handleCopy(results[activeLens])}
                className="absolute top-3 right-3 text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Copy
              </button>
              <pre className="text-zinc-100 text-xs leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                {results[activeLens]}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
