const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
// The GenerateContent REST API expects protobuf enum names, not the UI labels.
const GEMINI_ASPECT_RATIO: Record<string, string> = {
  '1:1': 'ASPECT_RATIO_ONE_BY_ONE',
  '4:3': 'ASPECT_RATIO_FOUR_BY_THREE',
  '3:4': 'ASPECT_RATIO_THREE_BY_FOUR',
  '16:9': 'ASPECT_RATIO_SIXTEEN_BY_NINE',
  '9:16': 'ASPECT_RATIO_NINE_BY_SIXTEEN',
};

type ApiRequest = {
  method?: string;
  body?: { prompt?: string; aspectRatio?: string; references?: unknown };
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function toInlineData(dataUrl: string) {
  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  return { inlineData: { mimeType: match[1], data: match[2] } };
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

  const { prompt, aspectRatio, references } = request.body || {};
  if (!prompt || typeof prompt !== 'string') {
    response.status(400).json({ error: 'Falta la instrucción de generación.' });
    return;
  }
  if (!aspectRatio || !ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    response.status(400).json({ error: 'La relación de aspecto no es válida.' });
    return;
  }
  if (!Array.isArray(references) || references.length > 6) {
    response.status(400).json({ error: 'Puedes enviar hasta seis imágenes de referencia.' });
    return;
  }

  const imageParts = references.map((reference) => typeof reference === 'string' ? toInlineData(reference) : null);
  if (imageParts.some((part) => !part)) {
    response.status(400).json({ error: 'Las imágenes de referencia no son válidas.' });
    return;
  }

  try {
    const upstream = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent',
      {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [...imageParts, { text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            responseFormat: {
              image: {
                aspectRatio: GEMINI_ASPECT_RATIO[aspectRatio],
                imageSize: 'IMAGE_SIZE_TWO_K',
              },
            },
          },
        }),
      },
    );
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      response.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({
        error: payload?.error?.message || 'Gemini rechazó la generación.',
      });
      return;
    }
    const image = payload?.candidates?.[0]?.content?.parts?.find((part: { inlineData?: { data?: string } }) => part.inlineData?.data)?.inlineData;
    if (!image?.data) {
      response.status(502).json({ error: 'Gemini no devolvió una imagen.' });
      return;
    }
    response.status(200).json({ imageUrl: `data:${image.mimeType || 'image/png'};base64,${image.data}` });
  } catch (error) {
    console.error('Gemini image generation failed', error);
    response.status(502).json({ error: 'No fue posible comunicarse con Gemini.' });
  }
}
