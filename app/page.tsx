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
      const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
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

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 selection:text-white pb-16 overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full px-6 md:px-16 py-6 flex justify-between items-center z-50 bg-gradient-to-b from-[#050505]/90 to-transparent">
        <h1 className="text-3xl font-black text-red-600 tracking-tighter drop-shadow-md">STADIO</h1>
        <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-gray-300">
          <span className="text-white cursor-default drop-shadow-md">En Vivo</span>
          <span className="hover:text-white cursor-pointer transition-colors drop-shadow-md">Explorar</span>
        </div>
      </nav>

      {/* PANTALLA DE CARGA */}
      {isLoading && (
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      )}

      {/* HERO SECTION CORREGIDO */}
      {!isLoading && hero && (
        <section className="relative min-h-[90vh] flex flex-col justify-center pt-32 pb-24 px-6 md:px-16 w-full">
          {/* FONDOS Y DEGRADADOS */}
          <div className="absolute inset-0 z-0">
            <img src={hero.poster_url} alt="Poster" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent" />
          </div>
          
          {/* CONTENIDO BIEN POSICIONADO */}
          <div className="relative z-10 w-full max-w-5xl space-y-6">
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-widest rounded shadow-lg shadow-red-600/30">En Vivo</span>
              <span className="bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded">{hero.competition}</span>
            </div>
            
            <h1 className="font-black italic tracking-tighter uppercase drop-shadow-2xl leading-[0.95] text-5xl md:text-7xl lg:text-8xl flex flex-col items-start gap-1">
              <span className="text-white">{hero.home_team}</span>
              <div className="flex items-center gap-4">
                <span className="text-red-600 text-4xl md:text-6xl">VS</span>
                <span className="text-gray-200">{hero.away_team}</span>
              </div>
            </h1>
            
            <p className="text-sm md:text-base text-gray-300 font-medium leading-relaxed max-w-2xl border-l-2 border-red-600 pl-4 drop-shadow-md">
              {hero.description}
            </p>
            
            {hero.schedules && hero.schedules.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2 text-gray-400 font-bold text-xs">
                {hero.schedules.map((s:any, i:number) => (
                  <span key={i} className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded">
                    <span className="text-red-500">⏱</span> {s.time} <span className="text-gray-500 uppercase">{s.region}</span>
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex flex-wrap gap-4 pt-4">
              {hero.channels?.map((chan: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleWatch(hero.id, i, chan.adLink, chan.realLink)}
                  className={`px-8 py-4 rounded font-black transition-all transform active:scale-95 text-sm uppercase tracking-wide flex items-center gap-2 ${
                    clickedAds[`${hero.id}-${i}`] 
                    ? 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/30' 
                    : 'bg-white text-black hover:bg-gray-200 shadow-lg'
                  }`}
                >
                  <span>{clickedAds[`${hero.id}-${i}`] ? '▶ VER' : '▶ DESBLOQUEAR'}</span>
                  <span>{chan.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRILLA CON TODOS LOS PARTIDOS INCLUYENDO EL PRINCIPAL */}
      {!isLoading && matches.length > 0 && (
        <section className="relative z-20 px-6 md:px-16 -mt-16 md:-mt-24 space-y-6">
          <h2 className="text-2xl font-black uppercase tracking-widest text-gray-200 drop-shadow-lg">Cartelera Completa</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {matches.map(m => (
              <div key={m.id} className="bg-[#111] rounded-lg overflow-hidden border border-white/5 hover:border-white/20 transition-all group shadow-2xl flex flex-col">
                
                <div className="relative aspect-video overflow-hidden bg-black">
                  <img src={m.poster_url} alt="Poster" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-black text-red-500 uppercase tracking-widest border border-white/10">{m.competition}</span>
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4 -mt-2 relative z-10">
                  <div className="space-y-2">
                    <h3 className="text-base font-black italic uppercase leading-tight text-white">{m.home_team} vs {m.away_team}</h3>
                    <div className="flex flex-wrap gap-2">
                      {m.schedules?.map((s:any, i:number) => (
                         <span key={i} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded font-bold text-gray-400">⏱ {s.time} {s.region}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    {m.channels?.map((chan: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => handleWatch(m.id, i, chan.adLink, chan.realLink)}
                        className={`w-full p-3 rounded text-[11px] font-black flex justify-between items-center transition-all uppercase tracking-wider ${
                          clickedAds[`${m.id}-${i}`] 
                          ? 'bg-green-600/20 text-green-500 border border-green-500/30' 
                          : 'bg-white/10 text-white hover:bg-red-600 border border-transparent'
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