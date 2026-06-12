import { supabase } from './supabase';

// Tipe data biar TypeScript lu rapi dan minim bug
export interface Hafalan {
  id: string;
  title: string;
  content: string;
  status: 'red' | 'yellow' | 'green';
  next_review: string; // Format YYYY-MM-DD
  created_at: string;
}

export interface Journal {
  id: string;
  note: string;
  created_at: string;
}

// 1. Mengambil semua daftar hafalan
export const getHafalans = async () => {
  const { data, error } = await supabase
    .from('hafalans')
    .select('*')
    // Mengurutkan dari tanggal review yang paling dekat atau sudah lewat (overdue)
    .order('next_review', { ascending: true }); 

  if (error) {
    console.error('Gagal mengambil data hafalan:', error.message);
    return [];
  }
  
  return data as Hafalan[];
};

// 2. Memperbarui status dan jadwal review hafalan
export const updateHafalanStatus = async (
  id: string,
  newStatus: 'red' | 'yellow' | 'green',
  nextReviewDate: string
) => {
  const { data, error } = await supabase
    .from('hafalans')
    .update({
      status: newStatus,
      next_review: nextReviewDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Gagal memperbarui status hafalan:', error.message);
    throw new Error(error.message);
  }
  
  return data as Hafalan;
};

// 3. Menambah catatan ke jurnal harian
export const addJournalEntry = async (note: string) => {
  const { data, error } = await supabase
    .from('journals')
    // Supabase otomatis mengisi kolom id dan created_at
    .insert([{ note }])
    .select()
    .single();

  if (error) {
    console.error('Gagal menyimpan jurnal:', error.message);
    throw new Error(error.message);
  }
  
  return data as Journal;
};