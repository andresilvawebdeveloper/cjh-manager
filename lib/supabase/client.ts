import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Atenção: As variáveis de ambiente do Supabase não estão definidas.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);