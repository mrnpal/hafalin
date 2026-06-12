// src/hooks/useActiveRecall.ts
import { useState, useMemo } from 'react';

export const useActiveRecall = (initialText: string) => {
  // Membelah teks menjadi array per kata
  const words = useMemo(() => initialText.split(' '), [initialText]);
  
  // State untuk melacak sampai kata ke-berapa teks sudah dibuka (-1 artinya belum ada yang dibuka)
  const [revealedIndex, setRevealedIndex] = useState<number>(-1);

  // Fungsi untuk membuka satu kata selanjutnya
  const revealNext = () => {
    if (revealedIndex < words.length - 1) {
      setRevealedIndex((prev) => prev + 1);
    }
  };

  // Fungsi untuk membuka seluruh teks sekaligus
  const revealAll = () => {
    setRevealedIndex(words.length - 1);
  };

  // Fungsi untuk menutup kembali teks (reset)
  const reset = () => {
    setRevealedIndex(-1);
  };

  return {
    words,
    revealedIndex,
    revealNext,
    revealAll,
    reset,
    isComplete: revealedIndex === words.length - 1 // Mengecek apakah semua teks sudah terbuka
  };
};