import React, { useState, useEffect, useRef } from 'react';
import { ImageFile } from '../types';
import {
  SavedProduct,
  getAllProducts,
  saveProduct,
  deleteProduct,
  createSavedProduct,
} from '../services/productStore';

interface Props {
  activeProductId: string | null;
  onSelect: (product: SavedProduct) => void;
  onClear: () => void;
}

// ── Tiny inline uploader for the creation modal ───────────────────────────────
function MiniUploader({
  images,
  onChange,
}: {
  images: ImageFile[];
  onChange: (imgs: ImageFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File): Promise<ImageFile> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64  = dataUrl.split(',')[1];
        resolve({
          id:       crypto.randomUUID(),
          name:     file.name,
          data:     base64,
          mimeType: file.type as ImageFile['mimeType'],
          url:      dataUrl,
        });
      };
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files: FileList) => {
    const slots = 5 - images.length;
    if (slots <= 0) return;
    const next = Array.from(files).slice(0, slots);
    const loaded = await Promise.all(next.map(readFile));
    onChange([...images, ...loaded]);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-500/40 transition-colors"
      >
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
          {images.length === 0 ? 'Arrastra o haz clic para subir ángulos' : `${images.length}/5 ángulos`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                className="w-14 h-14 object-cover rounded-xl border border-white/10"
                alt={img.name}
              />
              <button
                onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeWidth={3} />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export const ProductLibrary: React.FC<Props> = ({ activeProductId, onSelect, onClear }) => {
  const [products, setProducts]       = useState<SavedProduct[]>([]);
  const [creating, setCreating]       = useState(false);
  const [newName, setNewName]         = useState('');
  const [newImages, setNewImages]     = useState<ImageFile[]>([]);
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const load = async () => setProducts(await getAllProducts());

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (creating) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [creating]);

  const handleSave = async () => {
    if (!newName.trim() || newImages.length === 0) return;
    setSaving(true);
    try {
      const p = createSavedProduct(newName, newImages);
      await saveProduct(p);
      await load();
      setCreating(false);
      setNewName('');
      setNewImages([]);
      onSelect(p); // auto-select the newly created product
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    if (activeProductId === id) onClear();
    await load();
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Mis Productos
          </span>
          {products.length > 0 && (
            <span className="text-[8px] font-black text-slate-700 bg-slate-800 px-2 py-0.5 rounded-full">
              {products.length}
            </span>
          )}
        </div>
        <button
          onClick={() => { setCreating(true); }}
          className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeWidth={3} />
          </svg>
          Nuevo
        </button>
      </div>

      {/* Creation modal (inline) */}
      {creating && (
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-black text-white uppercase tracking-widest">Nuevo Producto</p>

          <input
            ref={nameInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Nombre del producto..."
            className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white placeholder-slate-600 outline-none focus:border-blue-500/50 transition-colors"
          />

          <MiniUploader images={newImages} onChange={setNewImages} />

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setCreating(false); setNewName(''); setNewImages([]); }}
              className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors rounded-xl border border-white/5 hover:border-white/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!newName.trim() || newImages.length === 0 || saving}
              className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl transition-all active:scale-95"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Product cards */}
      {products.length === 0 && !creating ? (
        <p className="text-[9px] text-slate-700 uppercase tracking-wide text-center py-4">
          Sin productos guardados
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => {
            const isActive = activeProductId === p.id;
            return (
              <div
                key={p.id}
                className={`group flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500/40'
                    : 'bg-slate-900/40 border-white/5 hover:border-white/10'
                }`}
                onClick={() => onSelect(p)}
              >
                {/* Thumbnail */}
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-slate-800">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" strokeWidth={1.5} />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-tight truncate ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                    {p.name}
                  </p>
                  <p className="text-[8px] text-slate-600 mt-0.5">
                    {p.images.length} ángulo{p.images.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Active badge / delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isActive && (
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest bg-blue-600/20 px-2 py-1 rounded-full">
                      Activo
                    </span>
                  )}

                  {/* Delete */}
                  {confirmDelete === p.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-[8px] font-black text-red-400 hover:text-red-300 uppercase tracking-wider px-2 py-1 bg-red-600/10 border border-red-500/20 rounded-lg transition-colors"
                      >
                        Borrar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        className="text-[8px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-wider px-2 py-1 bg-slate-800 border border-white/5 rounded-lg transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-600 hover:text-red-400 rounded-lg"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Divider shown when a product is active */}
      {activeProductId && (
        <button
          onClick={onClear}
          className="w-full text-[8px] font-black text-slate-700 hover:text-slate-500 uppercase tracking-widest transition-colors py-1"
        >
          ↑ subir manualmente en cambio
        </button>
      )}
    </div>
  );
};
