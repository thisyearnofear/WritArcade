import React from 'react';
import { motion } from 'framer-motion';

interface MoodIndicatorProps {
  mood: {
    tension: number;
    chaos: number;
    hope: number;
  };
}

export const MoodIndicator: React.FC<MoodIndicatorProps> = ({ mood }) => {
  const bars = [
    { label: 'Tension', value: mood.tension, color: 'bg-red-500', description: 'Conflict and suspense built by your choices.' },
    { label: 'Chaos', value: mood.chaos, color: 'bg-purple-500', description: 'Unpredictability and disruption in the world.' },
    { label: 'Hope', value: mood.hope, color: 'bg-emerald-500', description: 'Optimism and trust created by your actions.' },
  ];

  return (
    <div className="flex gap-4 p-2 bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 text-[10px] uppercase tracking-widest text-white/60">
      {bars.map((bar) => (
        <div key={bar.label} className="group relative flex flex-col items-center gap-1 cursor-help">
          <span>{bar.label}</span>
          <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${bar.color}`}
              initial={{ width: '50%' }}
              animate={{ width: `${Math.min(Math.max((bar.value + 10) / 20 * 100, 0), 100)}%` }}
              transition={{ type: 'spring', stiffness: 100 }}
            />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 hidden group-hover:block rounded-lg border border-white/10 bg-black/90 p-2 text-center text-xs text-white/80 shadow-xl backdrop-blur-sm z-50">
            {bar.description}
          </div>
        </div>
      ))}
    </div>
  );
};
