"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const matchId = params.id;
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clickedAds, setClickedAds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!matchId) return;
    
    const fetchMatch = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('*')
          .eq('id', matchId)
          .single();
          
        if (data) setMatch(data);
        if (error) console.error("Error en DB:", error);
      } catch (err) {
        console.error("Error fatal:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [matchId]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!match) return <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4"><h2 className="text-3xl font-black">Partido no encontrado</h2><Link href="/" className="text-red-500 hover:text-red-400 font-bold underline">Volver al inicio</Link></div>;

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
      <nav className="w-full px-4 md:px-8 py-4 flex justify-between items-center bg-[#050505] border-b border-white/10 z-50 relative">
        <Link href="/" className="flex items-center gap-1 group">
          <svg className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
      </nav>

      {/* HEADER DEL PARTIDO (Sin corte agresivo) */}
      <div className="relative w-full h-[50vh] md:h-[70vh]">
        <div className="absolute inset-0 z-0">
          <img src={match.poster_url} alt="Poster" className="w-full h-full object-cover opacity-40 md:opacity-30" />
          {/* Degradado perfecto hacia el color de fondo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent hidden md:block w-full"></div>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10 max-w-5xl">
           <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">{match.competition}</span>
           <h1 className="text-4xl md:text-7xl font-black mt-3 mb-2 uppercase leading-none italic drop-shadow-2xl tracking-tighter">
             {match.home_team} <br className="hidden md:block"/><span className="text-red-600 text-3xl md:text-5xl">VS</span> {match.away_team}
           </h1>
           {match.schedules && match.schedules.length > 0 && (
              <p className="text-gray-300 font-medium text-sm md:text-xl flex items-center gap-2 mt-4 bg-black/40 backdrop-blur-sm w-fit px-4 py-2 rounded-lg border border-white/10">
                📅 {match.schedules[0].date || 'Hoy'} | ⏱ {match.schedules[0].time} {match.schedules[0].region}
              </p>
           )}
        </div>
      </div>

      {/* CONTENIDO Y REPRODUCTORES */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Lado Izquierdo: Descripción SEO */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl">
            <h2 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-3"><div className="w-1.5 h-8 bg-red-600 rounded-full"></div> Previa del Partido</h2>
            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-line font-medium">
              {match.description}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Opciones de Transmisión (Monetización) */}
        <div className="space-y-6">
          <div className="bg-[#0f0f0f] border border-red-600/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(220,38,38,0.15)] sticky top-24">
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
                       <span className="leading-tight text-lg">{clickedAds[index] ? `VER ${channel.name}` : `DESBLOQUEAR ${channel.name}`}</span>
                       {!clickedAds[index] && <span className="text-[11px] opacity-70 font-bold uppercase mt-1">Requiere 1 clic de seguridad</span>}
                    </div>
                  </button>
                )) : (
                  <p className="text-center text-gray-500 text-sm font-bold">No hay enlaces disponibles aún.</p>
                )}
             </div>
             <p className="text-center text-xs text-gray-500 mt-6 font-medium">La transmisión iniciará 15 minutos antes del horario oficial.</p>
          </div>
        </div>

      </div>
    </main>
  );
}