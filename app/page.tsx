"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<{ [key: number]: number }>({});
  const [clickedAds, setClickedAds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setIsClient(true);
    const fetchMatches = async () => {
      const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
      if (data) setMatches(data);
    };
    fetchMatches();
  }, []);

  if (!isClient) return null;

  const handleWatch = (matchId: number, channelIndex: number, adLink: string, realLink: string) => {
    const key = `${matchId}-${channelIndex}`;
    if (!clickedAds[key]) {
      window.open(adLink, '_blank');
      setClickedAds({ ...clickedAds, [key]: true });
    } else {
      window.open(realLink, '_self');
    }
  };

  const hero = matches[0];

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans">
      
      {/* HERO SECTION */}
      {hero && (
        <section className="relative h-[85vh] flex items-end pb-20 px-6 md:px-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img src={hero.poster_url} className="w-full h-full object-cover opacity-40 scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
          </div>
          
          <div className="relative z-10 max-w-4xl space-y-6">
            <span className="bg-red-600 px-3 py-1 text-xs font-black uppercase tracking-widest rounded-sm">En Vivo</span>
            <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-none">
              {hero.home_team} <span className="text-red-600">VS</span> {hero.away_team}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl leading-relaxed border-l-2 border-red-600 pl-4">
              {hero.description}
            </p>
            
            <div className="flex flex-wrap gap-3 pt-4">
              {hero.channels?.map((chan: any, i: number) => (
                <button 
                  key={i}
                  onClick={() => handleWatch(hero.id, i, chan.adLink, chan.realLink)}
                  className={`px-8 py-4 rounded-xl font-black transition-all transform active:scale-95 ${clickedAds[`${hero.id}-${i}`] ? 'bg-green-600' : 'bg-white text-black hover:bg-red-600 hover:text-white'}`}
                >
                  {clickedAds[`${hero.id}-${i}`] ? `VER ${chan.name}` : `DESBLOQUEAR ${chan.name}`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GRILLA DE PARTIDOS */}
      <section className="p-6 md:p-16 space-y-12">
        <h2 className="text-2xl font-black uppercase tracking-tighter border-b border-white/10 pb-4">Cartelera de Hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {matches.map(m => (
            <div key={m.id} className="bg-[#111] rounded-3xl overflow-hidden border border-white/5 hover:border-red-600/50 transition-all group shadow-2xl">
              <div className="relative aspect-video">
                <img src={m.poster_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{m.competition}</span>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <h3 className="text-xl font-black italic leading-tight">{m.home_team} vs {m.away_team}</h3>
                
                {/* Selector de Canales */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Canales Disponibles</p>
                  <div className="flex flex-col gap-2">
                    {m.channels?.map((chan: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => handleWatch(m.id, i, chan.adLink, chan.realLink)}
                        className={`w-full p-3 rounded-xl text-xs font-bold flex justify-between items-center transition-all ${clickedAds[`${m.id}-${i}`] ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 'bg-white/5 hover:bg-red-600 hover:text-white border border-white/5'}`}
                      >
                        <span>{chan.name}</span>
                        <span className="opacity-50">{clickedAds[`${m.id}-${i}`] ? '● ONLINE' : '▶ JUGAR'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}