// Identificação do clube (responsável pelo tratamento dos dados, no RGPD).
// Usado na política de privacidade (/privacidade), no formulário de consentimento e na página RGPD.
export const CLUBE = {
  nome: 'Clube de Judo Hajime',
  nomeCurto: 'CJH',
  nif: '513188983',
  morada: 'Rua Agostinho Neto, nº 34 - 1º B, 1750-006 Lisboa',
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
