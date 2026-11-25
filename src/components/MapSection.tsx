import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiIsLoaded,
  useApiLoadingStatus,
  useMap,
  APILoadingStatus,
} from '@vis.gl/react-google-maps';
import { Eye, MapPin, Navigation, Pencil, Phone } from 'lucide-react';
import { useEffect } from 'react';
import { formatPrice, formatVenueType, getVenuePinColors } from '../lib/labels';
import type { Venue } from '../types';

interface MapSectionProps {
  venues: Venue[];
  selectedVenueId: string | null;
  onSelectVenueId: (id: string | null) => void;
  onOpenDetail: (venue: Venue) => void;
  onEditVenue: (venue: Venue) => void;
  hasMapsApiKey: boolean;
}

interface VenueMarkerProps {
  venue: Venue;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
  onOpenDetail: (venue: Venue) => void;
  onEditVenue: (venue: Venue) => void;
}

function VenueMarkerWithInfoWindow({
  venue,
  isSelected,
  onSelect,
  onClose,
  onOpenDetail,
  onEditVenue,
}: VenueMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const colors = getVenuePinColors(venue.type);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: venue.latitude, lng: venue.longitude }}
        title={venue.name}
        onClick={onSelect}
        zIndex={isSelected ? 50 : 1}
      >
        <Pin
          background={colors.background}
          borderColor={colors.borderColor}
          glyphColor={colors.glyphColor}
          scale={isSelected ? 1.25 : 1}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={300} onCloseClick={onClose}>
          <div className="p-1 font-sans text-stone-900">
            <p className="text-[11px] font-medium text-amber-800">
              {formatVenueType(venue.type)} · {venue.neighborhood || 'CDMX'}
            </p>
            <h4 className="mt-0.5 font-display text-sm font-semibold text-stone-950">
              {venue.name}
            </h4>
            <p className="mt-1 text-xs text-stone-600">{venue.address}</p>
            <p className="mt-1 font-mono text-[11px] text-stone-500 tabular-nums">
              {venue.contact_phone} · {venue.hours}
            </p>

            {venue.items.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-stone-200 pt-2">
                {venue.items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-baseline justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate font-medium text-stone-800">{item.name}</span>
                    <span className="font-mono text-stone-700 tabular-nums whitespace-nowrap shrink-0">
                      {formatPrice(item.price, item.currency, item.price_unit)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 border-t border-stone-200 pt-2">
              <button
                type="button"
                onClick={() => onOpenDetail(venue)}
                className="inline-flex items-center gap-1 rounded bg-stone-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-800 cursor-pointer"
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>Ver catálogo</span>
              </button>
              <button
                type="button"
                onClick={() => onEditVenue(venue)}
                className="inline-flex items-center gap-1 rounded border border-stone-300 px-2.5 py-1 text-[11px] font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                <span>Editar</span>
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapCameraSync({ selectedVenue }: { selectedVenue: Venue | null }) {
  const map = useMap();

  useEffect(() => {
    if (map && selectedVenue) {
      map.panTo({ lat: selectedVenue.latitude, lng: selectedVenue.longitude });
      const currentZoom = map.getZoom();
      if (currentZoom !== undefined && currentZoom < 13) {
        map.setZoom(14);
      }
    }
  }, [map, selectedVenue]);

  return null;
}

export function MapSection({
  venues,
  selectedVenueId,
  onSelectVenueId,
  onOpenDetail,
  onEditVenue,
  hasMapsApiKey,
}: MapSectionProps) {
  const isLoaded = useApiIsLoaded();
  const status = useApiLoadingStatus();

  const selectedVenue = venues.find((v) => v.id === selectedVenueId) ?? null;

  const defaultCenter =
    venues.length > 0
      ? { lat: venues[0].latitude, lng: venues[0].longitude }
      : { lat: 19.4195, lng: -99.1606 };

  return (
    <section id="mapa" className="border-b border-stone-200 bg-[#F8F7F4]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Mapa interactivo de ubicaciones
            </h2>
            <p className="mt-1.5 text-sm text-stone-600">
              Selecciona cualquier marcador o local de la lista para ver su dirección, contacto y
              ofertas musicales registradas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#B45309]" aria-hidden="true" />
              <span>Tienda</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0F766E]" aria-hidden="true" />
              <span>Escuela</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1E293B]" aria-hidden="true" />
              <span>Estudio</span>
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Synchronized sidebar list */}
          <div className="lg:col-span-4 space-y-2.5 max-h-[460px] lg:max-h-[560px] overflow-y-auto pr-1">
            {venues.map((venue) => {
              const active = venue.id === selectedVenueId;
              return (
                <button
                  key={venue.id}
                  type="button"
                  onClick={() => onSelectVenueId(venue.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-amber-700 bg-white shadow-sm'
                      : 'border-stone-200 bg-white/80 hover:border-stone-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                    <span className="font-medium text-amber-800">
                      {formatVenueType(venue.type)} · {venue.neighborhood || 'CDMX'}
                    </span>
                    <span className="font-mono tabular-nums">
                      {venue.items.length} ítems
                    </span>
                  </div>
                  <p className="mt-1 font-display text-base font-semibold text-stone-950">
                    {venue.name}
                  </p>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-stone-600">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden="true" />
                    <span className="line-clamp-2">{venue.address}</span>
                  </p>
                  <p className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-stone-500 tabular-nums">
                    <Phone className="h-3 w-3 shrink-0 text-stone-400" aria-hidden="true" />
                    <span>{venue.contact_phone}</span>
                  </p>
                </button>
              );
            })}
          </div>

          {/* Interactive Google Map */}
          <div className="lg:col-span-8">
            <div className="relative h-[460px] lg:h-[560px] w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-200">
              {!hasMapsApiKey ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <Navigation className="h-8 w-8 text-stone-500" aria-hidden="true" />
                  <h3 className="mt-3 font-display text-lg font-semibold text-stone-900">
                    Google Maps requiere clave de API
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-stone-600">
                    Configura <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code>{' '}
                    en tus variables de entorno para activar el mapa interactivo.
                  </p>
                </div>
              ) : status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                  <p className="font-display text-base font-semibold text-red-800">
                    No se pudo cargar Google Maps Platform
                  </p>
                  <p className="mt-1 max-w-md text-sm text-stone-600">
                    Verifica tu clave de Google Maps y la habilitación de Maps JavaScript API.
                  </p>
                </div>
              ) : !isLoaded ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-stone-600">
                  Cargando mapa interactivo de Google Maps...
                </div>
              ) : (
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={defaultCenter}
                  defaultZoom={12}
                  gestureHandling="cooperative"
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="h-full w-full"
                >
                  <MapCameraSync selectedVenue={selectedVenue} />
                  {venues.map((venue) => (
                    <VenueMarkerWithInfoWindow
                      key={venue.id}
                      venue={venue}
                      isSelected={venue.id === selectedVenueId}
                      onSelect={() => onSelectVenueId(venue.id)}
                      onClose={() => onSelectVenueId(null)}
                      onOpenDetail={onOpenDetail}
                      onEditVenue={onEditVenue}
                    />
                  ))}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
