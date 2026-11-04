import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// A sessão fica guardada no dispositivo (localStorage) até o treinador carregar em "Sair",
// para a app instalada não pedir login sempre que é reaberta.
// autoRefreshToken renova a sessão sozinha (sem isto expira ao fim de 1 hora).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
