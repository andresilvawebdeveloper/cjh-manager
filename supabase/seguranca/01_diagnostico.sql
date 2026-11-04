-- =====================================================================
-- DIAGNÓSTICO DE SEGURANÇA (só leitura — não altera nada)
-- Correr no Supabase: SQL Editor -> colar -> Run
-- Envie o resultado ao responsável técnico antes de aplicar 20261108_seguranca_rls.sql
-- =====================================================================

-- 1. Tabelas da app: a proteção por linhas (RLS) está ligada?
--    "rls_ligado = false" significa que QUALQUER pessoa com a chave pública da app pode ler a tabela.
select
  c.relname as tabela,
  c.relrowsecurity as rls_ligado,
  (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as num_regras
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- 2. Regras de acesso existentes (quem pode fazer o quê)
select tablename as tabela, policyname as regra, cmd as operacao, roles as papeis, qual as condicao_leitura, with_check as condicao_escrita
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 3. Contas de utilizador existentes (devem ser só treinadores do clube)
select email, created_at, last_sign_in_at
from auth.users
order by created_at;

-- 4. Emails com acesso a centros (lista de treinadores autorizados)
select distinct lower(email) as email_treinador, count(*) as num_centros
from public.centro_treinadores
group by lower(email)
order by 1;

-- 5. Atletas sem turma (ficam visíveis a todos os treinadores autorizados)
select count(*) as atletas_sem_turma from public.alunos where turma_id is null;
