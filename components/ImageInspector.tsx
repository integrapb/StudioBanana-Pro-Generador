
import React, { useState } from 'react';
import { ImageFile } from '../types';

interface ImageInspectorProps {
  imageUrl: string;
  productImages: ImageFile[];
  onClose: () => void;
}

export const ImageInspector: React.FC<ImageInspectorProps> = ({ imageUrl, productImages, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedReference, setSelectedReference] = useState<ImageFile | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-300">
      {/* Top Controls */}
      <header className="absolute top-0 left-0 right-0 h-24 flex items-center justify-between px-10 z-[110] bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.5em] mb-1">Quality Control Inspector</p>
          <div className="flex items-center gap-4">
             <p className="text-xs text-white/60 uppercase font-black tracking-widest">Zoom: {Math.round(zoom * 100)}%</p>
             {selectedReference && (
               <div className="flex items-center gap-2">
                 <div className="w-1 h-1 bg-indigo-500 rounded-full"></div>
                 <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Comparación Activa</p>
               </div>
             )}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-1 shadow-2xl">
            <button onClick={handleZoomOut} className="p-4 text-white hover:text-blue-400 transition-colors" title="Zoom Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
              </svg>
            </button>
            <div className="w-[1px] bg-white/10 my-2"></div>
            <button onClick={handleZoomIn} className="p-4 text-white hover:text-blue-400 transition-colors" title="Zoom In">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <button 
            onClick={onClose}
            className="p-4 bg-red-600/20 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-xl active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Generated Image */}
        <div 
          className={`relative flex-1 flex items-center justify-center transition-all duration-500 ${selectedReference ? 'border-r border-white/10' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute top-28 left-10 z-20">
            <span className="px-4 py-1.5 bg-blue-600/20 text-blue-500 border border-blue-600/20 rounded-lg text-[9px] font-black uppercase tracking-widest italic backdrop-blur-md">Render Generado</span>
          </div>
          <div 
            className="transition-transform duration-300 ease-out select-none cursor-grab active:cursor-grabbing"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center center'
            }}
          >
            <img 
              src={imageUrl} 
              alt="Generated" 
              className={`max-h-[75vh] w-auto shadow-[0_0_100px_rgba(0,0,0,1)] rounded-3xl ${selectedReference ? 'max-w-[45vw]' : 'max-w-[85vw]'}`}
              draggable={false}
            />
          </div>
        </div>

        {/* Right Side: Selected Reference Image (Split Mode) */}
        {selectedReference && (
          <div className="flex-1 flex items-center justify-center bg-black/40 animate-in slide-in-from-right duration-500">
            <div className="absolute top-28 right-10 z-20">
              <span className="px-4 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-600/20 rounded-lg text-[9px] font-black uppercase tracking-widest italic backdrop-blur-md">Referencia Original</span>
            </div>
            <div className="max-w-[45vw] flex items-center justify-center p-10">
              <img 
                src={selectedReference.preview} 
                alt="Reference" 
                className="max-h-[75vh] w-auto shadow-2xl rounded-3xl border border-white/5"
                draggable={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Dock: Reference Selector */}
      <footer className="absolute bottom-0 left-0 right-0 h-40 flex flex-col items-center justify-center z-[110] bg-gradient-to-t from-black via-black/90 to-transparent pb-6">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-4">Selecciona una muestra para comparar fidelidad</p>
        <div className="flex gap-4 p-2 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-x-auto max-w-[90vw] custom-scrollbar">
          <button 
            onClick={() => setSelectedReference(null)}
            className={`flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center border transition-all ${!selectedReference ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-xl scale-105' : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10'}`}
          >
            <div className="flex flex-col items-center gap-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={1.5}/></svg>
              <span className="text-[8px] font-black uppercase tracking-tighter">Solo Render</span>
            </div>
          </button>

          {productImages.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelectedReference(img)}
              className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border transition-all ${selectedReference?.id === img.id ? 'border-blue-500 shadow-xl scale-105 ring-4 ring-blue-500/20' : 'border-white/10 opacity-60 hover:opacity-100'}`}
            >
              <img src={img.preview} alt="Thumb" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};
