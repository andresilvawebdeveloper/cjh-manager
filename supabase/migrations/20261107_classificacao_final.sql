-- Classificação final de cada atleta numa competição
-- Correr no Supabase: SQL Editor -> colar este ficheiro -> Run

alter table public.analise_atletas
  add column if not exists classificacao text
  check (classificacao in ('1º', '2º', '3º', '5º', '7º', '9º', 'N/C'));
