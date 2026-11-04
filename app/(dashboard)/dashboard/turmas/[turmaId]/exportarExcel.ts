import * as XLSX from 'xlsx-js-style';

/** Cria a folha de Excel do mapa de presenças de uma turma (ou null se não houver registos). */
export function criarFolhaPresencas(turma: any, alunos: any[], todasPresencas: any[]): XLSX.WorkSheet | null {
  
  const horariosTexto = turma?.turma_horarios && turma.turma_horarios.length > 0
    ? turma.turma_horarios.map((h: any) => `${h.hora_inicio.slice(0, 5)} - ${h.hora_fim.slice(0, 5)} (${h.dia_semana})`).join(' | ')
    : 'Horário a definir';

  // Filtrar apenas presenças que tenham uma data válida e mapear corretamente
  const presencasFormatadas = (todasPresencas || [])
    .filter((p: any) => p && (p.data || p.data_treino))
    .map((p: any) => ({
      ...p,
      data_treino: p.data || p.data_treino,
      estado: p.presente === true ? 'Presente' : p.presente === false ? 'Faltou' : '-'
    }));

  const datasUnicas = Array.from(new Set(presencasFormatadas.map((p: any) => p.data_treino))).filter(Boolean).sort();

  if (datasUnicas.length === 0) return null;

  const coresMeses: Record<string, string> = {
    'Setembro': 'D9E1F2',
    'Outubro': 'E2EFDA',
    'Novembro': 'FFF2CC',
    'Dezembro': 'FCE4D6',
    'Janeiro': 'EDEDED',
    'Fevereiro': 'F8CBAD',
    'Março': 'C6E0B4',
    'Abril': 'D9D9D9',
    'Maio': 'F4B084',
    'Junho': 'B4C6E7',
    'Julho': 'A9D18E',
    'Agosto': 'D9E1F2',
  };

  const linha1 = ['Época 2025/2026', ''];
  const linha2 = [horariosTexto, ''];

  datasUnicas.forEach(() => {
    linha1.push('');
    linha2.push('');
  });

  const linhaMeses = ['', ''];
  const linhaDatas = ['Atletas', 'Ano Nascimento'];

  const blocosMeses: { nome: string; colInicio: number; colFim: number }[] = [];
  let mesAtual = '';
  let inicioIdx = 2;

  datasUnicas.forEach((dataStr: any, index: number) => {
    if (!dataStr) return;
    const dataObj = new Date(dataStr + 'T00:00:00');
    const nomeMes = dataObj.toLocaleString('pt-PT', { month: 'long' });
    const nomeMesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    const partesData = dataStr.split('-');
    const dataFormatada = partesData.length === 3 ? `${partesData[2]}/${partesData[1]}` : dataStr;

    linhaDatas.push(dataFormatada);

    if (nomeMesFormatado !== mesAtual) {
      if (mesAtual !== '') {
        blocosMeses.push({ nome: mesAtual, colInicio: inicioIdx, colFim: index + 1 });
        inicioIdx = index + 2;
      }
      mesAtual = nomeMesFormatado;
    }
    linhaMeses.push(nomeMesFormatado);

    if (index === datasUnicas.length - 1) {
      blocosMeses.push({ nome: mesAtual, colInicio: inicioIdx, colFim: index + 3 });
    }
  });

  const wsData = [linha1, linha2, linhaMeses, linhaDatas];

  alunos.forEach((aluno) => {
    const anoNascimento = aluno.data_nascimento ? new Date(aluno.data_nascimento).getFullYear() : '';
    const linhaAluno = [aluno.nome, anoNascimento];

    datasUnicas.forEach((dataStr: any) => {
      const registo = presencasFormatadas.find((p: any) => p.aluno_id === aluno.id && p.data_treino === dataStr);
      linhaAluno.push(registo ? registo.estado : '-');
    });

    wsData.push(linhaAluno);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  if (!ws['!merges']) ws['!merges'] = [];
  
  ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
  ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } });

  blocosMeses.forEach((bloco) => {
    if (bloco.colFim > bloco.colInicio) {
      ws['!merges'].push({
        s: { r: 2, c: bloco.colInicio },
        e: { r: 2, c: bloco.colFim - 1 },
      });
    }
  });

  const borderStyle = {
    top: { style: 'thin', color: { rgb: 'D3D3D3' } },
    bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
    left: { style: 'thin', color: { rgb: 'D3D3D3' } },
    right: { style: 'thin', color: { rgb: 'D3D3D3' } },
  };

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[cellAddress]) ws[cellAddress] = { v: '' };

      const cell = ws[cellAddress];
      
      cell.s = {
        font: { name: 'Arial', sz: 10 },
        alignment: { vertical: 'center', horizontal: 'center' },
        border: borderStyle,
      };

      if (C === 0 && R >= 4) {
        cell.s.alignment.horizontal = 'left';
        cell.s.font.bold = true;
      }

      if ((R === 0 || R === 1) && C <= 1) {
        cell.s.fill = { fgColor: { rgb: '1F4E78' } };
        cell.s.font = { name: 'Arial', sz: R === 0 ? 11 : 10, bold: true, color: { rgb: 'FFFFFF' } };
      }

      if (R === 2 && C >= 2) {
        const mesNome = cell.v;
        const corHex = coresMeses[mesNome] || 'E2EFDA';
        cell.s.fill = { fgColor: { rgb: corHex } };
        cell.s.font = { name: 'Arial', sz: 10, bold: true, color: { rgb: '000000' } };
      }

      if (R === 3) {
        cell.s.fill = { fgColor: { rgb: '2F5597' } };
        cell.s.font = { name: 'Arial', sz: 9, bold: true, color: { rgb: 'FFFFFF' } };
      }

      if (R >= 4 && C >= 2) {
        if (cell.v === 'Presente') {
          cell.s.font = { name: 'Arial', sz: 10, color: { rgb: '385723' }, bold: true };
          cell.s.fill = { fgColor: { rgb: 'E2EFDA' } };
        } else if (cell.v === 'Faltou') {
          cell.s.font = { name: 'Arial', sz: 10, color: { rgb: 'C00000' }, bold: true };
          cell.s.fill = { fgColor: { rgb: 'FCE4D6' } };
        }
      }
    }
  }

  ws['!cols'] = [
    { wch: 28 },
    { wch: 15 },
    ...datasUnicas.map(() => ({ wch: 12 })),
  ];

  return ws;
}

/** Nome de folha válido no Excel (máx. 31 caracteres, sem caracteres proibidos) e único no livro. */
function nomeFolha(nome: string, usados: Set<string>) {
  const base = (nome || 'Turma').replace(/[\/\\?*:()[\]]/g, '').trim().substring(0, 31) || 'Turma';
  let final = base;
  for (let n = 2; usados.has(final.toLowerCase()); n++) {
    const sufixo = ` (${n})`;
    final = base.substring(0, 31 - sufixo.length) + sufixo;
  }
  usados.add(final.toLowerCase());
  return final;
}

const nomeFicheiro = (nome: string) =>
  nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Exporta o mapa de presenças de uma só turma. */
export function exportarMapaPresencasExcel(turma: any, alunos: any[], todasPresencas: any[]) {
  const turmaNome = turma?.nome || 'Turma';
  const ws = criarFolhaPresencas(turma, alunos, todasPresencas);
  if (!ws) {
    alert('Ainda não existem registos de presenças válidos para exportar nesta turma.');
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nomeFolha(turmaNome, new Set()));
  XLSX.writeFile(wb, `mapa_presencas_${nomeFicheiro(turmaNome)}.xlsx`);
}

/** Exporta um único ficheiro com uma folha por turma do centro. Devolve as turmas sem registos. */
export function exportarPresencasCentroExcel(
  centroNome: string,
  turmas: { turma: any; alunos: any[]; presencas: any[] }[]
): string[] {
  const wb = XLSX.utils.book_new();
  const usados = new Set<string>();
  const semRegistos: string[] = [];

  turmas.forEach(({ turma, alunos, presencas }) => {
    const ws = criarFolhaPresencas(turma, alunos, presencas);
    if (!ws) {
      semRegistos.push(turma?.nome || 'Turma');
      return;
    }
    XLSX.utils.book_append_sheet(wb, ws, nomeFolha(turma?.nome, usados));
  });

  if (wb.SheetNames.length === 0) {
    alert('Ainda não existem registos de presenças em nenhuma turma deste centro.');
    return semRegistos;
  }
  XLSX.writeFile(wb, `mapa_presencas_${nomeFicheiro(centroNome || 'centro')}.xlsx`);
  return semRegistos;
}