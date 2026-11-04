'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../../../../../lib/supabase/client';
import { BUCKET_COMBATES } from '../../../../../../../../../lib/analise';

export default function CombatePage({
  params,
}: {
  params: Promise<{ competicaoId: string; atletaId: string; combateId: string }>;
}) {
  const { competicaoId, atletaId, combateId } = use(params);

  const [combate, setCombate] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, [combateId]);

  async function carregar() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analise_combates')
        .select('*, analise_atletas(nome, categoria, analise_competicoes(nome))')
        .eq('id', combateId)
        .single();
      if (error) throw error;
      setCombate(data);
      setNotas(data.notas || '');

      // Bucket privado: link temporário válido por 2 horas
      const { data: signed, error: signedError } = await supabase.storage
        .from(BUCKET_COMBATES)
        .createSignedUrl(data.video_path, 60 * 60 * 2);
      if (signedError) throw signedError;
      setVideoUrl(signed.signedUrl);
    } catch (err: any) {
      setErro('Erro ao carregar combate: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function guardarNotas() {
    setSaving(true);
    setGuardado(false);
    const { error } = await supabase.from('analise_combates').update({ notas: notas || null }).eq('id', combateId);
    setSaving(false);
    if (error) return alert('Erro ao guardar notas: ' + error.message);
    setGuardado(true);
  }

  if (loading) return <p className="text-xs text-gray-500">A carregar...</p>;

  const atleta = combate?.analise_atletas;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link
          href={`/dashboard/analise/${competicaoId}/atletas/${atletaId}`}
          className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2"
        >
          ← Voltar aos Combates
        </Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          {atleta?.analise_competicoes?.nome} · {atleta?.categoria}
        </span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">
          {atleta?.nome}
          {combate?.adversario ? <span className="text-gray-400"> vs </span> : null}
          {combate?.adversario}
        </h1>
        <p className="text-xs font-bold text-gray-500 mt-1">
          {[combate?.ronda, combate?.resultado].filter(Boolean).join(' · ') || 'Sem ronda/resultado definidos'}
        </p>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">{erro}</div>
      )}

      {videoUrl && (
        <div className="bg-black rounded-2xl overflow-hidden shadow-sm">
          <video src={videoUrl} controls playsInline preload="metadata" className="w-full max-h-[70vh]" />
        </div>
      )}

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Análise do Combate</h2>
        <p className="text-xs text-gray-500">
          Ferramentas de análise do vídeo serão adicionadas aqui. Por agora pode registar observações sobre o combate.
        </p>
        <textarea
          value={notas}
          onChange={(e) => {
            setNotas(e.target.value);
            setGuardado(false);
          }}
          rows={6}
          placeholder="Ex: Entrou bem de kumikata, sofreu shido aos 2:10 por passividade…"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={guardarNotas}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
          >
            {saving ? 'A guardar...' : 'Guardar Notas'}
          </button>
          {guardado && <span className="text-xs font-bold text-emerald-600">✓ Guardado</span>}
        </div>
      </section>
    </div>
  );
}
