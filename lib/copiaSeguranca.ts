// Cópia de segurança: todas as tabelas da app num ficheiro Excel (uma folha por tabela).
import * as XLSX from 'xlsx-js-style';
import { supabase } from './supabase/client';
import { lerTudo } from './supabase/utils';

// Tabela -> coluna para ordenar (necessária para ler por páginas de forma estável)
const TABELAS: { tabela: string; ordem: string; folha: string }[] = [
  { tabela: 'centros', ordem: 'id', folha: 'Centros' },
  { tabela: 'centro_treinadores', ordem: 'id', folha: 'Treinadores por centro' },
  { tabela: 'turmas', ordem: 'id', folha: 'Turmas' },
  { tabela: 'turma_horarios', ordem: 'id', folha: 'Horários' },
  { tabela: 'alunos', ordem: 'id', folha: 'Atletas' },
  { tabela: 'presencas', ordem: 'id', folha: 'Presenças' },
  { tabela: 'consentimentos', ordem: 'aluno_id', folha: 'Consentimentos' },
  { tabela: 'analise_competicoes', ordem: 'id', folha: 'Análise - competições' },
  { tabela: 'analise_atletas', ordem: 'id', folha: 'Análise - atletas' },
  { tabela: 'analise_combates', ordem: 'id', folha: 'Análise - combates' },
  { tabela: 'ranking_epocas', ordem: 'id', folha: 'Ranking - épocas' },
  { tabela: 'ranking_centros', ordem: 'id', folha: 'Ranking - centros' },
  { tabela: 'ranking_provas', ordem: 'id', folha: 'Ranking - provas' },
  { tabela: 'ranking_atletas', ordem: 'id', folha: 'Ranking - atletas' },
  { tabela: 'ranking_resultados', ordem: 'id', folha: 'Ranking - resultados' },
  { tabela: 'biblioteca_videos', ordem: 'id', folha: 'Biblioteca' },
  { tabela: 'eventos', ordem: 'id', folha: 'Eventos (antigos)' },
  { tabela: 'evento_participantes_livres', ordem: 'id', folha: 'Eventos - participantes' },
];

const LIMITE_CELULA = 32000; // o Excel não aceita mais de 32 767 caracteres por célula

function paraCelula(v: unknown) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const texto = JSON.stringify(v);
    return texto.length > LIMITE_CELULA ? texto.slice(0, LIMITE_CELULA) + '…[cortado]' : texto;
  }
  if (typeof v === 'string' && v.length > LIMITE_CELULA) return v.slice(0, LIMITE_CELULA) + '…[cortado]';
  return v as string | number | boolean;
}

export async function criarCopiaSeguranca(onProgresso?: (texto: string) => void) {
  const wb = XLSX.utils.book_new();
  const resumo: (string | number)[][] = [['Tabela', 'Linhas', 'Estado']];

  for (const { tabela, ordem, folha } of TABELAS) {
    onProgresso?.(`A copiar ${folha}…`);
    try {
      const linhas = await lerTudo((de, ate) => supabase.from(tabela).select('*').order(ordem).range(de, ate));
      const colunas = Array.from(new Set(linhas.flatMap((l: any) => Object.keys(l))));
      const ws = XLSX.utils.aoa_to_sheet([colunas, ...linhas.map((l: any) => colunas.map((c) => paraCelula(l[c])))]);
      ws['!cols'] = colunas.map(() => ({ wch: 18 }));
      colunas.forEach((_, c) => {
        const ref = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[ref]) ws[ref].s = { font: { bold: true } };
      });
      XLSX.utils.book_append_sheet(wb, ws, folha.slice(0, 31));
      resumo.push([tabela, linhas.length, 'OK']);
    } catch (err: any) {
      resumo.push([tabela, 0, `Não copiada: ${err?.message || 'erro'}`]);
    }
  }

  const agora = new Date();
  const wsResumo = XLSX.utils.aoa_to_sheet([
    ['Cópia de segurança CJH Manager'],
    [`Criada em ${agora.toLocaleString('pt-PT')}`],
    ['Inclui os registos visíveis para esta conta. Os ficheiros de vídeo não estão incluídos.'],
    [],
    ...resumo,
  ]);
  wsResumo['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
  // Resumo como primeira folha
  wb.SheetNames = ['Resumo', ...wb.SheetNames.filter((n) => n !== 'Resumo')];

  const carimbo = agora.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  XLSX.writeFile(wb, `copia_seguranca_cjh_${carimbo}.xlsx`);
  return resumo.slice(1);
}
