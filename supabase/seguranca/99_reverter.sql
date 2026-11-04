-- =====================================================================
-- REVERTER as regras de 20261108_seguranca_rls.sql (só se a app deixar de funcionar)
-- Deixa todas as tabelas acessíveis a QUALQUER utilizador com sessão iniciada
-- (menos seguro que as regras novas, mas mais seguro que RLS desligado).
-- Avise o responsável técnico para corrigir as regras e voltar a aplicá-las.
-- =====================================================================
do $$
declare
  t text;
  r record;
begin
  foreach t in array array[
    'centros', 'centro_treinadores', 'turmas', 'turma_horarios', 'alunos', 'presencas',
    'eventos', 'evento_participantes_livres', 'biblioteca_videos',
    'analise_competicoes', 'analise_atletas', 'analise_combates', 'consentimentos'
  ]
  loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('create policy "autenticados_tudo" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "combates_treinadores_select" on storage.objects;
drop policy if exists "combates_treinadores_insert" on storage.objects;
drop policy if exists "combates_treinadores_update" on storage.objects;
drop policy if exists "combates_treinadores_delete" on storage.objects;
create policy "combates_treinadores_select" on storage.objects for select to authenticated using (bucket_id = 'combates');
create policy "combates_treinadores_insert" on storage.objects for insert to authenticated with check (bucket_id = 'combates');
create policy "combates_treinadores_update" on storage.objects for update to authenticated using (bucket_id = 'combates');
create policy "combates_treinadores_delete" on storage.objects for delete to authenticated using (bucket_id = 'combates');
