import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';

// Función EFICIENTE para SEO Dinámico: Genera Metadata basada en el Slug
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!match) {
    return { title: 'Partido No Encontrado - STADIOTV' };
  }

  return {
    title: `Ver ${match.home_team} vs ${match.away_team} En Vivo - ${match.competition} - STADIOTV`,
    description: match.description_short || `Previa exclusiva de ${match.home_team} vs ${match.away_team} por la ${match.competition}. Ver transmisión HD por STADIOTV.`,
    openGraph: {
      images: [match.poster_url || ''],
    },
  };
}

export default async function MatchPage({ params }: { params: { slug: string } }) {
  const { data: match, error } = await supabase
    .from('matches')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!match) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
        <h2 className="text-3xl font-black">Partido No Encontrado</h2>
        <Link href="/" className="text-red-500 hover:text-red-400 font-bold underline">Volver a inicio</Link>
      </main>
    );
  }

  // Obtenemos los bloques HTML (custom_blocks)
  const htmlBlocks = match.custom_blocks || [];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 pb-20">
      
      {/* NAVBAR */}
      <nav className="fixed w-full px-4 md:px-8 py-4 flex justify-between items-center z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-2 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">
            STADIO<span className="text-white">TV</span>
          </h1>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sistema Online
        </div>
      </nav>

      {/* HERO SECTION PRO: Diseño responsivo sin corte agresivo */}
      <div className="relative w-full h-[65vh] md:h-[80vh] pt-16">
        <div className="absolute inset-0 z-0">
          <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-60 md:opacity-40" />
          {/* Degradados largos y suaves hacia el fondo negro */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent hidden md:block w-full"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10 max-w-7xl mx-auto flex flex-col gap-6">
           <div className="flex flex-wrap items-center gap-2 mb-1">
             <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
               <div className="w-1.5 h-1.5 bg-white rounded-full"></div> COBERTURA
             </span>
             <span className="text-gray-200 text-[10px] md:text-xs font-bold tracking-widest border border-white/20 px-3 py-1.5 rounded-sm uppercase bg-black/50 backdrop-blur-sm">{match.competition}</span>
           </div>
           
           <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-black mt-3 mb-2 uppercase leading-none italic drop-shadow-2xl tracking-tighter">
             {match.home_team} <br className="hidden md:block"/><span className="text-red-600 text-3xl md:text-6xl mx-2">VS</span> {match.away_team}
           </h1>
           
           <p className="hidden md:block text-gray-300 text-lg md:text-xl font-medium leading-relaxed max-w-3xl text-shadow-md">
             {match.description_short}
           </p>

           {match.schedules && match.schedules.length > 0 && (
              <p className="text-gray-200 font-medium text-sm md:text-xl flex items-center gap-2.5 mt-4 bg-black/40 backdrop-blur-sm w-fit px-5 py-3 rounded-lg border border-white/10 shadow-lg">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {match.schedules[0].date || 'Hoy'} | {match.schedules[0].time} {match.schedules[0].region}
              </p>
           )}
        </div>
      </div>

      {/* CONTENIDO & REPRODUCTORES - Mobile First & Proporcionado */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Lado Principal (Contenido) */}
        <div className="flex-1 space-y-8 order-2 lg:order-1">
          
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl relative">
            <h2 className="text-2xl md:text-3xl font-black mb-8 flex items-center gap-3"><div className="w-1.5 h-8 bg-red-600 rounded-full"></div> Previa Completa del Evento</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line font-medium prose prose-invert max-w-none">
              {match.description_long}
            </p>
          </div>

          {(match.lineups_home || match.lineups_away) && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl">
               <h3 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-tight flex items-center gap-3">
                 <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                 Alineaciones Probables
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {match.lineups_home && (
                      <div className="space-y-3 p-4 bg-black/40 rounded-xl border border-white/5">
                         <h4 className="font-bold text-red-500 uppercase flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> {match.home_team}</h4>
                         <p className="text-gray-400 text-sm whitespace-pre-line font-mono font-medium leading-relaxed">{match.lineups_home}</p>
                      </div>
                   )}
                   {match.lineups_away && (
                      <div className="space-y-3 p-4 bg-black/40 rounded-xl border border-white/5">
                         <h4 className="font-bold text-red-500 uppercase flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> {match.away_team}</h4>
                         <p className="text-gray-400 text-sm whitespace-pre-line font-mono font-medium leading-relaxed">{match.lineups_away}</p>
                      </div>
                   )}
               </div>
            </div>
          )}

          {/* RENDERIZADO DE BLOQUES HTML (INFINTOS) */}
          {htmlBlocks.length > 0 && htmlBlocks.map((htmlBlock: string, index: number) => (
             <div key={index} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl overflow-x-auto custom-scrollbar relative">
                {/* Usamos prose-invert para que el HTML herede el tema oscuro de STADIOTV */}
                <div dangerouslySetInnerHTML={{ __html: htmlBlock }} className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-red-500 font-medium leading-relaxed" />
             </div>
          ))}

        </div>

        {/* Lado Lateral (Transmisión) */}
        <div className="w-full lg:w-[400px] space-y-8 order-1 lg:order-2">
          
          {/* 1. Opciones de Transmisión (Proporcionado y fijo en PC) */}
          <div className="bg-[#0f0f0f] border border-red-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] sticky top-28 z-10 relative">
             <h3 className="text-2xl font-black uppercase text-center mb-8 tracking-tighter flex items-center justify-center gap-2.5">
               <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"></span> Transmisión HD
             </h3>
             
             <div className="space-y-5">
                {match.channels && match.channels.length > 0 ? match.channels.map((channel: any, index: number) => (
                  <Link key={index} href={channel.adLink || match.ad_link || '#'} target="_blank" className="block active:scale-95 transition-transform">
                      <button className="w-full justify-center bg-green-600 text-white hover:bg-green-500 shadow-green-900/50 font-black px-6 py-5 rounded-xl flex items-center gap-3 shadow-xl group">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <div className="text-left flex flex-col flex-1">
                           <span className="leading-tight text-lg uppercase tracking-tight">{channel.name || 'Opción HD'}</span>
                           <span className="text-[11px] opacity-80 font-bold uppercase mt-1.5 flex items-center gap-1.5">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                             Verificación Requerida
                           </span>
                        </div>
                        <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                  </Link>
                )) : (
                  <p className="text-center text-gray-500 text-sm font-bold p-4 bg-black/40 rounded-xl border border-white/5">Enlaces no disponibles aún.</p>
                )}
             </div>
             <p className="text-center text-xs text-gray-500 mt-6 font-medium bg-black/40 p-2 rounded-md">La señal se habilitará momentos antes del inicio.</p>
          </div>

          {/* 2. Estadísticas Clave */}
          {match.stats && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl">
               <h3 className="text-xl md:text-2xl font-black uppercase mb-6 tracking-tighter flex items-center gap-3">
                 <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                 Datos Clave
               </h3>
               <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line font-medium font-mono">
                 {match.stats}
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}