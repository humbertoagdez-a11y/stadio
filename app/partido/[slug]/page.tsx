import { supabase } from '@/lib/supabase';
import { Metadata } from 'next';
import Link from 'next/link';

// SEO Dinámico para cuando compartas el link
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: match } = await supabase.from('matches').select('*').eq('slug', params.slug).single();
  if (!match) return { title: 'Partido No Encontrado - STADIOTV' };
  return {
    title: `Ver ${match.home_team} vs ${match.away_team} En Vivo - STADIOTV`,
    description: match.description_short || `Previa y transmisión HD de ${match.home_team} vs ${match.away_team}.`,
    openGraph: { images: [match.poster_url || ''] },
  };
}

export default async function MatchPage({ params }: { params: { slug: string } }) {
  // BÚSQUEDA CORRECTA POR SLUG
  const { data: match } = await supabase.from('matches').select('*').eq('slug', params.slug).single();

  if (!match) {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-white">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Evento No Encontrado</h2>
        <Link href="/" className="text-red-500 hover:text-red-400 font-bold underline">Volver a inicio</Link>
      </main>
    );
  }

  const htmlBlocks = match.custom_blocks || [];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 pb-20">
      
      {/* NAVBAR */}
      <nav className="fixed w-full px-4 md:px-8 py-4 flex justify-between items-center z-50 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-2 group">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sistema Online
        </div>
      </nav>

      {/* HERO SECTION PRO: Altura reducida a 55vh-65vh y degradado suave */}
      <div className="relative w-full h-[55vh] md:h-[65vh] pt-16">
        <div className="absolute inset-0 z-0">
          <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-60 md:opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent hidden md:block w-full"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6">
           <div className="flex flex-wrap items-center gap-2 mb-1">
             <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-sm uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
               <div className="w-1.5 h-1.5 bg-white rounded-full"></div> COBERTURA
             </span>
             <span className="text-gray-200 text-[10px] md:text-xs font-bold tracking-widest border border-white/20 px-3 py-1.5 rounded-sm uppercase bg-black/50 backdrop-blur-sm">{match.competition}</span>
           </div>
           
           <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mt-2 mb-2 uppercase leading-none italic drop-shadow-2xl tracking-tighter">
             {match.home_team} <br className="hidden md:block"/><span className="text-red-600 text-3xl md:text-6xl mx-0 md:mx-2">VS</span> {match.away_team}
           </h1>

           {match.schedules && match.schedules.length > 0 && (
              <p className="text-gray-200 font-medium text-sm md:text-lg flex items-center gap-2.5 mt-2 bg-black/40 backdrop-blur-sm w-fit px-5 py-3 rounded-lg border border-white/10 shadow-lg">
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {match.schedules[0].date || 'Hoy'} | {match.schedules[0].time} {match.schedules[0].region}
              </p>
           )}
        </div>
      </div>

      {/* CONTENIDO & REPRODUCTORES */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Lado Principal (Contenido Dinámico) */}
        <div className="flex-1 space-y-8 order-2 lg:order-1">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl relative">
            <h2 className="text-2xl md:text-3xl font-black mb-8 flex items-center gap-3"><div className="w-1.5 h-8 bg-red-600 rounded-full"></div> Previa Completa del Evento</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line font-medium prose prose-invert max-w-none">
              {match.description_long || match.description}
            </p>
          </div>

          {/* RENDERIZADO DE BLOQUES HTML INFINITOS */}
          {htmlBlocks.length > 0 && htmlBlocks.map((htmlBlock: string, index: number) => (
             <div key={index} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl overflow-x-auto custom-scrollbar relative">
                <div dangerouslySetInnerHTML={{ __html: htmlBlock }} className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white prose-a:text-red-500 font-medium leading-relaxed" />
             </div>
          ))}
        </div>

        {/* Lado Lateral (Monetización) */}
        <div className="w-full lg:w-[400px] space-y-8 order-1 lg:order-2">
          <div className="bg-[#0f0f0f] border border-red-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] sticky top-28 z-10 relative">
             <h3 className="text-2xl font-black uppercase text-center mb-8 tracking-tighter flex items-center justify-center gap-2.5">
               <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]"></span> Transmisión HD
             </h3>
             
             <div className="space-y-5">
                {match.channels && match.channels.length > 0 ? match.channels.map((channel: any, index: number) => (
                  <Link key={index} href={channel.adLink || match.ad_link || '#'} target="_blank" className="block active:scale-95 transition-transform">
                      <button className="w-full justify-center bg-white text-black hover:bg-gray-200 shadow-white/20 font-black px-6 py-5 rounded-xl flex items-center gap-3 shadow-xl group">
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <div className="text-left flex flex-col flex-1">
                           <span className="leading-tight text-lg uppercase tracking-tight">VER {channel.name || 'Opción HD'}</span>
                           <span className="text-[11px] opacity-80 font-bold uppercase mt-1.5 flex items-center gap-1.5 text-gray-700">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                             Verificación Requerida
                           </span>
                        </div>
                        <svg className="w-6 h-6 text-black group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                  </Link>
                )) : (
                  <p className="text-center text-gray-500 text-sm font-bold p-4 bg-black/40 rounded-xl border border-white/5">Enlaces no disponibles aún.</p>
                )}
             </div>
             <p className="text-center text-xs text-gray-500 mt-6 font-medium bg-black/40 p-2 rounded-md">La señal se habilitará momentos antes del inicio.</p>
          </div>
        </div>

      </div>
    </main>
  );
}