"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const rawSlug = params?.slug;
  const matchSlug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchSlug) return;
    const fetchMatch = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('slug', matchSlug)
          .single();
        if (data && !error) setMatch(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [matchSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-6 text-white p-4 text-center">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-red-600">Evento No Encontrado</h2>
        <p className="text-gray-400">El partido que buscas no existe o la URL es incorrecta.</p>
        <Link href="/" className="bg-white text-black font-black px-8 py-4 rounded hover:bg-gray-200 transition-all uppercase shadow-lg active:scale-95">Volver al Inicio</Link>
      </main>
    );
  }

  const htmlBlocks = match.custom_blocks || [];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 pb-20">
      
      {/* NAVBAR ULTRA LIMPIO */}
      <nav className="fixed w-full px-4 md:px-8 py-3 flex justify-between items-center z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-2 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <div className="w-1.5 h-5 bg-red-600 rounded-full ml-1"></div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
        <div className="flex items-center gap-2 text-[10px] md:text-xs text-white font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> En Vivo HD
        </div>
      </nav>

      {/* HERO SECTION REDISEÑADO: Centrado y adaptado a móviles */}
      <div className="relative w-full min-h-[45vh] md:min-h-[55vh] flex items-center justify-center pt-20 pb-10 border-b border-white/5">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-30 object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-[#050505]/30"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 flex flex-col items-center text-center gap-4">
           {/* Etiqueta de Competición */}
           <span className="text-gray-200 text-[10px] md:text-xs font-bold tracking-widest border border-white/20 px-4 py-1.5 rounded-full uppercase bg-black/60 backdrop-blur-md shadow-lg">
             {match.competition}
           </span>
           
           {/* Título adaptable (En móvil hace saltos de línea inteligentes) */}
           <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase leading-tight drop-shadow-2xl tracking-tighter w-full">
             {match.home_team} <br className="block sm:hidden"/> <span className="text-red-600 italic text-2xl md:text-4xl mx-2">VS</span> <br className="block sm:hidden"/> {match.away_team}
           </h1>

           {/* Horario */}
           {match.schedules && match.schedules.length > 0 && (
              <div className="flex items-center justify-center gap-2.5 mt-2 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-xl shadow-xl">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-gray-200 font-bold text-[11px] md:text-sm tracking-wide uppercase">
                  {match.schedules[0].date || 'HOY'} | {match.schedules[0].time} {match.schedules[0].region}
                </span>
              </div>
           )}
        </div>
      </div>

      {/* CONTENIDO & REPRODUCTORES EN COLUMNAS */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 lg:px-16 py-10 md:py-12 flex flex-col lg:flex-row gap-8 md:gap-12">
        
        {/* COLUMNA DERECHA (O ARRIBA EN MÓVIL): REPRODUCTOR */}
        <div className="w-full lg:w-[400px] xl:w-[420px] order-1 lg:order-2">
          <div className="bg-[#0a0a0a] border border-red-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(220,38,38,0.1)] lg:sticky lg:top-28">
             <h3 className="text-xl md:text-2xl font-black uppercase text-center mb-6 tracking-tighter flex items-center justify-center gap-2.5">
               <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span> TRANSMISIÓN HD
             </h3>
             
             <div className="space-y-4">
                {match.channels && match.channels.length > 0 ? match.channels.map((channel: any, index: number) => (
                  <Link key={index} href={channel.adLink || match.ad_link || '#'} target="_blank" rel="noopener noreferrer" className="block active:scale-95 transition-transform">
                      <button className="w-full justify-center bg-white text-black hover:bg-gray-200 font-black px-5 py-4 rounded-xl flex items-center gap-3 shadow-lg group">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <div className="text-left flex flex-col flex-1">
                           <span className="leading-tight text-base md:text-lg uppercase tracking-tight">VER {channel.name || 'OPCIÓN 1 HD'}</span>
                           <span className="text-[10px] opacity-70 font-bold uppercase mt-1 flex items-center gap-1.5">
                             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                             Verificación Requerida
                           </span>
                        </div>
                        <svg className="w-5 h-5 text-black group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                  </Link>
                )) : (
                  <p className="text-center text-gray-500 text-sm font-bold p-4 bg-black/40 rounded-xl border border-white/5">Enlaces no disponibles aún.</p>
                )}
             </div>
             <p className="text-center text-[11px] text-gray-500 mt-5 font-medium bg-black/50 p-3 rounded-lg border border-white/5">La señal se habilitará momentos antes del pitazo inicial.</p>
          </div>
        </div>

        {/* COLUMNA IZQUIERDA (O ABAJO EN MÓVIL): ANÁLISIS */}
        <div className="flex-1 space-y-6 order-2 lg:order-1">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-xl md:text-2xl font-black mb-6 flex items-center gap-3">
               <div className="w-1.5 h-6 bg-red-600 rounded-full"></div> 
               Análisis del Encuentro
            </h2>
            <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-line font-medium">
              {match.description_long || match.description}
            </p>
          </div>

          {htmlBlocks.length > 0 && htmlBlocks.map((htmlBlock: string, index: number) => (
             <div key={index} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl overflow-x-auto custom-scrollbar">
                <div dangerouslySetInnerHTML={{ __html: htmlBlock }} className="prose prose-sm md:prose-base prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-red-500 font-medium leading-relaxed" />
             </div>
          ))}
        </div>

      </div>
    </main>
  );
}