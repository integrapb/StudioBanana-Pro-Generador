import React, { useRef, useState } from 'react';
import type { ImageFile, PreciseProductData, PreciseProductImage, ProductAngle } from '../types';
import { analyzePreciseProduct } from '../services/preciseProductService';

const ANGLES: Array<{ id: ProductAngle; title: string; hint: string }> = [
  { id: 'front', title: 'Frontal', hint: 'Producto recto y completo' },
  { id: 'right', title: 'Perfil derecho', hint: 'Lado derecho completo' },
  { id: 'back', title: 'Posterior', hint: 'Parte trasera completa' },
  { id: 'left', title: 'Perfil izquierdo', hint: 'Lado izquierdo completo' },
  { id: 'three-quarter', title: '45°', hint: 'Volumen y profundidad' },
  { id: 'detail', title: 'Detalles', hint: 'Logo, textura o etiqueta' },
];

interface Props {
  data: PreciseProductData;
  onChange: (data: PreciseProductData) => void;
  models: ReadonlyArray<{ id: string; label: string; description: string }>;
  selectedModel: string;
  onSelectModel: (model: string) => void;
}

function readHighFidelityFile(file: File): Promise<ImageFile> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const image = new Image();
      image.onload = () => {
        const maxDimension = 2048;
        let width = image.width;
        let height = image.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) { height = Math.round(height * maxDimension / width); width = maxDimension; }
          else { width = Math.round(width * maxDimension / height); height = maxDimension; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(image, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const preview = canvas.toDataURL(mimeType, 0.94);
        resolve({ id: crypto.randomUUID(), data: preview.split(',')[1], mimeType, preview });
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const PreciseProductStudio: React.FC<Props> = ({ data, onChange, models, selectedModel, onSelectModel }) => {
  const sceneInput = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showRefinement, setShowRefinement] = useState(false);
  const updatePassport = (key: keyof PreciseProductData['passport'], value: string) => onChange({ ...data, passport: { ...data.passport, [key]: value } });

  const setAngleImage = async (angle: ProductAngle, file?: File) => {
    if (!file) return;
    const raw = await readHighFidelityFile(file);
    const image: PreciseProductImage = { ...raw, angle };
    onChange({ ...data, images: [...data.images.filter((item) => item.angle !== angle), image] });
  };
  const setScene = async (file?: File) => file && onChange({ ...data, sceneReference: [await readHighFidelityFile(file)] });
  const createProfileWithAi = async () => {
    if (data.images.length < 2) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const profile = await analyzePreciseProduct(data.images);
      onChange({ ...data, passport: { ...data.passport, ...profile } });
    } catch (error: any) {
      setAnalysisError(error.message || 'No fue posible crear el perfil.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return <div className="space-y-8 animate-in fade-in slide-in-from-top-3 duration-500">
    <div className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
      <div className="flex items-center gap-2 mb-2"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Producto Preciso · Beta</p></div>
      <p className="text-[10px] text-slate-400 leading-relaxed">No necesitas conocer especificaciones. Sube dos o tres fotos y la IA construye un perfil visual que puedes corregir después.</p>
    </div>

    <div className="space-y-3">
      <div className="flex items-center justify-between"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Crear perfil con IA</label><span className="text-[9px] text-emerald-400 font-black">{data.images.length}/6 ángulos</span></div>
      <p className="text-[10px] leading-relaxed text-slate-400">Ideal: una frontal, una a 45° y, si puedes, un acercamiento al logo o textura.</p>
      <div className="grid grid-cols-2 gap-2">
        {ANGLES.map((angle) => {
          const image = data.images.find((item) => item.angle === angle.id);
          return <label key={angle.id} className={`relative min-h-28 rounded-2xl border cursor-pointer overflow-hidden p-3 transition-all ${image ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-dashed border-white/10 bg-slate-950/60 hover:border-emerald-400/30'}`}>
            {image && <img src={image.preview} alt={angle.title} className="absolute inset-0 w-full h-full object-cover opacity-40" />}
            <div className="relative z-10"><p className="text-[10px] font-black text-white uppercase">{angle.title}</p><p className="text-[8px] text-slate-400 mt-1">{image ? '✓ Cargada · reemplazar' : angle.hint}</p></div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAngleImage(angle.id, e.target.files?.[0])} />
          </label>;
        })}
      </div>
      <button onClick={createProfileWithAi} disabled={data.images.length < 2 || isAnalyzing} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
        {isAnalyzing ? 'Analizando producto…' : 'Analizar mi producto con IA'}
      </button>
      {analysisError && <p className="text-[10px] text-red-400">{analysisError}</p>}
    </div>

    {data.passport.name && <div className="p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 space-y-3">
      <div className="flex items-center justify-between"><p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Perfil creado por IA</p><span className="text-[9px] font-black text-emerald-300">Confianza {data.passport.confidence ?? 0}%</span></div>
      <p className="text-sm font-black text-white">{data.passport.name}</p>
      <p className="text-[10px] leading-relaxed text-slate-400">{data.passport.detectedDetails || 'La IA creó un perfil a partir de las fotografías.'}</p>
      {data.passport.unknownDetails && <p className="text-[10px] leading-relaxed text-amber-300/80">Por confirmar: {data.passport.unknownDetails}</p>}
      <button onClick={() => setShowRefinement(!showRefinement)} className="text-[9px] font-black uppercase text-emerald-300 hover:text-white">{showRefinement ? 'Ocultar edición' : 'Refinar perfil manualmente'}</button>
    </div>}

    {showRefinement && <div className="space-y-3 p-5 rounded-3xl border border-white/10 bg-slate-950/50">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Refinar perfil (opcional)</label>
      <input value={data.passport.name} onChange={(e) => updatePassport('name', e.target.value)} placeholder="Nombre del producto" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" />
      <input value={data.passport.dimensions} onChange={(e) => updatePassport('dimensions', e.target.value)} placeholder="Dimensiones reales (opcional)" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" />
      <input value={data.passport.materials} onChange={(e) => updatePassport('materials', e.target.value)} placeholder="Materiales y textura" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" />
      <input value={data.passport.colors} onChange={(e) => updatePassport('colors', e.target.value)} placeholder="Colores exactos" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" />
      <textarea value={data.passport.protectedDetails} onChange={(e) => updatePassport('protectedDetails', e.target.value)} placeholder="Detalles que no se pueden cambiar: logo, texto, costuras, tapa..." className="w-full min-h-20 bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50" />
    </div>}

    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Escena de referencia (opcional)</label>
      <button onClick={() => sceneInput.current?.click()} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-slate-950 hover:border-emerald-400/40 text-left">
        {data.sceneReference[0] ? <img src={data.sceneReference[0].preview} className="w-12 h-12 object-cover rounded-xl" alt="Escena" /> : <span className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400">+</span>}
        <span className="text-[10px] text-slate-400">{data.sceneReference[0] ? 'Escena cargada · cambiar' : 'Luz, composición y ambiente; no cambia el producto'}</span>
      </button>
      <input ref={sceneInput} type="file" accept="image/*" className="hidden" onChange={(e) => setScene(e.target.files?.[0])} />
    </div>

    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">3. Ángulo solicitado</label><select value={data.targetAngle} onChange={(e) => onChange({ ...data, targetAngle: e.target.value as ProductAngle })} className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500/50">{ANGLES.slice(0, 5).map((angle) => <option key={angle.id} value={angle.id}>{angle.title}</option>)}</select></div>
    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">4. Relación de aspecto</label><div className="grid grid-cols-5 gap-2">{['1:1', '4:3', '3:4', '16:9', '9:16'].map((ratio) => <button key={ratio} onClick={() => onChange({ ...data, aspectRatio: ratio })} className={`py-3 rounded-xl border text-[9px] font-black ${data.aspectRatio === ratio ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}>{ratio}</button>)}</div></div>
    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">5. Modelo de IA</label>{models.map((model) => <button key={model.id} onClick={() => onSelectModel(model.id)} className={`w-full p-3 rounded-2xl border text-left ${selectedModel === model.id ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-900/50 border-white/5 text-slate-500'}`}><p className="text-[10px] font-black uppercase">{model.label}</p><p className="text-[8px] opacity-60 mt-1">{model.description}</p></button>)}</div>
    <div className="space-y-3"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">6. Dirección creativa</label><textarea value={data.prompt} onChange={(e) => onChange({ ...data, prompt: e.target.value })} placeholder="Ej. campaña premium, estudio editorial, luz lateral suave..." className="w-full min-h-28 bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-emerald-500/50" /></div>
  </div>;
};
