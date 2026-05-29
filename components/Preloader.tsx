import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_SEQUENCE = [
  "0x00A0: [SYS] INITIATING FORMAT-SMORMAT vNext",
  "0x00B4: [NET] SYNCING SECURE CLOUDFLARE WORKER BRIDGE... OK",
  "0x01FF: [MEM] ALLOCATING ZUSTAND IR_GRAPH... PARSING",
  "0x02AA: [CORE] UNIVERSAL INGESTION_ENGINE: ARMED",
  "0x08CD: [OPT] STRIPPING CEREMONY... MAX_DENSITY ACHIEVED",
  "0x1024: [OPT] SETTING BYPASS_UX = TRUE",
  "0x2048: [SYS] BRUTALIST KNOWLEDGE COMPILER: ONLINE.",
];

export const Preloader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress(p => Math.min(p + (Math.random() * 12 + 2), 99));
    }, 100);

    const timeoutIds: NodeJS.Timeout[] = [];
    
    BOOT_SEQUENCE.forEach((log, index) => {
      const timeout = setTimeout(() => {
        setLogs(prev => [...prev, log]);
      }, 200 + index * 250); 
      timeoutIds.push(timeout);
    });

    const finishTimeout = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        onComplete();
      }, 500); // Snap and hold briefly at 100%
    }, 2800); // 2.8 second boot
    
    timeoutIds.push(finishTimeout);

    return () => {
      clearInterval(progressTimer);
      timeoutIds.forEach(clearTimeout);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1, filter: "brightness(1)", scale: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.05,
            filter: "brightness(2) contrast(1.5)", 
            transition: { duration: 0.6, ease: [0.19, 1, 0.22, 1] } 
          }}
          className="fixed inset-0 z-[100] flex flex-col bg-zinc-950 p-6 sm:p-12 font-mono selection:bg-green-400 selection:text-zinc-950 overflow-hidden"
        >
          {/* Ultra-crisp Grid & Scanlines (8K Detail) */}
          <div className="absolute inset-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'linear-gradient(to right, #3f3f46 1px, transparent 1px), linear-gradient(to bottom, #3f3f46 1px, transparent 1px)',
            backgroundSize: '4rem 4rem'
          }}></div>
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] mix-blend-overlay z-50"></div>
          
          {/* Technical Framing */}
          <div className="absolute inset-4 sm:inset-8 border border-zinc-900 pointer-events-none z-10">
            {/* Corner Fiducials */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-green-400"></div>
            <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-green-400"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-green-400"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-green-400"></div>
          </div>

          {/* Header */}
          <div className="relative z-20 flex flex-col sm:flex-row justify-between items-start pb-4 border-b border-zinc-900 text-[10px] sm:text-xs tracking-[0.2em] uppercase gap-4">
            <div>
              <span className="text-zinc-100 font-bold block sm:inline mr-4 drop-shadow-md">FORMAT_SMORMAT</span>
              <span className="text-green-600 font-medium">CORE // vNext</span>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-zinc-500">NET: ESTABLISHED</div>
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-green-400 font-bold drop-shadow-[0_0_12px_rgba(74,222,128,0.8)] mt-0.5"
              >
                IR_BRAIN_ACTIVE
              </motion.div>
            </div>
          </div>

          {/* Logs Terminal */}
          <div className="relative z-20 flex-1 overflow-y-auto flex flex-col justify-end min-h-[30vh] mt-8 mb-8">
            <div className="space-y-1 sm:space-y-1.5">
              {logs.map((log, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="text-green-300 font-medium text-[10px] sm:text-xs md:text-sm tracking-widest leading-relaxed drop-shadow-[0_0_8px_rgba(134,239,172,0.6)]"
                >
                  {log}
                </motion.div>
              ))}
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
                className="w-2 h-3 sm:w-3 sm:h-5 bg-green-300 inline-block align-middle ml-2 shadow-[0_0_12px_rgba(134,239,172,0.8)]"
              />
            </div>
          </div>

          {/* Massive Centerpiece */}
          <div className="relative z-20 mt-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 sm:mb-6 md:mb-8 md:gap-8">
              <h1 className="text-[14vw] md:text-[11vw] font-black text-zinc-100 uppercase tracking-tighter leading-[0.85] shrink-0 drop-shadow-2xl mix-blend-difference mb-4 md:mb-0">
                FUCK YOUR<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-600">FORMAT.</span>
              </h1>
              
              <div className="text-left md:text-right flex flex-col items-start md:items-end w-full md:w-auto">
                <div className="text-[9px] sm:text-[10px] text-zinc-500 tracking-[0.2em] uppercase mb-1">
                  HYPER_VIRTUALIZATION
                </div>
                <div className="text-green-400 font-black text-6xl sm:text-7xl md:text-8xl tabular-nums leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]">
                  {Math.floor(progress)}<span className="text-4xl sm:text-5xl md:text-6xl text-green-600">%</span>
                </div>
              </div>
            </div>
            
            {/* 8K Brutalist Progress Bar Setup */}
            <div className="relative w-full h-[6px] sm:h-2 bg-zinc-900 border border-zinc-800 overflow-hidden">
              {/* Subtle Subdivisions */}
              <div className="absolute inset-0 flex justify-between z-10 w-full px-[10%]">
                {[1,2,3,4,5,6,7,8,9].map(i => (
                  <div key={i} className="h-full w-px bg-zinc-950/80"></div>
                ))}
              </div>
              <motion.div 
                className="absolute top-0 left-0 h-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,1)] z-0"
                style={{ width: `${progress}%` }}
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 150, damping: 25, mass: 0.5 }}
              />
            </div>

            {/* Footer Data */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between text-zinc-600 text-[8px] sm:text-[9px] md:text-[10px] tracking-widest uppercase gap-2">
              <div className="grid grid-cols-2 sm:flex gap-4 sm:gap-8">
                <span>LCL_PRC: PREFERRED</span>
                <span>AI_BD: ISOLATED</span>
                <span>WKR: PROXY_ACTIVE</span>
              </div>
              <span className="text-zinc-500 text-left sm:text-right">
                WE NEVER GET READY.<br className="sm:hidden" /> WE ARE ALWAYS ALREADY READY.
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
