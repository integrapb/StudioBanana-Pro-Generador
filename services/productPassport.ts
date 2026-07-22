import { ImageFile, ProductAngle, ProductPassport, ProductView } from '../types';

export interface ProductAngleDefinition {
  id: ProductAngle;
  label: string;
  shortLabel: string;
  description: string;
  generatable: boolean;
}

export const PRODUCT_ANGLES: ProductAngleDefinition[] = [
  { id: 'front', label: 'Frontal', shortLabel: 'Frente', description: 'Vista recta principal', generatable: true },
  { id: 'front-left', label: '45° izquierdo', shortLabel: '45° Izq.', description: 'Frontal hacia la izquierda', generatable: true },
  { id: 'front-right', label: '45° derecho', shortLabel: '45° Der.', description: 'Frontal hacia la derecha', generatable: true },
  { id: 'left', label: 'Lateral izquierdo', shortLabel: 'Izquierda', description: 'Perfil completo izquierdo', generatable: true },
  { id: 'right', label: 'Lateral derecho', shortLabel: 'Derecha', description: 'Perfil completo derecho', generatable: true },
  { id: 'back', label: 'Posterior', shortLabel: 'Atrás', description: 'Vista recta posterior', generatable: true },
  { id: 'top', label: 'Superior', shortLabel: 'Arriba', description: 'Vista cenital del producto', generatable: true },
  { id: 'bottom', label: 'Inferior', shortLabel: 'Abajo', description: 'Base y detalles inferiores', generatable: true },
  { id: 'detail', label: 'Logo / detalle', shortLabel: 'Detalle', description: 'Texto, etiqueta o acabado', generatable: false },
];

export const GENERATABLE_PRODUCT_ANGLES = PRODUCT_ANGLES.filter((angle) => angle.generatable);

export function createVerifiedView(angle: ProductAngle, image: ImageFile): ProductView {
  return {
    id: crypto.randomUUID(),
    angle,
    image,
    status: 'verified',
    createdAt: Date.now(),
  };
}

export function createInferredView(angle: ProductAngle, image: ImageFile): ProductView {
  return {
    id: crypto.randomUUID(),
    angle,
    image,
    status: 'inferred',
    createdAt: Date.now(),
  };
}

export function createPassport(views: ProductView[]): ProductPassport {
  return { version: 1, views, updatedAt: Date.now() };
}

export function getPassportCoverage(passport?: ProductPassport): number {
  if (!passport) return 0;
  const covered = new Set(
    passport.views
      .filter((view) => view.angle !== 'unassigned')
      .map((view) => view.angle),
  );
  return Math.round((covered.size / PRODUCT_ANGLES.length) * 100);
}

export function getProductionImages(passport?: ProductPassport): ImageFile[] {
  if (!passport) return [];
  return passport.views
    .filter((view) => view.status === 'verified' || view.status === 'approved')
    .map((view) => view.image);
}

export function dataUrlToImageFile(dataUrl: string): ImageFile {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
  return {
    id: crypto.randomUUID(),
    data,
    mimeType,
    preview: dataUrl,
  };
}
