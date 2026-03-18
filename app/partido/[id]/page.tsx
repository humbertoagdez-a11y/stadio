"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MatchPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clickedAds, setClickedAds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchMatch = async () => {
      const { data } = await supabase.from('matches').select('*').eq('id', params.id).single();
      if (data) setMatch(data);
      setLoading(false);
    };
    fetchMatch();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!match) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">Partido no encontrado.</div>;

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
      
      {/* Navbar Simple */}
      <nav className="w-full px-4 md:px-8 py-4 flex justify-between items-center bg-[#050505] border-b border-white/10">
        <Link href="/" className="flex items-center gap-1">
          <svg className="w-6 h-6 text-gray-400 hover:text-white transition-colors mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
      </nav>

      {/* HEADER DEL PARTIDO (Mini Hero) */}
      <div className="relative w-full h-[40vh] md:h-[60vh]">
        <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10">
           <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{match.competition}</span>
           <h1 className="text-3xl md:text-6xl font-black mt-3 mb-2 uppercase leading-none italic drop-shadow-xl tracking-tighter">
             {match.home_team} <span className="text-red-600">VS</span> {match.away_team}
           </h1>
           {match.schedules && match.schedules.length > 0 && (
              <p className="text-gray-300 font-medium text-sm md:text-lg flex items-center gap-2">
                📅 {match.schedules[0].date || 'Hoy'} | ⏱ {match.schedules[0].time} {match.schedules[0].region}
              </p>
           )}
        </div>
      </div>

      {/* CONTENIDO Y REPRODUCTORES */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Lado Izquierdo: Descripción SEO */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl font-black mb-4 flex items-center gap-2"><div className="w-1.5 h-6 bg-red-600 rounded-full"></div> Previa del Partido</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line">
              {match.description}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Opciones de Transmisión (Monetización) */}
        <div className="space-y-6">
          <div className="bg-[#0f0f0f] border border-red-600/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
             <h3 className="text-xl font-black uppercase text-center mb-6 tracking-tighter">🔴 Transmisión en Vivo</h3>
             
             <div className="space-y-4">
                {match.channels ? match.channels.map((channel: any, index: number) => (
                  <button 
                    key={index}
                    onClick={(e) => handlePlayClick(e, channel, index)}
                    className={`w-full justify-center ${clickedAds[index] ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/50' : 'bg-white text-black hover:bg-gray-200 shadow-white/20'} font-black px-6 py-4 rounded-xl transition-all active:scale-95 flex items-center gap-3 shadow-lg`}
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <div className="text-left flex flex-col">
                       <span className="leading-tight">{clickedAds[index] ? `VER ${channel.name}` : `DESBLOQUEAR ${channel.name}`}</span>
                       {!clickedAds[index] && <span className="text-[10px] opacity-70">Requiere 1 clic de seguridad</span>}
                    </div>
                  </button>
                )) : (
                  <p className="text-center text-gray-500 text-sm">No hay enlaces disponibles aún.</p>
                )}
             </div>
             <p className="text-center text-xs text-gray-500 mt-6 mt-4">La transmisión iniciará 15 minutos antes del horario oficial.</p>
          </div>
        </div>

      </div>
    </main>
  );
}