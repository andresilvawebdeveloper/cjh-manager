'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../../../lib/supabase/client';
import { BUCKET_COMBATES, RESULTADOS, apagarFicheirosCombates, caminhoVideo, enviarVideoCombate, formatarData } from '../../../../../../../lib/analise';

interface Combate {
  id: number;
  adversario: string | null;
  ronda: string | null;
  resultado: string | null;
  video_path: string | null;
  notas: string | null;
  analise_estado: string | null;
  created_at: string;
}

export default function AtletaCombatesPage({ params }: { params: Promise<{ competicaoId: string; atletaId: string }> }) {
  const { competicaoId, atletaId } = use(params);

  const [atleta, setAtleta] = useState<any>(null);
  const [combates, setCombates] = useState<Combate[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [ficheiros, setFicheiros] = useState<File[]>([]);
  const [progresso, setProgresso] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Registar combate sem vídeo
  const [semVideo, setSemVideo] = useState({ adversario: '', ronda: '', resultado: '', notas: '' });
  const [aRegistar, setARegistar] = useState(false);
  // Combate ao qual se está a juntar um vídeo (upload posterior)
  const [aEnviarVideoId, setAEnviarVideoId] = useState<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, [atletaId]);

  async function carregarDados() {
    try {
      setLoading(true);
      const [atletaRes, combatesRes] = await Promise.all([
        supabase.from('analise_atletas').select('*, analise_competicoes(nome, data)').eq('id', atletaId).single(),
        supabase.from('analise_combates').select('*').eq('atleta_id', atletaId).order('created_at'),
      ]);
      if (atletaRes.error) throw atletaRes.error;
      if (combatesRes.error) throw combatesRes.error;
      setAtleta(atletaRes.data);
      setCombates(combatesRes.data || []);
    } catch (err: any) {
      setErro('Erro ao carregar atleta: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function enviarCombates(e: React.FormEvent) {
    e.preventDefault();
    if (ficheiros.length === 0) return;
    setUploading(true);
    setErro('');
    let enviados = 0;
    try {
      for (const ficheiro of ficheiros) {
        setProgresso(`A enviar ${enviados + 1} de ${ficheiros.length}: ${ficheiro.name}`);
        const caminho = caminhoVideo(competicaoId, atletaId, ficheiro);
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_COMBATES)
          .upload(caminho, ficheiro, { contentType: ficheiro.type || 'video/mp4', upsert: false });
        if (uploadError) throw new Error(`${ficheiro.name}: ${uploadError.message}`);

        const { error: insertError } = await supabase.from('analise_combates').insert([
          { atleta_id: Number(atletaId), video_path: caminho },
        ]);
        if (insertError) {
          await supabase.storage.from(BUCKET_COMBATES).remove([caminho]);
          throw insertError;
        }
        enviados++;
      }
      setFicheiros([]);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setErro('Erro no upload: ' + err.message);
    } finally {
      setUploading(false);
      setProgresso('');
      if (enviados > 0) carregarDados();
    }
  }

  async function registarSemVideo(e: React.FormEvent) {
    e.preventDefault();
    setARegistar(true);
    setErro('');
    try {
      const { error } = await supabase.from('analise_combates').insert([
        {
          atleta_id: Number(atletaId),
          video_path: null,
          adversario: semVideo.adversario.trim() || null,
          ronda: semVideo.ronda.trim() || null,
          resultado: semVideo.resultado || null,
          notas: semVideo.notas.trim() || null,
        },
      ]);
      if (error) throw error;
      setSemVideo({ adversario: '', ronda: '', resultado: '', notas: '' });
      carregarDados();
    } catch (err: any) {
      setErro('Erro ao registar combate: ' + err.message);
    } finally {
      setARegistar(false);
    }
  }

  async function adicionarVideo(combate: Combate, ficheiro: File | undefined) {
    if (!ficheiro) return;
    setAEnviarVideoId(combate.id);
    setErro('');
    try {
      const caminho = await enviarVideoCombate(supabase, competicaoId, atletaId, combate.id, ficheiro);
      setCombates((prev) => prev.map((c) => (c.id === combate.id ? { ...c, video_path: caminho } : c)));
    } catch (err: any) {
      setErro('Erro ao enviar vídeo: ' + err.message);
    } finally {
      setAEnviarVideoId(null);
    }
  }

  async function atualizarCombate(id: number, campos: Partial<Combate>) {
    setCombates((prev) => prev.map((c) => (c.id === id ? { ...c, ...campos } : c)));
    const { error } = await supabase.from('analise_combates').update(campos).eq('id', id);
    if (error) alert('Erro ao guardar: ' + error.message);
  }

  async function removerCombate(combate: Combate, numero: number) {
    if (!confirm(`Remover o combate ${numero}?${combate.video_path ? ' O vídeo será apagado.' : ''}`)) return;
    try {
      await apagarFicheirosCombates(supabase, [combate]);
      const { error } = await supabase.from('analise_combates').delete().eq('id', combate.id);
      if (error) throw error;
      setCombates((prev) => prev.filter((c) => c.id !== combate.id));
    } catch (err: any) {
      alert('Erro ao remover combate: ' + err.message);
    }
  }

  if (loading) return <p className="text-xs text-gray-500">A carregar...</p>;

  const tamanhoTotalMB = ficheiros.reduce((t, f) => t + f.size, 0) / (1024 * 1024);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href={`/dashboard/analise/${competicaoId}`} className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">
          ← Voltar à Competição
        </Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          {atleta?.analise_competicoes?.nome} · {formatarData(atleta?.analise_competicoes?.data)}
        </span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">{atleta?.nome}</h1>
        <p className="text-xs font-bold text-gray-500 mt-1">{atleta?.genero} · {atleta?.categoria}</p>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>
      )}

      <form onSubmit={enviarCombates} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Adicionar Combates (Upload de Vídeo)</h2>
        <p className="text-xs text-gray-500">Pode escolher vários vídeos de uma vez — cada vídeo fica registado como um combate.</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          multiple
          disabled={uploading}
          onChange={(e) => setFicheiros(Array.from(e.target.files || []))}
          className="block w-full text-xs text-gray-700 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold hover:file:bg-blue-100"
        />
        {ficheiros.length > 0 && !uploading && (
          <p className="text-xs text-gray-500">
            {ficheiros.length} {ficheiros.length === 1 ? 'vídeo selecionado' : 'vídeos selecionados'} ({tamanhoTotalMB.toFixed(1)} MB)
          </p>
        )}
        {progresso && <p className="text-xs font-bold text-blue-700">{progresso}</p>}
        <button
          type="submit"
          disabled={uploading || ficheiros.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {uploading ? 'A enviar...' : '⬆ Enviar Vídeos'}
        </button>
      </form>

      <form onSubmit={registarSemVideo} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Registar Combate sem Vídeo</h2>
          <p className="text-xs text-gray-500 mt-1">Para quando não há vídeo (ou fica para mais tarde). O vídeo pode ser adicionado depois no próprio combate.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={semVideo.adversario}
            onChange={(e) => setSemVideo({ ...semVideo, adversario: e.target.value })}
            placeholder="Adversário"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={semVideo.ronda}
            onChange={(e) => setSemVideo({ ...semVideo, ronda: e.target.value })}
            placeholder="Ronda (ex: 1/8, Meia-final)"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={semVideo.resultado}
            onChange={(e) => setSemVideo({ ...semVideo, resultado: e.target.value })}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Resultado…</option>
            {RESULTADOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <textarea
          value={semVideo.notas}
          onChange={(e) => setSemVideo({ ...semVideo, notas: e.target.value })}
          rows={3}
          placeholder="O que aconteceu? (ex: ganhou por waza-ari de seoi-nage aos 2:30, sofreu 2 shidos por passividade…)"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={aRegistar}
          className="px-5 py-2.5 bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
        >
          {aRegistar ? 'A guardar...' : '+ Registar Combate'}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Combates ({combates.length})</h2>
        {combates.length === 0 ? (
          <p className="text-xs text-gray-500 bg-white p-6 rounded-2xl border border-gray-100">Ainda não há combates para este atleta.</p>
        ) : (
          <div className="space-y-3">
            {combates.map((c, i) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    Combate {i + 1}
                    {!c.video_path && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase bg-gray-100 text-gray-600">Sem vídeo</span>
                    )}
                    {c.analise_estado === 'concluida' && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase bg-violet-100 text-violet-800">🤖 Analisado</span>
                    )}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {!c.video_path && (
                      <label
                        className={`px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs cursor-pointer ${
                          aEnviarVideoId !== null ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {aEnviarVideoId === c.id ? 'A enviar vídeo…' : '⬆ Adicionar vídeo'}
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          disabled={aEnviarVideoId !== null}
                          onChange={(e) => {
                            adicionarVideo(c, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                    <Link
                      href={`/dashboard/analise/${competicaoId}/atletas/${atletaId}/combates/${c.id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs"
                    >
                      {c.video_path ? '▶ Ver e Analisar' : '📝 Abrir'}
                    </Link>
                    <button onClick={() => removerCombate(c, i + 1)} className="text-xs font-bold text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    defaultValue={c.adversario || ''}
                    onBlur={(e) => e.target.value !== (c.adversario || '') && atualizarCombate(c.id, { adversario: e.target.value || null })}
                    placeholder="Adversário"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900"
                  />
                  <input
                    type="text"
                    defaultValue={c.ronda || ''}
                    onBlur={(e) => e.target.value !== (c.ronda || '') && atualizarCombate(c.id, { ronda: e.target.value || null })}
                    placeholder="Ronda (ex: 1/8, Meia-final)"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-900"
                  />
                  <select
                    value={c.resultado || ''}
                    onChange={(e) => atualizarCombate(c.id, { resultado: e.target.value || null })}
                    className={`px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white ${
                      c.resultado === 'Vitória' ? 'text-emerald-700' : c.resultado === 'Derrota' ? 'text-red-600' : 'text-gray-500'
                    }`}
                  >
                    <option value="">Resultado…</option>
                    {RESULTADOS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
