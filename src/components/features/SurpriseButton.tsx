'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';

export default function SurpriseButton() {
  const [isOpen, setIsOpen] = useState(false);

  const messages = [
    "Semangat ya Nilam, masa depan cerah menanti! ✨",
    "Pelan-pelan aja ngafalnya, yang penting konsisten. You got this! 🌷",
    "Aku bangga sama progress kamu hari ini. 💖"
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-nilam-500 hover:bg-nilam-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-40"
      >
        <Heart fill="currentColor" size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center relative"
            >
              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              <div className="text-4xl mb-4">🌸</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Pesan Buat Nilam</h3>
              <p className="text-gray-600">{randomMessage}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}