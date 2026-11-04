// Identificação do clube (responsável pelo tratamento dos dados, no RGPD).
// PREENCHER com os dados reais antes de publicar a política de privacidade e os formulários.
export const CLUBE = {
  nome: 'Clube de Judo Hajime',
  nomeCurto: 'CJH',
  nif: '[PREENCHER NIF]',
  morada: '[PREENCHER morada da sede]',
  email: '[PREENCHER email para assuntos de privacidade]',
  telefone: '[PREENCHER telefone]',
  // Pessoa a contactar sobre proteção de dados (o clube pode não ter Encarregado de Proteção de Dados formal)
  responsavelPrivacidade: '[PREENCHER nome do responsável]',
  // Quanto tempo se guardam os dados depois de o atleta sair do clube
  prazoConservacaoAnos: 2,
  // Data da última revisão da política de privacidade
  revisaoPolitica: '2026-11-04',
};

export const POR_PREENCHER = (texto: string) => texto.startsWith('[PREENCHER');
