
import React from 'react';
import { ImageFile } from '../types';

interface ImageUploaderProps {
  label: string;
  onUpload: (files: ImageFile[]) => void;
  onRemove: (id: string) => void;
  images: ImageFile[];
  maxFiles?: number;
  description?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  onUpload,
  onRemove,
  images,
  maxFiles = 5,
  description
}) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxFiles - images.length;
    // Fix: Explicitly cast the Array.from result to File[] to avoid 'unknown' type errors for file properties.
    const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

    const newImages: ImageFile[] = await Promise.all(
      filesToProcess.map(async (file) => {
        return new Promise<ImageFile>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const maxDim = 1024;
              
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              
              let targetType = file.type;
              if (targetType !== 'image/jpeg' && targetType !== 'image/webp') {
                targetType = 'image/png'; // Default to PNG for unsupported types
              }
              
              const dataUrl = canvas.toDataURL(targetType);
              const base64 = dataUrl.split(',')[1];
              
              resolve({
                id: Math.random().toString(36).substring(7),
                data: base64,
                mimeType: targetType,
                preview: dataUrl
              });
            };
            img.src = reader.result as string;
          };
          reader.readAsDataURL(file);
        });
      })
    );

    onUpload(newImages);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{label}</h3>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        <span className="text-xs text-slate-500 font-mono">
          {images.length} / {maxFiles}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
            <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(img.id)}
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {images.length < maxFiles && (
          <label className="aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500/50 cursor-pointer transition-all">
            <svg className="w-6 h-6 text-slate-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[10px] text-slate-500 font-medium">SUBIR</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple={maxFiles > 1}
              onChange={handleFileChange}
            />
          </label>
        )}
      </div>
    </div>
  );
};
