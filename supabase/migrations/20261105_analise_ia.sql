-- Análise de combates por IA
-- Correr no Supabase: SQL Editor -> colar este ficheiro -> Run

alter table public.analise_combates
  add column if not exists cor_judogi text check (cor_judogi in ('Branco', 'Azul')),
  add column if not exists analise_ia jsonb,
  add column if not exists analise_estado text check (analise_estado in ('a_analisar', 'concluida', 'erro')),
  add column if not exists analise_data timestamptz,
  add column if not exists analise_frames integer;
