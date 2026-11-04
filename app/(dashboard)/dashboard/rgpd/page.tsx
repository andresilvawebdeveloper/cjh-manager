'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';
import { buscarTodasPresencas } from '../../../../lib/presencas';
import { CLUBE, POR_PREENCHER } from '../../../../lib/clube';
import {
  Consentimento,
  TIPOS_CONSENTIMENTO,
  apagarAtletaCompletamente,
  consentimentoVazio,
  exportarDadosAtleta,
  guardarConsentimento,
  resumoEliminacao,
} from '../../../../lib/rgpd';

type Filtro = 'todos' | 'sem_consentimento' | 'sem_imagem' | 'inativos';

interface Linha {
  id: number;
  nome: string;
  turma: string;
  idade: number | null;
  ultimaPresenca: string | null;
  consentimento: Consentimento | null;
}

const hoje = () => new Date().toISOString().slice(0, 10);

function idade(dataNascimento: string | null) {
  if (!dataNascimento) return null;
  const n = new Date(dataNascimento);
  const h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
}

export default function RgpdPage() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [pesquisa, setPesquisa] = useState('');
  const [aEditar, setAEditar] = useState<Consentimento | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [ocupadoId, setOcupadoId] = useState<number | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      setErro('');
      const [alunosRes, turmasRes, consRes] = await Promise.all([
        supabase.from('alunos').select('id, nome, data_nascimento, turma_id').order('nome'),
        supabase.from('turmas').select('id, nome'),
        supabase.from('consentimentos').select('*'),
      ]);
      if (alunosRes.error) throw alunosRes.error;
      if (consRes.error) {
        throw new Error(
          consRes.error.message.includes('consentimentos')
            ? 'A tabela de consentimentos ainda não existe. Corra a migração 20261108_seguranca_rls.sql no Supabase.'
            : consRes.error.message
        );
      }
      const alunos = alunosRes.data || [];
      const turmas = new Map((turmasRes.data || []).map((t: any) => [t.id, t.nome]));
      const cons = new Map((consRes.data || []).map((c: any) => [c.aluno_id, c as Consentimento]));

      const presencas = await buscarTodasPresencas(alunos.map((a: any) => a.id));
      const ultima = new Map<number, string>();
      presencas.forEach((p: any) => {
        if (p.presente && (!ultima.has(p.aluno_id) || p.data > ultima.get(p.aluno_id)!)) ultima.set(p.aluno_id, p.data);
      });

      setLinhas(
        alunos.map((a: any) => ({
          id: a.id,
          nome: a.nome,
          turma: a.turma_id ? turmas.get(a.turma_id) || '—' : 'Sem turma',
          idade: idade(a.data_nascimento),
          ultimaPresenca: ultima.get(a.id) || null,
          consentimento: cons.get(a.id) || null,
        }))
      );
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  const limiteInatividade = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - CLUBE.prazoConservacaoAnos);
    return d.toISOString().slice(0, 10);
  }, []);

  const ehInativo = (l: Linha) => !l.ultimaPresenca || l.ultimaPresenca < limiteInatividade;

  const visiveis = linhas.filter((l) => {
    if (pesquisa && !l.nome.toLowerCase().includes(pesquisa.toLowerCase())) return false;
    if (filtro === 'sem_consentimento') return !l.consentimento?.dados_basicos;
    if (filtro === 'sem_imagem') return !l.consentimento?.imagem_video;
    if (filtro === 'inativos') return ehInativo(l);
    return true;
  });

  const contagens = {
    sem_consentimento: linhas.filter((l) => !l.consentimento?.dados_basicos).length,
    sem_imagem: linhas.filter((l) => !l.consentimento?.imagem_video).length,
    inativos: linhas.filter(ehInativo).length,
  };

  async function guardar() {
    if (!aEditar) return;
    setAGuardar(true);
    try {
      await guardarConsentimento(aEditar);
      setLinhas((prev) => prev.map((l) => (l.id === aEditar.aluno_id ? { ...l, consentimento: aEditar } : l)));
      setAEditar(null);
    } catch (err: any) {
      alert('Erro ao guardar: ' + err.message);
    } finally {
      setAGuardar(false);
    }
  }

  async function exportar(l: Linha) {
    setOcupadoId(l.id);
    try {
      await exportarDadosAtleta(l.id);
    } catch (err: any) {
      alert('Erro ao exportar: ' + err.message);
    } finally {
      setOcupadoId(null);
    }
  }

  async function apagar(l: Linha) {
    setOcupadoId(l.id);
    try {
      const r = await resumoEliminacao(l.id);
      const ok = confirm(
        `APAGAR DEFINITIVAMENTE todos os dados de "${r.nome}"?\n\n` +
          `• Ficha do atleta e consentimentos\n• ${r.presencas} registos de presença\n` +
          `• ${r.competicoes} inscrições em competições, ${r.combates} combates e ${r.videos} vídeos\n` +
          `• ${r.eventos} participações em eventos (encontradas pelo nome)\n\n` +
          'Esta ação não pode ser desfeita. Sugestão: exporte os dados primeiro, se o encarregado os pediu.'
      );
      if (!ok) return;
      await apagarAtletaCompletamente(l.id);
      setLinhas((prev) => prev.filter((x) => x.id !== l.id));
    } catch (err: any) {
      alert('Erro ao apagar: ' + err.message);
    } finally {
      setOcupadoId(null);
    }
  }

  const dadosPorPreencher = [CLUBE.nif, CLUBE.morada, CLUBE.email, CLUBE.responsavelPrivacidade].some(POR_PREENCHER);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Proteção de Dados</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Privacidade e RGPD</h1>
        <p className="text-xs text-gray-500 mt-1">Consentimentos dos encarregados de educação e direitos dos titulares (acesso, portabilidade e apagamento).</p>
      </div>

      {dadosPorPreencher && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
          <b>Falta preencher os dados do clube</b> (NIF, morada, email e responsável) em <code>lib/clube.ts</code>. Aparecem na política de privacidade e no formulário de consentimento.
        </div>
      )}

      {erro && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>}

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['todos', `Todos (${linhas.length})`],
                ['sem_consentimento', `Sem formulário entregue (${contagens.sem_consentimento})`],
                ['sem_imagem', `Sem autorização de imagem (${contagens.sem_imagem})`],
                ['inativos', `Inativos há +${CLUBE.prazoConservacaoAnos} anos (${contagens.inativos})`],
              ] as [Filtro, string][]
            ).map(([f, rotulo]) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  filtro === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Pesquisar atleta…"
            className="px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white"
          />
        </div>

        {filtro === 'inativos' && (
          <p className="text-xs text-gray-500">
            Atletas sem presenças nos últimos {CLUBE.prazoConservacaoAnos} anos. Pelo princípio da limitação da conservação, os dados de quem saiu do clube devem ser apagados (exporte primeiro, se necessário).
          </p>
        )}

        {loading ? (
          <p className="text-xs text-gray-500">A carregar…</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">
                  <th className="py-2 pr-3">Atleta</th>
                  <th className="py-2 px-2">Turma</th>
                  <th className="py-2 px-2">Autorizações</th>
                  <th className="py-2 px-2">Última presença</th>
                  <th className="py-2 pl-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visiveis.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-bold text-gray-900">{l.nome}</span>
                      {l.idade !== null && <span className="text-[10px] text-gray-400 ml-1.5">{l.idade} anos</span>}
                    </td>
                    <td className="py-2.5 px-2 text-gray-600">{l.turma}</td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {TIPOS_CONSENTIMENTO.map((t) => {
                          const sim = !!l.consentimento?.[t.chave];
                          return (
                            <span
                              key={t.chave}
                              title={t.descricao}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                sim ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}
                            >
                              {sim ? '✓' : '✗'} {t.rotulo}
                            </span>
                          );
                        })}
                      </div>
                      {l.consentimento?.autorizado_por && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          por {l.consentimento.autorizado_por}
                          {l.consentimento.data_autorizacao ? ` em ${l.consentimento.data_autorizacao.split('-').reverse().join('/')}` : ''}
                        </p>
                      )}
                    </td>
                    <td className={`py-2.5 px-2 whitespace-nowrap ${ehInativo(l) ? 'text-amber-700 font-bold' : 'text-gray-600'}`}>
                      {l.ultimaPresenca ? l.ultimaPresenca.split('-').reverse().join('/') : 'Nunca'}
                    </td>
                    <td className="py-2.5 pl-2">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => setAEditar(l.consentimento ? { ...l.consentimento } : { ...consentimentoVazio(l.id), data_autorizacao: hoje() })}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg"
                        >
                          Autorizações
                        </button>
                        <button
                          onClick={() => exportar(l)}
                          disabled={ocupadoId === l.id}
                          className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-lg disabled:opacity-50"
                          title="Descarregar todos os dados deste atleta (direito de acesso)"
                        >
                          ⬇ Exportar
                        </button>
                        <button
                          onClick={() => apagar(l)}
                          disabled={ocupadoId === l.id}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg disabled:opacity-50"
                          title="Apagar todos os dados deste atleta (direito ao apagamento)"
                        >
                          Apagar tudo
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">Nenhum atleta nesta lista.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Editor de autorizações */}
      {aEditar && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50" onClick={() => setAEditar(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-black text-gray-900">Autorizações</h2>
              <p className="text-xs text-gray-500">{linhas.find((l) => l.id === aEditar.aluno_id)?.nome} — registe o que consta no formulário assinado.</p>
            </div>
            <div className="space-y-2">
              {TIPOS_CONSENTIMENTO.map((t) => (
                <label key={t.chave} className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={!!aEditar[t.chave]}
                    onChange={(e) => setAEditar({ ...aEditar, [t.chave]: e.target.checked })}
                    className="mt-0.5 w-4 h-4"
                  />
                  <span>
                    <span className="block text-sm font-bold text-gray-900">{t.rotulo}</span>
                    <span className="block text-xs text-gray-500">{t.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Autorizado por</label>
                <input
                  type="text"
                  value={aEditar.autorizado_por || ''}
                  onChange={(e) => setAEditar({ ...aEditar, autorizado_por: e.target.value || null })}
                  placeholder="Nome do encarregado de educação"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Data do formulário</label>
                <input
                  type="date"
                  value={aEditar.data_autorizacao || ''}
                  onChange={(e) => setAEditar({ ...aEditar, data_autorizacao: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
                />
              </div>
            </div>
            <textarea
              value={aEditar.notas || ''}
              onChange={(e) => setAEditar({ ...aEditar, notas: e.target.value || null })}
              rows={2}
              placeholder="Notas (ex: formulário em papel arquivado na pasta da turma)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 bg-white"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAEditar(null)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={aGuardar}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs"
              >
                {aGuardar ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
