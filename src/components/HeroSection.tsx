import { ArrowDownRight, MessageSquareText, Search } from 'lucide-react';
import { useState } from 'react';
import type { Venue } from '../types';

interface HeroSectionProps {
  venues: Venue[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onJumpToCatalog: () => void;
  onJumpToAssistant: () => void;
}

export function HeroSection({
  venues,
  searchQuery,
  onSearchChange,
  onJumpToCatalog,
  onJumpToAssistant,
}: HeroSectionProps) {
  const [imgError, setImgError] = useState(false);

  const totalVenues = venues.length;
  const totalInstruments = venues.reduce(
    (sum, v) => sum + v.items.filter((i) => i.item_type === 'instrumento').length,
    0
  );
  const totalClasses = venues.reduce(
    (sum, v) => sum + v.items.filter((i) => i.item_type === 'clase').length,
    0
  );
  const totalServices = venues.reduce(
    (sum, v) => sum + v.items.filter((i) => i.item_type === 'servicio').length,
    0
  );

  return (
    <section id="inicio" className="border-b border-stone-200 bg-[#F8F7F4]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col justify-between lg:col-span-6 lg:pr-4">
            <div className="space-y-5">
              <p className="text-xs font-medium tracking-wide text-stone-500">
                Directorio musical · Catálogo en vivo · Mapa y asistente IA
              </p>

              <h1
                className="font-display font-semibold tracking-tight text-stone-950 leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                Tiendas, escuelas y estudios de música en un solo lugar.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-stone-600">
                Explora instrumentos en venta, clases personalizadas y salas de grabación con
                precios actualizados, ubicaciones verificadas en Google Maps y consultas directas
                mediante Gemini.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onJumpToCatalog();
                }}
                className="pt-2"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <label htmlFor="hero-search" className="sr-only">
                    Buscar instrumentos, clases, servicios o locales
                  </label>
                  <div className="relative flex-1">
                    <Search
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                      aria-hidden="true"
                    />
                    <input
                      id="hero-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Buscar guitarra, clases de piano, luthería, Roma Norte..."
                      className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-amber-700 px-5 text-sm font-medium text-white hover:bg-amber-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <span>Explorar catálogo</span>
                    <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-sm">
                <button
                  type="button"
                  onClick={onJumpToAssistant}
                  className="inline-flex items-center gap-2 font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 hover:text-amber-800 hover:decoration-amber-700 cursor-pointer"
                >
                  <MessageSquareText className="h-4 w-4 text-amber-700" aria-hidden="true" />
                  <span>Preguntar al asistente Gemini</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-72 overflow-hidden rounded-xl border border-stone-200 bg-stone-200 sm:h-96 lg:h-full lg:min-h-[380px]">
              {!imgError ? (
                <img
                  src="/src/assets/images/hero_music_atelier_1795624958554.jpg"
                  alt="Taller de luthería y tienda de guitarras acústicas y eléctricas"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-200 to-amber-100 p-6 text-center">
                  <span className="font-display text-xl font-semibold text-stone-800">
                    Sonora Hub Atelier
                  </span>
                  <span className="mt-1 text-sm text-stone-600">
                    Instrumentos, luthería y espacios musicales
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-width 4-column summary strip below hero */}
        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-stone-200 pt-8 sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="text-xs text-stone-500">Locales registrados</p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-950 tabular-nums">
              {totalVenues}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Instrumentos en venta</p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-950 tabular-nums">
              {totalInstruments}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Clases activas</p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-950 tabular-nums">
              {totalClasses}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-500">Servicios de estudio</p>
            <p className="mt-1 font-display text-2xl font-semibold text-stone-950 tabular-nums">
              {totalServices}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
