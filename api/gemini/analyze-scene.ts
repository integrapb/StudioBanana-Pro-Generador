type ApiRequest = { method?: string; body?: { reference?: unknown; productCategory?: unknown } };
type ApiResponse = { status: (code: number) => ApiResponse; json: (payload: unknown) => void; setHeader: (name: string, value: string) => void };

function toInlineData(dataUrl: string) {
  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
}

function parseJson(text: string) {
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return void response.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return void response.status(503).json({ error: 'Gemini no está configurado.' });
  const reference = typeof request.body?.reference === 'string' ? toInlineData(request.body.reference) : null;
  if (!reference) return void response.status(400).json({ error: 'La referencia de escena no es válida.' });
  const category = typeof request.body?.productCategory === 'string' ? request.body.productCategory : 'product';
  const prompt = `Analyze this commercial photography reference as a SCENE only. A separate real ${category} will be implanted later. Do not describe or preserve the product currently visible in the scene. Return ONLY valid JSON in Spanish with string fields lighting, environment, camera, colorPalette, aesthetic, subject, productPlacement, integrationRules, scenePrompt and numeric confidence (0-100). productPlacement must explain where and how the real ${category} should appear. integrationRules must cover scale, perspective, contact, occlusion, inherited light and physically correct shadows. If the product is wearable, include believable contact with body, hair or clothing. scenePrompt must be a concise English photographic direction describing only the scene, camera, light, subject and placement — never the identity of the replacement product.`;
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [reference, { text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return void response.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: payload?.error?.message || 'Gemini rechazó el análisis de escena.' });
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
    if (!text) throw new Error('Gemini no devolvió el análisis de escena.');
    const scene = parseJson(text);
    response.status(200).json({ scene: {
      lighting: String(scene.lighting || ''), environment: String(scene.environment || ''), camera: String(scene.camera || ''),
      colorPalette: String(scene.colorPalette || ''), aesthetic: String(scene.aesthetic || ''), subject: String(scene.subject || ''),
      productPlacement: String(scene.productPlacement || ''), integrationRules: String(scene.integrationRules || ''),
      scenePrompt: String(scene.scenePrompt || ''), confidence: Math.max(0, Math.min(100, Number(scene.confidence) || 0)),
    } });
  } catch (error) {
    console.error('Scene analysis failed', error);
    response.status(502).json({ error: 'No fue posible interpretar la escena.' });
  }
}
