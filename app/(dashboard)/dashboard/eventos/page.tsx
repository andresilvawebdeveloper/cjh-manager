'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

interface ParticipanteLivre {
  id?: number;
  evento_id: number;
  nome: string;
  apelido: string;
  cinto: string;
  escalao: string;
}

interface Evento {
  id: number;
  tipo: string;
  nome_torneio: string | null;
  dias: string[];
  horario: string | null;
  escaloes: string[];
}

interface AtletaRanking {
  nomeCompleto: string;
  cinto: string;
  escalao: string;
  totalPontos: number;
  torneios: number;
  estagios: number;
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [todosParticipantes, setTodosParticipantes] = useState<ParticipanteLivre[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Formulário de Criação de Evento
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tipo, setTipo] = useState('Torneio');
  const [nomeTorneio, setNomeTorneio] = useState('');
  const [dias, setDias] = useState<string>('');
  const [horario, setHorario] = useState('');
  const [escaloesSelecionados, setEscaloesSelecionados] = useState<string[]>([]);

  // Estados para gerir participantes do evento selecionado
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [listaParticipantes, setListaParticipantes] = useState<ParticipanteLivre[]>([]);
  const [novoNome, setNovoNome] = useState('');
  const [novoApelido, setNovoApelido] = useState('');
  const [novoCinto, setNovoCinto] = useState('Branco');
  const [novoEscalao, setNovoEscalao] = useState('Infantis');

  const listaEscaloesOficiais = ['Benjamins', 'Infantis', 'Iniciados', 'Juvenis', 'Cadetes', 'Juniores', 'Seniores', 'Veteranos'];

  const carregarDados = async () => {
    try {
      setLoading(true);
      const { data: evData, error: evError } = await supabase.from('eventos').select('*').order('id', { ascending: false });
      if (evError) throw evError;
      setEventos(evData || []);

      const { data: partData, error: partError } = await supabase.from('evento_participantes_livres').select('*');
      if (partError) throw partError;
      setTodosParticipantes(partData || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const abrirModalCriar = () => {
    setTipo('Torneio');
    setNomeTorneio('');
    setDias('');
    setHorario('');
    setEscaloesSelecionados([]);
    setMostrarModal(true);
  };

  const guardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    const arrayDias = dias.split(',').map((d) => d.trim()).filter(Boolean);

    if (arrayDias.length === 0 || escaloesSelecionados.length === 0) {
      alert('Preencha os dias e selecione pelo menos um escalão.');
      return;
    }

    const payload = {
      tipo,
      nome_torneio: tipo === 'Torneio' ? nomeTorneio : null,
      dias: arrayDias,
      horario,
      escaloes: escaloesSelecionados,
    };

    try {
      const { error } = await supabase.from('eventos').insert([payload]);
      if (error) throw error;

      setMostrarModal(false);
      carregarDados();
    } catch (err: any) {
      alert('Erro ao guardar evento: ' + err.message);
    }
  };

  const eliminarEvento = async (eventoId: number, nomeEvento: string) => {
    if (!confirm(`Tem a certeza que pretende eliminar o evento "${nomeEvento}"? Todos os pontos associados a este evento serão removidos do ranking.`)) return;

    try {
      const { error } = await supabase.from('eventos').delete().eq('id', eventoId);
      if (error) throw error;
      await carregarDados();
    } catch (err: any) {
      alert('Erro ao eliminar evento: ' + err.message);
    }
  };

  const abrirGestaoParticipantes = (evento: Evento) => {
    setEventoSelecionado(evento);
    const filtrados = todosParticipantes.filter((p) => p.evento_id === evento.id);
    setListaParticipantes(filtrados);
  };

  const adicionarParticipanteLivre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventoSelecionado || !novoNome.trim() || !novoApelido.trim()) return;

    try {
      const novoRegisto = {
        evento_id: eventoSelecionado.id,
        nome: novoNome.trim(),
        apelido: novoApelido.trim(),
        cinto: novoCinto,
        escalao: novoEscalao,
      };

      const { data, error } = await supabase.from('evento_participantes_livres').insert([novoRegisto]).select();
      if (error) throw error;

      if (data) {
        const atualizados = [...todosParticipantes, data[0]];
        setTodosParticipantes(atualizados);
        setListaParticipantes(atualizados.filter((p) => p.evento_id === eventoSelecionado.id));
      }
      setNovoNome('');
      setNovoApelido('');
      setNovoCinto('Branco');
      setNovoEscalao('Infantis');
    } catch (err: any) {
      alert('Erro ao adicionar participante: ' + err.message);
    }
  };

  const removerParticipanteLivre = async (id: number) => {
    try {
      const { error } = await supabase.from('evento_participantes_livres').delete().eq('id', id);
      if (error) throw error;
      const atualizados = todosParticipantes.filter((p) => p.id !== id);
      setTodosParticipantes(atualizados);
      if (eventoSelecionado) {
        setListaParticipantes(atualizados.filter((p) => p.evento_id === eventoSelecionado.id));
      }
    } catch (err: any) {
      alert('Erro ao remover participante: ' + err.message);
    }
  };

  const toggleEscalao = (esc: string) => {
    if (esc === 'Todos') {
      setEscaloesSelecionados(['Todos']);
    } else {
      const filtrados = escaloesSelecionados.filter((e) => e !== 'Todos');
      if (filtrados.includes(esc)) {
        setEscaloesSelecionados(filtrados.filter((e) => e !== esc));
      } else {
        setEscaloesSelecionados([...filtrados, esc]);
      }
    }
  };

  // Agrupamento de Atletas por Escalão para o Ranking
  const rankingPorEscalao: Record<string, AtletaRanking[]> = {};

  listaEscaloesOficiais.forEach((esc) => {
    rankingPorEscalao[esc] = [];
  });

  const mapaAtletasTemp: Record<string, AtletaRanking> = {};

  todosParticipantes.forEach((p) => {
    const nomeCompleto = `${p.nome} ${p.apelido}`.trim();
    const eventoDoAtleta = eventos.find((ev) => ev.id === p.evento_id);
    if (!eventoDoAtleta) return;

    const pontosAtribuidos = eventoDoAtleta.tipo === 'Torneio' ? 3 : 1;
    const chaveAtleta = `${nomeCompleto}_${p.escalao}`;

    if (!mapaAtletasTemp[chaveAtleta]) {
      mapaAtletasTemp[chaveAtleta] = {
        nomeCompleto,
        cinto: p.cinto,
        escalao: p.escalao,
        totalPontos: 0,
        torneios: 0,
        estagios: 0,
      };
    }

    mapaAtletasTemp[chaveAtleta].totalPontos += pontosAtribuidos;
    if (eventoDoAtleta.tipo === 'Torneio') {
      mapaAtletasTemp[chaveAtleta].torneios += 1;
    } else {
      mapaAtletasTemp[chaveAtleta].estagios += 1;
    }
    mapaAtletasTemp[chaveAtleta].cinto = p.cinto;
  });

  Object.values(mapaAtletasTemp).forEach((atleta) => {
    const esc = atleta.escalao || 'Infantis';
    if (!rankingPorEscalao[esc]) {
      rankingPorEscalao[esc] = [];
    }
    rankingPorEscalao[esc].push(atleta);
  });

  Object.keys(rankingPorEscalao).forEach((esc) => {
    rankingPorEscalao[esc].sort((a, b) => b.totalPontos - a.totalPontos);
  });

  if (loading) return <div className="p-12 text-center text-xs text-gray-500">A carregar dados...</div>;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Competições & Atividades</span>
          <h1 className="text-2xl font-black text-gray-900 mt-1">Gestão de Eventos e Rankings</h1>
        </div>
        <button
          onClick={abrirModalCriar}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
        >
          ➕ Adicionar Novo Evento
        </button>
      </div>

      {/* MODAL DE CRIAR EVENTO */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">Novo Evento / Estágio</h2>
            <form onSubmit={guardarEvento} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Evento</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl focus:ring-blue-500 bg-white"
                >
                  <option value="Torneio">Torneio (Vale 3 pontos)</option>
                  <option value="Estagio Interno / Aula Competitiva">Estágio Interno / Aula Competitiva (Vale 1 ponto)</option>
                  <option value="Estagio de Outros Clubes">Estágio de Outros Clubes (Vale 1 ponto)</option>
                </select>
              </div>

              {tipo === 'Torneio' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome do Torneio</label>
                  <input
                    type="text"
                    required
                    value={nomeTorneio}
                    onChange={(e) => setNomeTorneio(e.target.value)}
                    placeholder="Ex: Torneio Internacional de Judo"
                    className="w-full p-2.5 text-xs border border-gray-300 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dia(s) (Separe por vírgulas se forem vários)</label>
                <input
                  type="text"
                  required
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  placeholder="Ex: 2026-06-12, 2026-06-13"
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Horário</label>
                <input
                  type="text"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                  placeholder="Ex: 09:00 - 13:00"
                  className="w-full p-2.5 text-xs border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Escalão(ões)</label>
                <div className="flex flex-wrap gap-2">
                  {['Todos', ...listaEscaloesOficiais].map((esc) => {
                    const selecionado = escaloesSelecionados.includes(esc);
                    return (
                      <button
                        key={esc}
                        type="button"
                        onClick={() => toggleEscalao(esc)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${selecionado ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {esc}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" onClick={() => setMostrarModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                  Guardar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE EVENTOS COM BOTÃO DE ELIMINAR */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Eventos e Estágios Registados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventos.length === 0 ? (
            <p className="text-xs text-gray-400 col-span-full py-6 text-center italic">Ainda não existem eventos registados.</p>
          ) : (
            eventos.map((ev) => {
              const nomeDisplay = ev.tipo === 'Torneio' ? ev.nome_torneio : ev.tipo;
              return (
                <div key={ev.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase ${ev.tipo === 'Torneio' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {ev.tipo === 'Torneio' ? '🏆 Torneio (3 pts)' : '🥋 Estágio / Aula (1 pt)'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mt-1">{nomeDisplay}</h3>
                    <p className="text-xs text-gray-500 font-medium">📅 Dias: {ev.dias.join(', ')} {ev.horario && `• 🕒 ${ev.horario}`}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <button
                      onClick={() => abrirGestaoParticipantes(ev)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      👥 Gerir Participantes →
                    </button>
                    <button
                      onClick={() => eliminarEvento(ev.id, nomeDisplay || 'Evento')}
                      className="text-xs font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* TABELA DE RANKINGS SEPARADA POR ESCALÕES */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-black text-gray-900">🏆 Tabelas de Ranking por Escalão</h2>
          <p className="text-xs text-gray-400">Pontuação acumulada em Torneios (3 pts) e Estágios/Aulas Competitivas (1 pt).</p>
        </div>

        <div className="space-y-6">
          {listaEscaloesOficiais.map((escalao) => {
            const atletasDoEscalao = rankingPorEscalao[escalao] || [];

            return (
              <div key={escalao} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    🥋 Escalão: <span className="text-blue-600">{escalao}</span>
                  </h3>
                  <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                    {atletasDoEscalao.length} {atletasDoEscalao.length === 1 ? 'Atleta' : 'Atletas'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                      <tr>
                        <th className="p-3 text-center w-16">Pos</th>
                        <th className="p-3">Atleta</th>
                        <th className="p-3 text-center">Cinto</th>
                        <th className="p-3 text-center">Torneios (3 pts)</th>
                        <th className="p-3 text-center">Estágios (1 pt)</th>
                        <th className="p-3 text-center font-black">Total Pontos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {atletasDoEscalao.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-gray-400 italic">Ainda não existem atletas registados neste escalão.</td>
                        </tr>
                      ) : (
                        atletasDoEscalao.map((atleta, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 font-medium">
                            <td className="p-3 text-center font-bold text-gray-500">
                              {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                            </td>
                            <td className="p-3 font-bold text-gray-900">{atleta.nomeCompleto}</td>
                            <td className="p-3 text-center font-semibold text-blue-600">{atleta.cinto}</td>
                            <td className="p-3 text-center text-amber-700 font-bold">{atleta.torneios}</td>
                            <td className="p-3 text-center text-blue-700 font-bold">{atleta.estagios}</td>
                            <td className="p-3 text-center font-black text-emerald-700 text-sm">{atleta.totalPontos} pts</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE GESTÃO DE PARTICIPANTES */}
      {eventoSelecionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Participantes do Evento</h2>
                <p className="text-xs text-gray-400">{eventoSelecionado.nome_torneio || eventoSelecionado.tipo}</p>
              </div>
              <button onClick={() => setEventoSelecionado(null)} className="text-xs font-bold text-gray-400 hover:text-gray-700 cursor-pointer">✕ Fechar</button>
            </div>

            {/* Formulário para adicionar participante com escalão */}
            <form onSubmit={adicionarParticipanteLivre} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
              <p className="text-[11px] font-bold text-gray-700 uppercase">Adicionar Participante Manualmente</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="p-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Apelido"
                  value={novoApelido}
                  onChange={(e) => setNovoApelido(e.target.value)}
                  className="p-2 text-xs bg-white border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cinto</label>
                  <select
                    value={novoCinto}
                    onChange={(e) => setNovoCinto(e.target.value)}
                    className="p-2 text-xs bg-white border border-gray-300 rounded-lg w-full"
                  >
                    <option value="Branco">Branco</option>
                    <option value="Branco/Amarelo">Branco/Amarelo</option>
                    <option value="Amarelo">Amarelo</option>
                    <option value="Amarelo/Laranja">Amarelo/Laranja</option>
                    <option value="Laranja">Laranja</option>
                    <option value="Laranja/Verde">Laranja/Verde</option>
                    <option value="Verde">Verde</option>
                    <option value="Azul">Azul</option>
                    <option value="Castanho">Castanho</option>
                    <option value="Preto">Preto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Escalão</label>
                  <select
                    value={novoEscalao}
                    onChange={(e) => setNovoEscalao(e.target.value)}
                    className="p-2 text-xs bg-white border border-gray-300 rounded-lg w-full"
                  >
                    {listaEscaloesOficiais.map((esc) => (
                      <option key={esc} value={esc}>{esc}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer">
                  Adicionar Participante
                </button>
              </div>
            </form>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100 border border-gray-100 rounded-xl p-2 max-h-60">
              {listaParticipantes.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center italic">Ainda não foram adicionados participantes a este evento.</p>
              ) : (
                listaParticipantes.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{p.nome} {p.apelido}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Cinto: {p.cinto}</span>
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">Escalão: {p.escalao}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removerParticipanteLivre(p.id!)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}