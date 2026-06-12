import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Membuat instance Supabase yang akan dipakai di seluruh aplikasi
export const supabase = createClient(supabaseUrl, supabaseAnonKey);