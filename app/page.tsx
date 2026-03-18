"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const heroMatch = matches.length > 0 ? matches[0] : null;

  const groupedByDate = matches.reduce((acc, match) => {
    const date = match.schedules?.[0]?.date || 'Próximos Partidos';
    (acc[date] = acc[date] || []).push(match);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-red-600 selection:text-white pb-20">
      
      {/* NAVBAR */}
      <nav className="fixed w-full px-4 md:px-8 py-4 flex justify-between items-center z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-1 group">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-red-600 group-hover:scale-105 transition-transform">
            STADIO<span className="text-white">TV</span>
          </h1>
          <svg className="w-5 h-5 md:w-7 md:h-7 text-white/80 animate-[spin_10s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>
          </svg>
        </Link>
        
        <div className="space-x-6 text-sm text-gray-300 font-medium hidden md:flex items-center">
          <Link href="/" className="text-white font-bold border-b-2 border-red-600 pb-1">Inicio</Link>
          <a href="#calendario" className="hover:text-white transition-colors">Calendario & Competiciones</a>
        </div>
        
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
      </nav>

      {/* MENÚ MÓVIL DESPLEGABLE */}
      {isMobileMenuOpen && (
        <div className="fixed top-[68px] left-0 w-full bg-[#0a0a0a] border-b border-white/10 z-40 p-4 flex flex-col gap-4 md:hidden shadow-2xl">
           <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-white font-bold text-lg">Inicio</Link>
           <a href="#calendario" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 font-bold text-lg">Ver Calendario</a>
        </div>
      )}

      {/* HERO SECTION PRO - Ajuste del corte agresivo: quitamos border-bottom y suavizamos gradientes */}
      {heroMatch && (
        <section className="relative pt-20 pb-12 md:pt-0 md:pb-32 min-h-[50vh] md:min-h-[85vh] w-full flex items-end px-4 md:px-12 lg:px-16 mt-12 md:mt-0">
          <div className="absolute inset-0 z-0">
            <img src={heroMatch.poster_url} alt="Fondo" className="w-full h-full object-cover opacity-60 md:opacity-40" />
            {/* Degradado inferior extenso para borrar el corte y fundirse con el fondo */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            {/* Degradado lateral */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent hidden md:block w-full"></div>
          </div>

          <div className="relative z-10 w-full max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="bg-red-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-sm uppercase tracking-widest animate-pulse flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-white rounded-full"></div> DESTACADO
              </span>
              <span className="text-gray-300 text-[10px] md:text-xs font-bold tracking-widest border border-white/20 px-2 py-1 rounded-sm uppercase bg-black/50 backdrop-blur-sm">{heroMatch.competition}</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black leading-none mb-4 uppercase drop-shadow-2xl tracking-tighter">
              {heroMatch.home_team} <br className="hidden md:block"/><span className="text-red-600 italic text-3xl md:text-6xl">VS</span> {heroMatch.away_team}
            </h1>
            
            <p className="hidden md:block text-gray-300 text-sm md:text-lg mb-8 line-clamp-3 max-w-2xl text-shadow font-medium">
              {heroMatch.description}
            </p>

            <div className="mt-4 md:mt-0 w-full sm:w-auto">
              <Link href={`/partido/${heroMatch.id}`}>
                <button className="w-full sm:w-auto justify-center bg-red-600 text-white hover:bg-red-700 font-black px-6 py-4 md:px-10 md:py-5 rounded md:rounded-lg transition-all active:scale-95 flex items-center gap-3 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                  <svg className="w-5 h-5 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  VER PREVIA Y TRANSMISIÓN
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CARTELERA TIPO CALENDARIO */}
      <div id="calendario" className="mt-4 md:mt-8 space-y-12 relative z-10">
        {matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 opacity-50">
             <p className="text-gray-400 text-lg">Aún no hay transmisiones activas.</p>
          </div>
        ) : (
          Object.keys(groupedByDate).map((dateTitle) => (
            <section key={dateTitle} className="w-full">
              <div className="flex items-center gap-3 px-4 md:px-12 lg:px-16 mb-6">
                <div className="w-1.5 h-8 bg-red-600 rounded-full"></div>
                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter">📅 {dateTitle}</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-4 md:px-12 lg:px-16">
                {groupedByDate[dateTitle].map((match: any) => (
                  <Link href={`/partido/${match.id}`} key={match.id}>
                    <div className="cursor-pointer aspect-video relative rounded-xl overflow-hidden border border-gray-800 bg-[#0a0a0a] group hover:border-red-600/50 transition-all shadow-lg hover:shadow-red-900/20 hover:-translate-y-1 duration-300">
                      <img src={match.poster_url} alt="Poster" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-40 transition-opacity duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

                      <div className="absolute top-3 left-3 z-10">
                        <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase">{match.competition}</span>
                      </div>

                      {match.schedules && match.schedules.length > 0 && (
                        <div className="absolute top-3 right-3 z-10">
                          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                            ⏱ {match.schedules[0].time} {match.schedules[0].region}
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border bg-white/10 border-white/20 text-white group-hover:bg-red-600 group-hover:border-red-600 group-hover:scale-110 transition-all duration-300 shadow-xl">
                            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-4 z-10 bg-gradient-to-t from-[#050505] to-transparent">
                        <h3 className="text-sm md:text-lg font-black leading-tight text-white uppercase italic text-center drop-shadow-md">
                          {match.home_team} <span className="text-red-500">VS</span> {match.away_team}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}