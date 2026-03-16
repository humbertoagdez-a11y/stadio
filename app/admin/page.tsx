"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMatches = async () => {
    const { data } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (data) setMatches(data);
  };

  useEffect(() => {
    setIsClient(true);
    fetchMatches();
  }, []);

  const [formData, setFormData] = useState({
    homeTeam: '', awayTeam: '', competition: '', posterUrl: '', description: ''
  });

  const initialSchedule = { time: '', region: '' };
  const initialChannel = { name: 'Opción 1 HD', adLink: '', realLink: '' };

  const [currentSchedules, setCurrentSchedules] = useState([{ ...initialSchedule }]);
  const [currentChannels, setCurrentChannels] = useState([{ ...initialChannel }]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newMatch = {
      home_team: formData.homeTeam,
      away_team: formData.awayTeam,
      competition: formData.competition,
      poster_url: formData.posterUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000&auto=format&fit=crop',
      description: formData.description || `Disfruta del encuentro entre ${formData.homeTeam} y ${formData.awayTeam} en vivo.`,
      schedules: currentSchedules,
      channels: currentChannels,
      ad_link: currentChannels[0]?.adLink || '', 
      real_link: currentChannels[0]?.realLink || ''
    };

    const { data, error } = await supabase.from('matches').insert([newMatch]).select();
    
    if (!error && data) {
      setMatches([data[0], ...matches]);
      alert("¡Evento publicado con éxito!");
      // Resetear el formulario
      (e.target as HTMLFormElement).reset();
      setFormData({ homeTeam: '', awayTeam: '', competition: '', posterUrl: '', description: '' });
      setCurrentSchedules([{ ...initialSchedule }]);
      setCurrentChannels([{ ...initialChannel }]);
    } else {
      alert("Error al publicar. Revisa la consola.");
      console.error(error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar este evento de forma permanente?")) {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (!error) {
        setMatches(matches.filter(m => m.id !== id));
      }
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-red-600">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <h1 className="text-3xl md:text-4xl font-black text-red-600 uppercase italic tracking-tighter">Panel de Control</h1>
            <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
            </span>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-[#0f0f0f] p-6 md:p-8 rounded-2xl border border-white/5 space-y-8 shadow-2xl">
            
            {/* 1. INFO BÁSICA */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-red-600">1.</span> Datos del Evento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Equipo Local" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
                <input required placeholder="Equipo Visitante" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
              </div>
              <input required placeholder="Competición (Ej: Champions League)" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors" onChange={e => setFormData({...formData, competition: e.target.value})} />
              <textarea required placeholder="Escribe una descripción atractiva para el banner principal..." className="w-full bg-black border border-white/10 p-4 rounded-xl h-28 focus:border-red-600 outline-none resize-none transition-colors" onChange={e => setFormData({...formData, description: e.target.value})} />
              <input placeholder="URL del Poster (Opcional - Imagen HD horizontal)" className="w-full bg-black border border-white/10 p-4 rounded-xl focus:border-red-600 outline-none transition-colors text-sm" onChange={e => setFormData({...formData, posterUrl: e.target.value})} />
            </div>

            {/* 2. HORARIOS */}
            <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-red-600">2.</span> Horarios</h2>
                <button type="button" onClick={() => setCurrentSchedules([...currentSchedules, { ...initialSchedule }])} className="bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">+ Añadir País</button>
              </div>
              <div className="space-y-3">
                {currentSchedules.map((sched, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input required type="time" value={sched.time} className="bg-black border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-red-600 transition-colors [color-scheme:dark]" onChange={e => updateSchedule(i, 'time', e.target.value)} />
                    <input required placeholder="País (Ej: 🇦🇷 AR)" value={sched.region} className="flex-1 bg-black border border-white/10 p-3 rounded-lg text-sm outline-none focus:border-red-600 transition-colors" onChange={e => updateSchedule(i, 'region', e.target.value)} />
                    {currentSchedules.length > 1 && <button type="button" onClick={() => setCurrentSchedules(currentSchedules.filter((_, idx) => idx !== i))} className="p-3 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">✕</button>}
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CANALES */}
            <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><span className="text-red-600">3.</span> Canales de Streaming</h2>
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
                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Link Publicidad (Adsterra)</label>
                        <input required placeholder="https://..." value={chan.adLink} className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs outline-none focus:border-red-500 transition-colors" onChange={e => updateChannel(i, 'adLink', e.target.value)} />
                      </div>
                      <div>
                         <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Link Real (Video/M3U8)</label>
                        <input required placeholder="https://..." value={chan.realLink} className="w-full bg-black border border-white/5 p-3 rounded-lg text-xs outline-none focus:border-green-500 transition-colors" onChange={e => updateChannel(i, 'realLink', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed py-5 rounded-2xl font-black text-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] active:scale-[0.98]">
              {isSubmitting ? 'PUBLICANDO...' : 'PUBLICAR EN STADIO TV'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: LISTADO */}
        <div className="space-y-6">
          <h2 className="text-xl font-black uppercase text-gray-400 tracking-tighter border-b border-white/10 pb-6">Base de Datos ({matches.length})</h2>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {matches.length === 0 ? (
              <p className="text-gray-600 text-sm italic">No hay eventos activos.</p>
            ) : (
              matches.map(m => (
                <div key={m.id} className="bg-[#0f0f0f] p-5 rounded-2xl border border-white/5 group hover:border-white/20 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <p className="text-[10px] text-red-500 uppercase font-black tracking-widest">{m.competition}</p>
                      <p className="text-lg font-black leading-tight italic">{m.home_team} <br/> <span className="text-gray-500 text-sm">vs</span> {m.away_team}</p>
                    </div>
                    <button onClick={() => handleDelete(m.id)} className="bg-red-500/10 text-red-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100">✕</button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-4">
                     {m.channels?.map((c:any, i:number) => (
                       <span key={i} className="text-[9px] border border-white/10 px-2 py-1 rounded bg-black text-gray-400 font-bold truncate max-w-[100px]">{c.name}</span>
                     ))}
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