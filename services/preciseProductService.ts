import type { ImageFile, PreciseProductData, PreciseProductImage, ProductAngle, ProductPassport } from '../types';

const ANGLE_NAMES: Record<ProductAngle, string> = {
  front: 'front view',
  right: 'right side view',
  back: 'rear view',
  left: 'left side view',
  'three-quarter': 'three-quarter 45 degree view',
  detail: 'macro detail view',
};

/** Keeps the target angle first while preserving every supplied product identity reference. */
export function selectPreciseProductReferences(
  images: PreciseProductImage[],
  targetAngle: ProductAngle,
  limit: number,
): ImageFile[] {
  const preferred = images.filter((image) => image.angle === targetAngle);
  const supporting = images.filter((image) => image.angle !== targetAngle);
  return [...preferred, ...supporting].slice(0, limit);
}

export function buildPreciseProductPrompt(data: PreciseProductData): string {
  const passport = data.passport;
  const targetAngle = ANGLE_NAMES[data.targetAngle];
  const imageManifest = data.images
    .map((image, index) => `- Product reference ${index + 1}: ${ANGLE_NAMES[image.angle]}.`)
    .join('\n');

  return `PRODUCT PRECISE BETA — PRODUCT IDENTITY IS THE HIGHEST PRIORITY.

The supplied product references are an identity pack, not loose inspiration. Recreate one single, physically consistent product. The first product reference is the preferred ${targetAngle} for this scene. Never invent a different product or merge conflicting details.

REFERENCE MANIFEST:
${imageManifest}
${data.sceneReference.length ? '- The final reference is a SCENE reference only: copy its composition, lighting, camera mood and environment, never its product, text, logo or subject.' : ''}

PRODUCT PASSPORT (NON-NEGOTIABLE):
- Product name: ${passport.name || 'Not specified'}.
- Real dimensions/proportions: ${passport.dimensions || 'Preserve proportions from the product references exactly.'}
- Materials and texture: ${passport.materials || 'Match materials and surface texture exactly from the references.'}
- Exact colors: ${passport.colors || 'Match the original product colors exactly; do not recolor.'}
- Protected details: ${passport.protectedDetails || 'All logos, typography, seams, closures, buttons, hardware and labels.'}
- Additional identity notes: ${passport.notes || 'None.'}

ABSOLUTE PRODUCT RULES:
- Preserve silhouette, anatomy, proportions, thickness, edges, construction, texture, logos and readable text.
- Do not add, remove, simplify, mirror or distort any physical feature.
- Keep branding and labels in their original position and spelling.
- This is a real commercial product photograph, not an illustration, CGI render or a similar-looking substitute.
- Requested camera view: ${targetAngle}.

SCENE DIRECTION: ${data.prompt || 'Create a premium, photorealistic commercial product photograph with natural contact shadows and physically believable light.'}`;
}

export type AiProductProfile = Pick<ProductPassport, 'name' | 'materials' | 'colors' | 'protectedDetails' | 'notes' | 'detectedDetails' | 'unknownDetails' | 'confidence' | 'category' | 'audit'>;

export async function analyzePreciseProduct(images: PreciseProductImage[]): Promise<AiProductProfile> {
  const response = await fetch('/api/gemini/analyze-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ references: images.slice(0, 3).map((image) => image.preview) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.profile) {
    throw new Error(result.error || 'No fue posible analizar el producto.');
  }
  return result.profile as AiProductProfile;
}
