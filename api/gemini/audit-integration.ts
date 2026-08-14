type ApiRequest = {
  method?: string;
  body?: {
    generatedImage?: unknown;
    productReferences?: unknown;
    sceneReference?: unknown;
    productIdentity?: unknown;
  };
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
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

function score(value: unknown) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'POST') return void response.status(405).json({ error: 'Method not allowed' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return void response.status(503).json({ error: 'Gemini no está configurado.' });

  const generated = typeof request.body?.generatedImage === 'string' ? toInlineData(request.body.generatedImage) : null;
  const scene = typeof request.body?.sceneReference === 'string' ? toInlineData(request.body.sceneReference) : null;
  const references = Array.isArray(request.body?.productReferences)
    ? request.body.productReferences.slice(0, 2).map((item) => typeof item === 'string' ? toInlineData(item) : null)
    : [];
  if (!generated || references.length < 1 || references.some((item) => !item)) {
    return void response.status(400).json({ error: 'Faltan imágenes válidas para auditar la integración.' });
  }
  const identity = typeof request.body?.productIdentity === 'string' ? request.body.productIdentity.slice(0, 4000) : '';
  const prompt = `You are a strict forensic QA reviewer for a generated commercial product photograph.

IMAGE ORDER:
1. The generated result to audit.
2-${references.length + 1}. Product identity references showing the exact real product.
${scene ? `${references.length + 2}. Original scene reference defining lighting, perspective and environment.` : 'There is no separate scene reference.'}

PRODUCT IDENTITY NOTES:
${identity || 'Use only visible product-reference evidence.'}

Score three independent dimensions from 0-100:
- productFidelity: geometry, proportions, base color, material, texture, markings and distinctive details.
- lightingMatch: whether the generated product inherits scene key/fill/rim light, reflected color, exposure, white balance, highlights and shadow direction.
- physicalIntegration: scale, perspective, support/contact, occlusion, depth of field, grain and absence of pasted/floating edges.

Be strict but evidence-based. A pass requires score >= 82, productFidelity >= 85, lightingMatch >= 78 and physicalIntegration >= 78. List at most five concrete visible issues. correctionPrompt must be a concise ENGLISH edit instruction that preserves correct areas and fixes only observed failures. Do not request changes unsupported by the references.

Return ONLY valid JSON with boolean passed; numeric score, productFidelity, lightingMatch, physicalIntegration; issues as an array of strings in Spanish; correctionPrompt as a string in English.`;

  try {
    const parts = [generated, ...references, ...(scene ? [scene] : []), { text: prompt }];
    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json' } }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return void response.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502).json({ error: payload?.error?.message || 'Gemini rechazó la auditoría.' });
    const text = payload?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text;
    if (!text) throw new Error('Gemini no devolvió una auditoría.');
    const audit = parseJson(text);
    const productFidelity = score(audit.productFidelity);
    const lightingMatch = score(audit.lightingMatch);
    const physicalIntegration = score(audit.physicalIntegration);
    const totalScore = score(audit.score || (productFidelity * 0.45 + lightingMatch * 0.275 + physicalIntegration * 0.275));
    const passed = totalScore >= 82 && productFidelity >= 85 && lightingMatch >= 78 && physicalIntegration >= 78;
    response.status(200).json({ audit: {
      passed,
      score: totalScore,
      productFidelity,
      lightingMatch,
      physicalIntegration,
      issues: Array.isArray(audit.issues) ? audit.issues.slice(0, 5).map(String) : [],
      correctionPrompt: String(audit.correctionPrompt || ''),
    } });
  } catch (error) {
    console.error('Integration audit failed', error);
    response.status(502).json({ error: 'No fue posible interpretar la auditoría de integración.' });
  }
}
