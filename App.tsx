import React, { useState, useRef, useEffect } from 'react';
import { ImageFile, AppStatus, GenerationResult } from './types';
import { GeminiService, AnalyzedConcept, PromptVariant } from './services/geminiService';
import { ImageUploader } from './components/ImageUploader';
import { ImageInspector } from './components/ImageInspector';
import { ImageMasker } from './components/ImageMasker';
import { ComposerCanvas } from './components/ComposerCanvas';


const SHOT_TYPES = [
  { id: 'macro', label: 'Ultra Macro', description: 'Detalle extremo de texturas' },
  { id: 'hero', label: 'Hero Shot', description: 'Ángulo dinámico 45°' },
  { id: 'eye-level', label: 'Plano Frontal', description: 'Vista estándar' },
  { id: 'low-angle', label: 'Contrapicado', description: 'Escala imponente' },
  { id: 'top-down', label: 'Flat Lay', description: 'Vista cenital 90°' },
  { id: 'environmental', label: 'Lifestyle', description: 'Escena orgánica' },
];

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', desc: 'Cuadrado' },
  { id: '4:3', label: '4:3', desc: 'Clásico' },
  { id: '3:4', label: '3:4', desc: 'Retrato' },
  { id: '16:9', label: '16:9', desc: 'Widescreen' },
  { id: '9:16', label: '9:16', desc: 'Vertical' },
];

const ResultCard: React.FC<{
  res: GenerationResult;
  index: number;
  onEdit: (sourceImageUrl: string, editPrompt: string, maskImage: string | null) => Promise<void>;
  onInspect: (url: string) => void;
}> = ({ res, onEdit, onInspect }) => {
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isMasking, setIsMasking] = useState(false);
  const [activeMask, setActiveMask] = useState<string | null>(null);

  return (
    <div className="group relative bg-[#020617] rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="aspect-square bg-black relative">
        <img src={res.imageUrl} alt="Result" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10s]" />
        
        {isEditing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {isMasking && (
          <ImageMasker 
            imageUrl={res.imageUrl} 
            onCancel={() => setIsMasking(false)} 
            onSave={(mask) => { setActiveMask(mask); setIsMasking(false); }} 
          />
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 z-10">
          <button onClick={() => onInspect(res.imageUrl)} className="p-5 bg-white/10 backdrop-blur-xl rounded-3xl hover:bg-white/20 transition-all shadow-xl active:scale-95">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" strokeWidth={2}/></svg>
          </button>
          <a href={res.imageUrl} download={`studiobanana-${res.timestamp}.png`} className="p-5 bg-blue-600 rounded-3xl hover:bg-blue-500 transition-all shadow-xl active:scale-95">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2}/></svg>
          </a>
        </div>
      </div>

      <div className="p-8 border-t border-white/5 bg-gradient-to-b from-[#020617] to-black">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Master Render 4K</p>
          </div>
          {activeMask && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
              <span className="text-[8px] font-black text-blue-400 uppercase italic">Área Seleccionada</span>
              <button onClick={() => setActiveMask(null)} className="text-blue-400 hover:text-white transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3}/></svg>
              </button>
            </div>
          )}
        </div>

        <form onSubmit={async (e) => { 
          e.preventDefault(); 
          if(!editPrompt.trim()) return; 
          setIsEditing(true); 
          await onEdit(res.imageUrl, editPrompt, activeMask); 
          setIsEditing(false); 
          setEditPrompt(''); 
          setActiveMask(null);
        }} className="flex gap-2">
          <button 
            type="button" 
            onClick={() => setIsMasking(true)}
            className={`p-3 rounded-2xl border transition-all ${activeMask ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'}`}
            title="Pintar área de edición"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2}/></svg>
          </button>
          
          <input 
            type="text" 
            value={editPrompt} 
            onChange={e => setEditPrompt(e.target.value)} 
            placeholder={activeMask ? "Describe el cambio en la zona..." : "Refinar iluminación, fondo..."} 
            className="flex-1 bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-3 text-xs text-white focus:border-blue-500/50 transition-all outline-none" 
          />
          
          <button type="submit" className="p-3 bg-blue-600 rounded-2xl hover:bg-blue-500 shadow-lg active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2}/></svg>
          </button>
        </form>
      </div>
    </div>
  );
};

const LabVariantCard: React.FC<{
  variant: PromptVariant;
  index: number;
  onAdjust: (idx: number, instruction: string) => Promise<void>;
}> = ({ variant, index, onAdjust }) => {
  const [instruction, setInstruction] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || isAdjusting) return;
    setIsAdjusting(true);
    await onAdjust(index, instruction);
    setIsAdjusting(false);
    setInstruction('');
  };

  return (
    <div className="bg-[#020817] p-12 rounded-[4rem] border border-white/5 group relative overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="absolute top-0 left-0 w-2.5 h-full bg-indigo-600/80 group-hover:w-4 transition-all"></div>
      {isAdjusting && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Ajustando Prompt...</p>
        </div>
      )}
      <div className="flex justify-between items-start mb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-5 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">{variant.name}</span>
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Architect Variant {index + 1}</h3>
        </div>
        <button 
          onClick={() => { navigator.clipboard.writeText(variant.prompt); alert("JSON Copiado al Portapapeles."); }} 
          className="px-8 py-4 bg-white/5 border border-white/10 rounded-3xl text-[11px] font-black text-slate-300 hover:text-white hover:bg-indigo-600 hover:border-indigo-400 transition-all uppercase tracking-widest flex items-center gap-4 shadow-2xl active:scale-95"
        >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" strokeWidth={2}/></svg>
           Exportar JSON
        </button>
      </div>

      <div className="bg-black/60 p-10 rounded-[3rem] border border-white/5 font-mono text-[13px] leading-relaxed text-indigo-200/60 relative mb-8">
        <div className="absolute top-5 right-10 text-[9px] font-black text-indigo-500/20 uppercase tracking-widest">Metadata: Professional Prompt</div>
        {variant.prompt}
      </div>

      <div className="mb-10 p-2 bg-slate-900/50 rounded-3xl border border-white/5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            placeholder="Ajustar posición, luz, colores..."
            className="flex-1 bg-transparent border-none px-6 py-4 text-xs text-white placeholder:text-slate-600 outline-none font-medium"
          />
          <button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg"
          >
            Refinar Prompt
          </button>
        </form>
      </div>

      <div className="mt-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-t border-white/5 pt-10">
        <div className="space-y-3 flex-1">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Especificaciones del Motor:</p>
           <p className="text-xs text-slate-400 italic font-medium leading-relaxed max-w-xl">"{variant.technical_specs}"</p>
        </div>
        <div className="px-6 py-3 bg-green-500/5 border border-green-500/10 rounded-2xl text-[10px] font-black text-green-500/40 uppercase italic tracking-widest">Optimizado para 4K Engine</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<'generator' | 'prompt-lab' | 'composer'>('generator');

  // Composer State
  const [composerProduct, setComposerProduct] = useState<ImageFile[]>([]);
  const [composerStyle, setComposerStyle] = useState<ImageFile[]>([]);
  const [composerPrompt, setComposerPrompt] = useState('');
  const [composerRatio, setComposerRatio] = useState('1:1');
  const [composerBgUrl, setComposerBgUrl] = useState<string | null>(null);
  const [composerStage, setComposerStage] = useState<'setup' | 'canvas'>('setup');
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [composerAnalyzedData, setComposerAnalyzedData] = useState<AnalyzedConcept | null>(null);
  const [isAnalyzingComposerStyle, setIsAnalyzingComposerStyle] = useState(false);
  
  // Generator State
  const [productImages, setProductImages] = useState<ImageFile[]>([]);
  const [referenceImage, setReferenceImage] = useState<ImageFile[]>([]);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedConcept | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [variationCount, setVariationCount] = useState(1);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [inspectingImage, setInspectingImage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Lab State
  const [labImage, setLabImage] = useState<ImageFile[]>([]);
  const [labResults, setLabResults] = useState<PromptVariant[]>([]);
  const [isAnalyzingLab, setIsAnalyzingLab] = useState(false);
  const [inputKey, setInputKey] = useState('');

  const geminiServiceRef = useRef<GeminiService | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        if (await window.aistudio.hasSelectedApiKey()) {
          setHasApiKey(true);
        }
      } else {
        const localKey = localStorage.getItem('studiobanana_api_key');
        const envKey = process.env.API_KEY;
        if (
          (localKey && localKey.trim() !== '') ||
          (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey.trim() !== '')
        ) {
          setHasApiKey(true);
        }
      }
    };
    checkKey();
  }, []);

  const getService = () => (geminiServiceRef.current || (geminiServiceRef.current = new GeminiService()));

  const handleComposerStyleUpload = async (files: ImageFile[]) => {
    if (files.length === 0) return;
    if (composerProduct.length === 0) {
      alert("Sube primero el producto para tener el contexto de integración.");
      return;
    }
    setComposerStyle(files);
    setIsAnalyzingComposerStyle(true);
    try {
      const service = getService();
      const analysis = await service.analyzeReferenceImage(composerProduct, files[0]);
      setComposerAnalyzedData(analysis);
      setComposerPrompt(analysis.masterPrompt);
    } catch (e: any) {
      console.error("Análisis de estilo fallido", e);
      setErrorMessage("Error al analizar estilo de referencia: " + (e.message || "Error desconocido"));
      if (e.message && e.message.includes("Requested entity was not found.")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
        }
      }
    } finally {
      setIsAnalyzingComposerStyle(false);
    }
  };

  const handleGenerateBg = async () => {
    if (composerProduct.length === 0) {
      alert("Por favor, sube un producto primero.");
      return;
    }
    setIsGeneratingBg(true);
    setStatus(AppStatus.GENERATING);
    try {
      const service = getService();
      const bgUrl = await service.generateEmptyScene(
        composerStyle[0] || null,
        composerPrompt,
        composerAnalyzedData || undefined,
        composerRatio
      );
      setComposerBgUrl(bgUrl);
      setComposerStage('canvas');
      setStatus(AppStatus.SUCCESS);
      setErrorMessage(null);
    } catch (e: any) {
      console.error("Error al generar fondo:", e);
      setErrorMessage("Error al generar fondo: " + (e.message || "Error desconocido"));
      setStatus(AppStatus.ERROR);
      if (e.message && e.message.includes("Requested entity was not found.")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
        }
      }
    } finally {
      setIsGeneratingBg(false);
    }
  };

  const handleExportMontage = (exportedDataUrl: string) => {
    setResults(prev => [{
      imageUrl: exportedDataUrl,
      prompt: `Montaje Híbrido: ${composerPrompt || "Fondo personalizado"}`,
      timestamp: Date.now()
    }, ...prev]);
    setActiveTool('generator');
    alert("¡Montaje exportado con éxito a la galería principal!");
  };

  const handleStyleReferenceUpload = async (files: ImageFile[]) => {
    if (files.length === 0) return;
    if (productImages.length === 0) {
      alert("Sube primero fotos del producto para que la IA entienda qué debe integrar.");
      return;
    }
    setReferenceImage(files);
    setIsAnalyzingStyle(true);
    try {
      const service = getService();
      const analysis = await service.analyzeReferenceImage(productImages, files[0]);
      setAnalyzedData(analysis);
      setPrompt(analysis.masterPrompt);
    } catch (e: any) {
      console.error("Análisis fallido", e);
      setErrorMessage("Error al analizar la imagen de referencia: " + (e.message || "Error desconocido"));
      if (e.message && e.message.includes("Requested entity was not found.")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
        }
      }
    } finally {
      setIsAnalyzingStyle(false);
    }
  };

  const handleGenerate = async () => {
    if (productImages.length === 0) return;
    setStatus(AppStatus.GENERATING);
    const totalSteps = variationCount + (selectedShot ? 1 : 0);
    setProgress({ current: 0, total: totalSteps });
    
    try {
      const service = getService();
      
      for (let i = 0; i < variationCount; i++) {
        setProgress(p => ({ ...p, current: p.current + 1 }));
        const url = await service.generateProductImage(productImages, referenceImage[0] || null, prompt, i, analyzedData || undefined, undefined, null, null, selectedRatio);
        setResults(prev => [{ imageUrl: url, prompt, timestamp: Date.now() + i }, ...prev]);
        if (i < variationCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      if (selectedShot) {
        setProgress(p => ({ ...p, current: p.current + 1 }));
        const shotInfo = SHOT_TYPES.find(s => s.id === selectedShot);
        const url = await service.generateProductImage(productImages, referenceImage[0] || null, prompt, 0, analyzedData || undefined, shotInfo?.label, null, null, selectedRatio);
        setResults(prev => [{ imageUrl: url, prompt: `Especial: ${shotInfo?.label}`, timestamp: Date.now() + 99 }, ...prev]);
      }

      setStatus(AppStatus.SUCCESS);
      setErrorMessage(null);
    } catch (e: any) { 
      console.error("Error generating image:", e);
      if (e.message && e.message.includes("Requested entity was not found.")) {
        setHasApiKey(false);
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
          setHasApiKey(true);
        }
      } else {
        setErrorMessage(e.message || "Error desconocido");
        setStatus(AppStatus.ERROR); 
      }
    } finally {
      setProgress({ current: 0, total: 0 });
    }
  };

  const runPromptLab = async (files: ImageFile[]) => {
    if (files.length === 0) return;
    setLabImage(files);
    setIsAnalyzingLab(true);
    try {
      const variants = await getService().generatePromptVariants(files[0]);
      setLabResults(variants);
    } finally { setIsAnalyzingLab(false); }
  };

  const adjustLabPrompt = async (index: number, instruction: string) => {
    const currentVariant = labResults[index];
    if (!currentVariant) return;
    try {
      const adjusted = await getService().adjustPrompt(currentVariant.prompt, instruction);
      setLabResults(prev => {
        const next = [...prev];
        next[index] = adjusted;
        return next;
      });
    } catch (e) {
      console.error("Ajuste fallido", e);
    }
  };

  if (!hasApiKey) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-10 text-center">
      <div className="max-w-md w-full space-y-12 animate-in fade-in zoom-in duration-1000">
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-6 border border-white/20">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth={1.5}/></svg>
        </div>
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">StudioBanana <br/><span className="text-blue-500">Ultra Pro</span></h1>
          <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-medium">Capture Fidelity & Style Engine</p>
        </div>
        {window.aistudio ? (
          <button onClick={async () => { await window.aistudio.openSelectKey(); setHasApiKey(true); }} className="w-full py-6 bg-white text-black font-black rounded-3xl hover:bg-blue-50 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[11px]">Cargar Motor Darkroom 4K</button>
        ) : (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (inputKey.trim()) {
              localStorage.setItem('studiobanana_api_key', inputKey.trim());
              setHasApiKey(true);
            }
          }} className="space-y-4 w-full">
            <input
              type="password"
              placeholder="Ingresa tu Gemini API Key"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white focus:border-blue-500 transition-all outline-none text-center"
            />
            <button type="submit" className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-500 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[11px]">Conectar Motor Darkroom</button>
          </form>
        )}
        <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-loose">Requiere proyecto pagado con <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-500 hover:underline">billing habilitado</a></p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-[#010413] text-slate-200 overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar de Control */}
      <aside className={`bg-[#020817] border-r border-white/5 transition-all duration-700 relative flex flex-col z-30 shadow-[40px_0_100px_rgba(0,0,0,0.8)] ${sidebarOpen ? 'w-[480px]' : 'w-24'}`}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute -right-5 top-14 z-50 p-2.5 bg-blue-600 rounded-full text-white shadow-2xl hover:scale-110 transition-transform active:scale-90 border border-white/20">
          <svg className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth={3}/></svg>
        </button>

        <div className={`flex flex-col h-full ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="p-10 border-b border-white/5">
            <div className="flex items-center gap-5 mb-10">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center italic font-black text-white shadow-xl rotate-3">SB</div>
              <div>
                <h2 className="text-xl font-black tracking-tighter italic uppercase text-white leading-none">Studio Deck</h2>
                <p className="text-[9px] text-blue-500 font-black uppercase tracking-[0.3em] mt-1">Industrial Edition</p>
              </div>
            </div>
            
            <nav className="flex bg-slate-900/50 p-2 rounded-2xl border border-white/5 shadow-inner gap-1">
              <button onClick={() => setActiveTool('generator')} className={`flex-1 py-3 rounded-xl transition-all ${activeTool === 'generator' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">Generador</span>
              </button>
              <button onClick={() => setActiveTool('composer')} className={`flex-1 py-3 rounded-xl transition-all ${activeTool === 'composer' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">Fidelidad 100%</span>
              </button>
              <button onClick={() => setActiveTool('prompt-lab')} className={`flex-1 py-3 rounded-xl transition-all ${activeTool === 'prompt-lab' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}>
                <span className="text-[10px] font-black uppercase tracking-widest">Prompt Lab</span>
              </button>
            </nav>
          </div>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar pb-40">
            {activeTool === 'generator' ? (
              <>
                <ImageUploader 
                  label="1. DNA del Producto (Ángulos)" 
                  maxFiles={5} 
                  images={productImages} 
                  onUpload={f => setProductImages([...productImages, ...f])} 
                  onRemove={id => setProductImages(productImages.filter(i => i.id !== id))} 
                  description="Sube varios ángulos para fidelidad total." 
                />
                
                <div className="relative">
                  <ImageUploader 
                    label="2. Referencia de Estilo" 
                    maxFiles={1} 
                    images={referenceImage} 
                    onUpload={handleStyleReferenceUpload} 
                    onRemove={() => { setReferenceImage([]); setAnalyzedData(null); }} 
                    description="Clona la luz y atmósfera de esta imagen." 
                  />
                  {isAnalyzingStyle && (
                    <div className="absolute top-0 right-0 py-1.5 px-4 bg-blue-600 text-white rounded-full flex items-center gap-2 animate-bounce border border-white/20">
                      <span className="text-[9px] font-black uppercase italic">Analizando ADN de Estilo...</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">3. Relación de Aspecto</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ASPECT_RATIOS.map(r => (
                      <button 
                        key={r.id} 
                        onClick={() => setSelectedRatio(r.id)} 
                        className={`py-3 rounded-xl border text-center transition-all ${selectedRatio === r.id ? 'bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'}`}
                      >
                        <div className="text-[9px] font-black uppercase tracking-tighter leading-none">{r.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">4. Pre-Set de Cámara</label>
                  <div className="grid grid-cols-2 gap-3">
                    {SHOT_TYPES.map(s => (
                      <button key={s.id} onClick={() => setSelectedShot(selectedShot === s.id ? null : s.id)} className={`p-4 rounded-3xl border text-left transition-all ${selectedShot === s.id ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.02]' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'}`}>
                        <div className="text-[10px] font-black uppercase tracking-tighter mb-1 leading-tight">{s.label}</div>
                        <div className="text-[8px] opacity-40 font-medium uppercase leading-none">{s.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">5. Prompt Estructurado</label>
                    {analyzedData && <span className="text-[8px] font-black text-blue-400 px-2 py-0.5 bg-blue-400/10 rounded-full border border-blue-400/20 uppercase tracking-widest italic">Análisis Inyectado</span>}
                  </div>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-xs min-h-[160px] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-800 leading-relaxed font-medium" placeholder="Describe ajustes adicionales..." />
                </div>

                <div className="flex gap-2 p-2 bg-slate-950 rounded-2xl border border-white/5 shadow-inner">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setVariationCount(n)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all uppercase ${variationCount === n ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:text-slate-500'}`}>{n} Tomas</button>
                  ))}
                </div>
              </>
            ) : activeTool === 'composer' ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] relative overflow-hidden group">
                  <p className="text-[11px] font-black text-blue-400 italic mb-3 tracking-tight uppercase">MONTAJE DE FIDELIDAD TOTAL</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-medium">Garantiza el 100% de parecido de tu producto colocándolo sobre fondos de IA sin alterar sus píxeles.</p>
                </div>

                {composerStage === 'setup' ? (
                  <>
                    <ImageUploader 
                      label="1. Imagen del Producto" 
                      maxFiles={1} 
                      images={composerProduct} 
                      onUpload={setComposerProduct} 
                      onRemove={() => { setComposerProduct([]); setComposerBgUrl(null); }} 
                      description="Sube una foto de tu producto (PNG transparente o fondo sólido)." 
                    />

                    <div className="relative">
                      <ImageUploader 
                        label="2. Estilo del Escenario (Opcional)" 
                        maxFiles={1} 
                        images={composerStyle} 
                        onUpload={handleComposerStyleUpload} 
                        onRemove={() => { setComposerStyle([]); setComposerAnalyzedData(null); }} 
                        description="Copia la luz y atmósfera de esta imagen para el fondo." 
                      />
                      {isAnalyzingComposerStyle && (
                        <div className="absolute top-0 right-0 py-1.5 px-4 bg-blue-600 text-white rounded-full flex items-center gap-2 animate-bounce border border-white/20">
                          <span className="text-[9px] font-black uppercase italic">Analizando ADN de Estilo...</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">3. Relación de Aspecto</label>
                      <div className="grid grid-cols-5 gap-2">
                        {ASPECT_RATIOS.map(r => (
                          <button 
                            key={r.id} 
                            onClick={() => setComposerRatio(r.id)} 
                            className={`py-3 rounded-xl border text-center transition-all ${composerRatio === r.id ? 'bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-slate-900/50 border-white/5 text-slate-500 hover:border-white/10'}`}
                          >
                            <div className="text-[9px] font-black uppercase tracking-tighter leading-none">{r.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">4. Descripción del Escenario</label>
                        {composerAnalyzedData && <span className="text-[8px] font-black text-blue-400 px-2 py-0.5 bg-blue-400/10 rounded-full border border-blue-400/20 uppercase tracking-widest italic">Estilo Extraído</span>}
                      </div>
                      <textarea value={composerPrompt} onChange={e => setComposerPrompt(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-3xl p-6 text-xs min-h-[140px] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-800 leading-relaxed font-medium" placeholder="Escribe el fondo que deseas: ej. Una mesa de mármol negro con iluminación lateral y plantas desenfocadas..." />
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 bg-slate-950/50 p-6 rounded-3xl border border-white/5 text-center">
                    <p className="text-xs text-slate-400 uppercase font-black tracking-widest">¡Lienzo Inicializado!</p>
                    <p className="text-[10px] text-slate-600 uppercase leading-loose">
                      Usa el panel de la derecha de la galería para ajustar el tamaño, rotación, iluminación y sombras del producto.
                    </p>
                    <button onClick={() => setComposerStage('setup')} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-xl border border-white/5 transition-all">
                      Ajustar Escenario
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform"><svg className="w-16 h-16 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div>
                  <p className="text-[11px] font-black text-blue-400 italic mb-3 tracking-tight uppercase">PROMPT ARCHITECT LAB</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed uppercase font-medium">Extrae el código genético visual de cualquier imagen profesional para replicar su calidad exacta.</p>
                </div>
                <ImageUploader label="Imagen de Estudio" maxFiles={1} images={labImage} onUpload={runPromptLab} onRemove={() => { setLabImage([]); setLabResults([]); }} description="Sube una referencia para desglosar." />
              </div>
            )}
          </div>

          <div className="p-10 bg-gradient-to-t from-black to-transparent border-t border-white/5 absolute bottom-0 left-0 right-0 backdrop-blur-xl z-40">
            {activeTool === 'generator' ? (
              <button 
                onClick={handleGenerate} 
                disabled={status === AppStatus.GENERATING || productImages.length === 0} 
                className="w-full py-7 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(37,99,235,0.4)] disabled:opacity-50 hover:scale-[1.02] transition-all active:scale-95 text-white border border-white/10"
              >
                {status === AppStatus.GENERATING 
                  ? `REVELANDO SET 4K... (${progress.current}/${progress.total})` 
                  : "DISPARAR PRODUCCIÓN"}
              </button>
            ) : activeTool === 'composer' ? (
              composerStage === 'setup' ? (
                <button 
                  onClick={handleGenerateBg} 
                  disabled={status === AppStatus.GENERATING || composerProduct.length === 0} 
                  className="w-full py-7 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(37,99,235,0.4)] disabled:opacity-50 hover:scale-[1.02] transition-all active:scale-95 text-white border border-white/10"
                >
                  {status === AppStatus.GENERATING 
                    ? "GENERANDO ESCENARIO..." 
                    : "GENERAR FONDO CON IA"}
                </button>
              ) : (
                <button 
                  disabled 
                  className="w-full py-7 bg-slate-900 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] text-slate-500 border border-white/5 opacity-50"
                >
                  LIENZO ACTIVO
                </button>
              )
            ) : (
              <button 
                onClick={() => labImage[0] && runPromptLab(labImage)} 
                disabled={isAnalyzingLab || labImage.length === 0} 
                className="w-full py-7 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-[2.5rem] font-black text-[13px] uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(79,70,229,0.3)] disabled:opacity-50 hover:scale-[1.02] transition-all active:scale-95 text-white border border-white/10"
              >
                {isAnalyzingLab ? "ESCANEANDO..." : "INICIAR INGENIERÍA"}
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Área Principal Dinámica */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#00020a]">
        <header className="h-24 border-b border-white/5 bg-[#020817]/80 backdrop-blur-3xl flex items-center justify-between px-16 z-20">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
              {activeTool === 'generator' ? 'Darkroom Gallery' : activeTool === 'composer' ? 'Composition Deck' : 'Reverse Engineer Lab'}
            </h1>
            <div className="h-6 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Nano Banana Pro 4K Active</span>
            </div>
          </div>
          
          <div className="flex gap-4">
            {!window.aistudio && (
              <button onClick={() => {
                localStorage.removeItem('studiobanana_api_key');
                setHasApiKey(false);
              }} className="text-[10px] font-black text-slate-500 hover:text-yellow-500 transition-all uppercase tracking-widest border border-white/10 px-8 py-3 rounded-full hover:bg-yellow-500/10">Cambiar API Key</button>
            )}
            {activeTool === 'generator' && results.length > 0 && (
              <button onClick={() => setResults([])} className="text-[10px] font-black text-slate-500 hover:text-red-500 transition-all uppercase tracking-widest border border-white/10 px-8 py-3 rounded-full hover:bg-red-500/10">Limpiar Sesión</button>
            )}
          </div>
        </header>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 mx-16 mt-8 rounded-2xl text-sm font-medium flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-16 custom-scrollbar">
          {activeTool === 'generator' ? (
            <div className="max-w-7xl mx-auto">
              {results.length === 0 ? (
                <div className="h-[65vh] flex flex-col items-center justify-center opacity-30 border-2 border-dashed border-white/5 rounded-[5rem] bg-[#020817]/30 backdrop-blur-sm group hover:border-blue-500/20 transition-colors">
                   <div className="p-12 bg-slate-900/50 rounded-full mb-8 group-hover:scale-110 transition-transform duration-700 shadow-2xl"><svg className="w-16 h-16 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1}/></svg></div>
                   <p className="font-black uppercase tracking-[0.6em] text-[11px] text-slate-600">Listo para el revelado digital</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 pb-40">
                  {results.map((res, i) => (
                    <ResultCard 
                      key={res.timestamp + i} 
                      res={res} 
                      index={i} 
                      onInspect={setInspectingImage} 
                      onEdit={async (url, p, mask) => {
                        const service = getService();
                        const source = { id: 'edit', data: url.split(',')[1], mimeType: 'image/png', preview: url };
                        const resUrl = await service.generateProductImage(productImages, null, p, 0, analyzedData || undefined, undefined, source, mask, selectedRatio);
                        setResults(prev => [{ imageUrl: resUrl, prompt: `Refinado: ${p}`, timestamp: Date.now() }, ...prev]);
                      }} 
                    />
                  ))}
                </div>
              )}
            </div>
          ) : activeTool === 'composer' ? (
            composerStage === 'canvas' && composerProduct[0] ? (
              <ComposerCanvas 
                productImage={composerProduct[0]} 
                backgroundImageUrl={composerBgUrl} 
                onExport={handleExportMontage} 
                onBack={() => setComposerStage('setup')} 
              />
            ) : (
              <div className="max-w-4xl mx-auto space-y-12 py-10 pb-40">
                <div className="text-center space-y-6">
                  <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white leading-tight">Hybrid <br/> Composition Lab</h2>
                  <div className="flex items-center justify-center gap-6">
                    <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-blue-500"></div>
                    <p className="text-slate-500 text-[11px] uppercase tracking-[0.5em] font-black">Fidelidad Absoluta 100% Sin Distorsión</p>
                    <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-blue-500"></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-[#020817] p-8 border border-white/5 rounded-[2.5rem] flex flex-col justify-between space-y-6 shadow-xl">
                    <div>
                      <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">Flujo Automático</span>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mt-4">1. Generar Fondo e Iniciar Lienzo</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed uppercase mt-2 font-medium">
                        Sube el producto y la referencia de estilo en el panel izquierdo. Escribe tu prompt y deja que la IA genere un escenario perfecto y vacío. Luego, el lienzo interactivo se abrirá automáticamente.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateBg}
                      disabled={isGeneratingBg || composerProduct.length === 0}
                      className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-800 disabled:opacity-40 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/25 transition-all active:scale-95 text-center"
                    >
                      {isGeneratingBg ? "CREANDO ESCENARIO..." : "GENERAR FONDO CON IA →"}
                    </button>
                  </div>

                  <div className="bg-[#020817] p-8 border border-white/5 rounded-[2.5rem] flex flex-col justify-between space-y-6 shadow-xl">
                    <div>
                      <span className="px-4 py-1.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">Flujo Manual</span>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mt-4">2. Lienzo con Fondo de Referencia</h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed uppercase mt-2 font-medium">
                        Si ya tienes una imagen de fondo o quieres realizar la composición de prueba usando directamente la imagen de referencia de estilo como fondo, puedes iniciar el lienzo inmediatamente sin consumir créditos de generación.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (composerProduct.length === 0) {
                          alert("Por favor, sube un producto primero.");
                          return;
                        }
                        setComposerBgUrl(composerStyle[0]?.preview || null);
                        setComposerStage('canvas');
                      }}
                      disabled={composerProduct.length === 0}
                      className="w-full py-5 bg-slate-900 border border-white/5 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 text-center"
                    >
                      INICIAR LIENZO DIRECTAMENTE →
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="max-w-4xl mx-auto space-y-20 py-10 pb-40">
              <div className="text-center space-y-6">
                <h2 className="text-6xl font-black italic uppercase tracking-tighter text-white leading-tight">Reverse <br/> DNA Scanner</h2>
                <div className="flex items-center justify-center gap-6">
                  <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-indigo-500"></div>
                  <p className="text-slate-500 text-[11px] uppercase tracking-[0.5em] font-black">Extracción de Parámetros Industriales</p>
                  <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-indigo-500"></div>
                </div>
              </div>

              {labImage.length === 0 ? (
                <div className="h-[55vh] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[5rem] bg-indigo-950/5 backdrop-blur-sm group hover:border-indigo-500/20 transition-colors">
                  <div className="w-36 h-36 bg-slate-900/50 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-1000 opacity-20 shadow-2xl border border-white/5">
                    <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth={1}/></svg>
                  </div>
                  <p className="text-slate-700 font-black uppercase tracking-[0.5em] text-[11px]">Sube un activo para iniciar escaneo</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-16">
                  {isAnalyzingLab ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-12">
                       <div className="relative w-48 h-48">
                         <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-full animate-ping"></div>
                         <div className="absolute inset-0 border-[6px] border-indigo-600 border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(79,70,229,0.4)]"></div>
                         <div className="absolute inset-6 bg-indigo-600/5 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/5">
                           <svg className="w-14 h-14 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeWidth={2}/></svg>
                         </div>
                       </div>
                       <p className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.6em] animate-pulse italic">Mapeando ADN de Iluminación y Óptica...</p>
                    </div>
                  ) : labResults.length > 0 && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                      {labResults.map((variant, i) => (
                        <LabVariantCard 
                          key={i} 
                          variant={variant} 
                          index={i} 
                          onAdjust={adjustLabPrompt} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {inspectingImage && (
        <ImageInspector 
          imageUrl={inspectingImage} 
          productImages={productImages}
          onClose={() => setInspectingImage(null)} 
        />
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.03); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.1); }
      `}</style>
    </div>
  );
};

export default App;
