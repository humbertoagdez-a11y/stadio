"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MatchPage() {
  const params = useParams();
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatch = async () => {
      const { data } = await supabase.from('matches').select('*').eq('slug', params.slug).single();
      if (data) setMatch(data);
      setLoading(false);
    };
    fetchMatch();
  }, [params.slug]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!match) return <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 text-center p-4"><h2 className="text-3xl font-black">EVENTO NO ENCONTRADO</h2><Link href="/" className="text-red-500 font-bold underline">VOLVER AL INICIO</Link></div>;

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-red-600 pb-20">
      <nav className="fixed w-full px-4 py-4 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2"><div className="w-1 h-5 bg-red-600"></div><h1 className="text-xl font-black tracking-tighter text-red-600">STADIO<span className="text-white">TV</span></h1></Link>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">En Vivo HD</span>
      </nav>

      {/* HEADER: Altura corregida y degradado suave */}
      <div className="relative w-full h-[55vh] md:h-[65vh] pt-16">
        <img src={match.poster_url} className="absolute inset-0 w-full h-full object-cover opacity-50" alt="banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 md:p-16 z-10">
           <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-widest">{match.competition}</span>
           <h1 className="text-4xl md:text-7xl font-black mt-4 uppercase italic leading-none drop-shadow-2xl tracking-tighter">
             {match.home_team} <span className="text-red-600">VS</span> {match.away_team}
           </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col lg:flex-row gap-12">
        <div className="flex-1 space-y-8 order-2 lg:order-1">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><div className="w-1.5 h-8 bg-red-600 rounded-full"></div> ANÁLISIS DEL ENCUENTRO</h2>
            <p className="text-gray-400 leading-relaxed text-lg whitespace-pre-line font-medium italic">{match.description_long || match.description}</p>
          </div>

          {/* RENDERIZADO DE MÓDULOS HTML */}
          {match.custom_blocks?.map((block: string, i: number) => (
             <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 md:p-10 shadow-xl overflow-x-auto">
                <div dangerouslySetInnerHTML={{ __html: block }} className="prose prose-invert max-w-none" />
             </div>
          ))}
        </div>

        <div className="w-full lg:w-[400px] order-1 lg:order-2 space-y-6">
          <div className="bg-[#0f0f0f] border border-red-600/30 rounded-2xl p-8 sticky top-28 shadow-2xl">
             <h3 className="text-2xl font-black uppercase text-center mb-8 tracking-tighter flex items-center justify-center gap-2">
               <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span> TRANSMISIÓN
             </h3>
             <div className="space-y-4">
                {match.channels?.map((ch: any, i: number) => (
                  <a key={i} href={ch.adLink} target="_blank" className="block w-full bg-white text-black text-center py-5 rounded-xl font-black hover:bg-gray-200 transition-all uppercase tracking-tighter text-lg shadow-lg active:scale-95">
                    VER {ch.name}
                  </a>
                ))}
             </div>
             <p className="text-center text-[10px] text-gray-500 mt-6 font-bold uppercase tracking-widest">Se recomienda conexión Wi-Fi</p>
          </div>
        </div>
      </div>
    </main>
  );
}