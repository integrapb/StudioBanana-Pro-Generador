import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProductAngle, ProductView } from '../types';
import {
  SavedProduct,
  createSavedProduct,
  deleteProduct,
  getAllProducts,
  saveProduct,
  withUpdatedPassport,
} from '../services/productStore';
import { createPassport, GENERATABLE_PRODUCT_ANGLES, getPassportCoverage, PRODUCT_ANGLES } from '../services/productPassport';
import { ProductPassportCapture } from './ProductPassportCapture';

interface Props {
  activeProductId: string | null;
  onSelect: (product: SavedProduct) => void;
  onClear: () => void;
  onInferAngle: (product: SavedProduct, angle: ProductAngle) => Promise<SavedProduct>;
}

export const ProductLibrary: React.FC<Props> = ({ activeProductId, onSelect, onClear, onInferAngle }) => {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [draftViews, setDraftViews] = useState<ProductView[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [inferringAngle, setInferringAngle] = useState<ProductAngle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) || null,
    [products, activeProductId],
  );

  const load = async () => setProducts(await getAllProducts());

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (creating) setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [creating]);

  const resetCreation = () => {
    setCreating(false);
    setNewName('');
    setDraftViews([]);
    setError(null);
  };

  const handleSave = async () => {
    if (!newName.trim() || draftViews.length === 0) return;
    setSaving(true);
    try {
      const product = createSavedProduct(newName, draftViews);
      await saveProduct(product);
      await load();
      resetCreation();
      onSelect(product);
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

  const savePassportViews = async (product: SavedProduct, views: ProductView[]) => {
    const updated = withUpdatedPassport(product, createPassport(views));
    await saveProduct(updated);
    await load();
    onSelect(updated);
    setEditing(false);
  };

  const setInferredStatus = async (product: SavedProduct, viewId: string, approved: boolean) => {
    if (!product.passport) return;
    const views = approved
      ? product.passport.views.map((view) => view.id === viewId ? { ...view, status: 'approved' as const } : view)
      : product.passport.views.filter((view) => view.id !== viewId);
    await savePassportViews(product, views);
  };

  const inferAngle = async (product: SavedProduct, angle: ProductAngle) => {
    setInferringAngle(angle);
    setError(null);
    try {
      const updated = await onInferAngle(product, angle);
      await load();
      onSelect(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo inferir esta vista.');
    } finally {
      setInferringAngle(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasaportes de producto</span>
          <p className="text-[8px] text-slate-600 mt-1">Identidad y ángulos reutilizables</p>
        </div>
        <button
          onClick={() => { setCreating(true); setDraftViews([]); }}
          className="flex items-center gap-1.5 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest"
        >
          + Nuevo
        </button>
      </div>

      {creating && (
        <div className="bg-slate-900/80 border border-blue-500/20 rounded-3xl p-5 space-y-5">
          <div>
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Crear pasaporte visual</p>
            <p className="text-[8px] text-slate-500 mt-1">Primero documentaremos el producto; después crearemos fotografías.</p>
          </div>
          <input
            ref={nameInputRef}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nombre o SKU del producto..."
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white outline-none focus:border-blue-500/50"
          />
          <ProductPassportCapture views={draftViews} onChange={setDraftViews} />
          <div className="flex gap-2">
            <button onClick={resetCreation} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-500 border border-white/5 rounded-xl">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={!newName.trim() || draftViews.length === 0 || saving}
              className="flex-1 py-3 text-[9px] font-black uppercase bg-blue-600 disabled:opacity-40 text-white rounded-xl"
            >
              {saving ? 'Guardando...' : 'Crear pasaporte'}
            </button>
          </div>
        </div>
      )}

      {products.length === 0 && !creating ? (
        <div className="border border-dashed border-white/10 rounded-2xl py-6 text-center">
          <p className="text-[9px] text-slate-600 uppercase">Crea tu primer pasaporte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => {
            const active = product.id === activeProductId;
            const coverage = getPassportCoverage(product.passport);
            return (
              <button
                key={product.id}
                onClick={() => { onSelect(product); setEditing(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${active ? 'bg-blue-600/15 border-blue-500/40' : 'bg-slate-900/40 border-white/5 hover:border-white/10'}`}
              >
                <img src={product.thumbnail} alt={product.name} className="w-12 h-12 object-cover rounded-xl bg-slate-800" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[10px] font-black text-slate-200 uppercase truncate">{product.name}</span>
                  <span className="block text-[8px] text-slate-600 mt-1">{product.passport?.views.length || product.images.length} vistas · {coverage}% cobertura</span>
                </span>
                {active && <span className="text-[7px] font-black text-blue-400 uppercase">Activo</span>}
              </button>
            );
          })}
        </div>
      )}

      {activeProduct && activeProduct.passport && (
        <div className="bg-[#010513] border border-white/10 rounded-3xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-black text-white uppercase">Pasaporte activo</p>
              <p className="text-[8px] text-slate-600 mt-1">Solo las vistas verificadas o aprobadas entran al generador.</p>
            </div>
            <button onClick={() => setEditing(!editing)} className="text-[8px] font-black text-blue-400 uppercase">
              {editing ? 'Cerrar' : 'Añadir fotos'}
            </button>
          </div>

          {editing ? (
            <PassportEditor product={activeProduct} onSave={savePassportViews} />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {PRODUCT_ANGLES.map((angle) => {
                const view = activeProduct.passport?.views.find((item) => item.angle === angle.id);
                const canInfer = GENERATABLE_PRODUCT_ANGLES.some((item) => item.id === angle.id);
                return (
                  <div key={angle.id} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-slate-950 relative">
                    {view ? (
                      <>
                        <img src={view.image.preview} alt={angle.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1.5">
                          <p className="text-[7px] font-black text-white uppercase truncate">{angle.shortLabel}</p>
                          <p className={`text-[6px] font-black uppercase ${view.status === 'inferred' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {view.status === 'verified' ? 'Verificada' : view.status === 'approved' ? 'Aprobada' : 'Inferida'}
                          </p>
                        </div>
                        {view.status === 'inferred' && (
                          <div className="absolute inset-x-1 top-1 flex gap-1">
                            <button onClick={() => setInferredStatus(activeProduct, view.id, true)} className="flex-1 bg-emerald-600 text-white rounded-md text-[7px] py-1" title="Aprobar">✓</button>
                            <button onClick={() => setInferredStatus(activeProduct, view.id, false)} className="flex-1 bg-red-600 text-white rounded-md text-[7px] py-1" title="Descartar">×</button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full p-1 flex flex-col items-center justify-center text-center">
                        <p className="text-[7px] font-black text-slate-600 uppercase">{angle.shortLabel}</p>
                        {canInfer && (
                          <button
                            onClick={() => inferAngle(activeProduct, angle.id)}
                            disabled={!!inferringAngle || activeProduct.images.length === 0}
                            className="mt-1 text-[6px] font-black text-blue-400 uppercase disabled:opacity-30"
                          >
                            {inferringAngle === angle.id ? 'Creando...' : 'Inferir IA'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && <p className="text-[8px] text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            {confirmDelete === activeProduct.id ? (
              <>
                <button onClick={() => handleDelete(activeProduct.id)} className="flex-1 py-2 text-[8px] font-black uppercase text-red-400 bg-red-500/10 rounded-lg">Confirmar borrado</button>
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 text-[8px] font-black uppercase text-slate-500 bg-slate-900 rounded-lg">Cancelar</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(activeProduct.id)} className="text-[8px] font-black text-slate-700 hover:text-red-400 uppercase">Eliminar pasaporte</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PassportEditor: React.FC<{
  product: SavedProduct;
  onSave: (product: SavedProduct, views: ProductView[]) => Promise<void>;
}> = ({ product, onSave }) => {
  const [views, setViews] = useState(product.passport?.views || []);
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <ProductPassportCapture views={views} onChange={setViews} />
      <button
        onClick={async () => { setSaving(true); await onSave(product, views); setSaving(false); }}
        disabled={saving || views.length === 0}
        className="w-full py-3 bg-blue-600 disabled:opacity-40 rounded-xl text-[8px] font-black text-white uppercase"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
};
