// src/lib/spacedRepetition.ts

/**
 * Menghitung tanggal review selanjutnya berdasarkan status kelancaran.
 * @param status 'red' (lupa), 'yellow' (samar), atau 'green' (lancar)
 * @returns string tanggal dengan format YYYY-MM-DD untuk disimpan ke Supabase
 */
export const calculateNextReviewDate = (status: 'red' | 'yellow' | 'green'): string => {
  const today = new Date();
  let daysToAdd = 0;

  switch (status) {
    case 'red':
      // Lupa total -> Wajib review besoknya
      daysToAdd = 1;
      break;
    case 'yellow':
      // Samar-samar -> Review 3 hari lagi
      daysToAdd = 3;
      break;
    case 'green':
      // Lancar -> Kasih jeda lebih lama, review 7 hari lagi
      daysToAdd = 7;
      break;
  }

  // Tambahkan hari ke tanggal hari ini
  today.setDate(today.getDate() + daysToAdd);

  // Format ke YYYY-MM-DD agar mudah dibaca dan disimpan di Supabase
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};