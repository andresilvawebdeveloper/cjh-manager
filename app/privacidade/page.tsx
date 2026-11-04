import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUBE } from '../../lib/clube';
import ModoClaroForcado from '../ModoClaroForcado';

export const metadata: Metadata = {
  title: `Política de Privacidade · ${CLUBE.nome}`,
  description: `Como o ${CLUBE.nome} trata os dados pessoais dos atletas e das famílias.`,
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-black text-gray-900 pt-6">{children}</h2>
);

export default function PrivacidadePage() {
  const dataRevisao = CLUBE.revisaoPolitica.split('-').reverse().join('/');
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <ModoClaroForcado />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3 text-sm leading-relaxed">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="w-12 h-12" />
          <div>
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">{CLUBE.nome}</p>
            <h1 className="text-2xl font-black text-gray-900">Política de Privacidade</h1>
          </div>
        </div>
        <p className="text-xs text-gray-500">Última revisão: {dataRevisao}</p>

        <p>
          Esta política explica como o <b>{CLUBE.nome}</b> trata os dados pessoais dos atletas (muitos deles menores de idade) e dos seus
          encarregados de educação, na aplicação de gestão do clube (CJH Manager), de acordo com o Regulamento Geral sobre a Proteção de
          Dados (RGPD — Regulamento (UE) 2016/679) e a Lei n.º 58/2019.
        </p>

        <H2>1. Quem é o responsável pelos dados</H2>
        <p>
          {CLUBE.nome}, NIF {CLUBE.nif}, com sede em {CLUBE.morada}.<br />
          Contacto para assuntos de privacidade: {CLUBE.responsavelPrivacidade} — {CLUBE.email}
          {CLUBE.telefone ? ` — ${CLUBE.telefone}` : ''}.
        </p>

        <H2>2. Que dados tratamos, para quê e com que fundamento</H2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left border-b border-gray-200">Dados</th>
                <th className="p-2 text-left border-b border-gray-200">Finalidade</th>
                <th className="p-2 text-left border-b border-gray-200">Fundamento (RGPD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 align-top">
              <tr>
                <td className="p-2">Nome, data de nascimento, escalão, graduação (cinto), turma e centro de treino</td>
                <td className="p-2">Gestão da inscrição e das turmas</td>
                <td className="p-2">Execução da inscrição no clube (art. 6.º, n.º 1, al. b)</td>
              </tr>
              <tr>
                <td className="p-2">Presenças nos treinos</td>
                <td className="p-2">Organização dos treinos, assiduidade, ranking de assiduidade e relatórios internos</td>
                <td className="p-2">Execução da inscrição e interesse legítimo do clube na gestão desportiva (art. 6.º, n.º 1, als. b e f)</td>
              </tr>
              <tr>
                <td className="p-2">Competições: categoria de peso, combates, resultados, classificação e notas do treinador</td>
                <td className="p-2">Acompanhamento desportivo e evolução do atleta</td>
                <td className="p-2">Interesse legítimo na gestão desportiva (art. 6.º, n.º 1, al. f)</td>
              </tr>
              <tr>
                <td className="p-2">Vídeos e fotografias de treinos e combates</td>
                <td className="p-2">Análise técnica pelo treinador, de uso interno</td>
                <td className="p-2">Consentimento do encarregado de educação (art. 6.º, n.º 1, al. a) e direito à imagem (art. 79.º do Código Civil)</td>
              </tr>
              <tr>
                <td className="p-2">Imagens extraídas dos vídeos dos combates</td>
                <td className="p-2">Análise técnica com apoio de inteligência artificial</td>
                <td className="p-2">Consentimento específico do encarregado de educação (art. 6.º, n.º 1, al. a)</td>
              </tr>
              <tr>
                <td className="p-2">Nome, fotografias e resultados em publicações do clube</td>
                <td className="p-2">Divulgação da atividade do clube (redes sociais, site, cartazes)</td>
                <td className="p-2">Consentimento do encarregado de educação (art. 6.º, n.º 1, al. a)</td>
              </tr>
              <tr>
                <td className="p-2">Email e password dos treinadores</td>
                <td className="p-2">Acesso seguro à aplicação</td>
                <td className="p-2">Interesse legítimo na segurança da informação (art. 6.º, n.º 1, al. f)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Não tratamos dados de saúde na aplicação. Os nomes de adversários de outros clubes podem ser registados nos resultados dos combates, como
          informação desportiva pública das competições.
        </p>

        <H2>3. Menores de idade</H2>
        <p>
          Os consentimentos relativos a atletas menores são dados pelos titulares das responsabilidades parentais (encarregados de educação). Os
          atletas com 13 ou mais anos são também informados e ouvidos. Cada consentimento é específico (imagem, análise por IA e divulgação pública
          são autorizados separadamente) e pode ser retirado a qualquer momento, sem afetar a inscrição no clube.
        </p>

        <H2>4. Análise de vídeo com inteligência artificial</H2>
        <p>
          Com consentimento específico, imagens extraídas dos vídeos dos combates podem ser analisadas com o serviço de inteligência artificial Claude,
          da empresa Anthropic (Estados Unidos), para produzir um relatório técnico (pegas, postura, deslocamento e técnicas). O relatório é um apoio ao
          treinador: <b>não são tomadas decisões automáticas</b> sobre o atleta (como seleções ou graduações) com base nele. O clube configura o
          serviço para que as imagens não sejam usadas para treinar modelos de IA.
        </p>

        <H2>5. Quem tem acesso e onde ficam os dados</H2>
        <p>
          Apenas os treinadores autorizados do clube, com acesso limitado aos centros de treino onde dão aulas. Os dados não são vendidos nem cedidos
          para fins comerciais. Recorremos a prestadores de serviços (subcontratantes) que tratam os dados por nossa conta:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><b>Supabase</b> — base de dados, autenticação e armazenamento de vídeos.</li>
          <li><b>Vercel</b> — alojamento da aplicação.</li>
          <li><b>Anthropic</b> — análise de vídeo por IA (apenas com consentimento específico).</li>
        </ul>
        <p>
          Alguns destes prestadores estão sediados nos Estados Unidos. Nesses casos, as transferências de dados para fora do Espaço Económico Europeu
          são feitas com as garantias previstas no RGPD (Quadro de Privacidade de Dados UE-EUA ou cláusulas contratuais-tipo aprovadas pela Comissão
          Europeia). Os vídeos da biblioteca de técnicas são reproduzidos a partir do YouTube em modo de privacidade reforçada.
        </p>

        <H2>6. Durante quanto tempo guardamos os dados</H2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Dados de inscrição, presenças e resultados: enquanto o atleta estiver inscrito e até {CLUBE.prazoConservacaoAnos} anos após a última presença.</li>
          <li>Vídeos e análises de combates: enquanto o consentimento se mantiver, e no máximo até {CLUBE.prazoConservacaoAnos} anos após a saída do atleta.</li>
          <li>Imagens extraídas para a análise por IA: apagadas logo após a análise.</li>
          <li>Retirado um consentimento, os dados correspondentes são apagados.</li>
        </ul>

        <H2>7. Os seus direitos</H2>
        <p>
          O atleta e o encarregado de educação podem pedir, a qualquer momento: acesso aos dados e cópia num formato digital (portabilidade),
          retificação, apagamento, limitação do tratamento, oposição ao tratamento baseado em interesse legítimo e retirada de qualquer consentimento.
          Basta contactar {CLUBE.email}. Respondemos no prazo máximo de um mês.
        </p>
        <p>
          Tem também o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD) — <a className="text-blue-700 underline" href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>.
        </p>

        <H2>8. Segurança</H2>
        <p>
          Acesso apenas com conta pessoal de treinador; regras de acesso na base de dados que limitam cada treinador aos seus centros; vídeos em
          armazenamento privado com links temporários; ligações cifradas (HTTPS). Em caso de violação de dados com risco para os titulares, o clube
          notifica a CNPD no prazo de 72 horas e, quando o risco for elevado, as famílias afetadas.
        </p>

        <H2>9. Alterações</H2>
        <p>Esta política pode ser atualizada. A data da última revisão aparece no topo da página.</p>

        <div className="pt-8 flex flex-wrap gap-4 text-xs">
          <Link href="/consentimento" className="text-blue-700 underline">Formulário de consentimento</Link>
          <Link href="/" className="text-blue-700 underline">Entrar na aplicação (treinadores)</Link>
        </div>
      </div>
    </main>
  );
}
