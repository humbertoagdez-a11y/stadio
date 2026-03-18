"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Admin() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [formData, setFormData] = useState({ homeTeam: '', awayTeam: '', competition: '', posterUrl: '', descriptionShort: '', descriptionLong: '', slug: '' });
  const [channels, setChannels] = useState([{ name: 'Opción 1 HD', adLink: '', realLink: '' }]);
  const [blocks, setBlocks] = useState<string[]>([]);

  const fetchMatches = () => supabase.from('matches').select('*').order('created_at', { ascending: false }).then(({ data }) => setMatches(data || []));
  useEffect(() => { fetchMatches() }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const finalSlug = formData.slug || `${formData.homeTeam}-${formData.awayTeam}`.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const { error } = await supabase.from('matches').insert([{
      home_team: formData.homeTeam, away_team: formData.awayTeam, competition: formData.competition,
      poster_url: formData.posterUrl, description_short: formData.descriptionShort,
      description_long: formData.descriptionLong, slug: finalSlug, channels, custom_blocks: blocks,
      is_featured: isFeatured, schedules: [{ date: '2026-03-18', time: '20:30', region: 'PY' }]
    }]);

    if (!error) { alert("¡Evento Publicado!"); fetchMatches(); }
    else alert("Error: " + error.message);
  };

  const deleteMatch = (id: number) => {
    if(confirm("¿Eliminar?")) supabase.from('matches').delete().eq('id', id).then(() => fetchMatches());
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-10 border-b border-white/10 pb-6">
        <h1 className="text-4xl font-black text-red-600 italic tracking-tighter">STADIOTV ADMIN</h1>
        <Link href="/" className="text-gray-400 hover:text-white underline font-bold">Ver Sitio</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6 bg-[#0a0a0a] p-8 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-4 bg-red-600/10 p-4 rounded-xl border border-red-600/20">
            <input type="checkbox" className="w-6 h-6 accent-red-600" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
            <label className="font-bold uppercase text-xs text-red-500">Marcar como Destacado (Banner Inicio)</label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Local" className="bg-black p-4 rounded-xl border border-white/10" onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
            <input required placeholder="Visitante" className="bg-black p-4 rounded-xl border border-white/10" onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
          </div>
          <input required placeholder="URL SEO (Slug)" className="w-full bg-black p-4 rounded-xl border border-blue-500/30 text-blue-400 font-mono" onChange={e => setFormData({...formData, slug: e.target.value.split('/').pop() || ''})} />
          <input required placeholder="URL Imagen Poster" className="w-full bg-black p-4 rounded-xl border border-white/10" onChange={e => setFormData({...formData, posterUrl: e.target.value})} />
          <textarea required placeholder="Descripción Larga (Previa)" className="w-full bg-black p-4 rounded-xl border border-white/10 h-40 font-medium" onChange={e => setFormData({...formData, descriptionLong: e.target.value})} />
          
          <div className="space-y-4">
            <div className="flex justify-between items-center"><label className="text-xs font-black text-yellow-500 uppercase tracking-widest">Módulos HTML</label><button type="button" onClick={() => setBlocks([...blocks, ''])} className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded text-[10px] font-black">+ AÑADIR</button></div>
            {blocks.map((b, i) => (
              <textarea key={i} placeholder="Pega tu HTML aquí..." className="w-full bg-black p-4 rounded-xl border border-yellow-500/20 h-24 font-mono text-[10px] text-yellow-500/60" onChange={e => { const nb = [...blocks]; nb[i] = e.target.value; setBlocks(nb); }} />
            ))}
          </div>

          <button className="w-full bg-red-600 py-5 rounded-xl font-black text-xl hover:bg-red-700 transition-all shadow-lg active:scale-95">PUBLICAR EVENTO</button>
        </form>

        <div className="space-y-4">
           <h2 className="text-xl font-black uppercase text-gray-500 mb-6">Eventos en Sistema</h2>
           {matches.map(m => (
             <div key={m.id} className="bg-[#0f0f0f] p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                <div><p className="text-xs text-red-500 font-black uppercase">{m.competition}</p><p className="font-bold text-sm uppercase italic">{m.home_team} vs {m.away_team}</p></div>
                <button onClick={() => deleteMatch(m.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all font-black text-xl">✕</button>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}