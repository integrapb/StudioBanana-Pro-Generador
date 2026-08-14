
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
