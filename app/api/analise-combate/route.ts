import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { createClient } from '@supabase/supabase-js';
import { RelatorioCombateSchema } from '../../../lib/analiseIA';
import { SYSTEM_PROMPT, linhasContexto } from '../../../lib/promptAnalise';
import { BUCKET_COMBATES, formatarTempo } from '../../../lib/analise';

export const runtime = 'nodejs';
// A análise de um combate completo pode demorar alguns minutos
export const maxDuration = 300;



interface FramePedido {
  path: string;
  t: number;
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ erro: 'ANTHROPIC_API_KEY não está configurada no servidor.' }, { status: 500 });
  }

  // Cliente Supabase com a sessão do treinador (respeita as políticas RLS)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ erro: 'Sessão inválida.' }, { status: 401 });

  let body: { combateId?: number; frames?: FramePedido[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ erro: 'Pedido inválido.' }, { status: 400 });
  }
  const combateId = Number(body.combateId);
  const frames = Array.isArray(body.frames) ? body.frames : [];
  const prefixo = `frames/${combateId}/`;
  if (!combateId || frames.length === 0 || frames.length > 600 || frames.some((f) => !f.path?.startsWith(prefixo))) {
    return Response.json({ erro: 'Frames inválidos.' }, { status: 400 });
  }

  const { data: combate, error: combateError } = await supabase
    .from('analise_combates')
    .select('*, analise_atletas(nome, genero, categoria, analise_competicoes(nome, data))')
    .eq('id', combateId)
    .single();
  if (combateError || !combate) return Response.json({ erro: 'Combate não encontrado.' }, { status: 404 });

  const { data: assinados, error: signError } = await supabase.storage
    .from(BUCKET_COMBATES)
    .createSignedUrls(frames.map((f) => f.path), 60 * 60);
  if (signError || !assinados) {
    return Response.json({ erro: 'Erro ao preparar frames: ' + signError?.message }, { status: 500 });
  }

  await supabase.from('analise_combates').update({ analise_estado: 'a_analisar' }).eq('id', combateId);

  const atleta = combate.analise_atletas;
  const contexto = linhasContexto({
    competicao: atleta?.analise_competicoes?.nome,
    data: atleta?.analise_competicoes?.data,
    categoria: `${atleta?.genero ?? ''} ${atleta?.categoria ?? ''}`.trim(),
    ronda: combate.ronda,
    atleta: atleta?.nome,
    corAtleta: combate.cor_judogi || 'Branco',
    adversario: combate.adversario,
    resultado: combate.resultado,
  });

  const conteudo: Anthropic.Beta.BetaContentBlockParam[] = [
    {
      type: 'text',
      text: [...contexto, `Seguem ${frames.length} frames do combate, por ordem cronológica.`].join('\n'),
    },
  ];
  frames.forEach((f, i) => {
    const url = assinados[i]?.signedUrl;
    if (!url) return;
    conteudo.push({ type: 'text', text: `t=${formatarTempo(f.t)}` });
    conteudo.push({ type: 'image', source: { type: 'url', url } });
  });
  conteudo.push({
    type: 'text',
    text: 'Faz agora a análise completa do combate para os dois lutadores, seguindo o formato pedido.',
  });

  try {
    const client = new Anthropic();
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: {
        effort: 'high',
        format: betaZodOutputFormat(RelatorioCombateSchema),
      },
      messages: [{ role: 'user', content: conteudo }],
    });
    const resposta = await stream.finalMessage();

    if (resposta.stop_reason === 'refusal') {
      throw new Error('A IA recusou analisar este vídeo.');
    }
    if (resposta.stop_reason === 'max_tokens') {
      throw new Error('A análise ficou incompleta (limite de resposta atingido). Tente novamente.');
    }
    const relatorio = resposta.parsed_output;
    if (!relatorio) throw new Error('A IA devolveu uma resposta num formato inesperado.');

    const { error: saveError } = await supabase
      .from('analise_combates')
      .update({
        analise_ia: relatorio,
        analise_estado: 'concluida',
        analise_data: new Date().toISOString(),
        analise_frames: frames.length,
      })
      .eq('id', combateId);
    if (saveError) throw new Error('Erro ao guardar a análise: ' + saveError.message);

    // Os frames só servem para a análise: libertar espaço no Storage
    await supabase.storage.from(BUCKET_COMBATES).remove(frames.map((f) => f.path));

    return Response.json({ relatorio });
  } catch (err: any) {
    await supabase.from('analise_combates').update({ analise_estado: 'erro' }).eq('id', combateId);
    let mensagem = err?.message || 'Erro desconhecido.';
    if (err instanceof Anthropic.RateLimitError) mensagem = 'Limite de pedidos da IA atingido. Tente daqui a uns minutos.';
    else if (err instanceof Anthropic.AuthenticationError) mensagem = 'Chave da API da IA inválida.';
    else if (err instanceof Anthropic.APIError) mensagem = `Erro da IA (${err.status}): ${err.message}`;
    console.error('Erro na análise do combate', combateId, err);
    return Response.json({ erro: mensagem }, { status: 500 });
  }
}
