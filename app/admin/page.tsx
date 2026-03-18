"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    homeTeam: '', awayTeam: '', competition: '', posterUrl: '', descriptionShort: '', descriptionLong: '', slug: '', isFeatured: false, fixtureId: ''
  });

  const [currentSchedules, setCurrentSchedules] = useState([{ date: new Date().toISOString().split('T')[0], time: '', region: 'PY' }]);
  const [highlights, setHighlights] = useState([{ title: 'Resumen del Partido', adLink: '', videoUrl: '' }]);
  const [customBlocks, setCustomBlocks] = useState<string[]>([]);

  useEffect(() => { setIsClient(true); fetchMatches(); }, []);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
  };

  // --- FUNCIÓN MÁGICA DE SINCRONIZACIÓN ---
  const syncWithAPI = async () => {
    if (!formData.fixtureId) return alert("Primero pega el ID del partido de API-Football");
    
    try {
      const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${formData.fixtureId}`, {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': '8ddf752de714ed30864ba27695722a30' 
        }
      });
      const data = await res.json();
      if (data.response && data.response[0]) {
        const f = data.response[0];
        setFormData({
          ...formData,
          homeTeam: f.teams.home.name,
          awayTeam: f.teams.away.name,
          competition: f.league.name,
          slug: `${f.teams.home.name}-${f.teams.away.name}`.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '')
        });
        alert("¡Datos del partido cargados automáticamente!");
      } else {
        alert("No se encontró el partido. Revisa el ID.");
      }
    } catch (e) { alert("Error conectando con la API"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const matchData = {
      home_team: formData.homeTeam, away_team: formData.awayTeam, competition: formData.competition,
      poster_url: formData.posterUrl, description_short: formData.descriptionShort, description_long: formData.descriptionLong,
      slug: formData.slug, is_featured: formData.isFeatured, fixture_id: formData.fixtureId,
      schedules: currentSchedules, highlights: highlights.filter(h => h.videoUrl !== ''), custom_blocks: customBlocks
    };

    const { error } = editingId 
      ? await supabase.from('matches').update(matchData).eq('id', editingId)
      : await supabase.from('matches').insert([matchData]);

    if (!error) { fetchMatches(); cancelEdit(); alert("Guardado con éxito"); }
    setIsSubmitting(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ homeTeam: '', awayTeam: '', competition: '', posterUrl: '', descriptionShort: '', descriptionLong: '', slug: '', isFeatured: false, fixtureId: '' });
    setHighlights([{ title: 'Resumen del Partido', adLink: '', videoUrl: '' }]);
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-4xl font-black text-red-600 italic uppercase">Panel Stadio TV</h1>
          
          <form onSubmit={handleSubmit} className="bg-[#0f0f0f] p-8 rounded-3xl border border-white/5 space-y-8">
            {/* SECCIÓN API (LA MÁS IMPORTANTE) */}
            <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl space-y-4">
              <label className="text-xs font-black text-blue-400 uppercase tracking-widest">Paso 1: Sincronización Automática</label>
              <div className="flex gap-4">
                <input 
                  value={formData.fixtureId} 
                  placeholder="Pega el ID del Partido aquí..." 
                  className="flex-1 bg-black border border-white/10 p-4 rounded-xl outline-none focus:border-blue-500 transition-all font-mono text-sm"
                  onChange={e => setFormData({...formData, fixtureId: e.target.value})}
                />
                <button type="button" onClick={syncWithAPI} className="bg-blue-600 hover:bg-blue-700 px-6 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
                  SINCRONIZAR
                </button>
              </div>
            </div>

            {/* DATOS GENERALES */}
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <input required value={formData.homeTeam} placeholder="Equipo Local" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
                  <input required value={formData.awayTeam} placeholder="Equipo Visitante" className="w-full bg-black border border-white/10 p-4 rounded-xl outline-none" onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
               </div>
               <input value={formData.slug} placeholder="URL-del-partido" className="w-full bg-black/50 border border-white/5 p-4 rounded-xl text-gray-500 text-sm font-mono" onChange={e => setFormData({...formData, slug: e.target.value})} />
               <input value={formData.posterUrl} placeholder="URL de la imagen de fondo" className="w-full bg-black border border-white/10 p-4 rounded-xl" onChange={e => setFormData({...formData, posterUrl: e.target.value})} />
            </div>

            {/* HIGHLIGHTS */}
            <div className="bg-purple-600/5 border border-purple-500/20 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-purple-400 uppercase tracking-widest">Paso 2: Resúmenes de Video</label>
                <button type="button" onClick={() => setHighlights([...highlights, { title: '', adLink: '', videoUrl: '' }])} className="text-[10px] bg-purple-600 px-3 py-1 rounded-full font-bold">+ AÑADIR OTRO</button>
              </div>
              {highlights.map((h, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/50 p-4 rounded-xl border border-white/5">
                  <input placeholder="Link de Adsterra (Anuncio)" value={h.adLink} className="bg-black border border-white/10 p-3 rounded-lg text-xs" onChange={e => { const n = [...highlights]; n[i].adLink = e.target.value; setHighlights(n); }} />
                  <input placeholder="Link de Video (YouTube/MP4)" value={h.videoUrl} className="bg-black border border-white/10 p-3 rounded-lg text-xs" onChange={e => { const n = [...highlights]; n[i].videoUrl = e.target.value; setHighlights(n); }} />
                </div>
              ))}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 py-5 rounded-2xl font-black text-xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">
              {isSubmitting ? 'GUARDANDO...' : editingId ? 'GUARDAR CAMBIOS' : 'PUBLICAR EN STADIOTV'}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase text-gray-500 border-b border-white/10 pb-4">Eventos Activos</h2>
          <div className="space-y-3 overflow-y-auto max-h-[80vh] pr-2">
            {matches.map(m => (
              <div key={m.id} className="bg-[#0f0f0f] p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                <div>
                  <p className="text-[10px] text-red-500 font-black uppercase">{m.competition}</p>
                  <p className="font-bold text-sm italic">{m.home_team} vs {m.away_team}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => setEditingId(m.id)} className="bg-blue-500/20 p-2 rounded-lg text-blue-500">✎</button>
                  <button onClick={async () => { if(confirm("¿Eliminar?")) await supabase.from('matches').delete().eq('id', m.id); fetchMatches(); }} className="bg-red-500/20 p-2 rounded-lg text-red-500">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}