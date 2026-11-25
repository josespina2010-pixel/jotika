import { Eye, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatItemType, formatPrice, formatVenueType, getVenueFallbackImage } from '../lib/labels';
import type { ItemType, Venue, VenueType } from '../types';

interface CatalogSectionProps {
  venues: Venue[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  venueTypeFilter: VenueType | 'all';
  onVenueTypeChange: (t: VenueType | 'all') => void;
  itemTypeFilter: ItemType | 'all';
  onItemTypeChange: (t: ItemType | 'all') => void;
  categoryFilter: string;
  onCategoryChange: (c: string) => void;
  onSelectVenueDetail: (venue: Venue) => void;
  onFocusVenueOnMap: (venue: Venue) => void;
  onEditVenue: (venue: Venue) => void;
  onDeleteVenue: (venueId: string) => Promise<void>;
  onCreateVenue: () => void;
}

export function CatalogSection({
  venues,
  loading,
  error,
  searchQuery,
  onSearchChange,
  venueTypeFilter,
  onVenueTypeChange,
  itemTypeFilter,
  onItemTypeChange,
  categoryFilter,
  onCategoryChange,
  onSelectVenueDetail,
  onFocusVenueOnMap,
  onEditVenue,
  onDeleteVenue,
  onCreateVenue,
}: CatalogSectionProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const categories = useMemo(() => {
    const unique: Record<string, true> = {};
    for (const v of venues) {
      for (const item of v.items) {
        if (item.category.trim()) {
          unique[item.category.trim()] = true;
        }
      }
    }
    return Object.keys(unique).sort((a, b) => a.localeCompare(b, 'es'));
  }, [venues]);

  const filteredVenues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return venues.filter((venue) => {
      if (venueTypeFilter !== 'all' && venue.type !== venueTypeFilter) return false;
      if (itemTypeFilter !== 'all' && !venue.items.some((i) => i.item_type === itemTypeFilter)) {
        return false;
      }
      if (
        categoryFilter !== 'all' &&
        !venue.items.some((i) => i.category.toLowerCase() === categoryFilter.toLowerCase())
      ) {
        return false;
      }
      if (q) {
        const matchesVenue =
          venue.name.toLowerCase().includes(q) ||
          venue.address.toLowerCase().includes(q) ||
          venue.neighborhood.toLowerCase().includes(q) ||
          venue.description.toLowerCase().includes(q);
        const matchesItem = venue.items.some(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q)
        );
        if (!matchesVenue && !matchesItem) return false;
      }
      return true;
    });
  }, [venues, searchQuery, venueTypeFilter, itemTypeFilter, categoryFilter]);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteVenue(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section id="catalogo" className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Catálogo de locales, instrumentos y servicios
            </h2>
            <p className="mt-1.5 text-sm text-stone-600">
              Filtra por tipo de establecimiento, oferta musical o búsqueda directa, y administra
              altas, ediciones y bajas en tiempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateVenue}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-300 bg-[#F8F7F4] px-4 text-sm font-medium text-stone-900 hover:border-amber-700 hover:bg-amber-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Agregar local al catálogo</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-[#F8F7F4] p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="relative md:col-span-5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Buscar instrumento, escuela, dirección..."
                aria-label="Filtrar catálogo por texto"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <div
                role="group"
                aria-label="Filtrar por tipo de local"
                className="flex h-10 items-center gap-1 rounded-lg border border-stone-200 bg-white p-1"
              >
                {(
                  [
                    ['all', 'Todos'],
                    ['tienda', 'Tiendas'],
                    ['escuela', 'Escuelas'],
                    ['estudio', 'Estudios'],
                  ] as const
                ).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onVenueTypeChange(val)}
                    className={`flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      venueTypeFilter === val
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-600 hover:text-stone-950'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-3">
              <select
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value)}
                aria-label="Filtrar por categoría musical"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-800 focus:border-amber-700 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200/80 pt-3">
            <div
              role="group"
              aria-label="Filtrar por tipo de oferta"
              className="flex flex-wrap items-center gap-1.5"
            >
              {(
                [
                  ['all', 'Todas las ofertas'],
                  ['instrumento', 'Instrumentos'],
                  ['clase', 'Clases'],
                  ['servicio', 'Servicios'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onItemTypeChange(val)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    itemTypeFilter === val
                      ? 'bg-amber-700 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400 hover:text-stone-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs text-stone-500 tabular-nums">
              {filteredVenues.length} {filteredVenues.length === 1 ? 'local encontrado' : 'locales encontrados'}
            </p>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-96 animate-pulse rounded-xl border border-stone-200 bg-stone-100"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredVenues.length === 0 && (
          <div className="mt-8 rounded-xl border border-stone-200 bg-[#F8F7F4] p-10 text-center">
            <h3 className="font-display text-lg font-semibold text-stone-900">
              No hay locales que coincidan con tu filtro
            </h3>
            <p className="mt-1.5 text-sm text-stone-600">
              Ajusta los criterios de búsqueda o registra un nuevo local con instrumentos, clases o
              servicios.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onVenueTypeChange('all');
                  onItemTypeChange('all');
                  onCategoryChange('all');
                }}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 cursor-pointer"
              >
                Limpiar filtros
              </button>
              <button
                type="button"
                onClick={onCreateVenue}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 cursor-pointer"
              >
                Registrar local
              </button>
            </div>
          </div>
        )}

        {/* Venue Cards Grid */}
        {!loading && filteredVenues.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue) => {
              const visibleItems = venue.items
                .filter((item) => {
                  if (itemTypeFilter !== 'all' && item.item_type !== itemTypeFilter) return false;
                  if (
                    categoryFilter !== 'all' &&
                    item.category.toLowerCase() !== categoryFilter.toLowerCase()
                  ) {
                    return false;
                  }
                  return true;
                })
                .slice(0, 3);

              const itemsToRender = visibleItems.length > 0 ? visibleItems : venue.items.slice(0, 3);
              const imgSrc = venue.image_url || getVenueFallbackImage(venue.type);

              return (
                <article
                  key={venue.id}
                  className="flex flex-col justify-between overflow-hidden rounded-xl border border-stone-200 bg-[#F8F7F4] transition-transform duration-150 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="aspect-[4/3] w-full overflow-hidden border-b border-stone-200 bg-stone-200">
                      {!brokenImages[venue.id] ? (
                        <img
                          src={imgSrc}
                          alt={venue.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [venue.id]: true }))
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-200 to-stone-300 p-4 text-center">
                          <span className="font-display text-base font-semibold text-stone-800">
                            {venue.name}
                          </span>
                          <span className="mt-1 text-xs text-stone-600">
                            {formatVenueType(venue.type)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      {/* Zero-pill metadata line */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500">
                        <span className="text-amber-800">{formatVenueType(venue.type)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{venue.neighborhood || 'CDMX'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums whitespace-nowrap">
                          {venue.items.length} {venue.items.length === 1 ? 'oferta' : 'ofertas'}
                        </span>
                      </div>

                      <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-stone-950">
                        {venue.name}
                      </h3>

                      <p className="mt-1 text-xs text-stone-600 line-clamp-2">{venue.address}</p>

                      <p className="mt-1 font-mono text-xs text-stone-500 tabular-nums">
                        {venue.contact_phone} · {venue.hours}
                      </p>

                      {/* Clean itemized preview */}
                      <div className="mt-4 divide-y divide-stone-200 border-t border-stone-200 pt-2">
                        {itemsToRender.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-baseline justify-between gap-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-stone-900">{item.name}</p>
                              <p className="text-stone-500">
                                {formatItemType(item.item_type)} · {item.category}
                              </p>
                            </div>
                            <span className="font-mono font-medium text-stone-900 tabular-nums whitespace-nowrap shrink-0">
                              {formatPrice(item.price, item.currency, item.price_unit)}
                            </span>
                          </div>
                        ))}
                        {venue.items.length === 0 && (
                          <p className="py-2 text-xs text-stone-500">
                            Sin ofertas registradas aún.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-stone-200 bg-white px-4 py-3">
                    {confirmDeleteId === venue.id ? (
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-red-700">¿Eliminar este local?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md border border-stone-300 px-2.5 py-1 font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === venue.id}
                            onClick={() => handleConfirmDelete(venue.id)}
                            className="rounded-md bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                          >
                            {deletingId === venue.id ? 'Eliminando...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectVenueDetail(venue)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Ver catálogo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onFocusVenueOnMap(venue)}
                            className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Mapa</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditVenue(venue)}
                            aria-label={`Editar ${venue.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-600 hover:bg-stone-100 hover:text-stone-950 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(venue.id)}
                            aria-label={`Eliminar ${venue.name}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
