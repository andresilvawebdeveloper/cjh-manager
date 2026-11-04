// Identificação do clube (responsável pelo tratamento dos dados, no RGPD).
// PREENCHER com os dados reais antes de publicar a política de privacidade e os formulários.
export const CLUBE = {
  nome: 'Clube de Judo Hajime',
  nomeCurto: 'CJH',
  nif: '513188983',
  morada: '[PREENCHER morada da sede]',
  email: 'clubedejudohajime@gmail.com',
  telefone: '', // opcional: se ficar vazio não aparece na política
  // Pessoa a contactar sobre proteção de dados (o clube pode não ter Encarregado de Proteção de Dados formal)
  responsavelPrivacidade: 'Luis Bettencourt',
  // Quanto tempo se guardam os dados depois de o atleta sair do clube
  prazoConservacaoAnos: 2,
  // Data da última revisão da política de privacidade
  revisaoPolitica: '2026-11-04',
};

export const POR_PREENCHER = (texto: string) => texto.startsWith('[PREENCHER');
