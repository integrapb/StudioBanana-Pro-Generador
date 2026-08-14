import type { ImageFile } from '../types';
import type { AnalyzedConcept } from './geminiService';
import { buildProductPrompt } from './openRouterService';

export const GEMINI_IMAGE_MODEL = {
  id: 'gemini-3.1-flash-image',
  label: 'Gemini 3.1 Flash Image',
  description: 'Generación rápida y consistente con referencias visuales',
} as const;

export class GeminiImageService {
  async generateProductImage(
    productImages: ImageFile[],
    referenceImage: ImageFile | null,
    userPrompt: string,
    variationIndex = 0,
    analyzedConcept?: AnalyzedConcept,
    shotOverride?: string,
    aspectRatio = '1:1',
    promptIsCompiled = false,
  ): Promise<string> {
    const prompt = promptIsCompiled ? userPrompt : buildProductPrompt(
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
    const references = [...orderedProducts, ...(referenceImage ? [referenceImage] : [])]
      .slice(0, 6)
      .map((image) => image.preview);

    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio, references }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Gemini no pudo generar la imagen.');
    }
    if (!result.imageUrl) {
      throw new Error('Gemini no devolvió una imagen válida.');
    }
    return result.imageUrl;
  }
}
