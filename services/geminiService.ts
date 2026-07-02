
import { GoogleGenAI, Type } from "@google/genai";
import { ImageFile } from "../types";

export interface PromptLayers {
  productDNA: string;      
  lightingPhysics: string; 
  environmentContext: string; 
  cameraOptics: string;    
  aestheticGrade: string;
  subjectDetails?: string; 
  clothingAccessories?: string; 
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
  private modelName = 'gemini-3.1-flash-image-preview';
  private analysisModelName = 'gemini-3.1-pro-preview';

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

  async analyzeReferenceImage(productImages: ImageFile[], styleImage: ImageFile): Promise<AnalyzedConcept> {
    const ai = this.getClient();
    const parts = [
      ...productImages.map(img => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
      { inlineData: { data: styleImage.data, mimeType: styleImage.mimeType } },
      { 
        text: `Actúa como un Ingeniero de Producto y Director de Fotografía Industrial. 
        Tu misión es realizar una DISECCIÓN MICROSCÓPICA del producto y la escena de estilo.
        
        PASO 1: ANÁLISIS DE PRODUCTO (FIDELIDAD TOTAL)
        - Identifica materiales exactos (ej: aluminio cepillado, vidrio templado, cuero granulado).
        - Localiza logos, tipografías y marcas con precisión de coordenadas.
        - Analiza la geometría 3D basándote en los múltiples ángulos suministrados.
        - Identifica detalles mínimos: tornillos, costuras, reflejos internos, imperfecciones de fabricación.
        - MUY IMPORTANTE: Evalúa todas las imágenes del producto proporcionadas y determina cuál es la mejor (índice 0, 1, 2...) para integrar en la escena de estilo, considerando ángulo, iluminación y perspectiva.
        
        PASO 2: ANÁLISIS DE ESCENA (ESTILO)
        - Identifica sujetos, su vestuario detallado (especialmente sombreros y accesorios), entorno y luz.
        
        PASO 3: INTEGRACIÓN
        Crea un Master Prompt que exija al generador mantener el PRODUCTO IDÉNTICO (clon absoluto) integrándolo en la atmósfera de estilo. 
        El producto NO debe ser una interpretación genérica, debe ser EL MISMO de las fotos.` 
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
            bestProductImageIndex: { type: Type.INTEGER, description: "El índice (0-based) de la mejor imagen del producto para usar en la generación." },
            promptLayers: {
              type: Type.OBJECT,
              properties: {
                productDNA: { type: Type.STRING, description: "Descripción técnica e irrefutable de la identidad física del producto: materiales, logos, formas exactas y micro-detalles." },
                lightingPhysics: { type: Type.STRING },
                environmentContext: { type: Type.STRING },
                cameraOptics: { type: Type.STRING },
                aestheticGrade: { type: Type.STRING },
                subjectDetails: { type: Type.STRING },
                clothingAccessories: { type: Type.STRING }
              },
              required: ["productDNA", "lightingPhysics", "environmentContext", "cameraOptics", "aestheticGrade", "subjectDetails", "clothingAccessories"]
            },
            masterPrompt: { type: Type.STRING, description: "Prompt de alto rendimiento que prioriza la identidad del producto sobre todo lo demás." }
          },
          required: ["lighting", "environment", "camera", "colorPalette", "vibe", "variationDirections", "bestProductImageIndex", "promptLayers", "masterPrompt"]
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
          { text: "Realiza ingeniería inversa total a esta imagen. Identifica sujetos, vestimenta detallada, entorno, luz y parámetros de cámara. Genera 3 variantes de prompts técnicos de alta fidelidad (Publicitario, Minimalista, Dramático) que permitan replicar esta exactitud visual. Devuelve un ARRAY de objetos JSON." }
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
      contents: `Eres un ingeniero de prompts experto. Toma este prompt original y ajústalo según la instrucción del usuario. 
      Instrucción: "${instruction}"
      Prompt Original: "${originalPrompt}"
      
      Devuelve un objeto JSON con el nuevo prompt ajustado y una breve descripción técnica de lo que se cambió.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nombre de la variante (ajustada)" },
            prompt: { type: Type.STRING, description: "El prompt completo y optimizado" },
            technical_specs: { type: Type.STRING, description: "Explicación de los cambios realizados" }
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
    
    // Para evitar errores 500 (Internal Error), el modelo de generación de imágenes
    // solo soporta UNA imagen de entrada a la vez.
    if (sourceImage) {
      // Modo edición: enviamos solo la imagen original
      parts.push({ inlineData: { data: sourceImage.data, mimeType: sourceImage.mimeType } });
    } else if (productImages.length > 0) {
      // Modo generación: enviamos la mejor imagen del producto. 
      // El estilo se aplica a través del prompt detallado.
      let bestIndex = 0;
      if (analyzedConcept && analyzedConcept.bestProductImageIndex !== undefined) {
        bestIndex = analyzedConcept.bestProductImageIndex;
        if (bestIndex < 0 || bestIndex >= productImages.length) {
          bestIndex = 0;
        }
      }
      parts.push({ inlineData: { data: productImages[bestIndex].data, mimeType: productImages[bestIndex].mimeType } });
    }

    const layers = analyzedConcept?.promptLayers;

    let finalPrompt = "";

    if (sourceImage) {
      finalPrompt = `Edit this image: ${userPrompt}. Keep the main subject exactly the same.`;
    } else if (productImages.length > 0) {
      if (analyzedConcept) {
        finalPrompt = `Edit this image to place the product in a new scene. Keep the product exactly the same. Scene: ${analyzedConcept.masterPrompt}. ${userPrompt || ""}`;
      } else {
        finalPrompt = `Edit this image to generate a high-quality product photo. Shot: ${shotOverride || "Hero Shot"}. Style: ${userPrompt || "Commercial luxury"}.`;
      }
    } else {
      finalPrompt = `Generate a high-quality product photo. Shot: ${shotOverride || "Hero Shot"}. Style: ${userPrompt || "Commercial luxury"}.`;
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
    if (analyzedConcept) {
      finalPrompt = `Generate a high-quality product photography background scene. Style/Scene: ${analyzedConcept.masterPrompt}. Extra description: ${userPrompt || ""}. CRITICAL: Do NOT generate any central product, package, bottle or subject. Keep the center of the surface empty and clean, ready to place a product. Ensure professional lighting, realistic textures, and depth of field.`;
    } else {
      finalPrompt = `Generate a high-quality product photography background scene. Scene: ${userPrompt || "Luxury marble countertop in a modern bright studio, soft lighting, blurred background"}. CRITICAL: Do NOT generate any central product, package, bottle or subject. Keep the center of the surface empty and clean, ready to place a product. Ensure professional lighting, realistic textures, and depth of field.`;
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
