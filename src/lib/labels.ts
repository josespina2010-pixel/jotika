import type { ItemType, VenueType } from '../types';

export function formatVenueType(type: VenueType): string {
  if (type === 'tienda') return 'Tienda';
  if (type === 'escuela') return 'Escuela';
  return 'Estudio';
}

export function formatItemType(type: ItemType): string {
  if (type === 'instrumento') return 'Instrumento';
  if (type === 'clase') return 'Clase';
  return 'Servicio';
}

export function formatPrice(price: number, currency = 'USD', unit = 'unidad'): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `$${formatted} ${currency} / ${unit}`;
}

export function getVenueFallbackImage(type: VenueType): string {
  if (type === 'escuela') return '/src/assets/images/venue_music_school_1795624958211.jpg';
  if (type === 'estudio') return '/src/assets/images/venue_recording_studio_1795624958382.jpg';
  return '/src/assets/images/venue_music_store_1795624957572.jpg';
}

export function getVenuePinColors(type: VenueType): {
  background: string;
  borderColor: string;
  glyphColor: string;
} {
  if (type === 'escuela') {
    return { background: '#0F766E', borderColor: '#115E59', glyphColor: '#FFFFFF' };
  }
  if (type === 'estudio') {
    return { background: '#1E293B', borderColor: '#0F172A', glyphColor: '#FFFFFF' };
  }
  return { background: '#B45309', borderColor: '#92400E', glyphColor: '#FFFFFF' };
}
