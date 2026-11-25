import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ItemType, Venue, VenueInput, VenueType } from '../types';

interface VenueFormModalProps {
  isOpen: boolean;
  editingVenue: Venue | null;
  hasMapsApiKey: boolean;
  onClose: () => void;
  onSave: (payload: VenueInput, editingId?: string) => Promise<void>;
}

interface PlaceInstance {
  formattedAddress?: string;
  displayName?: string;
  nationalPhoneNumber?: string;
  location?: { lat: () => number; lng: () => number } | null;
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
}

interface PlacePredictionLike {
  placeId: string;
  text: { text: string };
  mainText?: { text: string };
  secondaryText?: { text: string };
  toPlace: () => PlaceInstance;
}

interface PlacesLibraryLike {
  AutocompleteSessionToken: new () => unknown;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (req: {
      input: string;
      sessionToken?: unknown;
      includedRegionCodes?: string[];
    }) => Promise<{
      suggestions: Array<{ placePrediction?: PlacePredictionLike | null }>;
    }>;
  };
}

interface PlaceSuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  toPlace: () => PlaceInstance;
}

function PlacesAddressSearch({
  onSelectPlace,
}: {
  onSelectPlace: (data: {
    address: string;
    lat: number;
    lng: number;
    phone?: string;
    nameHint?: string;
  }) => void;
}) {
  const placesLib = useMapsLibrary('places') as unknown as PlacesLibraryLike | null;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [searching, setSearching] = useState(false);
  const sessionTokenRef = useRef<unknown>(null);

  useEffect(() => {
    if (placesLib && !sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
  }, [placesLib]);

  useEffect(() => {
    if (!placesLib || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query.trim(),
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ['mx', 'es', 'us'],
          });

        const mapped: PlaceSuggestionItem[] = raw
          .map((s) => s.placePrediction)
          .filter((p): p is PlacePredictionLike => Boolean(p))
          .map((p) => ({
            placeId: p.placeId,
            mainText: p.mainText?.text ?? p.text.text,
            secondaryText: p.secondaryText?.text ?? '',
            toPlace: () => p.toPlace(),
          }));
        setSuggestions(mapped);
      } catch (err) {
        const msg = String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [placesLib, query]);

  const handleChooseSuggestion = async (item: PlaceSuggestionItem) => {
    try {
      const place = item.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'nationalPhoneNumber'],
      });

      const loc = place.location;
      if (loc) {
        onSelectPlace({
          address: place.formattedAddress || `${item.mainText}, ${item.secondaryText}`,
          lat: loc.lat(),
          lng: loc.lng(),
          phone: place.nationalPhoneNumber ?? undefined,
          nameHint: place.displayName ?? undefined,
        });
      }
      setQuery('');
      setSuggestions([]);
      if (placesLib) {
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
      }
    } catch (err) {
      const msg = String(err);
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  if (!placesLib) return null;

  return (
    <div className="relative rounded-lg border border-stone-200 bg-[#F8F7F4] p-3">
      <label
        htmlFor="places-address-search"
        className="block text-xs font-medium text-stone-700"
      >
        Autocompletar dirección con Google Places
      </label>
      <div className="relative mt-1.5">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        />
        <input
          id="places-address-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribe una calle, colonia o lugar..."
          className="h-9 w-full rounded-md border border-stone-300 bg-white pl-8 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none"
        />
      </div>
      {searching && <p className="mt-1 text-[11px] text-stone-500">Buscando direcciones...</p>}
      {suggestions.length > 0 && (
        <ul className="mt-1.5 max-h-40 overflow-y-auto divide-y divide-stone-100 rounded-md border border-stone-200 bg-white shadow-sm">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleChooseSuggestion(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-amber-50 cursor-pointer"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                <span>
                  <span className="font-medium text-stone-900">{s.mainText}</span>
                  {s.secondaryText && (
                    <span className="block text-[11px] text-stone-500">{s.secondaryText}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type DraftItem = {
  item_type: ItemType;
  category: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  price_unit: string;
  available: boolean;
};

const DEFAULT_DRAFT_ITEM: DraftItem = {
  item_type: 'instrumento',
  category: 'Guitarra',
  name: '',
  description: '',
  price: 100,
  currency: 'USD',
  price_unit: 'unidad',
  available: true,
};

export function VenueFormModal({
  isOpen,
  editingVenue,
  hasMapsApiKey,
  onClose,
  onSave,
}: VenueFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<VenueType>('tienda');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hours, setHours] = useState('Lun–Sáb 10:00–19:00');
  const [latitude, setLatitude] = useState('19.4195');
  const [longitude, setLongitude] = useState('-99.1606');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingVenue) {
      setName(editingVenue.name);
      setType(editingVenue.type);
      setAddress(editingVenue.address);
      setNeighborhood(editingVenue.neighborhood);
      setContactPhone(editingVenue.contact_phone);
      setContactEmail(editingVenue.contact_email);
      setHours(editingVenue.hours || 'Lun–Sáb 10:00–19:00');
      setLatitude(String(editingVenue.latitude));
      setLongitude(String(editingVenue.longitude));
      setDescription(editingVenue.description);
      setItems(
        editingVenue.items.map((i) => ({
          item_type: i.item_type,
          category: i.category,
          name: i.name,
          description: i.description,
          price: i.price,
          currency: i.currency,
          price_unit: i.price_unit,
          available: i.available,
        }))
      );
    } else {
      setName('');
      setType('tienda');
      setAddress('');
      setNeighborhood('');
      setContactPhone('');
      setContactEmail('');
      setHours('Lun–Sáb 10:00–19:00');
      setLatitude('19.4195');
      setLongitude('-99.1606');
      setDescription('');
      setItems([{ ...DEFAULT_DRAFT_ITEM }]);
    }
  }, [isOpen, editingVenue]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError('Latitud y longitud deben ser valores numéricos válidos.');
      return;
    }

    const cleanedItems = items.filter((i) => i.name.trim().length > 0);
    setSubmitting(true);
    try {
      await onSave(
        {
          name: name.trim(),
          type,
          address: address.trim(),
          neighborhood: neighborhood.trim(),
          contact_phone: contactPhone.trim(),
          contact_email: contactEmail.trim(),
          hours: hours.trim(),
          latitude: latNum,
          longitude: lngNum,
          description: description.trim(),
          image_url: editingVenue?.image_url,
          items: cleanedItems,
        },
        editingVenue?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el local.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={editingVenue ? 'Editar local musical' : 'Registrar nuevo local musical'}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <h3 className="font-display text-xl font-semibold text-stone-950">
            {editingVenue ? 'Editar local y catálogo' : 'Registrar nuevo local musical'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700">Nombre del local</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Casa Musical Bellavista"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VenueType)}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              >
                <option value="tienda">Tienda de instrumentos</option>
                <option value="escuela">Escuela de música</option>
                <option value="estudio">Estudio / Sala</option>
              </select>
            </div>
          </div>

          {hasMapsApiKey && (
            <PlacesAddressSearch
              onSelectPlace={(p) => {
                setAddress(p.address);
                setLatitude(String(Number(p.lat.toFixed(6))));
                setLongitude(String(Number(p.lng.toFixed(6))));
                if (p.phone && !contactPhone) setContactPhone(p.phone);
                if (p.nameHint && !name) setName(p.nameHint);
              }}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700">Dirección completa</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, colonia, ciudad"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Zona / Colonia</label>
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Roma Norte, Polanco..."
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-stone-700">Teléfono</label>
              <input
                type="text"
                required
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+52 55 1234 5678"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm font-mono tabular-nums focus:border-amber-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Email (opcional)</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contacto@local.mx"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Horario</label>
              <input
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="Lun–Sáb 10:00–19:00"
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus:border-amber-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-700">Latitud</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm font-mono tabular-nums focus:border-amber-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">Longitud</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm font-mono tabular-nums focus:border-amber-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700">Descripción</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Especialidades del local, instrumentos destacados o servicios..."
              className="mt-1 w-full rounded-lg border border-stone-300 p-3 text-sm focus:border-amber-700 focus:outline-none"
            />
          </div>

          {/* Dynamic Catalog Items */}
          <div className="border-t border-stone-200 pt-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-stone-950">
                  Instrumentos, clases y servicios ({items.length})
                </h4>
                <p className="text-xs text-stone-500">
                  Agrega los productos o clases con su precio para que aparezcan en búsquedas y en
                  el asistente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, { ...DEFAULT_DRAFT_ITEM }])}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100 cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Añadir ítem</span>
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-stone-200 bg-[#F8F7F4] p-3 space-y-2.5"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-3">
                      <select
                        value={item.item_type}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, item_type: e.target.value as ItemType } : it
                            )
                          )
                        }
                        aria-label="Tipo de oferta"
                        className="h-9 w-full rounded-md border border-stone-300 bg-white px-2 text-xs"
                      >
                        <option value="instrumento">Instrumento</option>
                        <option value="clase">Clase</option>
                        <option value="servicio">Servicio</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, category: e.target.value } : it
                            )
                          )
                        }
                        placeholder="Categoría (Piano...)"
                        className="h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, name: e.target.value } : it))
                          )
                        }
                        placeholder="Nombre del producto o clase"
                        className="h-9 w-full rounded-md border border-stone-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, price: Number(e.target.value) } : it
                            )
                          )
                        }
                        aria-label="Precio"
                        className="h-9 w-full rounded-md border border-stone-300 bg-white px-2 text-xs font-mono tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="Quitar ítem"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-stone-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-9">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, description: e.target.value } : it
                            )
                          )
                        }
                        placeholder="Descripción breve (opcional)"
                        className="h-8 w-full rounded-md border border-stone-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={item.price_unit}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, price_unit: e.target.value } : it
                            )
                          )
                        }
                        placeholder="Unidad (mes, hora...)"
                        className="h-8 w-full rounded-md border border-stone-300 bg-white px-2.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting
                ? 'Guardando...'
                : editingVenue
                  ? 'Guardar cambios'
                  : 'Registrar local'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
