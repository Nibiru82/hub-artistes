// On importe les dépendances
import { kv } from '@vercel/kv';
import { Ratelimit } from '@vercel/ratelimit';

// Configuration du limiteur de débit : 55 requêtes GLOBALES par minute
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(55, '60 s'),
  analytics: true,
});

export default async function handler(request, response) {
  // On utilise un identifiant fixe pour une limite globale
  const { success } = await ratelimit.limit('global_api_limit');

  if (!success) {
    return response.status(429).json({ error: 'La limite globale de requêtes a été atteinte. Veuillez réessayer dans une minute.' });
  }

  // Le reste du code est identique.
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!request.body) {
      return response.status(400).json({ error: 'Request body is missing' });
    }
    
    const { prompt } = request.body;

    if (!prompt) {
      return response.status(400).json({ error: 'Prompt is missing from request body' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return response.status(500).json({ error: 'API Key is not configured on the server' });
    }

    // --- LIGNE CORRIGÉE AVEC TON "CODE D'OR" ---
    // J'ai bien remis la version qui fonctionne pour toi.
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
    });

    const responseData = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return response.status(geminiResponse.status).json({ error: `Gemini API Error: ${responseData.error?.message || 'Unknown error'}` });
    }
    
    response.status(200).json(responseData);

  } catch (error) {
    console.error('Proxy Error:', error);
    response.status(500).json({ error: 'An internal server error occurred.' });
  }
}