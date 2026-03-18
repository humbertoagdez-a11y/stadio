import { supabase } from '@/lib/supabase';
import { getMatchData } from '@/lib/api-football';
import Image from 'next/image';
import Link from 'next/link';

// Revalidación automática cada 60 segundos (ISR)
export const revalidate = 60;

export default async function Home() {
  // 1. Obtener todos los partidos de Supabase
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .order('is_featured', { ascending: false }) // Primero los destacados
    .order('created_at', { ascending: false });

  if (error || !matches || matches.length === 0) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black italic text-white">STADIO<span className="text-red-600">TV</span></h1>
          <p className="text-gray-500 uppercase tracking-[0.3em] text-xs">No hay eventos programados</p>
        </div>
      </div>
    );
  }

  // 2. Definir el partido Hero (el primero por orden de importancia)
  const featured = matches[0];
  const gridMatches = matches.slice(1);

  // 3. Obtener marcador en vivo para el Hero si tiene fixture_id
  let heroLive = null;
  if (featured.fixture_id) {
    heroLive = await getMatchData(String(featured.fixture_id));
  }

  const heroHomeScore = heroLive?.goals?.home ?? '-';
  const heroAwayScore = heroLive?.goals?.away ?? '-';
  const isLive = heroLive?.fixture?.status?.short !== 'NS' && heroLive?.fixture?.status?.short !== 'FT' && heroLive?.fixture?.status?.short !== 'TBD';

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5 p-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black italic tracking-tighter hover:scale-105 transition-transform">
            STADIO<span className="text-red-600">TV</span>
          </Link>
          <div className="flex gap-4 md:gap-8">
            <Link href="/admin" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-600 transition-colors">Admin</Link>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 animate-pulse">Live Now</span>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative w-full h-[85vh] flex items-end overflow-hidden">
        {/* Background Image con gradientes */}
        <div className="absolute inset-0 z-0">
          <Image
            src={featured.poster_url || "/placeholder.jpg"}
            alt={featured.home_team}
            fill
            className="object-cover opacity-60 scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent opacity-80" />
        </div>

        {/* Info del Partido Hero */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pb-20 w-full">
          <div className="flex flex-col space-y-6">
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-[10px] font-black px-3 py-1 rounded shadow-[0_0_15px_rgba(220,38,38,0.4)] uppercase">
                {featured.competition}
              </span>
              {isLive && (
                <span className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded uppercase">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  En Vivo
                </span>
              )}
            </div>

            <h2 className="text-6xl md:text-8xl lg:text-[120px] font-black uppercase tracking-tighter leading-[0.85] italic">
              {featured.home_team} <br />
              <span className="text-red-600 text-4xl md:text-6xl lg:text-8xl not-italic ml-4 mr-4">VS</span>
              {featured.away_team}
            </h2>

            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mt-4">
              {/* Marcador en vivo integrado en el Home */}
              {heroLive && (
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-6">
                  <div className="text-3xl md:text-5xl font-black tabular-nums">
                    {heroHomeScore} <span className="text-red-600">:</span> {heroAwayScore}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-l border-white/10 pl-6">
                    Minuto <br/> <span className="text-white text-sm">{heroLive.fixture.status.elapsed}&apos;</span>
                  </div>
                </div>
              )}

              <Link 
                href={`/partido/${featured.slug}`}
                className="group relative bg-white text-black px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-tighter overflow-hidden transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">Ver Detalles y Highlights</span>
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* GRID DE PARTIDOS SECUNDARIOS */}
      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center justify-between mb-12">
          <h3 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
            <span className="w-12 h-1.5 bg-red-600" />
            Cartelera Completa
          </h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest hidden md:block">
            {matches.length} Eventos Disponibles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {gridMatches.map((match) => (
            <Link 
              key={match.id} 
              href={`/partido/${match.slug}`}
              className="group relative bg-[#0f0f0f] border border-white/5 rounded-[32px] overflow-hidden hover:border-red-600/30 transition-all duration-500 hover:-translate-y-2 shadow-2xl"
            >
              <div className="relative h-64">
                <Image 
                  src={match.poster_url || "/placeholder.jpg"} 
                  alt={match.home_team} 
                  fill 
                  className="object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
                <div className="absolute top-5 left-5">
                  <span className="bg-black/60 backdrop-blur-md text-[9px] font-black px-3 py-1 rounded border border-white/10 uppercase tracking-widest">
                    {match.competition}
                  </span>
                </div>
              </div>

              <div className="p-8 relative">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-2xl font-black uppercase tracking-tighter leading-none">{match.home_team}</p>
                    <p className="text-xs font-black text-red-600 italic tracking-widest">VERSUS</p>
                    <p className="text-2xl font-black uppercase tracking-tighter leading-none">{match.away_team}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300">
                    <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 border-t border-white/5 py-20 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="text-xl font-black italic tracking-tighter text-gray-400">
          STADIO<span className="text-red-600">TV</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">
          © 2026 Powered by Fabrizio.sys SmartControl
        </div>
        <div className="flex gap-6">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer">
            <span className="text-[10px] font-bold">IG</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer">
            <span className="text-[10px] font-bold">X</span>
          </div>
        </div>
      </footer>
    </div>
  );
}