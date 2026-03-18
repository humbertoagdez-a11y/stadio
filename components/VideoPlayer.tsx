"use client"; // CRUCIAL: Necesario para manejar el estado y los clics del usuario
import { useState } from 'react';

// Este componente maneja la lógica de: Clic -> Abre Publicidad -> Muestra Video
export default function VideoPlayer({ highlights }: { highlights: any[] }) {
  // Estado para guardar el video que se está reproduciendo actualmente
  const [activeUrl, setActiveUrl] = useState<string | null>(null);

  const handlePlay = (adLink: string, videoUrl: string) => {
    // 1. MOTOR DE MONETIZACIÓN: Abrimos tu publicidad (Adsterra/Smartlink)
    // Se abre en otra pestaña para que tú ganes dinero ANTES de mostrar el video.
    if (adLink) {
      window.open(adLink, '_blank');
    }

    // 2. CONVERSIÓN DE YOUTUBE: Los links normales no funcionan en reproductores integrados.
    // Esta lógica convierte "watch?v=..." en "/embed/..." automáticamente.
    let embedUrl = videoUrl;
    if (videoUrl.includes("youtube.com/watch?v=")) {
      embedUrl = videoUrl.replace("watch?v=", "embed/");
    } else if (videoUrl.includes("youtu.be/")) {
      embedUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
    }
    // Nota: Si el link es un MP4 directo u otro iframe, lo dejamos pasar igual.

    // 3. CARGAMOS EL VIDEO en el reproductor de la app
    setActiveUrl(embedUrl);
  };

  // Si no hay videos subidos en el panel, no mostramos nada
  if (!highlights || highlights.length === 0) {
    return (
      <div className="text-center py-12 bg-[#0f0f0f] rounded-3xl border border-dashed border-white/5 relative overflow-hidden">
        {/* Efecto de brillo de fondo */}
        <div className="absolute inset-0 bg-red-600/5 blur-[50px] rounded-full" />
        <p className="text-gray-600 text-sm italic relative z-10">No hay resúmenes disponibles para este partido aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* EL REPRODUCTOR GIGANTE (Solo aparece cuando activan un video) */}
      {activeUrl && (
        <div className="aspect-video w-full bg-black rounded-[32px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-700 relative z-10 shadow-[0_0_60px_rgba(168,85,247,0.1)]">
          <iframe
            src={`${activeUrl}?autoplay=1`} // Agregamos autoplay para mejor experiencia
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            title="StadioTV Video Player"
          />
        </div>
      )}

      {/* LISTADO DE BOTONES DE VIDEOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlights.map((h, i) => {
          // Lógica para saber cuál video es el que se está reproduciendo
          // (Limpiamos el link de YT para comparar solo el ID)
          const videoId = h.videoUrl.includes('v=') ? h.videoUrl.split('v=')[1]?.split('&')[0] : '';
          const isPlaying = activeUrl?.includes(videoId) && videoId !== '';

          return (
            <button
              key={i}
              onClick={() => handlePlay(h.adLink, h.videoUrl)}
              className={`flex items-center gap-5 p-6 rounded-[28px] border transition-all text-left group relative overflow-hidden ${
                isPlaying
                  ? 'bg-purple-600/20 border-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
                  : 'bg-[#0f0f0f] border-white/5 hover:border-purple-600/40 hover:-translate-y-1'
              }`}
            >
              {/* Efecto de brillo de fondo al pasar el mouse (hover) */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/5 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Ícono de Play o Pausa según el estado */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all relative z-10 ${
                isPlaying ? 'bg-purple-600 shadow-purple-600/30' : 'bg-purple-600/10 group-hover:bg-purple-600'
              }`}>
                {isPlaying ? (
                    // Ícono de Pausa (reproduciendo)
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                ) : (
                    // Ícono de Play (normal)
                    <svg className={`w-6 h-6 ml-1 transition-colors ${isPlaying ? 'text-white' : 'text-purple-500 group-hover:text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
              </div>

              {/* Textos del Video */}
              <div className="relative z-10 flex-1">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-1.5">
                  {isPlaying ? 'Reproduciendo Ahora' : `Opción ${i + 1}`}
                </p>
                <h4 className="font-bold text-white leading-tight text-base group-hover:text-purple-100 transition-colors">
                  {h.title || 'Resumen del Partido'}
                </h4>
              </div>

              {/* Flechita decorativa del hover */}
              <svg className="w-5 h-5 text-gray-700 group-hover:text-purple-300 transition-all transform group-hover:translate-x-1 relative z-10 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}