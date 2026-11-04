'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../../../lib/supabase/client';
import { BUCKET_COMBATES, RESULTADOS, caminhoVideo, formatarData } from '../../../../../../../lib/analise';

interface Combate {
  id: number;
  adversario: string | null;
  ronda: string | null;
  resultado: string | null;
  video_path: string;
  notas: string | null;
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

  async function atualizarCombate(id: number, campos: Partial<Combate>) {
    setCombates((prev) => prev.map((c) => (c.id === id ? { ...c, ...campos } : c)));
    const { error } = await supabase.from('analise_combates').update(campos).eq('id', id);
    if (error) alert('Erro ao guardar: ' + error.message);
  }

  async function removerCombate(combate: Combate, numero: number) {
    if (!confirm(`Remover o combate ${numero}? O vídeo será apagado.`)) return;
    try {
      await supabase.storage.from(BUCKET_COMBATES).remove([combate.video_path]);
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

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Combates ({combates.length})</h2>
        {combates.length === 0 ? (
          <p className="text-xs text-gray-500 bg-white p-6 rounded-2xl border border-gray-100">Ainda não há combates para este atleta.</p>
        ) : (
          <div className="space-y-3">
            {combates.map((c, i) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-gray-900">Combate {i + 1}</h3>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/analise/${competicaoId}/atletas/${atletaId}/combates/${c.id}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs"
                    >
                      ▶ Ver e Analisar
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
