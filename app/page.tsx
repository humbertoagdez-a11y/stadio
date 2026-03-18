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
      if (data && !error) setMatches(data);
    };
    fetchMatches();
  }, []);

  if (!isClient) return null;

  const heroMatch = matches.find(m => m.is_featured) || (matches.length > 0 ? matches[0] : null);

  const groupedByDate = matches.reduce((acc, match) => {
    const date = match.schedules?.[0]?.date || 'Próximos Partidos';
    (acc[date] = acc[date] || []).push(match);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden selection:bg-red-600 pb-20">
      
      <nav className="fixed w-full px-4 md:px-8 py-4 flex justify-between items-center z-50 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-2 h-6 bg-red-600"></div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1>
        </Link>
        <div className="space-x-6 text-sm text-gray-300 font-medium hidden md:flex">
          <Link href="/" className="text-white font-bold border-b-2 border-red-600 pb-1">Inicio</Link>
          <a href="#calendario" className="hover:text-white transition-colors">Cartelera</a>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-white p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </nav>

      {isMobileMenuOpen && (
        <div className="fixed top-[68px] left-0 w-full bg-[#0a0a0a] border-b border-white/10 z-40 p-4 flex flex-col gap-4 md:hidden shadow-2xl">
           <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-white font-bold">Inicio</Link>
           <a href="#calendario" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 font-bold">Cartelera</a>
        </div>
      )}

      {heroMatch && (
        <section className="relative pt-20 pb-8 md:pt-0 md:pb-24 min-h-[55vh] md:min-h-[80vh] w-full flex items-end px-4 md:px-12 lg:px-16 border-b border-white/5 mt-16 md:mt-0">
          <div className="absolute inset-0 z-0">
            <img src={heroMatch.poster_url} alt="Fondo" className="w-full h-full object-cover opacity-50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent hidden md:block w-3/4"></div>
          </div>
          <div className="relative z-10 w-full max-w-4xl">
            <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest shadow-lg flex w-fit items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> DESTACADO
            </span>
            <h1 className="text-4xl md:text-8xl font-black mt-2 uppercase leading-none tracking-tighter italic drop-shadow-2xl">
              {heroMatch.home_team} <br className="hidden md:block"/><span className="text-red-600 mx-0 md:mx-3">VS</span> {heroMatch.away_team}
            </h1>
            <p className="hidden md:block text-gray-300 text-lg mt-6 max-w-2xl font-medium text-shadow">{heroMatch.description_short || heroMatch.description}</p>
            <div className="mt-8">
              <Link href={`/partido/${heroMatch.slug}`} className="inline-block bg-red-600 text-white font-black px-10 py-4 rounded hover:bg-red-700 transition-all uppercase tracking-tighter shadow-lg active:scale-95">Acceder al Evento</Link>
            </div>
          </div>
        </section>
      )}

      <div id="calendario" className="mt-12 space-y-12 px-4 md:px-12 lg:px-16">
        {Object.keys(groupedByDate).length === 0 ? (
           <p className="text-center text-gray-500 font-bold mt-20">No hay transmisiones activas en el sistema.</p>
        ) : (
          Object.keys(groupedByDate).map((date) => (
            <section key={date}>
              <h2 className="text-xl md:text-2xl font-black uppercase mb-6 flex items-center gap-3 tracking-tighter">
                <div className="w-1.5 h-6 bg-red-600"></div> {date}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {groupedByDate[date].map((match: any) => (
                  <Link href={`/partido/${match.slug}`} key={match.id} className="group relative aspect-video rounded-xl overflow-hidden border border-white/5 hover:border-red-600/50 transition-all shadow-lg">
                    <img src={match.poster_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 group-hover:opacity-40 transition-all duration-500" alt="poster" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    
                    <div className="absolute top-3 left-3 z-10"><span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">{match.competition}</span></div>
                    {match.schedules && match.schedules.length > 0 && (
                      <div className="absolute top-3 right-3 z-10"><span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded flex items-center gap-1 shadow-lg">⏱ {match.schedules[0].time}</span></div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-sm border bg-white/10 border-white/20 text-white group-hover:bg-red-600 group-hover:border-red-600 group-hover:scale-110 transition-all duration-300 shadow-xl"><svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
                    </div>
                    
                    <div className="absolute bottom-4 left-0 w-full text-center px-4">
                      <p className="text-sm md:text-base font-black uppercase italic tracking-tighter drop-shadow-md">{match.home_team} <span className="text-red-600">vs</span> {match.away_team}</p>
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