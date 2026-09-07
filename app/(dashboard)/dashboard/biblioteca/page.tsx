'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabase/client';

const CATEGORIAS_JUDO = [
  'Kodokan Nage–Waza',
  'Kodokan Ne-Waza',
  'Nage–Waza',
  'Osaekomi–Waza',
  'Renraku–Waza',
  'Shime–Waza'
];

const SUBCATEGORIAS_NAGE_WAZA = [
  'Te-Waza',
  'Ashi-Waza',
  'Koshi-Waza',
  'Sutemi-Waza',
  'Yoko-Sutemi-Waza'
];

const SUBCATEGORIAS_NE_WAZA = [
  'Osaekomi-Waza',
  'Shime-Waza',
  'Kansetsu-Waza'
];

export default function BibliotecaPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [url, setUrl] = useState('');
  const [tipo, setTipo] = useState('youtube');
  const [categoria, setCategoria] = useState('Kodokan Nage–Waza');
  const [subcategoria, setSubcategoria] = useState('Te-Waza');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('TODAS');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [montado, setMontado] = useState(false);
  
  // Controla qual vídeo está ativo a ser reproduzido para poupar memória no telemóvel
  const [videoAtivoId, setVideoAtivoId] = useState<number | null>(null);

  useEffect(() => {
    setMontado(true);
    carregarVideos();
  }, []);

  const carregarVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('biblioteca_videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err: any) {
      setErro('Erro ao carregar vídeos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const adicionarVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro('');

    try {
      let subcatParaGuardar = null;
      if (categoria === 'Kodokan Nage–Waza' || categoria === 'Kodokan Ne-Waza') {
        subcatParaGuardar = subcategoria;
      }

      const { error } = await supabase.from('biblioteca_videos').insert([
        {
          titulo,
          url,
          tipo,
          categoria,
          subcategoria: subcatParaGuardar,
        }
      ]);

      if (error) throw error;

      setTitulo('');
      setUrl('');
      setCategoria('Kodokan Nage–Waza');
      setSubcategoria('Te-Waza');
      carregarVideos();
    } catch (err: any) {
      setErro('Erro ao adicionar vídeo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const extrairVideoIdYouTube = (link: string) => {
    try {
      const urlObj = new URL(link);
      let videoId = urlObj.searchParams.get('v');
      if (!videoId && urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1);
      }
      return videoId;
    } catch {
      return null;
    }
  };

  const videosFiltrados = videos.filter(v => {
    if (filtroCategoria !== 'TODAS' && v.categoria !== filtroCategoria) return false;
    if (filtroCategoria === 'Kodokan Nage–Waza' && filtroSubcategoria !== 'TODAS' && v.subcategoria !== filtroSubcategoria) return false;
    if (filtroCategoria === 'Kodokan Ne-Waza' && filtroSubcategoria !== 'TODAS' && v.subcategoria !== filtroSubcategoria) return false;
    return true;
  });

  if (!montado) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div>
        <Link href="/dashboard" className="text-xs font-bold text-gray-500 hover:text-blue-600 block mb-2">← Voltar ao Dashboard</Link>
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Recursos e Formação</span>
        <h1 className="text-2xl font-black text-gray-900 mt-1">Biblioteca de Vídeos e Técnicas</h1>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          {erro}
        </div>
      )}

      {/* Formulário para Adicionar Vídeo */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Adicionar Vídeo ou Pasta com Categoria</h2>
        
        <form onSubmit={adicionarVideo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Título</label>
              <input
                type="text"
                required
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Seoi-nage"
                className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Categoria Principal</label>
              <select
                value={categoria}
                onChange={(e) => {
                  const novaCat = e.target.value;
                  setCategoria(novaCat);
                  if (novaCat === 'Kodokan Nage–Waza') setSubcategoria('Te-Waza');
                  else if (novaCat === 'Kodokan Ne-Waza') setSubcategoria('Osaekomi-Waza');
                  else setSubcategoria('');
                }}
                className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-medium"
              >
                {CATEGORIAS_JUDO.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {categoria === 'Kodokan Nage–Waza' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subcategoria (Nage-Waza)</label>
                <select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-medium"
                >
                  {SUBCATEGORIAS_NAGE_WAZA.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            {categoria === 'Kodokan Ne-Waza' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subcategoria (Ne-Waza)</label>
                <select
                  value={subcategoria}
                  onChange={(e) => setSubcategoria(e.target.value)}
                  className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-medium"
                >
                  {SUBCATEGORIAS_NE_WAZA.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tipo de Recurso</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900 font-medium"
              >
                <option value="youtube">YouTube (Vídeo)</option>
                <option value="googledrive">Google Drive (Pasta)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Link de Acesso</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white text-gray-900"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'A guardar...' : '💾 Adicionar à Biblioteca'}
            </button>
          </div>
        </form>
      </div>

      {/* Filtros por Categoria Principal */}
      <div className="space-y-2 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase mr-2">Categoria:</span>
          <button
            onClick={() => { setFiltroCategoria('TODAS'); setFiltroSubcategoria('TODAS'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filtroCategoria === 'TODAS' ? 'bg-blue-950 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Todas ({videos.length})
          </button>
          {CATEGORIAS_JUDO.map(cat => {
            const count = videos.filter(v => v.categoria === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setFiltroCategoria(cat); setFiltroSubcategoria('TODAS'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filtroCategoria === cat ? 'bg-blue-950 text-white shadow' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Filtros por Subcategoria (Nage-Waza) */}
        {filtroCategoria === 'Kodokan Nage–Waza' && (
          <div className="flex flex-wrap items-center gap-2 pl-4 pt-2 border-l-2 border-blue-200">
            <span className="text-xs font-bold text-blue-800 uppercase mr-2">Subcategoria:</span>
            <button
              onClick={() => setFiltroSubcategoria('TODAS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filtroSubcategoria === 'TODAS' ? 'bg-blue-800 text-white' : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Todas as Subcategorias
            </button>
            {SUBCATEGORIAS_NAGE_WAZA.map(sub => {
              const count = videos.filter(v => v.categoria === 'Kodokan Nage–Waza' && v.subcategoria === sub).length;
              return (
                <button
                  key={sub}
                  onClick={() => setFiltroSubcategoria(sub)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filtroSubcategoria === sub ? 'bg-blue-800 text-white' : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {sub} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Filtros por Subcategoria (Ne-Waza) */}
        {filtroCategoria === 'Kodokan Ne-Waza' && (
          <div className="flex flex-wrap items-center gap-2 pl-4 pt-2 border-l-2 border-blue-200">
            <span className="text-xs font-bold text-blue-800 uppercase mr-2">Subcategoria:</span>
            <button
              onClick={() => setFiltroSubcategoria('TODAS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filtroSubcategoria === 'TODAS' ? 'bg-blue-800 text-white' : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Todas as Subcategorias
            </button>
            {SUBCATEGORIAS_NE_WAZA.map(sub => {
              const count = videos.filter(v => v.categoria === 'Kodokan Ne-Waza' && v.subcategoria === sub).length;
              return (
                <button
                  key={sub}
                  onClick={() => setFiltroSubcategoria(sub)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    filtroSubcategoria === sub ? 'bg-blue-800 text-white' : 'bg-white text-blue-900 border border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  {sub} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Listagem Otimizada */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-500 font-medium">A carregar biblioteca...</div>
      ) : videosFiltrados.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-500">Nenhum vídeo encontrado com estes filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videosFiltrados.map((item) => {
            const videoId = item.tipo === 'youtube' ? extrairVideoIdYouTube(item.url) : null;
            const estaAtivo = videoAtivoId === item.id;

            return (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-100">
                        {item.categoria}
                      </span>
                      {item.subcategoria && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
                          {item.subcategoria}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                      item.tipo === 'youtube' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {item.tipo === 'youtube' ? 'YouTube' : 'Google Drive'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-gray-900 mt-2">{item.titulo}</h3>
                </div>

                {item.tipo === 'youtube' ? (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-gray-200 relative flex items-center justify-center">
                    {estaAtivo && videoId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        title={item.titulo}
                        className="w-full h-full absolute inset-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div 
                        onClick={() => setVideoAtivoId(item.id)}
                        className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center bg-cover bg-center group transition-all"
                        style={{ backgroundImage: videoId ? `url(https://img.youtube.com/vi/${videoId}/hqdefault.jpg)` : undefined }}
                      >
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all" />
                        <div className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg z-10 transition-transform group-hover:scale-110">
                          ▶
                        </div>
                        <span className="text-white text-xs font-bold mt-2 z-10 drop-shadow">▶ Reproduzir Vídeo</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center space-y-3 text-center">
                    <p className="text-xs text-gray-600 font-medium">Pasta ou Ficheiro partilhado via Google Drive</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all"
                    >
                      📂 Abrir Pasta no Google Drive ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}