'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../../../../../../lib/supabase/client';
import { BUCKET_COMBATES, enviarVideoCombate, tempoParaSegundos } from '../../../../../../../../../lib/analise';
import { CORES_JUDOGI, LutadorRelatorio, RelatorioCombate } from '../../../../../../../../../lib/analiseIA';
import { extrairFrames } from '../../../../../../../../../lib/extrairFrames';
import PainelClaudeManual from './PainelClaudeManual';

// A análise automática usa a API da Anthropic (paga à parte). Ativar com NEXT_PUBLIC_ANALISE_IA_AUTOMATICA=true
const ANALISE_AUTOMATICA = process.env.NEXT_PUBLIC_ANALISE_IA_AUTOMATICA === 'true';

type Fase = 'parado' | 'a_extrair' | 'a_enviar' | 'a_analisar';

const AREAS: { chave: 'kumikata' | 'postura' | 'deslocamento' | 'tachi_waza' | 'ne_waza'; titulo: string }[] = [
  { chave: 'kumikata', titulo: 'Kumikata (Pegas)' },
  { chave: 'postura', titulo: 'Postura' },
  { chave: 'deslocamento', titulo: 'Deslocamento' },
  { chave: 'tachi_waza', titulo: 'Tachi-waza (Em pé)' },
  { chave: 'ne_waza', titulo: 'Ne-waza (Chão)' },
];

const CORES_RESULTADO: Record<string, string> = {
  Ippon: 'bg-emerald-100 text-emerald-800',
  'Waza-ari': 'bg-blue-100 text-blue-800',
  'Sem pontuação': 'bg-gray-100 text-gray-700',
  Bloqueada: 'bg-amber-100 text-amber-800',
  'Contra-atacada': 'bg-red-100 text-red-700',
  Tentativa: 'bg-gray-100 text-gray-600',
};

const CORES_PRIORIDADE: Record<string, string> = {
  Alta: 'bg-red-100 text-red-700',
  Média: 'bg-amber-100 text-amber-800',
  Baixa: 'bg-gray-100 text-gray-700',
};

async function emParalelo<T>(itens: T[], limite: number, fn: (item: T, i: number) => Promise<void>) {
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      await fn(itens[i], i);
    }
  });
  await Promise.all(trabalhadores);
}

export default function CombatePage({
  params,
}: {
  params: Promise<{ competicaoId: string; atletaId: string; combateId: string }>;
}) {
  const { competicaoId, atletaId, combateId } = use(params);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [combate, setCombate] = useState<any>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [enviandoVideo, setEnviandoVideo] = useState(false);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [erro, setErro] = useState('');

  const [fase, setFase] = useState<Fase>('parado');
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [relatorio, setRelatorio] = useState<RelatorioCombate | null>(null);

  useEffect(() => {
    carregar();
  }, [combateId]);

  async function carregar() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('analise_combates')
        .select('*, analise_atletas(nome, genero, categoria, analise_competicoes(nome, data))')
        .eq('id', combateId)
        .single();
      if (error) throw error;
      setCombate(data);
      setNotas(data.notas || '');
      setRelatorio(data.analise_ia || null);

      setVideoUrl('');
      if (data.video_path) await carregarVideo(data.video_path);
    } catch (err: any) {
      setErro('Erro ao carregar combate: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarVideo(caminho: string) {
    // Bucket privado: link temporário válido por 2 horas
    const { data: signed, error } = await supabase.storage.from(BUCKET_COMBATES).createSignedUrl(caminho, 60 * 60 * 2);
    if (error) throw error;
    setVideoUrl(signed.signedUrl);
  }

  async function adicionarVideo(ficheiro: File | undefined) {
    if (!ficheiro) return;
    setEnviandoVideo(true);
    setErro('');
    try {
      const caminho = await enviarVideoCombate(supabase, competicaoId, atletaId, Number(combateId), ficheiro);
      setCombate((c: any) => ({ ...c, video_path: caminho }));
      await carregarVideo(caminho);
    } catch (err: any) {
      setErro('Erro ao enviar vídeo: ' + err.message);
    } finally {
      setEnviandoVideo(false);
    }
  }

  async function atualizarCombate(campos: Record<string, any>) {
    setCombate((c: any) => ({ ...c, ...campos }));
    const { error } = await supabase.from('analise_combates').update(campos).eq('id', combateId);
    if (error) alert('Erro ao guardar: ' + error.message);
  }

  async function guardarNotas() {
    setSaving(true);
    setGuardado(false);
    const { error } = await supabase.from('analise_combates').update({ notas: notas || null }).eq('id', combateId);
    setSaving(false);
    if (error) return alert('Erro ao guardar notas: ' + error.message);
    setGuardado(true);
  }

  async function analisarComIA() {
    if (!videoUrl) return;
    if (relatorio && !confirm('Este combate já tem uma análise. Quer substituí-la por uma nova?')) return;
    setErro('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada. Volte a entrar.');

      // 1. Extrair frames do vídeo no próprio dispositivo
      setFase('a_extrair');
      const frames = await extrairFrames(videoUrl, (feitos, total) => setProgresso({ feitos, total }));

      // 2. Limpar frames antigos e enviar os novos para o Storage
      setFase('a_enviar');
      setProgresso({ feitos: 0, total: frames.length });
      const pasta = `frames/${combateId}`;
      const { data: antigos } = await supabase.storage.from(BUCKET_COMBATES).list(pasta, { limit: 1000 });
      if (antigos && antigos.length > 0) {
        await supabase.storage.from(BUCKET_COMBATES).remove(antigos.map((f) => `${pasta}/${f.name}`));
      }
      const caminhos: string[] = new Array(frames.length);
      let enviados = 0;
      await emParalelo(frames, 6, async (frame, i) => {
        const caminho = `${pasta}/${String(i).padStart(4, '0')}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET_COMBATES)
          .upload(caminho, frame.blob, { contentType: 'image/jpeg', upsert: true });
        if (error) throw new Error('Erro ao enviar frames: ' + error.message);
        caminhos[i] = caminho;
        enviados++;
        setProgresso({ feitos: enviados, total: frames.length });
      });

      // 3. Pedir a análise à IA
      setFase('a_analisar');
      const resposta = await fetch('/api/analise-combate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          combateId: Number(combateId),
          frames: frames.map((f, i) => ({ path: caminhos[i], t: f.t })),
        }),
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.erro || `Erro ${resposta.status}`);
      setRelatorio(json.relatorio);
      setCombate((c: any) => ({ ...c, analise_estado: 'concluida', analise_data: new Date().toISOString() }));
    } catch (err: any) {
      setErro('Erro na análise: ' + err.message);
    } finally {
      setFase('parado');
    }
  }

  async function guardarRelatorioManual(novo: RelatorioCombate, numFrames: number) {
    if (relatorio && !confirm('Este combate já tem uma análise. Quer substituí-la?')) return;
    const campos = {
      analise_ia: novo,
      analise_estado: 'concluida',
      analise_data: new Date().toISOString(),
      analise_frames: numFrames || null,
    };
    const { error } = await supabase.from('analise_combates').update(campos).eq('id', combateId);
    if (error) throw error;
    setRelatorio(novo);
    setCombate((c: any) => ({ ...c, ...campos }));
  }

  function irPara(momento: string) {
    const s = tempoParaSegundos(momento);
    if (s === null || !videoRef.current) return;
    videoRef.current.currentTime = s;
    videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function Tempo({ momento }: { momento: string }) {
    const valido = tempoParaSegundos(momento) !== null;
    return valido ? (
      <button onClick={() => irPara(momento)} className="font-mono text-[11px] font-bold text-blue-600 hover:underline">
        ▶ {momento}
      </button>
    ) : (
      <span className="font-mono text-[11px] text-gray-400">{momento}</span>
    );
  }

  function Lista({ itens, cor }: { itens: string[]; cor: 'verde' | 'vermelho' }) {
    if (!itens?.length) return null;
    return (
      <ul className="space-y-1">
        {itens.map((t, i) => (
          <li key={i} className="text-xs text-gray-700 flex gap-1.5">
            <span className={cor === 'verde' ? 'text-emerald-600' : 'text-red-500'}>{cor === 'verde' ? '✓' : '✗'}</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    );
  }

  function BarraNota({ nota }: { nota: number }) {
    const n = Math.max(0, Math.min(10, Math.round(nota)));
    const cor = n >= 7 ? 'bg-emerald-500' : n >= 5 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${cor}`} style={{ width: `${n * 10}%` }} />
        </div>
        <span className="text-xs font-black text-gray-900 w-8 text-right">{n}/10</span>
      </div>
    );
  }

  function CartaoLutador({ lutador, titulo, destaque }: { lutador: LutadorRelatorio; titulo: string; destaque: boolean }) {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border p-5 space-y-5 ${destaque ? 'border-blue-200' : 'border-gray-100'}`}>
        <div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${destaque ? 'text-blue-600' : 'text-gray-500'}`}>{titulo}</span>
          <h3 className="text-lg font-black text-gray-900">{lutador.nome}</h3>
          <p className="text-xs text-gray-500">Judogi {lutador.cor_judogi}</p>
        </div>

        {AREAS.map(({ chave, titulo }) => {
          const area: any = lutador[chave];
          if (!area) return null;
          return (
            <div key={chave} className="space-y-2 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">{titulo}</h4>
              <BarraNota nota={area.nota} />
              <p className="text-xs text-gray-700 leading-relaxed">{area.avaliacao}</p>
              <Lista itens={area.pontos_fortes} cor="verde" />
              <Lista itens={area.pontos_a_melhorar} cor="vermelho" />
              {area.tecnicas?.length > 0 && (
                <div className="space-y-2 pt-1">
                  {area.tecnicas.map((t: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-gray-900">{t.nome}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${CORES_RESULTADO[t.resultado] || 'bg-gray-100 text-gray-700'}`}>
                          {t.resultado}
                        </span>
                        <Tempo momento={t.momento} />
                      </div>
                      <p className="text-xs text-gray-600">{t.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {lutador.penalizacoes?.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Penalizações</h4>
            {lutador.penalizacoes.map((p, i) => (
              <div key={i} className="text-xs text-gray-700 flex flex-wrap gap-2 items-center">
                <span className="font-bold text-amber-700">{p.tipo}</span>
                <Tempo momento={p.momento} />
                <span>{p.motivo}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">Síntese</h4>
          <Lista itens={lutador.pontos_fortes_gerais} cor="verde" />
          <Lista itens={lutador.pontos_a_melhorar_gerais} cor="vermelho" />
        </div>
      </div>
    );
  }

  if (loading) return <p className="text-xs text-gray-500">A carregar...</p>;

  const atleta = combate?.analise_atletas;
  const ocupado = fase !== 'parado';
  const textoFase =
    fase === 'a_extrair'
      ? `A extrair frames do vídeo… ${progresso.feitos}/${progresso.total}`
      : fase === 'a_enviar'
        ? `A enviar frames… ${progresso.feitos}/${progresso.total}`
        : fase === 'a_analisar'
          ? 'O treinador IA está a analisar o combate… (pode demorar alguns minutos, não feche esta página)'
          : '';
  const percentagem = progresso.total ? Math.round((progresso.feitos / progresso.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
          <video ref={videoRef} src={videoUrl} controls playsInline preload="metadata" className="w-full max-h-[70vh]" />
        </div>
      )}

      {combate && !combate.video_path && (
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-dashed border-gray-300 text-center space-y-3">
          <p className="text-3xl">🎥</p>
          <h2 className="text-sm font-black text-gray-900">Este combate ainda não tem vídeo</h2>
          <p className="text-xs text-gray-500">
            Pode registar o que aconteceu nas notas abaixo. Quando tiver o vídeo, adicione-o aqui para o ver e analisar com IA.
          </p>
          <label
            className={`inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer ${
              enviandoVideo ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            {enviandoVideo ? 'A enviar vídeo…' : '⬆ Adicionar vídeo'}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={enviandoVideo}
              onChange={(e) => {
                adicionarVideo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </section>
      )}

      {/* Painel de análise por IA */}
      {videoUrl && (
      <section className="bg-gradient-to-br from-violet-50 to-blue-50 p-6 rounded-2xl border border-violet-100 space-y-4">
        <div>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">🤖 Análise por Inteligência Artificial</h2>
          <p className="text-xs text-gray-600 mt-1">
            A IA analisa o vídeo como um treinador de Judo experiente: kumikata, postura, deslocamento, tachi-waza e ne-waza dos dois lutadores.
            Indique primeiro a cor do judogi do atleta do clube.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Judogi de {atleta?.nome?.split(' ')[0] || 'atleta'}</label>
            <div className="flex gap-2">
              {CORES_JUDOGI.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  disabled={ocupado}
                  onClick={() => atualizarCombate({ cor_judogi: cor })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    (combate?.cor_judogi || 'Branco') === cor
                      ? cor === 'Azul'
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-gray-900 border-gray-900 ring-2 ring-gray-900'
                      : 'bg-white/60 text-gray-600 border-gray-200'
                  }`}
                >
                  {cor}
                </button>
              ))}
            </div>
          </div>
          {ANALISE_AUTOMATICA && (
            <button
              onClick={analisarComIA}
              disabled={ocupado || !videoUrl}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all"
            >
              {ocupado ? 'A analisar…' : relatorio ? '↻ Analisar automaticamente' : '⚡ Análise automática (API)'}
            </button>
          )}
        </div>
        {ocupado && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-violet-800">{textoFase}</p>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full bg-violet-500 transition-all ${fase === 'a_analisar' ? 'animate-pulse w-full' : ''}`}
                style={fase === 'a_analisar' ? undefined : { width: `${percentagem}%` }}
              />
            </div>
          </div>
        )}
        {combate?.analise_data && !ocupado && (
          <p className="text-[11px] text-gray-500">
            Última análise: {new Date(combate.analise_data).toLocaleString('pt-PT')}
          </p>
        )}
      </section>
      )}

      {videoUrl && (
        <PainelClaudeManual
          videoUrl={videoUrl}
          desativado={ocupado}
          contexto={{
            competicao: atleta?.analise_competicoes?.nome,
            data: atleta?.analise_competicoes?.data,
            categoria: [atleta?.genero, atleta?.categoria].filter(Boolean).join(' '),
            ronda: combate?.ronda,
            atleta: atleta?.nome || 'Atleta',
            corAtleta: combate?.cor_judogi || 'Branco',
            adversario: combate?.adversario,
            resultado: combate?.resultado,
          }}
          onRelatorio={guardarRelatorioManual}
        />
      )}

      {relatorio && (
        <>
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Resumo do Combate</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{relatorio.resumo}</p>
            <p className="text-xs font-bold text-gray-900">🏁 {relatorio.vencedor_observado}</p>
          </section>

          {/* Comparação das notas */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Comparação</h2>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 items-center text-xs">
              <span className="font-black text-blue-700 text-right truncate">{relatorio.atleta.nome}</span>
              <span />
              <span className="font-black text-gray-700 truncate">{relatorio.adversario.nome}</span>
              {AREAS.map(({ chave, titulo }) => {
                const a = Math.round(relatorio.atleta[chave]?.nota ?? 0);
                const b = Math.round(relatorio.adversario[chave]?.nota ?? 0);
                return (
                  <div key={chave} className="contents">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-black">{a}</span>
                      <div className="w-full max-w-[160px] h-2 bg-gray-100 rounded-full overflow-hidden flex justify-end">
                        <div className="h-full bg-blue-500" style={{ width: `${a * 10}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase text-center whitespace-nowrap">{titulo.split(' ')[0]}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[160px] h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-500" style={{ width: `${b * 10}%` }} />
                      </div>
                      <span className="font-black">{b}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CartaoLutador lutador={relatorio.atleta} titulo="Atleta do clube" destaque />
            <CartaoLutador lutador={relatorio.adversario} titulo="Adversário" destaque={false} />
          </div>

          {relatorio.momentos_chave?.length > 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Momentos-Chave</h2>
              <div className="space-y-2">
                {relatorio.momentos_chave.map((m, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <Tempo momento={m.momento} />
                    <p className="text-xs text-gray-700">{m.descricao}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {relatorio.recomendacoes_treino?.length > 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Plano de Treino Recomendado</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatorio.recomendacoes_treino.map((r, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase ${CORES_PRIORIDADE[r.prioridade] || ''}`}>
                        {r.prioridade}
                      </span>
                      <h3 className="text-xs font-black text-gray-900">{r.titulo}</h3>
                    </div>
                    <p className="text-xs text-gray-700">{r.descricao}</p>
                    {r.exercicios?.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {r.exercicios.map((e, j) => (
                          <li key={j}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {relatorio.limitacoes && (
            <p className="text-[11px] text-gray-500 italic">⚠ Limitações da análise: {relatorio.limitacoes}</p>
          )}
        </>
      )}

      <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Notas do Treinador</h2>
        <textarea
          value={notas}
          onChange={(e) => {
            setNotas(e.target.value);
            setGuardado(false);
          }}
          rows={4}
          placeholder="O que aconteceu no combate, observações próprias…"
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
