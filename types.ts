
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
