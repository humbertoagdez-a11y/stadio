"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [clickedAds, setClickedAds] = useState<{ [key: number]: boolean }>({});

  useEffect(() => {
    setIsClient(true);
    
    // Obtener partidos en tiempo real desde Supabase
    const fetchMatches = async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data) setMatches(data);
    };

    fetchMatches();
  }, []);

  if (!isClient) return null;

  const handlePlayClick = (e: React.MouseEvent, match: any) => {
    e.preventDefault();
    if (!clickedAds[match.id]) {
      window.open(match.ad_link, '_blank');
      setClickedAds(prev => ({ ...prev, [match.id]: true }));
    } else {
      window.open(match.real_link, '_self'); 
    }
  };

  const heroMatch = matches.length > 0 ? matches[0] : null;

  // Agrupamos por la columna de la base de datos "competition"
  const groupedMatches = matches.reduce((acc, match) => {
    (acc[match.competition] = acc[match.competition] || []).push(match);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-red-600 selection:text-white">
      
      <nav className="fixed w-full px-4 md:px-8 py-4 flex justify-between items-center z-50 bg-[#050505]/90 backdrop-blur-lg border-b border-white/5">
        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-red-600">STADIO</h1>
        <div className="space-x-6 text-sm text-gray-300 font-medium hidden md:flex items-center">
          <Link href="#" className="text-white font-bold">Inicio</Link>
          <Link href="#" className="hover:text-white transition-colors">Competiciones</Link>
        </div>
        <button className="md:hidden text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>

      {/* HERO SECTION */}
      {heroMatch && (
        <section className="relative pt-24 pb-12 md:pt-0 md:pb-24 min-h-[60vh] md:min-h-[85vh] w-full flex items-end px-4 md:px-12 lg:px-16 mt-14 md:mt-0">
          <div className="absolute inset-0 z-0">
            <img src={heroMatch.poster_url} alt="Fondo" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest">En Vivo</span>
              <span className="text-gray-300 text-xs md:text-sm font-semibold tracking-wide border border-white/20 px-2 py-1 rounded-sm">{heroMatch.competition}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-3 drop-shadow-2xl">
              {heroMatch.home_team} <br className="hidden md:block"/><span className="text-gray-400 text-3xl md:text-5xl">vs</span> {heroMatch.away_team}
            </h1>
            
            <p className="text-sm md:text-lg text-gray-300 mb-6 md:mb-8 line-clamp-2 md:line-clamp-3 max-w-xl">
              {heroMatch.description}
            </p>

            <div className="flex gap-3 md:gap-4 w-full md:w-auto">
              <button 
                onClick={(e) => handlePlayClick(e, heroMatch)}
                className={`flex-1 md:flex-none justify-center ${clickedAds[heroMatch.id] ? 'bg-green-600 text-white hover:bg-green-500' : 'bg-white text-black hover:bg-gray-200'} font-bold px-6 py-3 md:px-8 md:py-4 rounded md:rounded-lg transition-transform active:scale-95 flex items-center gap-2`}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                {clickedAds[heroMatch.id] ? 'Ver Transmisión' : 'Ver Ahora'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* FILAS DE CONTENIDO */}
      <div className="pb-24 -mt-4 relative z-20 space-y-8 md:space-y-12">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 opacity-50">
             <svg className="w-16 h-16 text-gray-400 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
             <p className="text-gray-400 text-lg">Aún no hay transmisiones activas.</p>
          </div>
        ) : (
          Object.keys(groupedMatches).map((cupName) => (
            <section key={cupName} className="w-full">
              <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-gray-100 px-4 md:px-12 lg:px-16">{cupName}</h2>
              
              <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-4 md:px-12 lg:px-16">
                {groupedMatches[cupName].map((match: any) => (
                  <div 
                    key={match.id} 
                    onClick={(e) => handlePlayClick(e, match)}
                    className="cursor-pointer min-w-[260px] md:min-w-[320px] aspect-video flex-shrink-0 snap-start group relative rounded-lg overflow-hidden border border-white/10 transition-transform duration-300 hover:scale-[1.03] hover:border-white/30 bg-[#111]"
                  >
                    <img src={match.poster_url} alt="Poster" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-70 group-hover:opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

                    <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10">
                      {clickedAds[match.id] ? (
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Listo
                        </span>
                      ) : (
                        <span className="bg-red-600/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                          Requiere Clic
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <svg className={`w-10 h-10 md:w-12 md:h-12 drop-shadow-2xl transition-all duration-300 ${clickedAds[match.id] ? 'text-green-500 opacity-100 scale-110' : 'text-white opacity-60 group-hover:opacity-100 group-hover:scale-110'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-3 md:p-4 z-10">
                      <h3 className="text-base md:text-lg font-black leading-tight drop-shadow-md mb-1 text-white">
                        {match.home_team} vs {match.away_team}
                      </h3>
                      
                      {match.schedules && match.schedules.length > 0 && (
                        <p className="text-[11px] md:text-xs text-gray-300 font-medium">
                          ⏱ {match.schedules[0].time} <span className="text-gray-400">{match.schedules[0].region}</span>
                          {match.schedules.length > 1 && ` (+${match.schedules.length - 1} más)`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}