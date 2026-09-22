const MODEL_CONFIG = {
  'openai/gpt-image-2.5-sunburst': { maxReferences: 16, quality: 'high', background: 'opaque' },
  'openai/gpt-image-2.5-flare': { maxReferences: 16, quality: 'high', background: 'opaque' },
  'bytedance-seed/seedream-5-0-pro': { maxReferences: 14, resolution: '2K' },
  'openai/gpt-image-2': { maxReferences: 16, quality: 'high', background: 'opaque' },
  'x-ai/grok-imagine-image-2.0': { maxReferences: 3, resolution: '2K', quality: 'medium' },
  'sourceful/riverflow-v2.5-pro': { maxReferences: 10, resolution: '4K', background: 'opaque' },
} as const;

type ApiRequest = {
  method?: string;
  body?: {
    model?: string;
    prompt?: string;
    aspectRatio?: string;
    references?: unknown;
  };
};
type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    response.status(503).json({ error: 'OpenRouter no está configurado en este despliegue.' });
    return;
  }

  const { model, prompt, aspectRatio, references } = request.body || {};
  if (!model || !(model in MODEL_CONFIG)) {
    response.status(400).json({ error: 'El modelo seleccionado no está permitido.' });
    return;
  }
  if (!prompt || typeof prompt !== 'string') {
    response.status(400).json({ error: 'Falta la instrucción de generación.' });
    return;
  }
  if (!aspectRatio || !ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
    response.status(400).json({ error: 'La relación de aspecto no es válida.' });
    return;
  }
  if (!Array.isArray(references) || references.some((reference) => typeof reference !== 'string' || !reference.startsWith('data:image/'))) {
    response.status(400).json({ error: 'Las imágenes de referencia no son válidas.' });
    return;
  }
  const modelConfig = MODEL_CONFIG[model as keyof typeof MODEL_CONFIG];
  if (references.length > modelConfig.maxReferences) {
    response.status(400).json({ error: `Este modelo admite hasta ${modelConfig.maxReferences} imágenes de referencia.` });
    return;
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://studio-banana-pro-generador.vercel.app',
        'X-OpenRouter-Title': 'StudioBanana Pro',
      },
      body: JSON.stringify({
        model,
        prompt,
        aspect_ratio: aspectRatio,
        n: 1,
        input_references: references.map((url) => ({ type: 'image_url', image_url: { url } })),
        ...('resolution' in modelConfig ? { resolution: modelConfig.resolution } : {}),
        ...('quality' in modelConfig ? { quality: modelConfig.quality } : {}),
        ...('background' in modelConfig ? { background: modelConfig.background } : {}),
      }),
    });

    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = payload?.error?.message || payload?.message || 'OpenRouter rechazó la generación.';
      response.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: message });
      return;
    }

    const image = payload?.data?.[0];
    if (!image?.b64_json) {
      response.status(502).json({ error: 'OpenRouter no devolvió una imagen.' });
      return;
    }

    response.status(200).json({
      imageUrl: `data:${image.media_type || 'image/png'};base64,${image.b64_json}`,
      model,
      cost: payload?.usage?.cost ?? null,
    });
  } catch (error) {
    console.error('OpenRouter image generation failed', error);
    response.status(502).json({ error: 'No fue posible comunicarse con OpenRouter.' });
  }
}
