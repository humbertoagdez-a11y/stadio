import { supabase } from '@/lib/supabase';
import { getMatchData } from '@/lib/api-football';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

// Ruta relativa probada
import VideoPlayer from '../../../components/VideoPlayer';

export const revalidate = 60;

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  competition: string;
  poster_url: string;
  description_long: string;
  slug: string;
  fixture_id: string | null;
  highlights: any[];
  schedules: any[];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MatchPage(props: PageProps) {
  const params = await props.params;
  const { slug } = params;

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return notFound();
  const match = data as Match;

  let liveStats = null;
  if (match.fixture_id) {
    try {
      liveStats = await getMatchData(match.fixture_id);
    } catch (e) {
      console.error("Error conectando con API-Football:", e);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-red-600 pb-20 font-sans">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black italic tracking-tighter hover:opacity-80 transition-opacity">
            STADIO<span className="text-red-600">TV</span>
          </Link>
          <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* BANNER PRINCIPAL */}
      <div className="relative h-[60vh] md:h-[75vh] w-full">
        <Image 
          src={match.poster_url || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop"} 
          alt="Banner del partido" 
          fill 
          className="object-cover opacity-40 scale-105" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 md:p-20 w-full max-w-7xl mx-auto z-10">
          <span className="bg-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20">
            {match.competition}
          </span>
          <h1 className="text-5xl md:text-9xl font-black uppercase italic tracking-tighter mt-6 leading-[0.85] drop-shadow-2xl">
            {match.home_team} <br/> <span className="text-red-600 not-italic">VS</span> {match.away_team}
          </h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12 relative z-20">
        
        <div className="lg:col-span-2 space-y-12">
          
          {/* MARCADOR EN VIVO */}
          {liveStats && (
            <div className="bg-[#0f0f0f] border border-white/5 p-10 rounded-[40px] flex items-center justify-between shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-red-600/10 blur-[120px]" />
              
              <div className="flex-1 text-center font-black text-xl md:text-3xl uppercase italic tracking-tighter">{match.home_team}</div>
              
              <div className="flex flex-col items-center px-8 md:px-16 border-x border-white/5">
                <span className="text-6xl md:text-8xl font-black tracking-tighter tabular-nums text-white">
                  {liveStats?.goals?.home ?? 0} - {liveStats?.goals?.away ?? 0}
                </span>
                <div className="flex items-center gap-2 mt-4">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-red-600">
                    {liveStats?.fixture?.status?.elapsed ?? 0}&apos; EN VIVO
                  </span>
                </div>
              </div>
              
              <div className="flex-1 text-center font-black text-xl md:text-3xl uppercase italic tracking-tighter">{match.away_team}</div>
            </div>
          )}

          {/* EVENTOS (Goles y Tarjetas) */}
          {liveStats?.events && liveStats.events.length > 0 && (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 space-y-6">
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em] border-b border-white/5 pb-4">
                Sucedió en el encuentro
              </h4>
              <div className="grid grid-cols-1 gap-4">
                {liveStats.events.map((event: any, index: number) => (
                  <div key={index} className={`flex items-center gap-4 text-sm ${event.team.name === match.home_team ? 'flex-row' : 'flex-row-reverse text-right'}`}>
                    <span className="font-black text-red-600 w-10 text-lg italic">{event.time.elapsed}&apos;</span>
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl px-6 min-w-[200px]">
                      <span className="font-bold uppercase tracking-tight text-gray-200">{event.player.name}</span>
                      {event.type === "Goal" && <span className="text-xl">⚽</span>}
                      {event.type === "Card" && <span className={`w-3 h-4 rounded-sm ${event.detail === "Yellow Card" ? "bg-yellow-400" : "bg-red-600"}`}></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPRODUCTOR */}
          <section className="space-y-8">
            <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
              <span className="w-12 h-1.5 bg-purple-600 rounded-full" /> RESUMEN DEL PARTIDO
            </h3>
            <VideoPlayer highlights={match.highlights || []} />
          </section>

          {/* CRÓNICA */}
          <section className="space-y-6">
             <h3 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
              <span className="w-12 h-1.5 bg-gray-700 rounded-full" /> CRÓNICA
            </h3>
            <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-[40px]">
              <p className="text-gray-400 leading-relaxed text-xl font-medium whitespace-pre-wrap italic">
                {match.description_long || "Análisis en desarrollo por el equipo de Stadio TV..."}
              </p>
            </div>
          </section>
        </div>

        {/* HORARIOS */}
        <aside className="space-y-8">
          <div className="bg-[#0f0f0f] border border-white/5 p-8 rounded-[40px] sticky top-28 shadow-2xl">
            <h4 className="font-black uppercase text-[11px] text-gray-500 mb-8 tracking-[0.4em] border-b border-white/5 pb-5 text-center">
              Horarios Globales
            </h4>
            <div className="space-y-4">
              {match.schedules?.map((s: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-black/40 p-5 rounded-3xl border border-white/5 hover:border-red-600/30 transition-all group">
                  <span className="font-bold text-xs text-gray-400 group-hover:text-white transition-colors uppercase">{s.region}</span>
                  <span className="font-black text-red-600 text-lg italic tracking-tighter">{s.time}</span>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-10 bg-white text-black py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-xl shadow-white/5 active:scale-95">
              INSTALAR STADIO APP
            </button>
          </div>
        </aside>

      </main>

      {/* FOOTER */}
      <footer className="mt-20 border-t border-white/5 p-12 text-center">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em]">
          STADIO TV © 2026 • TU PASIÓN EN HD
        </p>
      </footer>
    </div>
  );
}