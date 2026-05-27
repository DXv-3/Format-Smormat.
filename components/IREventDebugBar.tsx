import React from 'react';
import { useFileStore } from '../src/stores/useFileStore';

export const IREventDebugBar: React.FC = () => {
  const irGraph = useFileStore(state => state.irGraph);

  if (!irGraph.events.length) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-48 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-400 overflow-y-auto z-50 p-2">
      <div className="font-bold text-zinc-200 mb-2 sticky top-0 bg-zinc-950 p-1 border-b border-zinc-800">
        IR Event Debug Log ({irGraph.events.length} events)
      </div>
      <div className="space-y-1">
        {[...irGraph.events].reverse().map(event => (
          <div key={event.id} className="flex gap-4 border-b border-zinc-900 pb-1">
            <span className="text-zinc-600 w-24 shrink-0">
              {new Date(event.timestamp).toISOString().split('T')[1].replace('Z', '')}
            </span>
            <span className="text-zinc-300 w-32 shrink-0 font-bold">{event.type}</span>
            <span className="text-zinc-500 truncate">{JSON.stringify(event.payload)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
