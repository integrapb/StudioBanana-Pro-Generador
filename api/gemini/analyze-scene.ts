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
  const prompt = `You are a forensic commercial photography reverse-engineer. Analyze this image as a SCENE reference only. A separate real ${category} will replace or enter the scene later. Do not preserve the identity of any competing product visible here.

Document: shot type and framing; camera height relative to subject/product; focal length and perspective; depth of field; aspect/composition; light source, direction, hardness, temperature and shadow length; how the product should cast shadows on face/body/surface; time of day; dominant palette and grade; environment and material surfaces; subject pose, expression and gaze; wardrobe; props and their wear; grain, vignette, halation and sharpening; any existing product, its angle and whether it must be replaced; the exact product view required from front, back, left, right, three-quarter, top, bottom, detail or unknown.

Separate what should be copied from what must be ignored. productPlacement must state where and how the real ${category} appears. integrationRules must enforce scale, perspective, contact, occlusion, inherited light and physical shadows. For wearables include contact with body, hair and clothing.

Return ONLY valid JSON in Spanish with string fields composition, lighting, environment, camera, colorPalette, aesthetic, subject, productPlacement, integrationRules, scenePrompt, framing, cameraHeight, focalLength, depthOfField, timeOfDay, shadowBehavior, wardrobe, props, postProcessing, originalProduct, copyElements, ignoreElements; desiredProductView as exactly front, back, left, right, three-quarter, top, bottom, detail or unknown; and numeric confidence. scenePrompt must be concise ENGLISH photographic direction describing scene, subject, camera and light only, never the replacement product identity.`;
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
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
      composition: String(scene.composition || ''),
      lighting: String(scene.lighting || ''), environment: String(scene.environment || ''), camera: String(scene.camera || ''),
      colorPalette: String(scene.colorPalette || ''), aesthetic: String(scene.aesthetic || ''), subject: String(scene.subject || ''),
      productPlacement: String(scene.productPlacement || ''), integrationRules: String(scene.integrationRules || ''),
      scenePrompt: String(scene.scenePrompt || ''), confidence: Math.max(0, Math.min(100, Number(scene.confidence) || 0)),
      framing: String(scene.framing || ''), cameraHeight: String(scene.cameraHeight || ''), focalLength: String(scene.focalLength || ''),
      depthOfField: String(scene.depthOfField || ''), timeOfDay: String(scene.timeOfDay || ''), shadowBehavior: String(scene.shadowBehavior || ''),
      wardrobe: String(scene.wardrobe || ''), props: String(scene.props || ''), postProcessing: String(scene.postProcessing || ''),
      originalProduct: String(scene.originalProduct || ''),
      desiredProductView: ['front', 'back', 'left', 'right', 'three-quarter', 'top', 'bottom', 'detail', 'unknown'].includes(scene.desiredProductView) ? scene.desiredProductView : 'unknown',
      copyElements: String(scene.copyElements || ''), ignoreElements: String(scene.ignoreElements || ''),
    } });
  } catch (error) {
    console.error('Scene analysis failed', error);
    response.status(502).json({ error: 'No fue posible interpretar la escena.' });
  }
}
