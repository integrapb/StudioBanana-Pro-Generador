import React, { useRef, useState } from 'react';
import { ImageFile, ProductAngle, ProductView } from '../types';
import { createVerifiedView, getPassportCoverage, PRODUCT_ANGLES } from '../services/productPassport';

interface Props {
  views: ProductView[];
  onChange: (views: ProductView[]) => void;
}

async function readImage(file: File): Promise<ImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('El archivo no contiene una imagen válida.'));
      image.onload = () => {
        const maxDimension = 2048;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);

        const mimeType = file.type === 'image/jpeg' || file.type === 'image/webp' ? file.type : 'image/png';
        const preview = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.94 : undefined);
        resolve({
          id: crypto.randomUUID(),
          data: preview.split(',')[1],
          mimeType,
          preview,
        });
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const ProductPassportCapture: React.FC<Props> = ({ views, onChange }) => {
  const inputRefs = useRef<Partial<Record<ProductAngle, HTMLInputElement | null>>>({});
  const [error, setError] = useState<string | null>(null);

  const coverage = getPassportCoverage({ version: 1, views, updatedAt: Date.now() });

  const handleFile = async (angle: ProductAngle, file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const image = await readImage(file);
      const next = views.filter((view) => view.angle !== angle);
      onChange([...next, createVerifiedView(angle, image)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la imagen.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Cobertura del producto</p>
          <p className="text-[9px] text-slate-500 mt-1">Sube únicamente vistas reales; la IA completará lo que falte después.</p>
        </div>
        <span className="text-xs font-black text-blue-400">{coverage}%</span>
      </div>

      <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all" style={{ width: `${coverage}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {PRODUCT_ANGLES.map((angle) => {
          const view = views.find((item) => item.angle === angle.id);
          return (
            <div key={angle.id} className={`relative aspect-square rounded-2xl overflow-hidden border transition-colors ${view ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-slate-950/50'}`}>
              {view ? (
                <>
                  <img src={view.image.preview} alt={angle.label} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black via-black/80 to-transparent pt-8">
                    <p className="text-[8px] font-black text-white uppercase truncate">{angle.shortLabel}</p>
                    <p className={`text-[7px] font-black uppercase ${view.status === 'inferred' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {view.status === 'verified' ? 'Verificada' : view.status === 'approved' ? 'Aprobada' : 'Inferida'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Eliminar vista ${angle.label}`}
                    onClick={() => onChange(views.filter((item) => item.id !== view.id))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRefs.current[angle.id]?.click()}
                  className="w-full h-full p-2 flex flex-col items-center justify-center text-center hover:bg-blue-600/10 transition-colors"
                >
                  <span className="text-lg text-blue-500 mb-1">+</span>
                  <span className="text-[8px] font-black text-slate-300 uppercase leading-tight">{angle.shortLabel}</span>
                  <span className="text-[7px] text-slate-600 leading-tight mt-1">{angle.description}</span>
                </button>
              )}
              <input
                ref={(element) => { inputRefs.current[angle.id] = element; }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  handleFile(angle.id, event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>

      {error && <p className="text-[9px] text-red-400">{error}</p>}
      <p className="text-[8px] text-slate-600 leading-relaxed">
        Recomendado: frontal, ambos 45°, posterior y detalle de logotipo. Las vistas aportadas por ti siempre tienen prioridad sobre las inferidas.
      </p>
    </div>
  );
};
