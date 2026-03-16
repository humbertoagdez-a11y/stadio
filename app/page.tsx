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
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white pb-20 overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full px-6 py-4 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm transition-all duration-300">
        <h1 className="text-3xl font-black text-red-600 tracking-tighter drop-shadow-lg">STADIO</h1>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-gray-300">
          <span className="text-white border-b-2 border-red-600 pb-1 cursor-default">En Vivo</span>
          <span className="hover:text-white cursor-pointer transition-colors duration-300">Competiciones</span>
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

      {/* HERO SECTION MEJORADO VISUALMENTE */}
      {!isLoading && hero && (
        <section className="relative min-h-[85vh] flex items-center pt-20 pb-12 px-6 md:px-16 lg:px-24 w-full">
          <div className="absolute inset-0 z-0">
            <img src={hero.poster_url} alt="Poster" className="w-full h-full object-cover opacity-30 scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/70 to-transparent" />
          </div>
          
          <div className="relative z-10 w-full max-w-5xl space-y-8 animate-fade-in mt-10">
            
            {/* Etiquetas */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-red-600 px-3 py-1.5 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse">En Vivo</span>
              <span className="border border-white/20 bg-black/40 backdrop-blur-md px-3 py-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-sm text-gray-300">{hero.competition}</span>
            </div>
            
            {/* Título adaptativo (Arreglo del VS) */}
            <h1 className="font-black italic tracking-tighter uppercase drop-shadow-2xl flex flex-col items-start leading-[0.9]">
              <span className="text-5xl md:text-7xl lg:text-8xl text-white">{hero.home_team}</span>
              <div className="flex items-center gap-3 md:gap-5 mt-1 md:mt-3">
                <span className="text-red-600 text-3xl md:text-5xl lg:text-6xl">VS</span>
                <span className="text-4xl md:text-6xl lg:text-7xl text-gray-300">{hero.away_team}</span>
              </div>
            </h1>
            
            {/* Descripción e Info */}
            <div className="space-y-5 max-w-2xl">
              <p className="text-sm md:text-base text-gray-400 font-medium leading-relaxed border-l-2 border-red-600 pl-4 drop-shadow-md text-pretty">
                {hero.description}
              </p>
              
              {/* Horarios Hero */}
              {hero.schedules && hero.schedules.length > 0 && (
                <div className="flex flex-wrap gap-3 pl-4 text-gray-400 font-bold text-xs">
                  {hero.schedules.map((s:any, i:number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-md">
                      <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {s.time} <span className="text-gray-500 uppercase">{s.region}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Canales Hero */}
            <div className="flex flex-wrap gap-3 md:gap-4 pt-4">
              {hero.channels?.map((chan: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleWatch(hero.id, i, chan.adLink, chan.realLink)}
                  className={`w-full md:w-auto px-8 py-3.5 rounded-lg font-black transition-all duration-300 transform active:scale-95 text-sm flex justify-center items-center gap-2 border tracking-wide uppercase ${
                    clickedAds[`${hero.id}-${i}`] 
                    ? 'bg-green-600 border-green-500 shadow-[0_0_20px_rgba(22,163,74,0.3)] text-white hover:bg-green-500' 
                    : 'bg-white text-black border-transparent hover:bg-red-600 hover:text-white hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                  }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  {clickedAds[`${hero.id}-${i}`] ? `VER ${chan.name}` : `DESBLOQUEAR ${chan.name}`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRILLA DE CARTELERA */}
      {!isLoading && otherMatches.length > 0 && (
        <section className="px-6 md:px-16 lg:px-24 mt-4 space-y-8 relative z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic">Más Eventos</h2>
            <div className="h-[2px] bg-gradient-to-r from-red-600 to-transparent flex-1 opacity-50"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {otherMatches.map(m => (
              <div key={m.id} className="bg-[#0f0f0f] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-500 group shadow-2xl flex flex-col">
                
                <div className="relative aspect-[16/9] overflow-hidden bg-black">
                  <img src={m.poster_url} alt="Poster" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-50 group-hover:opacity-70" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-black text-red-500 uppercase tracking-widest border border-white/10">{m.competition}</span>
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6 -mt-2 relative z-10">
                  <div className="space-y-3">
                    <h3 className="text-xl md:text-2xl font-black italic leading-tight uppercase drop-shadow-md">{m.home_team} <br/> <span className="text-gray-500 text-base">vs</span> <br/> {m.away_team}</h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {m.schedules?.map((s:any, i:number) => (
                        <span key={i} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded font-bold text-gray-400">⏱ {s.time} {s.region}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/5">
                    {m.channels?.map((chan: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => handleWatch(m.id, i, chan.adLink, chan.realLink)}
                        className={`w-full p-3 rounded-lg text-xs font-bold flex justify-between items-center transition-all duration-300 border uppercase tracking-wider ${
                          clickedAds[`${m.id}-${i}`] 
                          ? 'bg-green-600/10 text-green-500 border-green-500/30 hover:bg-green-600/20' 
                          : 'bg-white/5 text-gray-300 border-transparent hover:bg-red-600 hover:text-white hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                        }`}
                      >
                        <span className="truncate pr-2">{chan.name}</span>
                        <span className="flex items-center gap-1 flex-shrink-0 text-[10px]">
                          {clickedAds[`${m.id}-${i}`] ? <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> ONLINE</> : <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> ABRIR</>}
                        </span>
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