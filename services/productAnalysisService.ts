import type { ImageFile, IntegrationAudit, ProductImageView, ProductProfile, SceneBlueprint } from '../types';
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

function compressForAudit(source: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const maxSide = 1024;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => resolve(source);
    image.src = source;
  });
}

export async function auditGeneratedIntegration(
  generatedImage: string,
  productImages: ImageFile[],
  sceneReference: ImageFile | null,
  profile?: ProductProfile | null,
): Promise<IntegrationAudit> {
  const productSources = productImages.slice(0, 2).map((image) => image.preview);
  const [compressedGenerated, compressedScene, ...compressedProducts] = await Promise.all([
    compressForAudit(generatedImage),
    sceneReference ? compressForAudit(sceneReference.preview) : Promise.resolve(''),
    ...productSources.map(compressForAudit),
  ]);
  const response = await fetch('/api/gemini/audit-integration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generatedImage: compressedGenerated,
      productReferences: compressedProducts,
      sceneReference: compressedScene || null,
      productIdentity: profile?.productBlock || profile?.protectedDetails || '',
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.audit) throw new Error(result.error || 'No fue posible auditar la integración.');
  return result.audit as IntegrationAudit;
}

function confidence(view?: ProductImageView): number {
  return typeof view?.confidence === 'number' ? view.confidence : 0;
}

export function selectBestProductImageIndex(profile: ProductProfile, scene?: SceneBlueprint | null): number {
  const views = (profile.imageViews || []).filter((view) => Number.isInteger(view.index));
  if (!views.length) return 0;

  const desired = scene?.desiredProductView;
  const exact = desired
    ? views.filter((view) => view.view === desired).sort((a, b) => confidence(b) - confidence(a))[0]
    : undefined;
  if (exact) return exact.index;

  const preferred = views
    .filter((view) => !['detail', 'top', 'bottom', 'unknown'].includes(view.view))
    .sort((a, b) => confidence(b) - confidence(a))[0];
  return (preferred || [...views].sort((a, b) => confidence(b) - confidence(a))[0])?.index ?? 0;
}

function visibleAudit(profile: ProductProfile): string {
  return (profile.audit || [])
    .filter((item) => item.status === 'visible' && item.observation)
    .map((item) => `- ${item.label}: ${item.observation}`)
    .join('\n');
}

function sceneFacts(scene: SceneBlueprint): string {
  return [
    `Composition: ${scene.composition || 'match the visible geometry and subject placement'}`,
    `Framing: ${scene.framing || 'match the visible framing'}`,
    `Camera: ${scene.camera}`,
    `Camera height: ${scene.cameraHeight || 'infer only from visible perspective'}`,
    `Lens/perspective: ${scene.focalLength || 'match the reference perspective without distortion'}`,
    `Depth of field: ${scene.depthOfField || 'match the reference focus falloff'}`,
    `Lighting: ${scene.lighting}`,
    `Shadow behavior: ${scene.shadowBehavior || 'derive from the reference'}`,
    `Time of day: ${scene.timeOfDay || 'not established'}`,
    `Environment: ${scene.environment}`,
    `Subject: ${scene.subject}`,
    `Wardrobe: ${scene.wardrobe || 'copy only if relevant and visible'}`,
    `Props: ${scene.props || 'copy only if compositionally relevant'}`,
    `Palette: ${scene.colorPalette}`,
    `Aesthetic/grade: ${scene.aesthetic}`,
    `Post-processing: ${scene.postProcessing || 'match contrast, grain and sharpness visibly present'}`,
    `Original product to replace: ${scene.originalProduct || 'the product occupying the target placement'}`,
    `Target placement: ${scene.productPlacement}`,
    `Copy from scene: ${scene.copyElements || 'composition, camera, lighting, palette and environment'}`,
    `Ignore from scene: ${scene.ignoreElements || 'identity and branding of the original product'}`,
  ].join('\n');
}

export function compileGenerationPrompt(
  profile: ProductProfile,
  scene?: SceneBlueprint | null,
  userDirection = '',
  realisticIntegration = false,
): string {
  const audit = visibleAudit(profile);
  const selectedView = scene?.desiredProductView || 'the view that best matches the target placement';

  return `TASK
Create one photorealistic, high-end commercial photograph. The product references define identity; ${scene ? 'the final reference defines the photographic scene' : 'the requested direction defines the scene'}.

REFERENCE MAP
- Product reference images: authoritative evidence for the same exact physical product. The first product reference is the preferred ${selectedView} view; remaining product references resolve geometry, materials and markings.
${scene ? '- Final scene reference: authoritative evidence for composition, perspective, subject, pose, environment, lighting, shadows and color grade. Its original product must be replaced.' : '- No scene reference: build a clean commercial setting without changing product identity.'}

PRODUCT IDENTITY LOCK — NON-NEGOTIABLE
${profile.productBlock}
Category: ${profile.category || 'product'}
${audit || '- Preserve every visible geometric, material and graphic feature from the product references.'}

PROTECTED PRODUCT DETAILS
${profile.protectedDetails || 'Preserve all visible shape, proportions, construction, colors, texture, hardware, labels, logos and wear exactly.'}

${realisticIntegration ? `INTRINSIC PRODUCT PROPERTIES — PRESERVE
${profile.intrinsicProperties || profile.productBlock}

SOURCE-PHOTO LIGHTING — DISCARD
${profile.sourceLightingToIgnore || 'Ignore highlights, reflections, shadows, exposure, white balance and background color casts baked into the product source photographs.'}
These are temporary illumination effects, not product identity.` : ''}

UNKNOWN OR UNVERIFIED DETAILS
${profile.unknownDetails || 'Anything not visible in the product references.'}
Never invent, mirror, relocate, simplify or beautify an unknown feature. Hide it naturally or keep it consistent with the nearest visible evidence.

${scene ? `SCENE RECONSTRUCTION
${sceneFacts(scene)}

PHYSICAL INTEGRATION
${scene.integrationRules}
Match contact points, occlusion, scale, orientation, perspective, reflected light, cast shadows and depth of field so the exact product belongs in the photographed scene.` : `SCENE DIRECTION
${userDirection || 'Neutral premium studio product photography with controlled realistic light and an uncluttered background.'}`}

${realisticIntegration && scene ? `PHOTOMETRIC RELIGHTING AND PLACEMENT
- Key light: ${scene.keyLight || scene.lighting}
- Fill light: ${scene.fillLight || 'infer the scene fill-to-key ratio'}
- Rim light: ${scene.rimLight || 'apply only if visibly supported'}
- Ambient bounce and reflected color: ${scene.ambientBounce || 'inherit nearby surface colors naturally'}
- Exposure: ${scene.exposurePlan || 'match scene exposure, highlight roll-off and black level'}
- White balance: ${scene.whiteBalance || 'match the scene white balance'}
- Placement: ${scene.placementPlan || scene.productPlacement}
- Contact: ${scene.contactPlan || 'create physically connected contact and cast shadows'}
- Occlusion: ${scene.occlusionPlan || 'respect every foreground and background overlap'}

Discard the lighting baked into the product reference photos, then re-render the exact product under the scene illumination. Generate material-correct highlights and reflections, ambient color contamination, contact shadows and cast shadows. Match perspective, exposure, depth of field, grain, sharpness and lens behavior. The product must not look pasted, floating, separately exposed or photographed in another studio.` : ''}

${scene && userDirection ? `ADDITIONAL USER DIRECTION
${userDirection}
Apply it only where it does not contradict product identity or the visible scene evidence.` : ''}

NEGATIVE CONSTRAINTS
- Do not redesign, restyle or substitute the product.
- Do not change proportions, silhouette, colors, materials, texture, hardware, logo, text or visible wear.
- Do not merge the original scene product with the referenced product.
- Do not add unsupported parts, decorations, text or branding.
- Do not output an illustration, CGI render, mockup or synthetic-looking composite.

OUTPUT
One coherent, realistic commercial photograph with exact product fidelity and natural photographic integration.`;
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
    bestProductImageIndex: selectBestProductImageIndex(profile, scene),
    promptLayers: {
      productDNA,
      productCategory: profile.category || 'product',
      productPlacement: `${scene.productPlacement}. ${scene.integrationRules}`,
      lightingPhysics: scene.lighting,
      environmentContext: scene.environment,
      cameraOptics: scene.camera,
      aestheticGrade: `${scene.aesthetic}. Palette: ${scene.colorPalette}`,
      subjectDetails: scene.subject,
      clothingAccessories: scene.wardrobe || '',
    },
    masterPrompt: compileGenerationPrompt(profile, scene),
  };
}
