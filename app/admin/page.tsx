"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
  };

  useEffect(() => {
    setIsClient(true);
    fetchMatches();
  }, []);

  const [formData, setFormData] = useState({
    homeTeam: '', awayTeam: '', competition: '', posterUrl: '', descriptionShort: '', descriptionLong: '', slug: '', isFeatured: false
  });

  const generateSlug = (home: string, away: string) => {
    return `${home}-${away}`.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const today = new Date().toISOString().split('T')[0];
  const initialSchedule = { date: today, time: '', region: '' };
  const initialChannel = { name: 'Opción 1 HD', adLink: '', realLink: '' };
  
  const [currentSchedules, setCurrentSchedules] = useState([{ ...initialSchedule }]);
  const [currentChannels, setCurrentChannels] = useState([{ ...initialChannel }]);
  
  // EL SISTEMA DE BLOQUES INFINITOS
  const [customBlocks, setCustomBlocks] = useState<string[]>([]);

  const updateSchedule = (index: number, field: string, value: string) => {
    const newS = [...currentSchedules];
    newS[index] = { ...newS[index], [field]: value };
    setCurrentSchedules(newS);
  };

  const updateChannel = (index: number, field: string, value: string) => {
    const newC = [...currentChannels];
    newC[index] = { ...newC[index], [field]: value };
    setCurrentChannels(newC);
  };

  const updateCustomBlock = (index: number, value: string) => {
    const newB = [...customBlocks];
    newB[index] = value;
    setCustomBlocks(newB);
  };

  const handleEditClick = (match: any) => {
    setEditingId(match.id);
    setFormData({
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      competition: match.competition,
      posterUrl: match.poster_url,
      descriptionShort: match.description_short || '',
      descriptionLong: match.description_long || match.description || '',
      slug: match.slug,
      isFeatured: match.is_featured || false
    });
    setCurrentSchedules(match.schedules && match.schedules.length > 0 ? match.schedules : [{ ...initialSchedule }]);
    setCurrentChannels(match.channels && match.channels.length > 0 ? match.channels : [{ ...initialChannel }]);
    setCustomBlocks(match.custom_blocks || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ homeTeam: '', awayTeam: '', competition: '', posterUrl: '', descriptionShort: '', descriptionLong: '', slug: '', isFeatured: false });
    setCurrentSchedules([{ ...initialSchedule }]);
    setCurrentChannels([{ ...initialChannel }]);
    setCustomBlocks([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const slug = formData.slug || generateSlug(formData.homeTeam, formData.awayTeam);

    const matchData = {
      home_team: formData.homeTeam,
      away_team: formData.awayTeam,
      competition: formData.competition,
      poster_url: formData.posterUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop',
      description_short: formData.descriptionShort || `Evento: ${formData.homeTeam} vs ${formData.awayTeam}.`,
      description_long: formData.descriptionLong,
      schedules: currentSchedules,
      channels: currentChannels,
      ad_link: currentChannels[0]?.adLink || '', 
      real_link: currentChannels[0]?.realLink || '',
      slug: slug,
      is_featured: formData.isFeatured,
      custom_blocks: customBlocks.filter(block => block.trim() !== '') // Evita guardar bloques vacíos
    };

    if (editingId) {
      const { data, error } = await supabase.from('matches').update(matchData).eq('id', editingId).select();
      if (!error && data) {
        setMatches(matches.map(m => m.id === editingId ? data[0] : m));
        alert("¡Sistema actualizado!");
        cancelEdit();
      } else alert("Error al guardar. Verifica que el Slug sea único.");
    } else {
      const { data, error } = await supabase.from('matches').insert([matchData]).select();
      if (!error && data) {
        setMatches([data[0], ...matches]);
        alert("¡Evento publicado!");
        cancelEdit();
      } else alert("Error al guardar. Verifica que el Slug sea único.");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Confirmar eliminación del evento del sistema?")) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (!error) {
        setMatches(matches.filter(m => m.id !== id));
        if (editingId === id) cancelEdit();
      }
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-red-600 pb-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pt-10">
        
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
               <h1 className="text-3xl md:text-4xl font-black text-red-600 uppercase italic tracking-tighter">Panel de Control</h1>
               <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Sistema Activo
               </span>
            </div>
            <Link href="/" className="text-sm font-bold text-gray-400 hover:text-white underline">Ir a la Web</Link>
          </div>
          
          <form onSubmit={handleSubmit} className={`bg-[#0f0f0f] p-6 md:p-8 rounded-2xl border ${editingId ? 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-white/5 shadow-2xl'} space-y-8 transition-all`}>
            
            {editingId && (
              <div className="bg-blue-600/20 border border-blue-500/50 text-blue-400 p-4 rounded-xl flex justify-between items-center font-bold">
                <span>Modo Edición Activado (Editando ID: {editingId})</span>
                <button type="button" onClick={cancelEdit} className="text-white bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 transition-colors text-sm">Cancelar Edición</button>
              </div>
            )}

            <div className="bg-red-600/10 border border-red-600/30 p-4 rounded-xl flex items-center gap-4 shadow-xl">
              <input type="checkbox" id="featured" checked={formData.isFeatured} onChange={e => setFormData({...formData, isFeatured: e.target.checked})} className="w-6 h-6 accent-red-600 cursor-pointer" />
              <label htmlFor="featured" className="cursor-pointer font-bold text-red-500 uppercase tracking-wide flex-1">Marcar como Partido Destacado (Banner Principal)</label>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className={editingId ? 'text-blue-500' : 'text-red-600'}>1.</span> Datos del Evento & SEO</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required value={formData.homeTeam} placeholder="Equipo Local" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
                <input required value={formData.awayTeam} placeholder="Equipo Visitante" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
              </div>
              <input required value={formData.competition} placeholder="Competición (Ej: Champions League)" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, competition: e.target.value})} />
              <input required value={formData.slug} placeholder="URL Amigable (ej: madrid-vs-city)" className="w-full bg-black border border-blue-500/30 p-4 rounded-xl focus:border-blue-500 outline-none transition-colors text-sm font-mono text-blue-300" onChange={e => setFormData({...formData, slug: e.target.value})} />
              <input value={formData.posterUrl} placeholder="URL del Poster (Imagen HD horizontal)" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors text-sm" onChange={e => setFormData({...formData, posterUrl: e.target.value})} />
            </div>

            <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className={editingId ? 'text-blue-500' : 'text-red-600'}>2.</span> Valor Añadido & Contenido</h2>
              <div className="space-y-1">
                 <label className="text-xs text-gray-500 font-bold ml-2">Descripción Corta (Para el banner de inicio)</label>
                 <input value={formData.descriptionShort} placeholder="Un párrafo corto para el banner principal..." className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors text-sm" onChange={e => setFormData({...formData, descriptionShort: e.target.value})} />
              </div>
              <div className="space-y-1">
                 <label className="text-xs text-gray-500 font-bold ml-2">Previa Larga y Detallada (Página del partido)</label>
                 <textarea required value={formData.descriptionLong} placeholder="Análisis, cómo llegan los equipos..." className="w-full bg-black border border-white/10 p-4 rounded-xl h-48 focus:border-red-600 outline-none resize-none transition-colors leading-relaxed" onChange={e => setFormData({...formData, descriptionLong: e.target.value})} />
              </div>
              
              {/* SISTEMA DE BLOQUES HTML INFINITOS */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xs text-yellow-500 font-bold uppercase flex items-center gap-2">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                     Módulos HTML Extras
                  </label>
                  <button type="button" onClick={() => setCustomBlocks([...customBlocks, ''])} className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-lg">
                     + Añadir Bloque
                  </button>
                </div>
                <div className="space-y-4">
                  {customBlocks.length === 0 && (
                     <p className="text-xs text-gray-500 italic p-4 border border-white/5 rounded-xl bg-black/50 text-center">No has añadido módulos HTML adicionales. Haz clic en el botón de arriba para agregar uno.</p>
                  )}
                  {customBlocks.map((block, i) => (
                    <div key={i} className="relative group">
                        <textarea value={block} placeholder="" className="w-full bg-[#050505] border border-yellow-500/30 p-4 rounded-xl h-32 focus:border-yellow-500 outline-none resize-y transition-colors text-xs font-mono text-yellow-500/80 shadow-inner" onChange={e => updateCustomBlock(i, e.target.value)} />
                        <button type="button" onClick={() => setCustomBlocks(customBlocks.filter((_, idx) => idx !== i))} className="absolute top-3 right-3 bg-red-500/10 text-red-500 p-2 rounded hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className={editingId ? 'text-blue-500' : 'text-red-600'}>3.</span> Calendario & Horarios</h2>
                <button type="button" onClick={() => setCurrentSchedules([...currentSchedules, { ...initialSchedule }])} className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">+ Añadir País</button>
              </div>
              <div className="space-y-3">
                {currentSchedules.map((sched, i) => (
                  <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-black p-2 rounded-xl border border-white/5">
                    <input required type="date" value={sched.date} className="bg-transparent text-gray-300 p-2 rounded-lg text-sm outline-none focus:text-white transition-colors [color-scheme:dark]" onChange={e => updateSchedule(i, 'date', e.target.value)} />
                    <input required type="time" value={sched.time} className="bg-[#111] border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-red-600 transition-colors [color-scheme:dark]" onChange={e => updateSchedule(i, 'time', e.target.value)} />
                    <input required placeholder="País (Ej: 🇦🇷 AR)" value={sched.region} className="flex-1 bg-[#111] border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-red-600 transition-colors" onChange={e => updateSchedule(i, 'region', e.target.value)} />
                    {currentSchedules.length > 1 && <button type="button" onClick={() => setCurrentSchedules(currentSchedules.filter((_, idx) => idx !== i))} className="p-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">✕</button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className={editingId ? 'text-blue-500' : 'text-red-600'}>4.</span> Canales & Monetización</h2>
                <button type="button" onClick={() => setCurrentChannels([...currentChannels, { name: `Opción ${currentChannels.length + 1} HD`, adLink: '', realLink: '' }])} className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">+ Añadir Canal</button>
              </div>
              <div className="space-y-4">
                {currentChannels.map((chan, i) => (
                  <div key={i} className="bg-[#111] p-4 rounded-xl border border-white/5 space-y-3 relative group">
                    <div className="flex justify-between items-center">
                      <input value={chan.name} className="bg-transparent font-black text-white outline-none w-full border-b border-transparent focus:border-white/20 pb-1 transition-colors" onChange={e => updateChannel(i, 'name', e.target.value)} />
                      {currentChannels.length > 1 && <button type="button" onClick={() => setCurrentChannels(currentChannels.filter((_, idx) => idx !== i))} className="text-xs text-red-500 font-bold bg-red-500/10 px-2 py-1 rounded hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100">Eliminar</button>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Link Ads (Adsterra)</label>
                        <input required placeholder="https://..." value={chan.adLink} className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs outline-none focus:border-red-500 transition-colors" onChange={e => updateChannel(i, 'adLink', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Link Destino (Video/M3U8)</label>
                        <input required placeholder="https://..." value={chan.realLink} className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs outline-none focus:border-green-500 transition-colors" onChange={e => updateChannel(i, 'realLink', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.2)]'} disabled:bg-gray-800 disabled:cursor-not-allowed py-5 rounded-2xl font-black text-xl transition-all shadow-lg active:scale-[0.98]`}>
              {isSubmitting ? 'PROCESANDO...' : editingId ? 'GUARDAR CAMBIOS' : 'PUBLICAR EN STADIOTV'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: LISTADO */}
        <div className="space-y-6 pt-10">
          <h2 className="text-xl font-black uppercase text-gray-400 tracking-tighter border-b border-white/10 pb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            Base de Datos ({matches.length})
          </h2>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {matches.length === 0 ? (
              <p className="text-gray-600 text-sm italic">Base de datos vacía.</p>
            ) : (
              matches.map(m => (
                <div key={m.id} className="bg-[#0f0f0f] p-5 rounded-2xl border border-white/5 group hover:border-white/20 transition-colors relative">
                  {m.is_featured && <div className="absolute -top-2.5 -right-2.5 bg-red-600 text-[9px] font-black px-2.5 py-1 rounded shadow-lg">DESTACADO</div>}
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <p className="text-[10px] text-red-500 uppercase font-black tracking-widest">{m.competition}</p>
                      <p className="text-lg font-black leading-tight italic">{m.home_team} <br/> <span className="text-gray-500 text-sm">vs</span> {m.away_team}</p>
                    </div>
                    
                    <div className="flex flex-col gap-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleEditClick(m)} className="bg-blue-500/10 text-blue-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                       </button>
                       <button onClick={() => handleDelete(m.id)} className="bg-red-500/10 text-red-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}