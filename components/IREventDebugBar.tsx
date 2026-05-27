// ============================================================
// FORMAT-SMORMAT — IR EVENT DEBUG BAR
// Dev-only. Shows the live event log from the IR brain.
// Remove from production builds or gate behind a flag.
// ============================================================
import React, { useState } from 'react';
import { useFileStore } from '../src/stores/useFileStore';
import type { IREvent } from '../types';

const EVENT_COLORS: Record<string, string> = {
  InputIngested:       'text-sky-400',
  ParsedToIR:          'text-emerald-400',
  RelationsDiscovered: 'text-violet-400',
  ViewsPrepared:       'text-amber-400',
  ActionRequested:     'text-orange-400',
  ActionCompleted:     'text-green-400',
  IRUpdated:           'text-zinc-400',
  Error:               'text-red-400',
};

export const IREventDebugBar: React.FC = () => {
  const events = useFileStore((s) => s.getEventLog());
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] max-w-sm w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left bg-zinc-950 text-zinc-300 text-xs px-4 py-2 rounded-t-lg font-mono border border-zinc-700"
      >
        🧠 IR Events ({events.length}){' '}
        <span className="float-right">{open ? '▼' : '▲'}</span>
      </button>
      {open && (
        <div className="bg-zinc-950 border border-t-0 border-zinc-700 rounded-b-lg max-h-64 overflow-y-auto p-3 space-y-1">
          {events.length === 0 && (
            <p className="text-zinc-600 text-xs font-mono">No events yet.</p>
          )}
          {[...events].reverse().map((e: IREvent) => (
            <div key={e.id} className="font-mono text-xs flex items-start space-x-2">
              <span className="text-zinc-600 shrink-0">
                {new Date(e.timestamp).toISOString().slice(11, 23)}
              </span>
              <span className={EVENT_COLORS[e.type] ?? 'text-zinc-400'}>
                {e.type}
              </span>
              {e.nodeId && (
                <span className="text-zinc-500 truncate">{e.nodeId.slice(0, 8)}…</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
