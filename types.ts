
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
  aspectRatio?: string;
}

export type ReferenceMode =
  | 'current'
  | 'preserve-photo'
  | 'replace-person'
  | 'replace-background'
  | 'inspiration';

export interface ReferenceIntent {
  mode: ReferenceMode;
  instruction?: string;
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
