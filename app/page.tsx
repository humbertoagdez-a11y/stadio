"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [clickedAds, setClickedAds] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) setMatches(data);
      setIsLoading(false);
    };
    fetchMatches();
  }, []);

  if (!isClient) return null;

  const handleWatch = (matchId: number, channelIndex: number, adLink: string, realLink: string) => {
    const key = `${matchId}-${channelIndex}`;
    if (!clickedAds[key]) {
      window.open(adLink, '_blank');
      setClickedAds(prev => ({ ...prev, [key]: true }));
    } else {
      window.open(realLink, '_self');
    }
  };

  const hero = matches.length > 0 ? matches[0] : null;
  const otherMatches = matches.length > 1 ? matches.slice(1) : [];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white pb-12 overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full px-6 md:px-16 lg:px-24 py-6 flex justify-between items-center z-50 bg-gradient-to-b from-[#050505]/90 via-[#050505]/50 to-transparent transition-all duration-300">
        <h1 className="text-3xl font-black text-red-600 tracking-tighter drop-shadow-lg">STADIO</h1>
        <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-gray-300">
          <span className="text-white cursor-default">En Vivo</span>
          <span className="hover:text-white cursor-pointer transition-colors duration-300">Explorar</span>
        </div>
      </nav>

      {/* PANTALLA DE CARGA */}
      {isLoading && (
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* ESTADO VACÍO */}
      {!isLoading && matches.length === 0 && (
        <div className="h-screen flex flex-col items-center justify-center opacity-50 space-y-4">
          <p className="text-xl tracking-widest uppercase font-bold text-gray-500">Sin transmisiones activas</p>
        </div>
      )}

      {/* HERO SECTION ESTILO NETFLIX (FUNDIDO PERFECTO) */}
      {!isLoading && hero && (
        <section className="relative h-[85vh] md:h-[90vh] flex flex-col justify-end pb-32 md:pb-40 px-6 md:px-16 lg:px-24 w-full">
          <div className="absolute inset-0 z-0">
            <img src={hero.poster_url} alt="Poster" className="w-full h-full object-cover opacity-50" />
            {/* El secreto de Netflix: Degradados intensos abajo y a la izquierda */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent" />
          </div>
          
          <div className="relative z-10 w-full max-w-4xl space-y-6">
            
            {/* Etiquetas Superiores */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-red-600 px-2 py-1 text-[10px] md:text-xs font-black uppercase tracking-widest rounded shadow-[0_0_15px_rgba(220,38,38,0.5)]">En Vivo</span>
              <span className="border border-white/20 bg-black/40 backdrop-blur-md px-2 py-1 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded text-gray-300">{hero.competition}</span>
            </div>
            
            {/* Título Estructurado */}
            <h1 className="font-black italic tracking-tighter uppercase drop-shadow-2xl leading-[0.9] text-5xl md:text-7xl lg:text-8xl">
              {hero.home_team} <br/> 
              <span className="text-red-600 text-4xl md:text-6xl lg:text-7xl">VS</span> <span className="text-gray-200">{hero.away_team}</span>
            </h1>
            
            {/* Descripción y Horarios */}
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed drop-shadow-md text-pretty border-l-2 border-red-600 pl-4">
                {hero.description}
              </p>
              
              {hero.schedules && hero.schedules.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2 text-gray-400 font-bold text-xs">
                  {hero.schedules.map((s:any, i:number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-black/50 border border-white/10 px-3 py-1.5 rounded">
                      <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {s.time} <span className="text-gray-500 uppercase">{s.region}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Botones Estilo Netflix */}
            <div className="flex flex-wrap gap-3 md:gap-4 pt-4">
              {hero.channels?.map((chan: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleWatch(hero.id, i, chan.adLink, chan.realLink)}
                  className={`px-8 py-3.5 rounded font-bold transition-all duration-300 transform active:scale-95 text-sm md:text-base flex justify-center items-center gap-2 tracking-wide ${
                    clickedAds[`${hero.id}-${i}`] 
                    ? 'bg-green-600 text-white hover:bg-green-500' 
                    : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  {clickedAds[`${hero.id}-${i}`] ? `VER ${chan.name}` : `DESBLOQUEAR ${chan.name}`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRILLA DE CARTELERA (SUPERPUESTA AL HERO) */}
      {!isLoading && otherMatches.length > 0 && (
        <section className="relative z-20 px-6 md:px-16 lg:px-24 -mt-16 md:-mt-24 space-y-6">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-gray-200 drop-shadow-lg">Próximos Eventos</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {otherMatches.map(m => (
              <div key={m.id} className="bg-[#141414] rounded-md overflow-hidden hover:scale-105 hover:z-30 transition-all duration-300 group shadow-2xl flex flex-col border border-transparent hover:border-white/10 cursor-pointer">
                
                {/* Miniatura */}
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img src={m.poster_url} alt="Poster" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-2 left-2">
                    <span className="bg-black/70 backdrop-blur-md px-2 py-1 rounded-sm text-[8px] font-black text-white uppercase tracking-widest">{m.competition}</span>
                  </div>
                </div>
                
                {/* Info Card */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm md:text-base font-bold leading-tight uppercase text-gray-200 group-hover:text-white transition-colors">{m.home_team} vs {m.away_team}</h3>
                    <div className="flex flex-wrap gap-1">
                      {m.schedules?.map((s:any, i:number) => (
                         <span key={i} className="text-[9px] font-bold text-gray-500 uppercase">{s.time} {s.region}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {m.channels?.map((chan: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => handleWatch(m.id, i, chan.adLink, chan.realLink)}
                        className={`w-full py-2 px-3 rounded-sm text-[10px] font-bold flex justify-between items-center transition-colors uppercase ${
                          clickedAds[`${m.id}-${i}`] 
                          ? 'bg-green-600/20 text-green-500' 
                          : 'bg-[#2b2b2b] text-white hover:bg-white hover:text-black'
                        }`}
                      >
                        <span className="truncate pr-2">{chan.name}</span>
                        <span>{clickedAds[`${m.id}-${i}`] ? 'ONLINE' : '▶'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}