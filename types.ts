
export interface ImageFile {
  id: string;
  data: string; // base64
  mimeType: string;
  preview: string;
}

export type ProductAngle =
  | 'front'
  | 'front-left'
  | 'front-right'
  | 'left'
  | 'right'
  | 'back'
  | 'top'
  | 'bottom'
  | 'detail'
  | 'unassigned';

export type ProductViewStatus = 'verified' | 'inferred' | 'approved';

export interface ProductView {
  id: string;
  angle: ProductAngle;
  image: ImageFile;
  status: ProductViewStatus;
  createdAt: number;
}

export interface ProductPassport {
  version: 1;
  views: ProductView[];
  updatedAt: number;
}

export interface GenerationResult {
  imageUrl: string;
  prompt: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
