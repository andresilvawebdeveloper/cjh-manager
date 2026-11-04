# Proteção de Dados (RGPD) — Clube de Judo Hajime

> **Aviso:** estes documentos são uma base de trabalho preparada com a aplicação CJH Manager.
> **Não substituem aconselhamento jurídico.** Devem ser revistos por um advogado ou especialista em proteção de dados antes de serem usados com as famílias.

## O que o clube tem de fazer (por ordem)

### 1. Segurança da base de dados — urgente
- [ ] No Supabase, correr `supabase/seguranca/01_diagnostico.sql` e guardar o resultado.
- [ ] Em **Authentication → Sign In / Providers → Email**, desligar **"Allow new users to sign up"** (só o administrador cria contas de treinador).
- [ ] Correr `supabase/migrations/20261108_seguranca_rls.sql`.
- [ ] Confirmar que a app funciona (centros, turmas, presenças, competições). Se algo falhar: `supabase/seguranca/99_reverter.sql` e avisar o responsável técnico.
- [ ] Confirmar em **Project Settings → General** a **região** do projeto Supabase (ideal: na União Europeia). Anotar em `04-subcontratantes.md`.

### 2. Dados do clube
- [ ] Preencher NIF, morada, email e responsável em `lib/clube.ts` (aparecem na política e no formulário).

### 3. Famílias
- [ ] Imprimir o formulário (`/consentimento` na app) e entregá-lo a cada encarregado de educação.
- [ ] Registar cada formulário na app: **Painel → Privacidade e RGPD → Autorizações**.
- [ ] Guardar os formulários assinados em papel (ou digitalizados num local com acesso restrito).
- [ ] Partilhar com as famílias o link da política de privacidade (`/privacidade`).

### 4. Inteligência artificial
- [ ] No claude.ai: **Definições → Privacidade** → desligar o uso das conversas para treinar modelos.
- [ ] Só analisar combates de atletas com autorização de "Análise por IA" (a app bloqueia os restantes).
- [ ] Ler `02-avaliacao-impacto-video-ia.md` e decidir sobre a recomendação de usar a API comercial.

### 5. Rotina
- [ ] Uma vez por época: **Privacidade e RGPD → Inativos**, exportar (se pedido) e apagar dados de quem saiu há mais de 2 anos.
- [ ] Responder a pedidos das famílias (acesso, cópia, apagamento) em **menos de 1 mês**: botões **Exportar** e **Apagar tudo**.
- [ ] Em caso de incidente de segurança: seguir `03-procedimento-violacao-dados.md` (prazo de 72 horas).
- [ ] Rever estes documentos sempre que a app passar a recolher dados novos (por exemplo, dados de saúde ou contactos dos pais).

## Documentos
| Ficheiro | Para quê |
|---|---|
| `01-registo-atividades-tratamento.md` | Registo obrigatório dos tratamentos de dados (art. 30.º RGPD) |
| `02-avaliacao-impacto-video-ia.md` | Avaliação de impacto da análise de vídeo de menores com IA (art. 35.º) |
| `03-procedimento-violacao-dados.md` | O que fazer se houver uma fuga de dados (arts. 33.º e 34.º) |
| `04-subcontratantes.md` | Empresas que tratam dados por conta do clube e garantias (art. 28.º) |
| `05-regras-treinadores.md` | Regras de segurança para quem usa a app |
| App: `/privacidade` | Política de privacidade pública (arts. 13.º e 14.º) |
| App: `/consentimento` | Formulário de autorização para os encarregados de educação |
| App: Painel → Privacidade e RGPD | Consentimentos, exportação e apagamento de dados |
