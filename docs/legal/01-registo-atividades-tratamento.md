# Registo das Atividades de Tratamento (art. 30.º RGPD)

**Responsável pelo tratamento:** Clube de Judo Hajime — NIF 513188983 — Rua Agostinho Neto, nº 34 - 1º B, 1750-006 Lisboa — clubedejudohajime@gmail.com
**Ponto de contacto para proteção de dados:** Luis Bettencourt
**Encarregado de Proteção de Dados (EPD):** não designado. Avaliação: o clube não trata dados em grande escala nem faz controlo sistemático em grande escala; a designação não é obrigatória, mas deve ser reavaliada se a atividade crescer.
**Data da última atualização:** 2026-11-04

| # | Tratamento | Titulares | Categorias de dados | Finalidade | Fundamento | Destinatários / subcontratantes | Transferências fora do EEE | Prazo de conservação | Medidas de segurança |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Gestão de atletas e turmas | Atletas (maioritariamente menores) | Nome, data de nascimento, escalão, graduação, turma, centro | Inscrição e organização do clube | Art. 6.º/1/b (inscrição) | Treinadores autorizados; Supabase; Vercel | Conforme região Supabase/Vercel (ver doc. 04) | Inscrição + 2 anos após última presença | Contas pessoais; RLS por centro; HTTPS |
| 2 | Registo de presenças | Atletas | Data e estado de presença | Organização dos treinos, assiduidade, ranking, relatórios Excel | Art. 6.º/1/b e f | Treinadores do centro; Supabase; Vercel | Idem | Idem | Idem; Excel exportado só para uso interno |
| 3 | Resultados de competições | Atletas do clube e adversários | Nome, categoria de peso, combates, resultados, classificação, notas | Acompanhamento desportivo | Art. 6.º/1/f (interesse legítimo na gestão desportiva) | Treinadores autorizados; Supabase; Vercel | Idem | Idem | Idem |
| 4 | Vídeos de combates | Atletas e adversários | Imagem e vídeo | Análise técnica interna | Art. 6.º/1/a (consentimento) + art. 79.º Código Civil | Treinadores autorizados; Supabase Storage (privado) | Idem | Enquanto houver consentimento; máx. 2 anos após saída | Bucket privado; links temporários; bloqueio sem autorização |
| 5 | Análise de vídeo por IA | Atletas e adversários | Imagens extraídas dos vídeos; relatório técnico | Apoio técnico ao treinador | Art. 6.º/1/a (consentimento específico) | Anthropic (Claude) | EUA (ver doc. 04) | Imagens: apagadas após a análise; relatório: como no tratamento 4 | Treino de modelos desligado; sem decisões automáticas; avaliação de impacto (doc. 02) |
| 6 | Divulgação pública | Atletas | Nome, imagem, resultados | Divulgação da atividade do clube | Art. 6.º/1/a (consentimento) | Público; redes sociais | Conforme plataforma | Até retirada do consentimento | Verificar autorização antes de publicar |
| 7 | Contas de treinadores | Treinadores | Email, password (cifrada), registos de acesso | Acesso seguro à aplicação | Art. 6.º/1/f | Supabase Auth | Idem | Enquanto for treinador do clube | Password; sessão por dispositivo; botão "Sair" |
| 8 | Consentimentos | Encarregados de educação e atletas | Nome do encarregado, autorizações, datas | Prova dos consentimentos (art. 7.º/1) | Art. 6.º/1/c (obrigação legal de demonstrar o consentimento) | Treinadores; Supabase | Idem | Enquanto os dados do atleta existirem | RLS por centro |

**Dados que a app NÃO trata:** dados de saúde, contactos dos pais, dados de pagamento. Se passarem a ser tratados, este registo e a política de privacidade têm de ser atualizados antes.
