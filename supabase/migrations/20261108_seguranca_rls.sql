-- =====================================================================
-- SEGURANÇA E RGPD: regras de acesso (Row Level Security) para TODAS as tabelas
--
-- Antes de correr:
--   1. Corra supabase/seguranca/01_diagnostico.sql e guarde o resultado.
--   2. Em Authentication -> Sign In / Providers -> Email, DESLIGUE "Allow new users to sign up"
--      (só o administrador cria contas de treinador).
-- Se algo deixar de funcionar: supabase/seguranca/99_reverter.sql
--
-- Regras:
--   * "Treinador autorizado" = email que aparece em centro_treinadores (em pelo menos um centro).
--   * Centros, turmas, horários, atletas e presenças: só os treinadores desse centro.
--   * Atletas sem turma, análise de competições, eventos, biblioteca e vídeos: qualquer treinador autorizado.
--   * Contas que não são de treinadores autorizados (ou sem sessão) não leem nada.
-- =====================================================================

-- ---------- Funções auxiliares (SECURITY DEFINER evita ciclos entre regras) ----------
create or replace function public.email_atual() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.e_treinador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.centro_treinadores where lower(email) = public.email_atual() and public.email_atual() <> '')
$$;

create or replace function public.tem_acesso_centro(cid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.email_atual() <> '' and (
    exists (select 1 from public.centro_treinadores where centro_id = cid and lower(email) = public.email_atual())
    or exists (select 1 from public.centros where id = cid and treinador_id::text = auth.uid()::text)
  )
$$;

create or replace function public.tem_acesso_turma(tid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.turmas t where t.id = tid and public.tem_acesso_centro(t.centro_id))
$$;

create or replace function public.tem_acesso_aluno(aid bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.alunos a
    where a.id = aid
      and ((a.turma_id is null and public.e_treinador()) or public.tem_acesso_turma(a.turma_id))
  )
$$;

-- ---------- Consentimentos (RGPD) ----------
create table if not exists public.consentimentos (
  aluno_id bigint primary key references public.alunos(id) on delete cascade,
  dados_basicos boolean not null default false,     -- inscrição, presenças, graduações, resultados
  imagem_video boolean not null default false,      -- fotografias e vídeos de treinos/combates
  analise_ia boolean not null default false,        -- análise de vídeo por inteligência artificial
  divulgacao_publica boolean not null default false,-- nome/fotos em redes sociais, site e cartazes
  autorizado_por text,                              -- nome do encarregado de educação (ou do atleta, se adulto)
  data_autorizacao date,
  notas text,
  atualizado_em timestamptz not null default now()
);

-- ---------- Apagar todas as regras existentes nas tabelas da app ----------
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'centros', 'centro_treinadores', 'turmas', 'turma_horarios', 'alunos', 'presencas',
      'eventos', 'evento_participantes_livres', 'biblioteca_videos',
      'analise_competicoes', 'analise_atletas', 'analise_combates', 'consentimentos'
    )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---------- Ligar RLS em todas ----------
alter table public.centros enable row level security;
alter table public.centro_treinadores enable row level security;
alter table public.turmas enable row level security;
alter table public.turma_horarios enable row level security;
alter table public.alunos enable row level security;
alter table public.presencas enable row level security;
alter table public.eventos enable row level security;
alter table public.evento_participantes_livres enable row level security;
alter table public.biblioteca_videos enable row level security;
alter table public.analise_competicoes enable row level security;
alter table public.analise_atletas enable row level security;
alter table public.analise_combates enable row level security;
alter table public.consentimentos enable row level security;

-- ---------- Centros ----------
-- (a condição direta no treinador_id permite ler o centro logo a seguir a criá-lo)
create policy "centros_ler" on public.centros for select to authenticated
  using (treinador_id::text = auth.uid()::text or public.tem_acesso_centro(id));
-- criar um centro: o criador fica como treinador_id (e depois associa os emails em centro_treinadores)
create policy "centros_criar" on public.centros for insert to authenticated
  with check (treinador_id::text = auth.uid()::text);
create policy "centros_alterar" on public.centros for update to authenticated
  using (public.tem_acesso_centro(id)) with check (public.tem_acesso_centro(id));
create policy "centros_apagar" on public.centros for delete to authenticated
  using (public.tem_acesso_centro(id));

-- ---------- Treinadores de cada centro ----------
create policy "ct_ler" on public.centro_treinadores for select to authenticated
  using (lower(email) = public.email_atual() or public.tem_acesso_centro(centro_id));
create policy "ct_gerir" on public.centro_treinadores for all to authenticated
  using (public.tem_acesso_centro(centro_id)) with check (public.tem_acesso_centro(centro_id));

-- ---------- Turmas e horários ----------
create policy "turmas_tudo" on public.turmas for all to authenticated
  using (public.tem_acesso_centro(centro_id)) with check (public.tem_acesso_centro(centro_id));
create policy "horarios_tudo" on public.turma_horarios for all to authenticated
  using (public.tem_acesso_turma(turma_id)) with check (public.tem_acesso_turma(turma_id));

-- ---------- Atletas, presenças e consentimentos ----------
create policy "alunos_tudo" on public.alunos for all to authenticated
  using ((turma_id is null and public.e_treinador()) or public.tem_acesso_turma(turma_id))
  with check ((turma_id is null and public.e_treinador()) or public.tem_acesso_turma(turma_id));
create policy "presencas_tudo" on public.presencas for all to authenticated
  using (public.tem_acesso_aluno(aluno_id)) with check (public.tem_acesso_aluno(aluno_id));
create policy "consentimentos_tudo" on public.consentimentos for all to authenticated
  using (public.tem_acesso_aluno(aluno_id)) with check (public.tem_acesso_aluno(aluno_id));

-- ---------- Dados do clube partilhados entre treinadores autorizados ----------
create policy "eventos_tudo" on public.eventos for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());
create policy "evento_part_tudo" on public.evento_participantes_livres for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());
create policy "biblioteca_tudo" on public.biblioteca_videos for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());
create policy "an_comp_tudo" on public.analise_competicoes for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());
create policy "an_atl_tudo" on public.analise_atletas for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());
create policy "an_comb_tudo" on public.analise_combates for all to authenticated
  using (public.e_treinador()) with check (public.e_treinador());

-- ---------- Vídeos e frames no Storage (bucket privado "combates") ----------
drop policy if exists "combates_treinadores_select" on storage.objects;
drop policy if exists "combates_treinadores_insert" on storage.objects;
drop policy if exists "combates_treinadores_update" on storage.objects;
drop policy if exists "combates_treinadores_delete" on storage.objects;
create policy "combates_treinadores_select" on storage.objects for select to authenticated
  using (bucket_id = 'combates' and public.e_treinador());
create policy "combates_treinadores_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'combates' and public.e_treinador());
create policy "combates_treinadores_update" on storage.objects for update to authenticated
  using (bucket_id = 'combates' and public.e_treinador());
create policy "combates_treinadores_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'combates' and public.e_treinador());
