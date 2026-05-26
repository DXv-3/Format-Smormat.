import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, Variants, MotionValue } from 'framer-motion';

const alternates: Record<string, string[]> = {
  'F': ['F', '₣', 'Ƒ', 'F'],
  'O': ['O', 'Ø', '0', 'O'],
  'R': ['R', 'Ř', 'Я', 'R'],
  'M': ['M', 'M', 'ℳ', 'M'],
  'A': ['A', '4', 'Λ', 'A'],
  'T': ['T', '†', '7', 'T'],
  'S': ['S', '5', '§', 'S'],
  'H': ['H', 'Ħ', '|-|', 'H'],
};

const ParallaxLetter: React.FC<{
  char: string;
  smoothProgress: MotionValue<number>;
  yRange: number[];
  rotateRange: number[];
  variants: Variants;
  index: number;
}> = ({ char, smoothProgress, yRange, rotateRange, variants, index }) => {
  const y = useTransform(smoothProgress, [0, 1], yRange);
  const rotate = useTransform(smoothProgress, [0, 1], rotateRange);

  const [displayChar, setDisplayChar] = useState(char);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const chars = alternates[char.toUpperCase()];
    if (!chars) return;

    let interval: ReturnType<typeof setInterval>;
    
    // Wait for the initial animation to finish before starting leetspeak
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        if (Math.random() > 0.75) {
          setDisplayChar(chars[Math.floor(Math.random() * chars.length)]);
          setTimeout(() => {
            setDisplayChar(char);
          }, 150 + Math.random() * 200);
        }
      }, 500 + index * 120);
    }, 2500 + (index * 100)); // Stagger the start time

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [char, index]);

  return (
    <motion.div style={{ y, rotate }}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={variants}
        className="text-[12vw] sm:text-[7rem] md:text-[9rem] lg:text-[12rem] font-sans font-black tracking-tighter leading-none mx-[-0.01em] cursor-default"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          WebkitTextStroke: '2px #18181b',
          color: isHovered ? 'transparent' : '#18181b',
          backgroundImage: 'linear-gradient(to top, #ec4899, #14b8a6, #f59e0b)',
          backgroundSize: '100% 200%',
          backgroundPosition: isHovered ? '0% 100%' : '0% 0%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          transition: 'background-position 1.2s cubic-bezier(0.2, 0.8, 0.2, 1), color 0.3s'
        }}
      >
        <motion.span 
          className="block origin-center"
          whileHover={{ scale: 1.05, rotate: (index % 2 === 0 ? 3 : -3), y: -10, transition: { type: "spring", stiffness: 300, damping: 15 } }}
        >
          {displayChar}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

export const HeroSequence: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const scaleText = useTransform(smoothProgress, [0, 1], [1, 0.85]);
  const opacityText = useTransform(smoothProgress, [0.6, 1], [1, 0]);
  const yBackground = useTransform(smoothProgress, [0, 1], [0, 300]);

  const letterInitialStates = [
    { scale: 0.5, opacity: 0, y: -800, x: -200, rotate: -45 }, // F
    { scale: 0, opacity: 0, rotate: 180, y: 200 }, // O
    { scale: 1, opacity: 0, x: 800, y: -200, skewX: 30 }, // R
    { scale: 1, opacity: 0, y: 800, rotate: 40 }, // M
    { scale: 2, opacity: 0, filter: "blur(30px)" }, // A
    { scale: 1.2, opacity: 0, y: -1000, rotate: -15 }, // T
    
    // SHMORMAT
    { scale: 0, opacity: 0, rotate: -180, y: -200, x: -400 }, // S
    { scale: 0.5, opacity: 0, x: -600, rotate: 45 }, // H
    { scale: 1, opacity: 0, x: 800, skewX: -30 }, // M
    { scale: 2, opacity: 0, filter: "blur(30px)" }, // O
    { scale: 1, opacity: 0, y: 800, rotate: -40 }, // R
    { scale: 1.2, opacity: 0, y: 1000, rotate: 15 }, // M
    { scale: 1, opacity: 0, x: 800, y: 200, skewY: 20 }, // A
    { scale: 0, opacity: 0, rotate: 180, y: 200, x: 400 }, // T
  ];

  const getVariant = (index: number, delay: number): Variants => {
    const isBlur = letterInitialStates[index]?.filter !== undefined;
    if (isBlur) {
        return {
          initial: letterInitialStates[index],
          animate: { 
            filter: "blur(0px)", scale: 1, opacity: 1, 
            transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay } 
          }
        }
    }
    return {
      initial: letterInitialStates[index],
      animate: { 
        y: 0, x: 0, rotate: 0, scale: 1, opacity: 1, skewX: 0, skewY: 0,
        transition: { type: "spring", stiffness: 120 + (index % 3) * 30, damping: 14 + (index % 2) * 2, mass: 1.5, delay } 
      }
    };
  }

  const formatLetters = [
    { char: 'F', yRange: [0, -200], rotateRange: [0, -10], delay: 0.1 },
    { char: 'O', yRange: [0, -350], rotateRange: [0, 25], delay: 0.3 },
    { char: 'R', yRange: [0, -150], rotateRange: [0, -5], delay: 0.2 },
    { char: 'M', yRange: [0, -400], rotateRange: [0, -15], delay: 0.4 },
    { char: 'A', yRange: [0, -100], rotateRange: [0, 8], delay: 0.25 },
    { char: 'T', yRange: [0, -250], rotateRange: [0, -20], delay: 0.5 }
  ];

  const shmormatLetters = [
    { char: 'S', yRange: [0, -300], rotateRange: [0, 12], delay: 0.6 },
    { char: 'H', yRange: [0, -100], rotateRange: [0, -8], delay: 0.7 },
    { char: 'M', yRange: [0, -250], rotateRange: [0, 18], delay: 0.8 },
    { char: 'O', yRange: [0, -450], rotateRange: [0, -25], delay: 0.9 },
    { char: 'R', yRange: [0, -200], rotateRange: [0, 15], delay: 1.0 },
    { char: 'M', yRange: [0, -350], rotateRange: [0, -12], delay: 1.1 },
    { char: 'A', yRange: [0, -500], rotateRange: [0, 22], delay: 1.2 },
    { char: 'T', yRange: [0, -150], rotateRange: [0, -18], delay: 1.3 },
  ];

  return (
    <div ref={containerRef} className="h-[250vh] relative z-10 block w-full bg-transparent">
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden pointer-events-none">
        
        {/* Cinematic Parallax Background */}
        <motion.div 
          style={{ y: yBackground }}
          className="absolute inset-0 z-0 pointer-events-none origin-top"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          {/* Subtle noise and light leak combo */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute inset-0 opacity-[0.4] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-200 via-transparent to-transparent mix-blend-multiply" />
        </motion.div>

        {/* Text Container */}
        <motion.div 
          style={{ scale: scaleText, opacity: opacityText }} 
          className="relative z-10 flex flex-col items-center justify-center space-y-[-1rem] sm:space-y-[-2rem] lg:space-y-[-4rem] pointer-events-auto"
        >
          <div className="flex flex-row items-center justify-center">
            {formatLetters.map((l, i) => (
              <ParallaxLetter
                key={`format-${i}`}
                char={l.char}
                smoothProgress={smoothProgress}
                yRange={l.yRange}
                rotateRange={l.rotateRange}
                variants={getVariant(i, l.delay)}
                index={i}
              />
            ))}
          </div>
          <div className="flex flex-row items-center justify-center">
            {shmormatLetters.map((l, i) => (
              <ParallaxLetter
                key={`shmormat-${i}`}
                char={l.char}
                smoothProgress={smoothProgress}
                yRange={l.yRange}
                rotateRange={l.rotateRange}
                variants={getVariant(formatLetters.length + i, l.delay)}
                index={formatLetters.length + i}
              />
            ))}
          </div>
        </motion.div>
        
        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
          style={{ opacity: useTransform(smoothProgress, [0, 0.05], [1, 0]) }}
          className="absolute bottom-16 left-0 right-0 flex flex-col items-center justify-center space-y-4 pointer-events-auto"
        >
          <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-zinc-900 to-transparent animate-pulse opacity-30" />
          <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-zinc-500">
            Scroll
          </span>
        </motion.div>
      </div>
    </div>
  );
};
