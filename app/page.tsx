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

  const groupedMatches = matches.reduce((acc, match) => {
    (acc[match.competition] = acc[match.competition] || []).push(match);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-red-600 selection:text-white pb-20">
      
      {/* NAVBAR: Fondo sólido para evitar superposiciones */}
      <nav className="fixed w-full px-4 md:px-8 py-3 flex justify-between items-center z-50 bg-[#050505] border-b border-white/10 shadow-lg">
        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-red-600">STADIO</h1>
        <div className="space-x-6 text-sm text-gray-300 font-medium hidden md:flex items-center">
          <Link href="#" className="text-white font-bold">Inicio</Link>
          <Link href="#" className="hover:text-white transition-colors">Competiciones</Link>
        </div>
        <button className="md:hidden text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>

      {/* HERO SECTION: Compacto en móviles, expansivo en PC */}
      {heroMatch && (
        <section className="relative pt-20 pb-8 md:pt-0 md:pb-24 min-h-[45vh] md:min-h-[75vh] w-full flex items-end px-4 md:px-12 lg:px-16 mt-12 md:mt-0 border-b border-gray-900">
          <div className="absolute inset-0 z-0">
            <img src={heroMatch.poster_url} alt="Fondo" className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent hidden md:block"></div>
          </div>

          <div className="relative z-10 w-full max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-4">
              <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest animate-pulse">En Vivo</span>
              <span className="text-gray-300 text-[10px] md:text-xs font-bold tracking-widest border border-white/20 px-2 py-1 rounded-sm uppercase bg-black/50 backdrop-blur-sm">{heroMatch.competition}</span>
            </div>
            
            {/* Título adaptativo */}
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-2 uppercase drop-shadow-2xl">
              {heroMatch.home_team} <br className="hidden md:block"/><span className="text-red-600 italic text-2xl md:text-5xl">VS</span> {heroMatch.away_team}
            </h1>
            
            {/* Descripción: Oculta en móviles para ahorrar espacio */}
            <p className="hidden md:block text-gray-300 text-sm md:text-lg mb-8 line-clamp-3 max-w-2xl text-shadow">
              {heroMatch.description}
            </p>

            {/* Botón premium */}
            <div className="mt-4 md:mt-0 w-full sm:w-auto">
              <button 
                onClick={(e) => handlePlayClick(e, heroMatch)}
                className={`w-full sm:w-auto justify-center ${clickedAds[heroMatch.id] ? 'bg-green-600 text-white hover:bg-green-500 shadow-green-900/50' : 'bg-white text-black hover:bg-gray-200 shadow-white/20'} font-bold px-6 py-3 md:px-8 md:py-4 rounded md:rounded-lg transition-all active:scale-95 flex items-center gap-2 shadow-lg`}
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                {clickedAds[heroMatch.id] ? 'VER TRANSMISIÓN HD' : 'DESBLOQUEAR OPCIÓN 1'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* CARTELERA: Sistema de Grid (Cuadrícula) */}
      <div className="mt-8 md:mt-12 space-y-10">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 opacity-50">
             <p className="text-gray-400 text-lg">Aún no hay transmisiones activas.</p>
          </div>
        ) : (
          Object.keys(groupedMatches).map((cupName) => (
            <section key={cupName} className="w-full">
              {/* Título de la competición con detalle rojo */}
              <div className="flex items-center gap-3 px-4 md:px-12 lg:px-16 mb-4">
                <div className="w-1.5 h-6 bg-red-600 rounded-full"></div>
                <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-wide">{cupName}</h2>
              </div>
              
              {/* Cuadrícula responsiva de tarjetas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 md:px-12 lg:px-16">
                {groupedMatches[cupName].map((match: any) => (
                  <div 
                    key={match.id} 
                    onClick={(e) => handlePlayClick(e, match)}
                    className="cursor-pointer aspect-video relative rounded-xl overflow-hidden border border-gray-800 bg-[#0a0a0a] group hover:border-red-600/50 transition-colors shadow-lg"
                  >
                    <img src={match.poster_url} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                    {/* Badge superior izquierdo */}
                    <div className="absolute top-3 left-3 z-10">
                      {clickedAds[match.id] ? (
                        <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase">Listo</span>
                      ) : (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase">Requiere Clic</span>
                      )}
                    </div>

                    {/* Horario superior derecho */}
                    {match.schedules && match.schedules.length > 0 && (
                      <div className="absolute top-3 right-3 z-10">
                         <span className="bg-black/80 backdrop-blur-md text-gray-200 border border-gray-700 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
                           ⏱ {match.schedules[0].time} {match.schedules[0].region}
                         </span>
                      </div>
                    )}

                    {/* Botón Play central */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border transition-all duration-300 ${clickedAds[match.id] ? 'bg-green-600/20 border-green-500 text-green-400 scale-110' : 'bg-white/10 border-white/20 text-white group-hover:bg-red-600/20 group-hover:border-red-600 group-hover:text-red-500 group-hover:scale-110'}`}>
                          <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                    </div>

                    {/* Nombres de los equipos abajo */}
                    <div className="absolute bottom-0 left-0 w-full p-4 z-10 bg-gradient-to-t from-black to-transparent">
                      <h3 className="text-sm md:text-base font-black leading-tight text-white uppercase italic text-center drop-shadow-md">
                        {match.home_team} <span className="text-red-500">VS</span> {match.away_team}
                      </h3>
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