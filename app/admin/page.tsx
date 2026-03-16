"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPanel() {
  const [matches, setMatches] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) setMatches(data);
    if (error) console.error("Error al cargar:", error);
  };

  useEffect(() => {
    setIsClient(true);
    fetchMatches();
  }, []);

  const [formData, setFormData] = useState({
    homeTeam: '',
    awayTeam: '',
    competition: '',
    adLink: '',
    realLink: '',
    posterUrl: '',
    description: 'Disfruta de este gran encuentro en vivo y en máxima calidad.'
  });

  const [currentSchedules, setCurrentSchedules] = useState([{ time: '20:30', region: '🇦🇷 🇵🇾' }]);

  const addSchedule = () => setCurrentSchedules([...currentSchedules, { time: '', region: '' }]);
  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...currentSchedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setCurrentSchedules(newSchedules);
  };
  const removeSchedule = (index: number) => setCurrentSchedules(currentSchedules.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newMatch = {
      home_team: formData.homeTeam,
      away_team: formData.awayTeam,
      competition: formData.competition,
      ad_link: formData.adLink,
      real_link: formData.realLink,
      poster_url: formData.posterUrl || 'https://images.unsplash.com/photo-1518605368461-1ee7116cbce5?q=80&w=1000&auto=format&fit=crop',
      description: formData.description,
      schedules: currentSchedules
    };
    
    const { data, error } = await supabase
      .from('matches')
      .insert([newMatch])
      .select();

    if (!error && data) {
      setMatches([data[0], ...matches]);
      setCurrentSchedules([{ time: '20:30', region: '🇦🇷 🇵🇾' }]);
      // Aquí está la corrección de TypeScript
      (e.currentTarget as HTMLFormElement).reset();
      alert("¡Partido publicado con éxito en la nube!");
    } else {
      alert("Error al publicar el partido");
      console.error(error);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar este partido de la plataforma?");
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', id);

    if (!error) {
      setMatches(matches.filter(match => match.id !== id));
    }
  };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <section>
          <h1 className="text-3xl font-bold mb-8 tracking-tight">Stadio <span className="text-red-600">Admin</span></h1>
          <form onSubmit={handleSubmit} className="bg-[#111] border border-gray-800 p-6 rounded-xl space-y-6 shadow-2xl">
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Local</label>
                <input required type="text" placeholder="Ej. LA Galaxy" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-600"
                  onChange={e => setFormData({...formData, homeTeam: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Visitante</label>
                <input required type="text" placeholder="Ej. Mount Pleasant" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-600"
                  onChange={e => setFormData({...formData, awayTeam: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Competición</label>
                <input required type="text" placeholder="Ej. Concachampions" className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-600"
                  onChange={e => setFormData({...formData, competition: e.target.value})} />
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-white">Horarios</label>
                <button type="button" onClick={addSchedule} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-white transition-colors">
                  + Agregar horario
                </button>
              </div>
              <div className="space-y-3">
                {currentSchedules.map((sched, index) => (
                  <div key={index} className="flex gap-4 items-center">
                    <input required type="time" value={sched.time} className="bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-red-600 [color-scheme:dark]"
                      onChange={e => updateSchedule(index, 'time', e.target.value)} />
                    <input required type="text" placeholder="Ej. 🇦🇷 🇵🇾" value={sched.region} className="flex-1 bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-red-600"
                      onChange={e => updateSchedule(index, 'region', e.target.value)} />
                    {currentSchedules.length > 1 && (
                      <button type="button" onClick={() => removeSchedule(index)} className="text-red-500 hover:text-red-400 px-2 font-bold">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 p-4 border border-red-900/50 bg-red-900/10 rounded-lg">
              <div>
                <label className="block text-sm font-bold text-red-400 mb-2">1. Adsterra (Publicidad)</label>
                <input required type="url" placeholder="https://adsterra..." className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-600"
                  onChange={e => setFormData({...formData, adLink: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-green-400 mb-2">2. Enlace Real</label>
                <input required type="url" placeholder="https://stream..." className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-600"
                  onChange={e => setFormData({...formData, realLink: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">URL del Póster (Opcional, imagen HD)</label>
                <input type="url" placeholder="https://..." className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-red-600"
                  onChange={e => setFormData({...formData, posterUrl: e.target.value})} />
              </div>
            </div>

            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-colors text-lg">
              Publicar Partido
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">En la Nube ({matches.length})</h2>
          <div className="space-y-3">
            {matches.map((match) => (
              <div key={match.id} className="bg-[#111] border border-gray-800 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{match.home_team} vs {match.away_team} <span className="text-xs text-red-500 border border-red-500/30 bg-red-500/10 px-2 py-1 rounded ml-2">{match.competition}</span></h3>
                  <div className="text-sm text-gray-400 mt-1 space-x-3">
                    {match.schedules?.map((s: any, i: number) => (
                      <span key={i}>⏱ {s.time} {s.region}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleDelete(match.id)} className="bg-red-900/30 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                  Eliminar
                </button>
              </div>
            ))}
            {matches.length === 0 && <p className="text-gray-500">No hay partidos en la base de datos.</p>}
          </div>
        </section>

      </div>
    </div>
  );
}