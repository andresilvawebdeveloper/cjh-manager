-- Permitir registar combates sem vídeo (o vídeo pode ser adicionado mais tarde)
-- Correr no Supabase: SQL Editor -> colar este ficheiro -> Run

alter table public.analise_combates alter column video_path drop not null;
