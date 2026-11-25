import { Menu, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onCreateVenue: () => void;
}

export function Header({ onCreateVenue }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/90 bg-[#F8F7F4]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#inicio"
          className="font-display text-xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
        >
          Sonora Hub
        </a>

        {/* Zone 2: 4 concise single-line navigation links */}
        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600"
        >
          <a
            href="#catalogo"
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Catálogo
          </a>
          <a
            href="#mapa"
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Mapa
          </a>
          <a
            href="#asistente"
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Asistente IA
          </a>
          <a
            href="#despliegue"
            className="hover:text-stone-950 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Supabase &amp; Deploy
          </a>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onCreateVenue}
            className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 hover:bg-amber-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Registrar local</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            className="inline-flex md:hidden h-11 w-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 cursor-pointer"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#F8F7F4] px-4 py-4 space-y-2">
          <a
            href="#catalogo"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200/60"
          >
            Catálogo
          </a>
          <a
            href="#mapa"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200/60"
          >
            Mapa interactivo
          </a>
          <a
            href="#asistente"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200/60"
          >
            Asistente IA
          </a>
          <a
            href="#despliegue"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-200/60"
          >
            Supabase &amp; Deploy
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onCreateVenue();
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Registrar local</span>
          </button>
        </div>
      )}
    </header>
  );
}
