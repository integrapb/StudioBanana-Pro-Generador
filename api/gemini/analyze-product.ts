type ApiRequest = {
  method?: string;
  body?: { references?: unknown; name?: unknown };
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

function sanitizeAudit(audit: unknown) {
  if (!Array.isArray(audit)) return [];
  return audit.slice(0, 12).map((item) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const status = record.status === 'visible' || record.status === 'estimated' || record.status === 'not_visible'
      ? record.status
      : 'not_visible';
    return {
      label: String(record.label || 'Observación'),
      status,
      observation: String(record.observation || 'No verificable en las fotografías.'),
    };
  });
}

function sanitizeImageViews(views: unknown, imageCount: number) {
  const allowed = new Set(['front', 'back', 'left', 'right', 'three-quarter', 'top', 'bottom', 'detail', 'unknown']);
  if (!Array.isArray(views)) return [];
  return views.slice(0, imageCount).map((item, fallbackIndex) => {
    const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
    const rawIndex = Number(record.index);
    const index = Number.isInteger(rawIndex) && rawIndex >= 0 && rawIndex < imageCount ? rawIndex : fallbackIndex;
    const rawView = String(record.view || 'unknown');
    return {
      index,
      view: allowed.has(rawView) ? rawView : 'unknown',
      description: String(record.description || 'Vista del producto'),
      confidence: Math.max(0, Math.min(100, Number(record.confidence) || 0)),
    };
  });
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
  if (!Array.isArray(references) || references.length < 1 || references.length > 3) {
    response.status(400).json({ error: 'Sube entre una y tres fotografías para crear el perfil con IA.' });
    return;
  }
  const imageParts = references.map((value) => typeof value === 'string' ? toInlineData(value) : null);
  if (imageParts.some((part) => !part)) {
    response.status(400).json({ error: 'Las imágenes no son válidas.' });
    return;
  }

  const suppliedName = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
  const prompt = `You are a forensic product identity analyst for high-end commercial photography. Analyze the supplied product photographs as evidence of ONE real physical product. The user's product name is "${suppliedName || 'not supplied'}". Never invent dimensions, unseen sides, brand spelling, materials or colors when evidence is insufficient.

For each input image, create one imageViews entry using its zero-based input index. Classify view as exactly one of: front, back, left, right, three-quarter, top, bottom, detail, unknown. Describe visible geometry and assign confidence 0-100.

Build identity evidence in three levels: visible facts, cautious estimates, and not visible. Capture silhouette, proportions, distinctive geometry, construction, surface, reflectivity, transparency, exact visible colors, logos/text positions, seams, edges, closures, hardware, wear and imperfections. Explicitly separate intrinsic physical properties (base color/albedo, geometry, material, roughness, transparency, texture and markings) from temporary appearance caused by the source photograph (highlights, reflections, cast shadows, exposure, white balance and background color contamination). The latter must not be copied into a new scene.

First identify the product category. If it is a hat or sombrero, perform this forensic audit IN THIS ORDER: 1) type and crown/hat block silhouette, 2) crown shape and visible creases, 3) brim width/curvature/edge finish, 4) material and finish, 5) color family and estimated hex colors, 6) hatband and hardware, 7) interior and markings, 8) wear and age, 9) apparent scale and size. For every point document only what you see. Never state inches, size, interior details, branding or material as fact unless visible. Mark unavailable information as not_visible.

For other categories, create a similarly practical audit focused on features that distinguish this exact product from a similar substitute.

Return ONLY valid JSON in Spanish with string fields name, category, materials, colors, protectedDetails, notes, detectedDetails, unknownDetails, intrinsicProperties, sourceLightingToIgnore; numeric confidence; audit array with label, status, observation; imageViews array with index, view, description, confidence; and productBlock as a dense 100-180 word ENGLISH identity lock. status must be visible, estimated or not_visible. intrinsicProperties must describe only illumination-independent evidence. sourceLightingToIgnore must identify highlights, reflections, shadows and color casts baked into the source photos. productBlock must contain only product identity, lead with the most distinctive geometry, distinguish verified facts from unknowns, preserve branding positions and wear, and contain no scene, mood, camera or lighting instructions.`;
  try {
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
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
      category: String(profile.category || 'Producto'),
      materials: String(profile.materials || ''),
      colors: String(profile.colors || ''),
      protectedDetails: String(profile.protectedDetails || ''),
      notes: String(profile.notes || ''),
      detectedDetails: String(profile.detectedDetails || ''),
      unknownDetails: String(profile.unknownDetails || ''),
      confidence: Math.max(0, Math.min(100, Number(profile.confidence) || 0)),
      audit: sanitizeAudit(profile.audit),
      productBlock: String(profile.productBlock || profile.detectedDetails || ''),
      imageViews: sanitizeImageViews(profile.imageViews, references.length),
      intrinsicProperties: String(profile.intrinsicProperties || profile.productBlock || ''),
      sourceLightingToIgnore: String(profile.sourceLightingToIgnore || 'Ignore source-photo highlights, reflections, shadows, exposure and background color casts.'),
    } });
  } catch (error) {
    console.error('Product profile analysis failed', error);
    response.status(502).json({ error: 'No fue posible interpretar el perfil del producto.' });
  }
}
