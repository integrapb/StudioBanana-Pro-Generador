import type { ImageFile, ProductProfile, SceneBlueprint } from '../types';
import type { AnalyzedConcept } from './geminiService';

export async function analyzeStoredProduct(images: ImageFile[], name: string): Promise<ProductProfile> {
  const response = await fetch('/api/gemini/analyze-product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, references: images.slice(0, 3).map((image) => image.preview) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.profile) throw new Error(result.error || 'No fue posible analizar el producto.');
  return {
    ...result.profile,
    status: 'ready',
    version: 1,
    analyzedAt: Date.now(),
  } as ProductProfile;
}

export async function analyzeSceneReference(reference: ImageFile, productProfile?: ProductProfile): Promise<SceneBlueprint> {
  const response = await fetch('/api/gemini/analyze-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: reference.preview,
      productCategory: productProfile?.category || 'product',
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.scene) throw new Error(result.error || 'No fue posible analizar la escena.');
  return result.scene as SceneBlueprint;
}

export function wireProductAndScene(profile: ProductProfile, scene: SceneBlueprint): AnalyzedConcept {
  const productDNA = `${profile.productBlock}\n\nPROTECTED DETAILS: ${profile.protectedDetails || 'Preserve every visible physical detail.'}\nUNKNOWN OR UNVERIFIED — DO NOT INVENT: ${profile.unknownDetails || 'Any feature not visible in the references.'}`;
  return {
    lighting: scene.lighting,
    environment: scene.environment,
    camera: scene.camera,
    colorPalette: scene.colorPalette,
    vibe: scene.aesthetic,
    variationDirections: ['subtle lighting shift', 'subtle camera position shift', 'subtle environmental variation'],
    bestProductImageIndex: 0,
    promptLayers: {
      productDNA,
      productCategory: profile.category || 'product',
      productPlacement: `${scene.productPlacement}. ${scene.integrationRules}`,
      lightingPhysics: scene.lighting,
      environmentContext: scene.environment,
      cameraOptics: scene.camera,
      aestheticGrade: `${scene.aesthetic}. Palette: ${scene.colorPalette}`,
      subjectDetails: scene.subject,
      clothingAccessories: '',
    },
    masterPrompt: scene.scenePrompt,
  };
}
