// Funções de apoio ao RGPD: consentimentos, exportação e eliminação dos dados de um atleta.
import { supabase } from './supabase/client';
import { apagarFicheirosCombates } from './analise';
import { buscarTodasPresencas } from './presencas';

export interface Consentimento {
  aluno_id: number;
  dados_basicos: boolean;
  imagem_video: boolean;
  analise_ia: boolean;
  divulgacao_publica: boolean;
  autorizado_por: string | null;
  data_autorizacao: string | null;
  notas: string | null;
  atualizado_em?: string;
}

export const TIPOS_CONSENTIMENTO: { chave: keyof Consentimento; rotulo: string; descricao: string }[] = [
  // Fundamento: inscrição no clube (contrato). Regista apenas que a família tomou conhecimento da política.
  { chave: 'dados_basicos', rotulo: 'Política lida', descricao: 'O encarregado tomou conhecimento da política de privacidade (ficha, presenças, graduações e resultados)' },
  { chave: 'imagem_video', rotulo: 'Imagem e vídeo', descricao: 'Fotografias e vídeos de treinos e combates, para uso interno do treinador' },
  { chave: 'analise_ia', rotulo: 'Análise por IA', descricao: 'Envio de imagens dos combates a um serviço de inteligência artificial (Anthropic, EUA)' },
  { chave: 'divulgacao_publica', rotulo: 'Divulgação pública', descricao: 'Nome e imagens em redes sociais, site e cartazes do clube' },
];

export const consentimentoVazio = (alunoId: number): Consentimento => ({
  aluno_id: alunoId,
  dados_basicos: false,
  imagem_video: false,
  analise_ia: false,
  divulgacao_publica: false,
  autorizado_por: null,
  data_autorizacao: null,
  notas: null,
});

export async function carregarConsentimento(alunoId: number): Promise<Consentimento | null> {
  const { data, error } = await supabase.from('consentimentos').select('*').eq('aluno_id', alunoId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function guardarConsentimento(c: Consentimento) {
  const { error } = await supabase
    .from('consentimentos')
    .upsert({ ...c, atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id' });
  if (error) throw error;
}

const normalizar = (s: string | null | undefined) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Registos ligados a um atleta: pela ficha (aluno_id) e, onde não há ligação, pelo nome completo exato. */
async function recolherDados(alunoId: number) {
  const { data: aluno, error } = await supabase.from('alunos').select('*').eq('id', alunoId).single();
  if (error) throw error;
  const nome = normalizar(aluno.nome);

  const [presencas, consentimento, analisePorId, analiseSemLigacao, participantes] = await Promise.all([
    buscarTodasPresencas([alunoId]),
    carregarConsentimento(alunoId),
    supabase.from('analise_atletas').select('*, analise_competicoes(nome, data), analise_combates(*)').eq('aluno_id', alunoId),
    supabase.from('analise_atletas').select('*, analise_competicoes(nome, data), analise_combates(*)').is('aluno_id', null),
    supabase.from('evento_participantes_livres').select('*'),
  ]);

  const analise = [
    ...(analisePorId.data || []),
    ...(analiseSemLigacao.data || []).filter((a: any) => normalizar(a.nome) === nome),
  ];
  const eventos = (participantes.data || []).filter(
    (p: any) => normalizar(`${p.nome || ''} ${p.apelido || ''}`) === nome || normalizar(p.nome) === nome
  );

  return { aluno, presencas, consentimento, analise, eventos };
}

/** Direito de acesso / portabilidade: descarrega todos os dados do atleta num ficheiro JSON. */
export async function exportarDadosAtleta(alunoId: number) {
  const d = await recolherDados(alunoId);
  const ficheiro = {
    gerado_em: new Date().toISOString(),
    nota: 'Dados pessoais tratados pelo clube relativos a este atleta (RGPD, artigos 15.º e 20.º). Os vídeos dos combates podem ser pedidos ao clube em separado.',
    atleta: d.aluno,
    consentimentos: d.consentimento,
    presencas: d.presencas.map(({ alunos, ...p }: any) => p),
    competicoes_e_combates: d.analise,
    participacoes_em_eventos: d.eventos,
  };
  const blob = new Blob([JSON.stringify(ficheiro, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dados_${normalizar(d.aluno.nome).replace(/[^a-z0-9]+/g, '_') || 'atleta'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Resumo do que será apagado (para mostrar na confirmação). */
export async function resumoEliminacao(alunoId: number) {
  const d = await recolherDados(alunoId);
  const combates = d.analise.flatMap((a: any) => a.analise_combates || []);
  return {
    nome: d.aluno.nome as string,
    presencas: d.presencas.length,
    competicoes: d.analise.length,
    combates: combates.length,
    videos: combates.filter((c: any) => c.video_path).length,
    eventos: d.eventos.length,
  };
}

/** Direito ao apagamento: remove o atleta e todos os dados associados, incluindo vídeos. */
export async function apagarAtletaCompletamente(alunoId: number) {
  const d = await recolherDados(alunoId);
  const combates = d.analise.flatMap((a: any) => a.analise_combates || []);

  await apagarFicheirosCombates(supabase, combates);
  if (d.analise.length > 0) {
    const { error } = await supabase.from('analise_atletas').delete().in('id', d.analise.map((a: any) => a.id));
    if (error) throw error;
  }
  if (d.eventos.length > 0) {
    const { error } = await supabase.from('evento_participantes_livres').delete().in('id', d.eventos.map((e: any) => e.id));
    if (error) throw error;
  }
  const { error: errPres } = await supabase.from('presencas').delete().eq('aluno_id', alunoId);
  if (errPres) throw errPres;
  await supabase.from('consentimentos').delete().eq('aluno_id', alunoId);
  const { error } = await supabase.from('alunos').delete().eq('id', alunoId);
  if (error) throw error;
}

export interface AutorizacoesAnalise {
  ligado: boolean; // o atleta da competição está ligado a uma ficha do clube?
  imagem: boolean;
  ia: boolean;
  desconhecido?: boolean; // não foi possível verificar (ex: migração ainda não aplicada)
}

/** Autorizações relevantes para vídeo e IA de um atleta inscrito numa competição. */
export async function autorizacoesAnalise(alunoId: number | null | undefined): Promise<AutorizacoesAnalise> {
  if (!alunoId) return { ligado: false, imagem: false, ia: false };
  try {
    const c = await carregarConsentimento(alunoId);
    return { ligado: true, imagem: !!c?.imagem_video, ia: !!c?.analise_ia };
  } catch {
    return { ligado: true, imagem: true, ia: true, desconhecido: true };
  }
}

/**
 * Confirma que se pode avançar. Para atletas sem ficha no clube pede confirmação explícita.
 * Devolve false (e avisa) quando a autorização registada não o permite.
 */
export function confirmarAutorizacao(a: AutorizacoesAnalise | null, tipo: 'imagem' | 'ia'): boolean {
  if (!a || a.desconhecido) return true;
  const nomeTipo = tipo === 'imagem' ? 'vídeos/fotografias' : 'análise por inteligência artificial';
  if (!a.ligado) {
    return confirm(
      `Este atleta não está ligado a uma ficha do clube, por isso a app não consegue verificar a autorização de ${nomeTipo}.\n\n` +
        'Confirma que tem autorização escrita do encarregado de educação (ou do próprio, se adulto)?'
    );
  }
  if (!a[tipo]) {
    alert(
      `Sem autorização de ${nomeTipo} registada para este atleta.\n\n` +
        'Registe o formulário assinado em Privacidade e RGPD antes de continuar.'
    );
    return false;
  }
  return true;
}
