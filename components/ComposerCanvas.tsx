import React, { useRef, useEffect, useState } from 'react';
import { ImageFile } from '../types';

interface ComposerCanvasProps {
  productImage: ImageFile;
  backgroundImageUrl: string | null;
  onExport: (dataUrl: string) => void;
  onBack: () => void;
}

export const ComposerCanvas: React.FC<ComposerCanvasProps> = ({
  productImage,
  backgroundImageUrl,
  onExport,
  onBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Product transform state
  const [scale, setScale] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(0);
  const [posX, setPosX] = useState<number>(50); // percentage 0-100
  const [posY, setPosY] = useState<number>(60); // percentage 0-100
  
  // Product color filters
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [warmth, setWarmth] = useState<number>(0); // -50 to 50
  
  // Shadow state
  const [shadowOpacity, setShadowOpacity] = useState<number>(40);
  const [shadowBlur, setShadowBlur] = useState<number>(25);
  const [shadowOffsetY, setShadowOffsetY] = useState<number>(20);
  const [shadowScaleX, setShadowScaleX] = useState<number>(90); // percentage of product width
  const [shadowScaleY, setShadowScaleY] = useState<number>(15); // squashed shadow

  // Chroma Key / Background Removal Modal State
  const [showChromaModal, setShowChromaModal] = useState<boolean>(false);
  const [processedProductUrl, setProcessedProductUrl] = useState<string>(productImage.preview);
  const [chromaColor, setChromaColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [chromaTolerance, setChromaTolerance] = useState<number>(15);

  const chromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const chromaImgRef = useRef<HTMLImageElement>(null);

  // Load and draw canvas
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const prodImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    let loadedCount = 0;
    const total = backgroundImageUrl ? 2 : 1;

    const checkLoad = () => {
      loadedCount++;
      if (loadedCount === total) {
        setImagesLoaded(prev => !prev); // trigger redraw
      }
    };

    const prod = new Image();
    prod.crossOrigin = 'anonymous';
    prod.onload = () => {
      prodImgRef.current = prod;
      checkLoad();
    };
    prod.src = processedProductUrl;

    let bg: HTMLImageElement | null = null;
    if (backgroundImageUrl) {
      bg = new Image();
      bg.crossOrigin = 'anonymous';
      bg.onload = () => {
        bgImgRef.current = bg;
        checkLoad();
      };
      bg.src = backgroundImageUrl;
    } else {
      bgImgRef.current = null;
    }
  }, [processedProductUrl, backgroundImageUrl]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Background
    if (bgImgRef.current) {
      ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Dark grey placeholder background
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Esperando el fondo generado por IA...', canvas.width / 2, canvas.height / 2);
    }

    if (!prodImgRef.current) return;

    const pImg = prodImgRef.current;
    
    // Calculate sizes
    // Base scale so product fits nicely
    const maxDim = Math.max(pImg.width, pImg.height);
    const baseWidth = (pImg.width / maxDim) * (canvas.width * 0.6);
    const baseHeight = (pImg.height / maxDim) * (canvas.height * 0.6);
    
    const w = baseWidth * scale;
    const h = baseHeight * scale;
    const cx = (posX / 100) * canvas.width;
    const cy = (posY / 100) * canvas.height;

    // 1. Draw Shadow first (so it goes behind)
    if (shadowOpacity > 0) {
      ctx.save();
      
      // Shadow positioning (usually squashed below the product)
      const shadowY = cy + h / 2 - (h * (1 - shadowScaleY/100)) / 4 + shadowOffsetY;
      
      ctx.translate(cx, shadowY);
      ctx.scale(shadowScaleX / 100, shadowScaleY / 100);
      
      // Draw a blurred dark shadow using canvas shadow API or drawing an oval
      ctx.beginPath();
      // Draw ellipse shadow
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, 2 * Math.PI);
      
      // Setup blur
      ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity / 100})`;
      ctx.shadowBlur = shadowBlur;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity / 100})`;
      ctx.fill();
      
      ctx.restore();
    }

    // 2. Draw Product
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply color filters
    // Warmth is simulated via Sepia (for warm) or Hue rotate/Slight blue overlay
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (warmth > 0) {
      filterString += ` sepia(${warmth}%)`;
    } else if (warmth < 0) {
      // Negative warmth: slight cold tone
      filterString += ` hue-rotate(${warmth * 0.5}deg) saturate(${100 - warmth}%)`;
    }
    
    ctx.filter = filterString;

    ctx.drawImage(pImg, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [
    imagesLoaded,
    scale,
    rotation,
    posX,
    posY,
    brightness,
    contrast,
    saturation,
    warmth,
    shadowOpacity,
    shadowBlur,
    shadowOffsetY,
    shadowScaleX,
    shadowScaleY
  ]);

  // Dragging logic
  const [isDragging, setIsDragging] = useState(false);
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosX(Math.max(0, Math.min(100, x)));
    setPosY(Math.max(0, Math.min(100, y)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Magic Wand background remover algorithm
  const applyChromaKey = () => {
    const canvas = chromaCanvasRef.current;
    const img = chromaImgRef.current;
    if (!canvas || !img || !chromaColor) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    const targetR = chromaColor.r;
    const targetG = chromaColor.g;
    const targetB = chromaColor.b;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Euclidean distance in RGB space
      const dist = Math.sqrt(
        Math.pow(r - targetR, 2) +
        Math.pow(g - targetG, 2) +
        Math.pow(b - targetB, 2)
      );

      // Normalize distance to percentage (0 - 100)
      const pct = (dist / 442) * 100;

      if (pct <= chromaTolerance) {
        data[i + 3] = 0; // Transparent
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    if (showChromaModal && chromaColor) {
      applyChromaKey();
    }
  }, [chromaColor, chromaTolerance, showChromaModal]);

  const handleCanvasClickForColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = chromaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    setChromaColor({
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
    });
  };

  const handleSaveChroma = () => {
    const canvas = chromaCanvasRef.current;
    if (canvas) {
      setProcessedProductUrl(canvas.toDataURL('image/png'));
    }
    setShowChromaModal(false);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onExport(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-10 p-4 max-w-7xl mx-auto h-[78vh]">
      {/* Left Column: Canvas Editor */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-6 rounded-[2.5rem] border border-white/5 relative shadow-inner">
        <div className="absolute top-4 left-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lienzo Interactivo (Arrastra el producto)</span>
        </div>

        <div className="relative aspect-square w-full max-w-[500px] overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="mt-6 flex w-full max-w-[500px] gap-4">
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-slate-900 border border-white/5 hover:border-white/15 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            ← Volver
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            Exportar Montaje
          </button>
        </div>
      </div>

      {/* Right Column: Customization Deck */}
      <div className="w-full lg:w-[380px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Magic Wand Button */}
        <div className="bg-[#020817] border border-white/5 p-6 rounded-3xl space-y-4">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">1. Preparación del Producto</h4>
          <p className="text-[9px] text-slate-500 uppercase leading-relaxed">
            Si tu producto tiene un fondo de estudio sólido, usa la varita para hacerlo transparente.
          </p>
          <button
            onClick={() => setShowChromaModal(true)}
            className="w-full py-4 bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth={2}/></svg>
            Varita Mágica (Quitar Fondo)
          </button>
        </div>

        {/* Transform Tools */}
        <div className="bg-[#020817] border border-white/5 p-6 rounded-3xl space-y-5">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">2. Escala y Rotación</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Tamaño</span>
              <span>{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range" min="0.1" max="1.5" step="0.01" value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Rotación</span>
              <span>{rotation}°</span>
            </div>
            <input
              type="range" min="-180" max="180" step="1" value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Shadow Settings */}
        <div className="bg-[#020817] border border-white/5 p-6 rounded-3xl space-y-5">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">3. Configuración de Sombra</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Intensidad (Opacidad)</span>
              <span>{shadowOpacity}%</span>
            </div>
            <input
              type="range" min="0" max="100" value={shadowOpacity}
              onChange={(e) => setShadowOpacity(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Difuminado (Blur)</span>
              <span>{shadowBlur}px</span>
            </div>
            <input
              type="range" min="5" max="80" value={shadowBlur}
              onChange={(e) => setShadowBlur(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Altura (Desplazamiento Y)</span>
              <span>{shadowOffsetY}px</span>
            </div>
            <input
              type="range" min="-10" max="80" value={shadowOffsetY}
              onChange={(e) => setShadowOffsetY(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Ancho de Sombra</span>
              <span>{shadowScaleX}%</span>
            </div>
            <input
              type="range" min="50" max="150" value={shadowScaleX}
              onChange={(e) => setShadowScaleX(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Color Match Settings */}
        <div className="bg-[#020817] border border-white/5 p-6 rounded-3xl space-y-5">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">4. Ajuste de Iluminación y Tono</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Brillo</span>
              <span>{brightness}%</span>
            </div>
            <input
              type="range" min="50" max="150" value={brightness}
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Contraste</span>
              <span>{contrast}%</span>
            </div>
            <input
              type="range" min="50" max="150" value={contrast}
              onChange={(e) => setContrast(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Saturación</span>
              <span>{saturation}%</span>
            </div>
            <input
              type="range" min="0" max="200" value={saturation}
              onChange={(e) => setSaturation(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
              <span>Temperatura (Cálido / Frío)</span>
              <span>{warmth > 0 ? `+${warmth}` : warmth}</span>
            </div>
            <input
              type="range" min="-40" max="40" value={warmth}
              onChange={(e) => setWarmth(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

      </div>

      {/* Chroma Key Background Removal Modal */}
      {showChromaModal && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#020617] border border-white/10 p-8 rounded-[3rem] max-w-[600px] w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-white uppercase tracking-wider italic">Varita Mágica Chroma Key</h3>
                <p className="text-[10px] text-slate-500 uppercase mt-1">
                  Selecciona el color del fondo para hacerlo transparente.
                </p>
              </div>
              <button
                onClick={() => setShowChromaModal(false)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={3.5}/></svg>
              </button>
            </div>

            <div className="relative aspect-square w-full bg-slate-900 border border-white/5 rounded-2xl overflow-hidden cursor-crosshair">
              {/* Invisible source image to read clean pixels */}
              <img
                ref={chromaImgRef}
                src={productImage.preview}
                className="hidden"
                crossOrigin="anonymous"
                alt="Chroma Source"
              />
              <canvas
                ref={chromaCanvasRef}
                width={800}
                height={800}
                onClick={handleCanvasClickForColor}
                className="w-full h-full object-contain"
              />
              {!chromaColor && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6 text-center pointer-events-none">
                  <p className="text-xs text-blue-400 font-black uppercase tracking-widest leading-loose">
                    Haz clic en cualquier punto del fondo <br/>
                    para muestrear el color a remover.
                  </p>
                </div>
              )}
            </div>

            {chromaColor && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Color Seleccionado:</span>
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full border border-white/20 shadow-md"
                      style={{ backgroundColor: `rgb(${chromaColor.r}, ${chromaColor.g}, ${chromaColor.b})` }}
                    />
                    <span className="font-mono text-[10px] text-slate-300">
                      RGB({chromaColor.r}, {chromaColor.g}, {chromaColor.b})
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                    <span>Tolerancia (Sensibilidad)</span>
                    <span>{chromaTolerance}%</span>
                  </div>
                  <input
                    type="range" min="1" max="60" value={chromaTolerance}
                    onChange={(e) => setChromaTolerance(parseInt(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => {
                  setChromaColor(null);
                  setProcessedProductUrl(productImage.preview);
                }}
                className="flex-1 py-4 bg-slate-900 border border-white/5 text-slate-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Resetear Recorte
              </button>
              <button
                onClick={handleSaveChroma}
                disabled={!chromaColor}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
              >
                Guardar Recorte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
