"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const matchSlug = params.slug;
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clickedAds, setClickedAds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!matchSlug) return;
    const fetchMatch = async () => {
      try {
        const { data, error } = await supabase.from('matches').select('*').eq('slug', matchSlug).single();
        if (data) setMatch(data);
      } catch (err) {} finally { setLoading(false); }
    };
    fetchMatch();
  }, [matchSlug]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!match) return <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4"><h2 className="text-3xl font-black">Evento no encontrado</h2><Link href="/" className="text-red-500 hover:text-red-400 font-bold underline">Volver a inicio</Link></div>;

  const handlePlayClick = (e: React.MouseEvent, channel: any, index: number) => {
    e.preventDefault();
    if (!clickedAds[index]) {
      window.open(channel.adLink || match.ad_link, '_blank');
      setClickedAds(prev => ({ ...prev, [index]: true }));
    } else {
      window.open(channel.realLink || match.real_link, '_self'); 
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600">
      
      {/* NAVBAR */}
      <nav className="w-full px-4 md:px-8 py-4 flex justify-between items-center bg-[#050505] border-b border-white/10 z-50 relative">
        <Link href="/" className="flex items-center gap-2 group">
          <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <div className="w-1 h-5 bg-red-600 ml-2"></div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
      </nav>

      {/* HEADER */}
      <div className="relative w-full h-[60vh] md:h-[75vh]">
        <div className="absolute inset-0 z-0">
          <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-60 md:opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent hidden md:block w-full"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10 max-w-7xl">
           <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{match.competition}</span>
           <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black mt-3 mb-2 uppercase leading-none italic drop-shadow-2xl tracking-tighter">
             {match.home_team} <br className="hidden md:block"/><span className="text-red-600 text-3xl md:text-5xl">VS</span> {match.away_team}
           </h1>
           {match.schedules && match.schedules.length > 0 && (
              <p className="text-gray-300 font-medium text-sm md:text-xl flex items-center gap-2 mt-4 bg-black/40 backdrop-blur-sm w-fit px-4 py-2 rounded-lg border border-white/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {match.schedules[0].date || 'Hoy'} | {match.schedules[0].time} {match.schedules[0].region}
              </p>
           )}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Lado Principal */}
        <div className="flex-1 space-y-8 order-2 lg:order-1">
          
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-3"><div className="w-1.5 h-8 bg-red-600 rounded-full"></div> Previa Completa</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line font-medium">
              {match.description_long}
            </p>
          </div>

          {(match.lineups_home || match.lineups_away) && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8">
               <h3 className="text-xl md:text-2xl font-black mb-6 uppercase tracking-tight">Alineaciones Probables</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {match.lineups_home && (
                      <div className="space-y-3">
                         <h4 className="font-bold text-red-500 uppercase flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> {match.home_team}</h4>
                         <p className="text-gray-400 text-sm whitespace-pre-line font-mono">{match.lineups_home}</p>
                      </div>
                   )}
                   {match.lineups_away && (
                      <div className="space-y-3">
                         <h4 className="font-bold text-red-500 uppercase flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> {match.away_team}</h4>
                         <p className="text-gray-400 text-sm whitespace-pre-line font-mono">{match.lineups_away}</p>
                      </div>
                   )}
               </div>
            </div>
          )}

          {/* EL BLOQUE COMODÍN (Se muestra solo si pegaste algo en el Admin) */}
          {match.custom_embed && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8 shadow-xl overflow-hidden">
               <div dangerouslySetInnerHTML={{ __html: match.custom_embed }} />
            </div>
          )}

        </div>

        {/* Lado Lateral (Transmisión) */}
        <div className="w-full lg:w-[400px] space-y-8 order-1 lg:order-2">
          
          <div className="bg-[#0f0f0f] border border-red-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] sticky top-24 z-10">
             <h3 className="text-2xl font-black uppercase text-center mb-6 tracking-tighter flex items-center justify-center gap-2">
               <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span> Transmisión HD
             </h3>
             
             <div className="space-y-4">
                {match.channels && match.channels.length > 0 ? match.channels.map((channel: any, index: number) => (
                  <button 
                    key={index}
                    onClick={(e) => handlePlayClick(e, channel, index)}
                    className={`w-full justify-center ${clickedAds[index] ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/50' : 'bg-white text-black hover:bg-gray-200 shadow-white/20'} font-black px-6 py-5 rounded-xl transition-all active:scale-95 flex items-center gap-3 shadow-xl`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <div className="text-left flex flex-col">
                       <span className="leading-tight text-lg">{clickedAds[index] ? `VER ${channel.name}` : `ACCEDER A ${channel.name}`}</span>
                       {!clickedAds[index] && <span className="text-[11px] opacity-70 font-bold uppercase mt-1">Requiere verificación</span>}
                    </div>
                  </button>
                )) : (
                  <p className="text-center text-gray-500 text-sm font-bold">Enlaces no disponibles.</p>
                )}
             </div>
             <p className="text-center text-xs text-gray-500 mt-6 font-medium">La señal se habilitará momentos antes del inicio.</p>
          </div>

          {match.stats && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8">
               <h3 className="text-xl font-black uppercase mb-5 tracking-tight flex items-center gap-2">
                 <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
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