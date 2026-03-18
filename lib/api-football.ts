export async function getMatchData(fixtureId: string) {
  // El truco de oro: next: { revalidate: 300 }
  // Esto actualiza el marcador solo 1 vez cada 5 minutos (300 segundos), 
  // sirviendo la respuesta en caché a miles de usuarios sin gastar tu límite.
  
  try {
    const res = await fetch(`https://v3.football.api-sports.io/fixtures?id=${fixtureId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': process.env.API_FOOTBALL_KEY as string,
      },
      next: { revalidate: 300 }, 
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.response[0]; 
  } catch (error) {
    console.error("Error conectando con API-Football:", error);
    return null;
  }
}