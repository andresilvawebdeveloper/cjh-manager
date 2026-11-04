import type { Metadata } from 'next';
import { CLUBE } from '../../lib/clube';
import ModoClaroForcado from '../ModoClaroForcado';
import BotaoImprimir from './BotaoImprimir';

export const metadata: Metadata = {
  title: `Consentimento · ${CLUBE.nome}`,
  description: 'Formulário de autorização do encarregado de educação (RGPD e direito à imagem).',
};

const Linha = ({ rotulo }: { rotulo: string }) => (
  <div className="flex items-end gap-2">
    <span className="whitespace-nowrap">{rotulo}</span>
    <span className="flex-1 border-b border-gray-400 h-5" />
  </div>
);

const Opcao = ({ titulo, texto }: { titulo: string; texto: string }) => (
  <div className="border border-gray-300 rounded-lg p-3 break-inside-avoid">
    <p className="font-bold">{titulo}</p>
    <p className="text-xs text-gray-700 mt-1">{texto}</p>
    <div className="flex gap-8 mt-2 text-sm">
      <span>☐ Autorizo</span>
      <span>☐ Não autorizo</span>
    </div>
  </div>
);

export default function ConsentimentoPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <ModoClaroForcado />
      <div className="max-w-3xl mx-auto px-4 py-8 print:py-0 space-y-4 text-sm">
        <div className="flex justify-end print:hidden">
          <BotaoImprimir />
        </div>

        <div className="flex items-center gap-3 border-b border-gray-300 pb-3">
          <img src="/icons/icon-192.png" alt="" className="w-12 h-12" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">{CLUBE.nome}</p>
            <h1 className="text-xl font-black">Autorização de Tratamento de Dados e Imagem</h1>
            <p className="text-xs text-gray-600">Atletas menores de idade — RGPD (Regulamento (UE) 2016/679) e art. 79.º do Código Civil</p>
          </div>
        </div>

        <div className="space-y-3">
          <Linha rotulo="Nome do atleta:" />
          <div className="grid grid-cols-2 gap-6">
            <Linha rotulo="Data de nascimento:" />
            <Linha rotulo="Turma / centro:" />
          </div>
          <Linha rotulo="Nome do encarregado de educação:" />
          <div className="grid grid-cols-2 gap-6">
            <Linha rotulo="Email:" />
            <Linha rotulo="Telefone:" />
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-3 break-inside-avoid">
          <p className="font-bold">1. Inscrição e política de privacidade</p>
          <p className="text-xs text-gray-700 mt-1">
            Declaro que tomei conhecimento da Política de Privacidade do {CLUBE.nome} (disponível em <b>/privacidade</b> na aplicação do clube ou em papel,
            a pedido), incluindo o tratamento dos dados de inscrição, presenças, graduações e resultados desportivos, necessário à inscrição no clube.
          </p>
          <p className="mt-2">☐ Tomei conhecimento</p>
        </div>

        <p className="text-xs text-gray-700">
          As autorizações seguintes são <b>facultativas e independentes</b>: recusar qualquer uma delas não afeta a inscrição nem a participação nos
          treinos. Podem ser retiradas a qualquer momento através de {CLUBE.email}.
        </p>

        <Opcao
          titulo="2. Fotografias e vídeos para uso interno"
          texto="Captação de fotografias e vídeos de treinos e combates, guardados de forma privada e usados apenas pelos treinadores para análise técnica e acompanhamento do atleta."
        />
        <Opcao
          titulo="3. Análise de vídeo com inteligência artificial"
          texto="Envio de imagens extraídas dos vídeos dos combates ao serviço de IA Claude (Anthropic, EUA), para gerar um relatório técnico de apoio ao treinador. As imagens não são usadas para treinar modelos de IA e são apagadas após a análise. Não são tomadas decisões automáticas sobre o atleta."
        />
        <Opcao
          titulo="4. Divulgação pública"
          texto="Publicação do nome, fotografias, vídeos e resultados do atleta nas redes sociais, site, cartazes e comunicações do clube."
        />

        <div className="text-xs text-gray-700 space-y-1 break-inside-avoid">
          <p>
            <b>Responsável pelo tratamento:</b> {CLUBE.nome}, NIF {CLUBE.nif}, {CLUBE.morada}. Contacto: {CLUBE.email}.
          </p>
          <p>
            <b>Direitos:</b> acesso, retificação, apagamento, portabilidade, limitação, oposição e retirada do consentimento, através de {CLUBE.email}. Pode
            reclamar junto da CNPD (www.cnpd.pt). Os dados são guardados enquanto o atleta estiver inscrito e até {CLUBE.prazoConservacaoAnos} anos depois.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-8 pt-6 break-inside-avoid">
          <div className="space-y-6">
            <Linha rotulo="Data:" />
            <div>
              <span className="block border-b border-gray-400 h-10" />
              <p className="text-xs text-gray-600 mt-1">Assinatura do encarregado de educação</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-5" />
            <div>
              <span className="block border-b border-gray-400 h-10" />
              <p className="text-xs text-gray-600 mt-1">Assinatura do atleta (se tiver 13 ou mais anos)</p>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-gray-500 pt-4">
          A preencher pelo clube: registado na aplicação em ____/____/______ por ______________________
        </p>
      </div>
    </main>
  );
}
