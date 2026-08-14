type ApiRequest = {
  method?: string;
  body?: { references?: unknown };
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function toInlineData(dataUrl: string) {
  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
}

function parseJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned);
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'Gemini no está configurado en este despliegue.' });
    return;
  }
  const references = request.body?.references;
  if (!Array.isArray(references) || references.length < 2 || references.length > 3) {
    response.status(400).json({ error: 'Sube dos o tres fotografías para crear el perfil con IA.' });
    return;
  }
  const imageParts = references.map((value) => typeof value === 'string' ? toInlineData(value) : null);
  if (imageParts.some((part) => !part)) {
    response.status(400).json({ error: 'Las imágenes no son válidas.' });
    return;
  }

  const prompt = `You are a cautious commercial product analyst. Analyze only what is visibly supported by the supplied 2-3 product photographs. Do not invent dimensions, unseen sides, exact brand spelling, materials, or colors when they cannot be confirmed. Return ONLY valid JSON with these string fields: name, materials, colors, protectedDetails, notes, detectedDetails, unknownDetails, and one numeric field confidence (0-100). Write values in Spanish. Use concise phrases. In unknownDetails explicitly list what needs another photo or user confirmation. protectedDetails must identify visual details that should not be altered in later image generation.`;
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [...imageParts, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      response.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: payload?.error?.message || 'Gemini rechazó el análisis.' });
      return;
    }
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
    if (!text) throw new Error('Gemini no devolvió un perfil.');
    const profile = parseJson(text);
    response.status(200).json({ profile: {
      name: String(profile.name || 'Producto sin identificar'),
      materials: String(profile.materials || ''),
      colors: String(profile.colors || ''),
      protectedDetails: String(profile.protectedDetails || ''),
      notes: String(profile.notes || ''),
      detectedDetails: String(profile.detectedDetails || ''),
      unknownDetails: String(profile.unknownDetails || ''),
      confidence: Math.max(0, Math.min(100, Number(profile.confidence) || 0)),
    } });
  } catch (error) {
    console.error('Product profile analysis failed', error);
    response.status(502).json({ error: 'No fue posible interpretar el perfil del producto.' });
  }
}
