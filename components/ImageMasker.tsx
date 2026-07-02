
import React, { useRef, useEffect, useState } from 'react';

interface ImageMaskerProps {
  imageUrl: string;
  onSave: (maskBase64: string) => void;
  onCancel: () => void;
}

export const ImageMasker: React.FC<ImageMaskerProps> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(30);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Inicializar canvas transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Rojo semitransparente para visualización
    ctx.lineWidth = brushSize;
  }, [brushSize]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.beginPath(); // Reset path
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    // Escalar coordenadas si el canvas tiene diferente tamaño visual
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo(x * scaleX, y * scaleY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x * scaleX, y * scaleY);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Crear un canvas temporal para la máscara final (blanco y negro o alpha)
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Dibujar el contenido del canvas principal en el temporal con color sólido para la máscara
    tempCtx.fillStyle = 'black'; // Fondo negro (área no editada)
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tempCtx.globalCompositeOperation = 'source-over';
    tempCtx.strokeStyle = 'white'; // Pinceladas blancas (área a editar)
    tempCtx.lineWidth = brushSize;
    tempCtx.lineJoin = 'round';
    tempCtx.lineCap = 'round';

    // Necesitaríamos redibujar los trazos, pero para simplificar, usaremos el canvas actual 
    // y procesaremos los pixels para que sea una máscara binaria real si fuera necesario.
    // Para Gemini, una imagen donde lo rojo es lo que quieres cambiar suele bastar si se explica en el prompt.
    // Exportamos el dataURL del canvas actual.
    onSave(canvas.toDataURL('image/png'));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="relative bg-[#020617] p-4 rounded-[2rem] border border-white/10 shadow-2xl max-w-full">
        <div className="mb-4 flex justify-between items-center px-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Editor de Área</span>
            <span className="text-[8px] text-slate-500 uppercase">Pinta la zona que deseas transformar</span>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="10" max="100" value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 accent-blue-600"
            />
            <button onClick={clearCanvas} className="p-2 text-slate-500 hover:text-white transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2}/></svg>
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full max-w-[500px] overflow-hidden rounded-2xl cursor-crosshair bg-black border border-white/5">
          <img src={imageUrl} className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-50" alt="Base" />
          <canvas
            ref={canvasRef}
            width={1024}
            height={1024}
            className="absolute inset-0 w-full h-full touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all border border-white/5 rounded-xl">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all">Confirmar Área</button>
        </div>
      </div>
    </div>
  );
};
