import { Clock, Mail, MapPin, Pencil, Phone, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { formatItemType, formatPrice, formatVenueType } from '../lib/labels';
import type { CatalogItem, CatalogItemInput, ItemType, Venue } from '../types';

interface VenueDetailDrawerProps {
  venue: Venue | null;
  onClose: () => void;
  onEditVenue: (venue: Venue) => void;
  onFocusOnMap: (venue: Venue) => void;
  onAddItem: (venueId: string, item: CatalogItemInput) => Promise<void>;
  onUpdateItem: (itemId: string, item: CatalogItemInput) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
}

const EMPTY_ITEM: CatalogItemInput = {
  item_type: 'instrumento',
  category: 'Guitarra',
  name: '',
  description: '',
  price: 0,
  currency: 'USD',
  price_unit: 'unidad',
  available: true,
};

export function VenueDetailDrawer({
  venue,
  onClose,
  onEditVenue,
  onFocusOnMap,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: VenueDetailDrawerProps) {
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<CatalogItemInput>(EMPTY_ITEM);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  if (!venue) return null;

  const startNewItem = () => {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM);
    setItemError(null);
    setShowItemForm(true);
  };

  const startEditItem = (item: CatalogItem) => {
    setEditingItemId(item.id);
    setItemForm({
      item_type: item.item_type,
      category: item.category,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      price_unit: item.price_unit,
      available: item.available,
    });
    setItemError(null);
    setShowItemForm(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setItemError('Escribe el nombre del instrumento, clase o servicio.');
      return;
    }
    setSavingItem(true);
    setItemError(null);
    try {
      if (editingItemId) {
        await onUpdateItem(editingItemId, itemForm);
      } else {
        await onAddItem(venue.id, itemForm);
      }
      setShowItemForm(false);
      setEditingItemId(null);
      setItemForm(EMPTY_ITEM);
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Error guardando la oferta.');
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${venue.name}`}
    >
      <div className="flex h-full w-full max-w-2xl flex-col bg-[#F8F7F4] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-medium text-amber-800">
              {formatVenueType(venue.type)} · {venue.neighborhood || 'Ciudad de México'}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold text-stone-950">
              {venue.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
            {venue.description && (
              <p className="text-sm leading-relaxed text-stone-700">{venue.description}</p>
            )}
            <div className="grid grid-cols-1 gap-2.5 pt-2 text-xs text-stone-600 sm:grid-cols-2 border-t border-stone-100">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                <span>{venue.address}</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <Phone className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                <span>{venue.contact_phone}</span>
              </div>
              {venue.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <span>{venue.contact_email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                <span>{venue.hours}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3">
              <span className="font-mono text-xs text-stone-500 tabular-nums">
                Lat {venue.latitude.toFixed(4)} · Lng {venue.longitude.toFixed(4)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFocusOnMap(venue);
                  }}
                  className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 cursor-pointer"
                >
                  Ubicar en mapa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditVenue(venue);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Editar local</span>
                </button>
              </div>
            </div>
          </div>

          {/* Catalog Items Section */}
          <div>
            <div className="flex items-center justify-between gap-4">
              <h4 className="font-display text-lg font-semibold text-stone-950">
                Catálogo de instrumentos, clases y servicios ({venue.items.length})
              </h4>
              <button
                type="button"
                onClick={startNewItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Agregar oferta</span>
              </button>
            </div>

            {showItemForm && (
              <form
                onSubmit={handleSaveItem}
                className="mt-4 rounded-xl border border-amber-300 bg-white p-4 space-y-3"
              >
                <p className="text-xs font-semibold text-stone-900">
                  {editingItemId ? 'Editar oferta del catálogo' : 'Nueva oferta para este local'}
                </p>
                {itemError && <p className="text-xs text-red-700">{itemError}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700">Tipo</label>
                    <select
                      value={itemForm.item_type}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, item_type: e.target.value as ItemType }))
                      }
                      className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs"
                    >
                      <option value="instrumento">Instrumento</option>
                      <option value="clase">Clase</option>
                      <option value="servicio">Servicio</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700">Categoría</label>
                    <input
                      type="text"
                      required
                      value={itemForm.category}
                      onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="Guitarra, Piano, Mezcla..."
                      className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700">Precio (USD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={itemForm.price}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, price: Number(e.target.value) }))
                      }
                      className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs font-mono tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-700">Nombre</label>
                    <input
                      type="text"
                      required
                      value={itemForm.name}
                      onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ej. Clases de Piano Nivel Inicial"
                      className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700">Unidad</label>
                    <input
                      type="text"
                      value={itemForm.price_unit}
                      onChange={(e) => setItemForm((f) => ({ ...f, price_unit: e.target.value }))}
                      placeholder="unidad, mes, hora..."
                      className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700">Descripción</label>
                  <input
                    type="text"
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Detalles técnicos, duración o nivel..."
                    className="mt-1 h-9 w-full rounded-md border border-stone-300 px-2.5 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowItemForm(false)}
                    className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingItem}
                    className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 cursor-pointer"
                  >
                    {savingItem ? 'Guardando...' : editingItemId ? 'Actualizar' : 'Agregar'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
              {venue.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-800">
                      {formatItemType(item.item_type)} · {item.category}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-950">{item.name}</p>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono text-sm font-semibold text-stone-950 tabular-nums">
                      {formatPrice(item.price, item.currency, item.price_unit)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditItem(item)}
                        aria-label={`Editar ${item.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        aria-label={`Eliminar ${item.name}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-stone-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {venue.items.length === 0 && (
                <p className="p-6 text-center text-sm text-stone-500">
                  Este local aún no tiene instrumentos, clases o servicios registrados.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
