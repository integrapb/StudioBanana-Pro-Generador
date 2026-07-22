
import { GoogleGenAI, Type } from "@google/genai";
import { ImageFile } from "../types";

export interface PromptLayers {
  productDNA: string;         // Physical identity: materials, colors, logos, exact shapes
  productCategory: string;    // e.g. "hat", "bottle", "watch" - drives placement logic
  productPlacement: string;   // How/where the product should appear in the scene
  lightingPhysics: string;    // Light sources, direction, intensity, shadows
  environmentContext: string; // Background, surfaces, props, depth of field
  cameraOptics: string;       // Focal length, aperture, angle, perspective
  aestheticGrade: string;     // Overall mood, color grade, post-processing style
  subjectDetails?: string;    // Human subjects if present
  clothingAccessories?: string; // Clothing worn by subjects
}

export interface AnalyzedConcept {
  lighting: string;
  environment: string;
  camera: string;
  colorPalette: string;
  vibe: string;
  variationDirections: string[];
  promptLayers: PromptLayers;
  masterPrompt: string;
  bestProductImageIndex: number;
}

export interface PromptVariant {
  name: string;
  prompt: string;
  technical_specs: string;
}

export class GeminiService {
  private modelName = 'gemini-3.1-flash-image';         // Nano Banana 2: multi-image coherence + 4K
  private analysisModelName = 'gemini-3-pro-image';  // Deep scene & product forensics

  private getApiKey(): string {
    if (typeof window !== 'undefined') {
      const localKey = localStorage.getItem('studiobanana_api_key');
      if (localKey && localKey.trim() !== '') {
        return localKey;
      }
    }
    return process.env.API_KEY || '';
  }

  private getClient() {
    return new GoogleGenAI({ apiKey: this.getApiKey() });
  }

  async generateProductAngle(productImages: ImageFile[], angleLabel: string): Promise<string> {
    if (productImages.length === 0) {
      throw new Error('Se necesita al menos una vista verificada para inferir un ángulo.');
    }

    const ai = this.getClient();
    const parts: any[] = [
      ...productImages.map((image) => ({
        inlineData: { data: image.data, mimeType: image.mimeType },
      })),
      {
        text: `Create a neutral product identity reference photograph showing the exact same product from this angle: ${angleLabel}.

All input images are verified photographs of the same physical product. Use every input together as the only source of truth. Preserve exact geometry, proportions, materials, colors, labels, logos, typography, seams, hardware and imperfections. Do not redesign, simplify, beautify or add details.

Output requirements:
- Single product centered on a clean neutral light-gray studio background.
- Product fully visible with no props, hands or people.
- Even catalog lighting with minimal soft shadow.
- Square composition.
- If a surface, label or detail is not visible in the verified inputs, keep it plain and conservative rather than inventing branding or text.

This is an INFERRED passport view for human review, not a creative campaign image.`,
      },
    ];

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: '1:1' },
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find((part) => part.inlineData);
    if (!imagePart?.inlineData?.data) {
      throw new Error('La IA no devolvió una vista de producto válida.');
    }

    return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
  }

  async analyzeReferenceImage(productImages: ImageFile[], styleImage: ImageFile): Promise<AnalyzedConcept> {
    const ai = this.getClient();

    // We send ALL product images first so the model sees every angle,
    // then the reference style image last so it is visually fresh when analyzing the scene.
    const parts = [
      ...productImages.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
      { inlineData: { data: styleImage.data, mimeType: styleImage.mimeType } },
      {
        text: `You are a world-class Commercial Photography Director and Product Engineer with 20 years of experience directing luxury brand campaigns.

You have been given ${productImages.length} image(s) of a product (shown first) and 1 reference style/scene image (shown last).

YOUR MISSION: Perform a forensic-level analysis of both the product and the scene, then construct a generation blueprint that will produce a result where THE PRODUCT IS INDISTINGUISHABLE FROM THE ORIGINAL PHOTOS.

═══ PART 1: PRODUCT FORENSICS (Images 1 to ${productImages.length}) ═══

Analyze EVERY product image provided and extract:

1. PRODUCT CATEGORY — What type of product is this? (e.g., "hat/cap", "glass bottle", "wristwatch", "sneaker", "perfume bottle", "skincare tube"). This determines placement logic.

2. PRODUCT DNA — Build an exhaustive physical identity document:
   - Exact shape and silhouette geometry
   - Primary material(s) with surface finish (e.g., "matte black ABS plastic", "hand-stitched tan leather", "brushed 316L stainless steel")
   - Every color with its exact shade (e.g., "dusty rose #C9A0A0", "cream off-white", "gunmetal grey")
   - ALL text, logos, emblems visible: exact font style, position, color, size relative to product
   - Hardware details: buttons, zippers, stitching, seams, rivets
   - Transparency or reflectivity properties
   - Any unique distinguishing features or imperfections

3. BEST IMAGE — Which index (0-based) shows the product at the ideal angle to be integrated into the reference scene? Consider: which angle best matches the scene's perspective and would look most natural.

4. PRODUCT PLACEMENT LOGIC — Based on the product category and the reference scene:
   - If it is a WEARABLE (hat, watch, jewelry, glasses, shoes): must be shown worn by a person/model matching the scene
   - If it is a PACKAGED GOOD (bottle, box, can, tube): must be placed on a surface in the scene
   - If it is a FOOD/BEVERAGE: must be shown in context (table, hand, environment)
   - Describe exactly how and where the product should appear in the final image

═══ PART 2: SCENE FORENSICS (Last image = Style Reference) ═══

Analyze the reference scene and extract:
- Lighting setup: key light position, fill light, rim light, ambient light color temperature (warm/cool/neutral in Kelvin)
- Environment: exact setting (indoor/outdoor, surface material, background elements, depth)
- Camera technical specs: estimated focal length (mm), aperture (f-stop), shooting angle (eye-level/low-angle/top-down), sensor perspective
- Color palette: dominant colors, shadows, highlights, overall color grade (matte, cinematic, bright, moody)
- Mood/vibe: the emotional feeling and commercial style of the scene
- Human subjects: if people are present, describe their appearance, pose, clothing in detail

═══ PART 3: INTEGRATION BLUEPRINT ═══

Create a MASTER PROMPT that will be sent to an image generation AI. This prompt must:
1. Open with an ABSOLUTE PRODUCT IDENTITY DECLARATION — every detail extracted in Part 1 stated as non-negotiable facts
2. Specify the EXACT PLACEMENT of the product as determined in the placement logic
3. Describe the SCENE with the precision extracted in Part 2
4. Use authoritative, directive language (NOT suggestive). Say "MUST SHOW", "EXACT COLOR IS", "IDENTICAL TO", not "try to", "similar to", "like"
5. End with FIDELITY CONSTRAINTS: "Reproduce the product with 100% accuracy. Do not simplify logos, do not alter proportions, do not change colors. The product shown must be a photographic clone of the reference."

The master prompt should be 150-250 words of dense, technical, authoritative instructions.`
      }
    ];

    const response = await ai.models.generateContent({
      model: this.analysisModelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lighting: { type: Type.STRING },
            environment: { type: Type.STRING },
            camera: { type: Type.STRING },
            colorPalette: { type: Type.STRING },
            vibe: { type: Type.STRING },
            variationDirections: { type: Type.ARRAY, items: { type: Type.STRING } },
            bestProductImageIndex: {
              type: Type.INTEGER,
              description: "0-based index of the product image that best matches the scene angle and perspective."
            },
            promptLayers: {
              type: Type.OBJECT,
              properties: {
                productDNA: {
                  type: Type.STRING,
                  description: "Complete forensic description of the product: every material, color, logo, shape, hardware detail. This is the ground truth."
                },
                productCategory: {
                  type: Type.STRING,
                  description: "The product type category (e.g. 'hat/cap', 'glass bottle', 'wristwatch'). Drives placement logic."
                },
                productPlacement: {
                  type: Type.STRING,
                  description: "Exact instructions on how the product must appear in the scene (worn, placed on surface, held, etc.) based on product category."
                },
                lightingPhysics: {
                  type: Type.STRING,
                  description: "Exact lighting setup from the reference scene: key light angle, color temperature, shadows, highlights."
                },
                environmentContext: {
                  type: Type.STRING,
                  description: "Setting, surfaces, background, props, depth of field from the reference scene."
                },
                cameraOptics: {
                  type: Type.STRING,
                  description: "Camera specs: focal length, aperture, shooting angle, perspective."
                },
                aestheticGrade: {
                  type: Type.STRING,
                  description: "Color grade, mood, post-processing style of the reference scene."
                },
                subjectDetails: {
                  type: Type.STRING,
                  description: "If humans are present in the reference: appearance, pose, skin tone, gender presentation."
                },
                clothingAccessories: {
                  type: Type.STRING,
                  description: "If humans are present: exact clothing items worn, colors, fit, style."
                }
              },
              required: [
                "productDNA",
                "productCategory",
                "productPlacement",
                "lightingPhysics",
                "environmentContext",
                "cameraOptics",
                "aestheticGrade",
                "subjectDetails",
                "clothingAccessories"
              ]
            },
            masterPrompt: {
              type: Type.STRING,
              description: "The complete, authoritative generation prompt (150-250 words) with absolute product identity declaration, exact placement, scene description, and fidelity constraints."
            }
          },
          required: [
            "lighting",
            "environment",
            "camera",
            "colorPalette",
            "vibe",
            "variationDirections",
            "bestProductImageIndex",
            "promptLayers",
            "masterPrompt"
          ]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async generatePromptVariants(image: ImageFile): Promise<PromptVariant[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: this.analysisModelName,
      contents: {
        parts: [
          { inlineData: { data: image.data, mimeType: image.mimeType } },
          { text: "You are a commercial photography director. Perform a full reverse-engineering analysis of this image. Identify all subjects with exact clothing/accessories, environment, lighting setup, camera angle and lens, color grade and mood. Generate 3 high-fidelity technical prompt variants (Advertising/Commercial, Minimalist/Clean, Dramatic/Editorial) that would allow an AI image generator to replicate this scene's visual precision exactly. Return a JSON ARRAY of objects." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              prompt: { type: Type.STRING },
              technical_specs: { type: Type.STRING }
            },
            required: ["name", "prompt", "technical_specs"]
          }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  }

  async adjustPrompt(originalPrompt: string, instruction: string): Promise<PromptVariant> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: this.analysisModelName,
      contents: `You are an expert prompt engineer for commercial photography AI. Take the original prompt and adjust it according to the user's instruction. Preserve all product fidelity constraints and technical specifications — only modify what the instruction requests.
      Instruction: "${instruction}"
      Original Prompt: "${originalPrompt}"
      
      Return a JSON object with the adjusted prompt and a brief technical explanation of the changes made.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the adjusted variant" },
            prompt: { type: Type.STRING, description: "The complete, optimized prompt" },
            technical_specs: { type: Type.STRING, description: "Explanation of changes made" }
          },
          required: ["name", "prompt", "technical_specs"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  }

  async generateProductImage(
    productImages: ImageFile[],
    referenceImage: ImageFile | null,
    userPrompt: string,
    variationIndex: number = 0,
    analyzedConcept?: AnalyzedConcept,
    shotOverride?: string,
    sourceImage?: ImageFile | null,
    maskImage?: string | null,
    aspectRatio: string = "1:1"
  ): Promise<string> {
    const ai = this.getClient();
    const parts: any[] = [];

    if (sourceImage) {
      // Editing mode: send only the source image being edited
      parts.push({ inlineData: { data: sourceImage.data, mimeType: sourceImage.mimeType } });

    } else if (productImages.length > 0) {
      // Generation mode: leverage gemini-3.1-flash-image multi-image coherence.
      // Strategy:
      //   1. Send the best-angle product image FIRST (primary product reference)
      //   2. Send remaining product angle images next (give the model full 3D context)
      //   3. Send the style reference image LAST (visual target for lighting/colors/scene)
      // The model will visually match the scene atmosphere from the reference image
      // instead of relying solely on text descriptions.

      let bestIndex = 0;
      if (analyzedConcept && analyzedConcept.bestProductImageIndex !== undefined) {
        bestIndex = analyzedConcept.bestProductImageIndex;
        if (bestIndex < 0 || bestIndex >= productImages.length) bestIndex = 0;
      }

      // Best angle first
      parts.push({ inlineData: { data: productImages[bestIndex].data, mimeType: productImages[bestIndex].mimeType } });

      // Remaining angles (skip bestIndex to avoid duplicate)
      productImages.forEach((img, idx) => {
        if (idx !== bestIndex) {
          parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
        }
      });

      // Style reference image: the model uses this to visually clone lighting, colors and scene
      if (referenceImage) {
        parts.push({ inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } });
      }
    }

    const layers = analyzedConcept?.promptLayers;
    let finalPrompt = "";

    if (sourceImage) {
      // Editing an already-generated image
      finalPrompt = `Edit this image following this instruction: ${userPrompt}. Preserve all other elements exactly as they are, especially the main product subject.`;

    } else if (productImages.length > 0 && analyzedConcept && layers) {
      // ── FULL LAYERED PROMPT ──
      // Multi-image layout sent to gemini-3.1-flash-image:
      //   Images 1..N-1 = product reference angles (fidelity source)
      //   Image N (last) = style reference (visual target for lighting/colors/scene)
      // The prompt explicitly labels each image's role so the model understands its inputs.

      const totalProductImgs = productImages.length;
      const hasStyleRef = !!referenceImage;

      const variationSuffix = variationIndex > 0
        ? ` Variation ${variationIndex + 1}: ${analyzedConcept.variationDirections[variationIndex] || "subtle lighting shift"}.`
        : "";

      const shotContext = shotOverride
        ? `Shot type: ${shotOverride}.`
        : "";

      finalPrompt = `You are generating a high-end commercial product photograph using ${totalProductImgs} product reference image(s)${hasStyleRef ? " and 1 style reference image" : ""}.

IMAGE ROLES:
- Image(s) 1${totalProductImgs > 1 ? ` to ${totalProductImgs}` : ""}: PRODUCT REFERENCE — these show the exact product that must appear in the final photo. Copy the product with 100% accuracy: shape, colors, materials, logos, proportions, texture, hardware.${hasStyleRef ? `\n- Last image: STYLE REFERENCE — copy the lighting direction, color temperature, color palette, background environment, mood and overall photographic aesthetic EXACTLY from this image. Do NOT copy the people or subjects from this image.` : ""}

PRODUCT IDENTITY (NON-NEGOTIABLE):
${layers.productDNA}

PRODUCT TYPE: ${layers.productCategory}

HOW THE PRODUCT MUST APPEAR:
${layers.productPlacement}

SCENE & ENVIRONMENT (match the style reference image):
${layers.environmentContext}

LIGHTING (clone from the style reference image):
${layers.lightingPhysics}

CAMERA & OPTICS:
${layers.cameraOptics}

COLOR GRADE & AESTHETIC (match the style reference image):
${layers.aestheticGrade}

${shotContext}
${userPrompt ? `ADDITIONAL DIRECTION: ${userPrompt}` : ""}
${variationSuffix}

ABSOLUTE FIDELITY CONSTRAINTS:
- Product: photographic clone of the product reference images. Zero simplification of logos, text, materials or colors.
- Scene: visually match the lighting, colors, and atmosphere from the style reference image.
- Output: must look like a real, high-quality commercial photograph. Not an illustration, not a render.`;

    } else if (productImages.length > 0) {
      // No analysis done — strong fallback prompt
      const shotContext = shotOverride ? `Shot type: ${shotOverride}.` : "Hero Shot.";
      finalPrompt = `Generate a high-quality commercial product photograph. The product in the provided image(s) must be reproduced with 100% accuracy — identical shape, colors, materials, logos, and proportions. Do not alter or simplify any product details. ${shotContext} Style: ${userPrompt || "Clean studio background, professional luxury commercial lighting, photorealistic."}. The output must look like a real professional photograph.`;

    } else {
      // No product image at all
      finalPrompt = `Generate a high-quality commercial product photograph. ${shotOverride ? `Shot type: ${shotOverride}.` : ""} Style: ${userPrompt || "Commercial luxury, professional studio lighting, photorealistic."}.`;
    }

    parts.push({ text: finalPrompt });

    const config: any = {};
    const hasImage = parts.some(p => p.inlineData);
    if (!hasImage) {
      config.imageConfig = {
        aspectRatio: aspectRatio as any
      };
    }

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: { parts },
      config
    });

    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!imgPart) throw new Error("La IA no generó una imagen válida.");
    return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
  }

  async generateEmptyScene(
    referenceImage: ImageFile | null,
    userPrompt: string,
    analyzedConcept?: AnalyzedConcept,
    aspectRatio: string = "1:1"
  ): Promise<string> {
    const ai = this.getClient();
    const parts: any[] = [];

    if (referenceImage) {
      parts.push({ inlineData: { data: referenceImage.data, mimeType: referenceImage.mimeType } });
    }

    let finalPrompt = "";
    const layers = analyzedConcept?.promptLayers;

    if (analyzedConcept && layers) {
      finalPrompt = `Generate a high-quality product photography BACKGROUND SCENE — no product present.

SCENE ENVIRONMENT: ${layers.environmentContext}
LIGHTING SETUP: ${layers.lightingPhysics}
CAMERA OPTICS: ${layers.cameraOptics}
COLOR GRADE: ${layers.aestheticGrade}
${userPrompt ? `ADDITIONAL DETAILS: ${userPrompt}` : ""}

CRITICAL: The center of the scene must be completely EMPTY — no product, no bottle, no object, no box placed in the middle. Leave a clean, well-lit surface area in the center ready for a product to be placed. The scene should look like a professional photography set waiting for the hero product. Photorealistic, high resolution, commercial quality.`;
    } else {
      finalPrompt = `Generate a high-quality product photography background scene. Scene description: ${userPrompt || "Luxury marble countertop in a modern bright studio, soft diffused lighting, blurred warm background, professional commercial photography set."} CRITICAL: The center must be completely EMPTY — no product, no object placed in the middle. Leave a clean surface ready to receive a product. Photorealistic, high resolution, commercial quality.`;
    }

    parts.push({ text: finalPrompt });

    const config: any = {};
    const hasImage = parts.some(p => p.inlineData);
    if (!hasImage) {
      config.imageConfig = {
        aspectRatio: aspectRatio as any
      };
    }

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents: { parts },
      config
    });

    const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (!imgPart) throw new Error("La IA no generó una escena de fondo válida.");
    return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
  }
}
