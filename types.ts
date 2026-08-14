
export interface ImageFile {
  id: string;
  data: string; // base64
  mimeType: string;
  preview: string;
}

export interface GenerationResult {
  imageUrl: string;
  prompt: string;
  timestamp: number;
  engine?: string;
}

export type ProductAngle = 'front' | 'right' | 'back' | 'left' | 'three-quarter' | 'detail';

export interface PreciseProductImage extends ImageFile {
  angle: ProductAngle;
}

export interface ProductPassport {
  name: string;
  dimensions: string;
  materials: string;
  colors: string;
  protectedDetails: string;
  notes: string;
  detectedDetails?: string;
  unknownDetails?: string;
  confidence?: number;
  category?: string;
  audit?: ProductAuditEntry[];
}

export interface ProductAuditEntry {
  label: string;
  status: 'visible' | 'estimated' | 'not_visible';
  observation: string;
}

export interface ProductProfile {
  category: string;
  name: string;
  materials: string;
  colors: string;
  protectedDetails: string;
  detectedDetails: string;
  unknownDetails: string;
  notes: string;
  confidence: number;
  audit: ProductAuditEntry[];
  productBlock: string;
  status: 'ready' | 'pending' | 'failed';
  version: number;
  analyzedAt?: number;
  error?: string;
  imageViews?: ProductImageView[];
}

export interface ProductImageView {
  index: number;
  view: 'front' | 'back' | 'left' | 'right' | 'three-quarter' | 'top' | 'bottom' | 'detail' | 'unknown';
  description: string;
  confidence: number;
}

export interface SceneBlueprint {
  composition?: string;
  lighting: string;
  environment: string;
  camera: string;
  colorPalette: string;
  aesthetic: string;
  subject: string;
  productPlacement: string;
  integrationRules: string;
  scenePrompt: string;
  confidence: number;
  framing?: string;
  cameraHeight?: string;
  focalLength?: string;
  depthOfField?: string;
  timeOfDay?: string;
  shadowBehavior?: string;
  wardrobe?: string;
  props?: string;
  postProcessing?: string;
  originalProduct?: string;
  desiredProductView?: ProductImageView['view'];
  copyElements?: string;
  ignoreElements?: string;
}

export interface PreciseProductData {
  images: PreciseProductImage[];
  sceneReference: ImageFile[];
  passport: ProductPassport;
  targetAngle: ProductAngle;
  prompt: string;
  aspectRatio: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export enum AppStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}
