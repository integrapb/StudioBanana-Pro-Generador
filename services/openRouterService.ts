import type { ImageFile } from '../types';
import type { AnalyzedConcept } from './geminiService';

export const OPENROUTER_IMAGE_MODELS = [
  {
    id: 'bytedance-seed/seedream-5-0-pro',
    label: 'Seedream 5 Pro',
    description: 'Alta resolución y hasta 14 referencias',
  },
  {
    id: 'openai/gpt-image-2',
    label: 'GPT Image 2',
    description: 'Máxima fidelidad de producto y detalles',
  },
  {
    id: 'x-ai/grok-imagine-image-2.0',
    label: 'Grok Imagine 2',
    description: 'Variaciones creativas con hasta 3 referencias',
  },
] as const;

export type OpenRouterImageModel = (typeof OPENROUTER_IMAGE_MODELS)[number]['id'];

function buildProductPrompt(
  productImages: ImageFile[],
  referenceImage: ImageFile | null,
  userPrompt: string,
  variationIndex: number,
  analyzedConcept?: AnalyzedConcept,
  shotOverride?: string,
): string {
  const layers = analyzedConcept?.promptLayers;

  if (productImages.length > 0 && analyzedConcept && layers) {
    const variationSuffix = variationIndex > 0
      ? ` Variation ${variationIndex + 1}: ${analyzedConcept.variationDirections[variationIndex] || 'subtle lighting shift'}.`
      : '';
    const shotContext = shotOverride ? `Shot type: ${shotOverride}.` : '';

    return `You are generating a high-end commercial product photograph using ${productImages.length} product reference image(s)${referenceImage ? ' and 1 style reference image' : ''}.

REFERENCE ROLES:
- Product reference images: reproduce the exact product with 100% accuracy: shape, colors, materials, logos, proportions, texture and hardware.
${referenceImage ? '- Last reference image: copy only lighting direction, color temperature, palette, environment, mood and photographic aesthetic. Do not copy people or subjects.' : ''}

PRODUCT IDENTITY (NON-NEGOTIABLE):
${layers.productDNA}

PRODUCT TYPE: ${layers.productCategory}
PRODUCT PLACEMENT: ${layers.productPlacement}
SCENE & ENVIRONMENT: ${layers.environmentContext}
LIGHTING: ${layers.lightingPhysics}
CAMERA & OPTICS: ${layers.cameraOptics}
COLOR GRADE & AESTHETIC: ${layers.aestheticGrade}
${shotContext}
${userPrompt ? `ADDITIONAL DIRECTION: ${userPrompt}` : ''}
${variationSuffix}

ABSOLUTE FIDELITY CONSTRAINTS:
- Preserve all product text, branding and physical details without simplification.
- The output must be a real, high-quality commercial photograph, never an illustration or 3D render.`;
  }

  if (productImages.length > 0) {
    return `Generate a high-quality commercial product photograph. The supplied reference image(s) show the exact product that must appear in the final image. Reproduce its shape, colors, materials, logos, text and proportions with 100% accuracy. Do not alter or simplify any product details. ${shotOverride ? `Shot type: ${shotOverride}.` : 'Hero shot.'} ${referenceImage ? 'Use the final reference image only for lighting, color palette, atmosphere and environment; do not copy its people or subjects.' : ''} Style: ${userPrompt || 'Clean studio background, professional luxury commercial lighting, photorealistic.'}. The output must look like a real professional photograph.`;
  }

  return `Generate a high-quality commercial product photograph. ${shotOverride ? `Shot type: ${shotOverride}.` : ''} Style: ${userPrompt || 'Commercial luxury, professional studio lighting, photorealistic.'}.`;
}

export class OpenRouterService {
  async generateProductImage(
    model: OpenRouterImageModel,
    productImages: ImageFile[],
    referenceImage: ImageFile | null,
    userPrompt: string,
    variationIndex = 0,
    analyzedConcept?: AnalyzedConcept,
    shotOverride?: string,
    aspectRatio = '1:1',
  ): Promise<string> {
    const prompt = buildProductPrompt(
      productImages,
      referenceImage,
      userPrompt,
      variationIndex,
      analyzedConcept,
      shotOverride,
    );

    const bestProductIndex = analyzedConcept?.bestProductImageIndex;
    const orderedProducts = bestProductIndex !== undefined && productImages[bestProductIndex]
      ? [productImages[bestProductIndex], ...productImages.filter((_, index) => index !== bestProductIndex)]
      : productImages;
    const maxReferences = model === 'x-ai/grok-imagine-image-2.0' ? 3 : 6;
    const productReferenceLimit = referenceImage ? maxReferences - 1 : maxReferences;
    const references = [
      ...orderedProducts.slice(0, productReferenceLimit),
      ...(referenceImage ? [referenceImage] : []),
    ].map((image) => image.preview);
    const response = await fetch('/api/openrouter/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, aspectRatio, references }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'OpenRouter no pudo generar la imagen.');
    }
    if (!result.imageUrl) {
      throw new Error('OpenRouter no devolvió una imagen válida.');
    }
    return result.imageUrl;
  }
}
