'use client';

import { useActiveRecall } from '@/hooks/useActiveRecall';
import { motion } from 'framer-motion';
import { RotateCcw, Eye } from 'lucide-react';

export default function ActiveRecall({ text = "Tabarakalladzi biyadihil mulku wa huwa 'ala kulli syai'in qadir." }) {
  const { words, revealedIndex, revealNext, revealAll, reset, isComplete } = useActiveRecall(text);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-nilam-100 p-6">
      <h2 className="text-xl font-semibold text-nilam-600 mb-2 flex items-center gap-2">
        🧠 Active Recall Area
      </h2>
      <p className="text-sm text-gray-500 mb-4">Tap teks area di bawah untuk menebak kata selanjutnya.</p>
      
      <div 
        className="p-6 bg-nilam-50/50 rounded-xl min-h-[120px] cursor-pointer border border-nilam-100"
        onClick={revealNext}
      >
        <div className="text-lg leading-relaxed flex flex-wrap gap-x-1.5 gap-y-2">
          {words.map((word, index) => {
            const isRevealed = index <= revealedIndex;
            return (
              <motion.span
                key={index}
                initial={false}
                animate={{ 
                  filter: isRevealed ? 'blur(0px)' : 'blur(6px)',
                  opacity: isRevealed ? 1 : 0.4 
                }}
                className={`transition-colors duration-300 ${isRevealed ? 'text-gray-800' : 'text-gray-400 bg-gray-200 rounded px-1 select-none'}`}
              >
                {word}
              </motion.span>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button 
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 text-nilam-600 bg-nilam-50 hover:bg-nilam-100 rounded-lg text-sm font-medium transition"
        >
          <RotateCcw size={16} /> Ulangi
        </button>
        
        {!isComplete && (
          <button 
            onClick={revealAll}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition"
          >
            <Eye size={16} /> Buka Semua
          </button>
        )}
      </div>
    </div>
  );
}