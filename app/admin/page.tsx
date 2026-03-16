"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

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

  const [currentSchedules, setCurrentSchedules] = useState([{ time: '20:30', region: '🇦🇷 🇵🇾' }]);
  const [currentChannels, setCurrentChannels] = useState([{ name: 'Opción 1 HD', adLink: '', realLink: '' }]);

  // Funciones para Horarios
  const addSchedule = () => setCurrentSchedules([...currentSchedules, { time: '', region: '' }]);
  const updateSchedule = (index: number, field: string, value: string) => {
    const newS = [...currentSchedules];
    newS[index] = { ...newS[index], [field]: value };
    setCurrentSchedules(newS);
  };

  // Funciones para Canales
  const addChannel = () => setCurrentChannels([...currentChannels, { name: `Opción ${currentChannels.length + 1} HD`, adLink: '', realLink: '' }]);
  const updateChannel = (index: number, field: string, value: string) => {
    const newC = [...currentChannels];
    newC[index] = { ...newC[index], [field]: value };
    setCurrentChannels(newC);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newMatch = {
      home_team: formData.homeTeam,
      away_team: formData.awayTeam,
      competition: formData.competition,
      poster_url: formData.posterUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000',
      description: formData.description,
      schedules: currentSchedules,
      channels: currentChannels,
      ad_link: currentChannels[0].adLink, // Compatibilidad
      real_link: currentChannels[0].realLink // Compatibilidad
    };

    const { data, error } = await supabase.from('matches').insert([newMatch]).select();
    if (!error) {
      setMatches([data[0], ...matches]);
      alert("¡Encuentro publicado!");
      (e.currentTarget as HTMLFormElement).reset();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Eliminar partido?")) {
      await supabase.from('matches').delete().eq('id', id);
      setMatches(matches.filter(m => m.id !== id));
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-3xl font-black text-red-600 uppercase italic">Publicar Evento</h1>
          <form onSubmit={handleSubmit} className="bg-[#111] p-6 rounded-2xl border border-white/5 space-y-6 shadow-2xl">
            <div className="grid grid-cols-2 gap-4">
              <input required placeholder="Equipo Local" className="bg-black border border-white/10 p-3 rounded-xl" onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
              <input required placeholder="Equipo Visitante" className="bg-black border border-white/10 p-3 rounded-xl" onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
            </div>
            <input required placeholder="Competición (Ej: Premier League)" className="w-full bg-black border border-white/10 p-3 rounded-xl" onChange={e => setFormData({...formData, competition: e.target.value})} />
            <textarea required placeholder="Descripción del encuentro..." className="w-full bg-black border border-white/10 p-3 rounded-xl h-24" onChange={e => setFormData({...formData, description: e.target.value})} />
            <input placeholder="URL del Poster (Imagen HD)" className="w-full bg-black border border-white/10 p-3 rounded-xl" onChange={e => setFormData({...formData, posterUrl: e.target.value})} />

            {/* SECCIÓN DE CANALES */}
            <div className="space-y-4 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-red-500 uppercase text-sm">Canales de Transmisión</h3>
                <button type="button" onClick={addChannel} className="bg-white/10 px-3 py-1 rounded-lg text-xs hover:bg-white/20">+ Agregar Canal</button>
              </div>
              {currentChannels.map((chan, i) => (
                <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-3">
                  <input value={chan.name} className="bg-transparent font-bold text-white outline-none w-full" onChange={e => updateChannel(i, 'name', e.target.value)} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input required placeholder="Link Adsterra" className="bg-black border border-red-900/30 p-2 rounded-lg text-xs" onChange={e => updateChannel(i, 'adLink', e.target.value)} />
                    <input required placeholder="Link Real (Stream)" className="bg-black border border-green-900/30 p-2 rounded-lg text-xs" onChange={e => updateChannel(i, 'realLink', e.target.value)} />
                  </div>
                </div>
              ))}
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 py-4 rounded-xl font-black text-xl transition-all shadow-lg shadow-red-600/20">PUBLICAR AHORA</button>
          </form>
        </div>

        {/* LISTADO LATERAL */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold uppercase text-gray-500">Activos</h2>
          {matches.map(m => (
            <div key={m.id} className="bg-[#111] p-4 rounded-xl border border-white/5 flex justify-between items-center group">
              <div>
                <p className="text-lg font-bold leading-tight">{m.home_team} vs {m.away_team}</p>
                <p className="text-[10px] text-red-500 uppercase font-black">{m.competition}</p>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}