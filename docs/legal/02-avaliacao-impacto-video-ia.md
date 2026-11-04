# Avaliação de Impacto sobre a Proteção de Dados (AIPD) — Vídeo de combates e análise por IA

**Data:** 2026-11-04 · **Responsável:** Clube de Judo Hajime · **A rever:** anualmente ou se o tratamento mudar

## 1. Porquê fazer esta avaliação
O tratamento envolve **titulares vulneráveis (menores)**, **imagem/vídeo** e **tecnologia nova (inteligência artificial)**, com envio de dados para **fora da UE**. Estes critérios, em conjunto, indicam um risco que justifica uma AIPD (art. 35.º RGPD; orientações do Comité Europeu para a Proteção de Dados). Em caso de dúvida, a CNPD recomenda fazê-la.

## 2. Descrição do tratamento
1. O treinador filma (ou recebe) o vídeo de um combate e carrega-o na app (armazenamento privado no Supabase).
2. Para a análise, a app extrai até 96 imagens do vídeo, no dispositivo do treinador, e junta-as em "folhas de contacto".
3. O treinador envia essas imagens ao Claude (Anthropic) através da sua conta claude.ai, com um pedido que inclui o nome do atleta, do adversário, a competição e a categoria.
4. O relatório devolvido é guardado na app e consultado só pelos treinadores.
5. *(Opcional, desligado por defeito)* Análise automática pela API da Anthropic, com as imagens enviadas por link temporário.

## 3. Necessidade e proporcionalidade
- **Finalidade legítima:** melhorar a formação técnica dos atletas.
- **Minimização:** só imagens (não o vídeo completo), em resolução reduzida (640 px); imagens apagadas após a análise; o nome do adversário é opcional.
- **Fundamento:** consentimento específico, separado do da imagem; recusar não afeta a inscrição.
- **Sem decisões automáticas:** o relatório é um apoio; seleções e graduações são decididas pelo treinador.

## 4. Riscos e medidas
| Risco | Probabilidade / gravidade (antes) | Medidas | Risco residual |
|---|---|---|---|
| Acesso indevido aos vídeos de menores | Média / Elevada | Bucket privado; links temporários; RLS só para treinadores autorizados; registos públicos desligados | Baixo |
| Imagens usadas para treinar modelos de IA | Média / Média | Desligar a opção de treino na conta claude.ai; política e formulário informam as famílias | Baixo (depende da configuração da conta) |
| Transferência para os EUA sem garantias | Média / Média | Verificar a adesão do fornecedor ao Quadro de Privacidade UE-EUA ou cláusulas contratuais-tipo (doc. 04); informar as famílias | Médio |
| Uso de conta pessoal (consumidor) do claude.ai, sem contrato de subcontratação (DPA) com o clube | Elevada / Média | **Recomendação:** para uso continuado, passar para a API comercial da Anthropic (análise automática da app), que tem termos comerciais e DPA | Médio enquanto se usar a conta pessoal |
| Análise de adversários (outros clubes) sem consentimento | Elevada / Baixa | Uso estritamente interno; o adversário não é o foco; não publicar relatórios; nome do adversário opcional | Baixo |
| Vídeos guardados demasiado tempo | Média / Média | Prazo de 2 anos após a saída; lista de inativos na página RGPD; apagar ao retirar o consentimento | Baixo |
| Erros ou vieses da IA prejudicarem o atleta | Baixa / Baixa | Relatório como apoio; treinador valida; secção "limitações" no relatório | Baixo |

## 5. Conclusão
O tratamento pode prosseguir com as medidas indicadas. **Ação prioritária:** substituir o uso da conta pessoal claude.ai pela API comercial quando for viável, e confirmar as garantias de transferência internacional. Não se considera necessária consulta prévia à CNPD (art. 36.º), desde que as medidas sejam aplicadas.

**Aprovado por:** ____________________ **Data:** ____/____/______
