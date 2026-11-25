import { Check, Copy, Database, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { HealthStatus } from '../types';

interface DeploymentSectionProps {
  health: HealthStatus | null;
  onReseed: () => Promise<void>;
  onRefreshHealth: () => Promise<void>;
}

const SUPABASE_SCHEMA_PREVIEW = `create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('tienda', 'escuela', 'estudio')),
  address text not null,
  neighborhood text not null default '',
  contact_phone text not null,
  contact_email text not null default '',
  hours text not null default 'Lun–Sáb 10:00–19:00',
  latitude double precision not null,
  longitude double precision not null,
  description text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  item_type text not null check (item_type in ('instrumento', 'clase', 'servicio')),
  category text not null,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  currency text not null default 'USD',
  price_unit text not null default 'unidad',
  available boolean not null default true,
  created_at timestamptz not null default now()
);`;

export function DeploymentSection({
  health,
  onReseed,
  onRefreshHealth,
}: DeploymentSectionProps) {
  const [seeding, setSeeding] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onReseed();
    } finally {
      setSeeding(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_PREVIEW);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <section id="despliegue" className="bg-[#F8F7F4]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Integración con Supabase, GitHub y Render
            </h2>
            <p className="mt-1.5 text-sm text-stone-600">
              Estado en vivo de almacenamiento, esquema SQL para PostgreSQL en Supabase y variables
              de entorno protegidas en servidor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onRefreshHealth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-medium text-stone-800 hover:bg-stone-100 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Verificar conexión</span>
            </button>
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeed}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{seeding ? 'Poblando...' : 'Restaurar 6 locales iniciales'}</span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Status & Render checklist */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-3">
              <p className="text-xs font-medium text-stone-500">Estado de persistencia</p>
              <p className="font-display text-lg font-semibold text-stone-950">
                {health?.storageMode === 'supabase'
                  ? 'Conectado a Supabase PostgreSQL'
                  : 'Almacenamiento local de vista previa'}
              </p>
              <p className="text-xs leading-relaxed text-stone-600">
                {health?.storageMode === 'supabase'
                  ? 'Las operaciones de creación, edición, búsqueda y eliminación se ejecutan directamente sobre tus tablas en Supabase.'
                  : 'Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tus variables de entorno (AI Studio Secrets o Render) y ejecuta supabase/schema.sql para activar Supabase.'}
              </p>

              {health?.supabaseError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {health.supabaseError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-xs">
                <div>
                  <span className="text-stone-500">Locales activos</span>
                  <p className="font-mono text-base font-semibold text-stone-950 tabular-nums">
                    {health?.venueCount ?? 0}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Ofertas registradas</span>
                  <p className="font-mono text-base font-semibold text-stone-950 tabular-nums">
                    {health?.itemCount ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 space-y-2.5 text-xs text-stone-700">
              <p className="font-semibold text-stone-950">
                Publicación en GitHub y Render (`render.yaml`)
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 leading-relaxed">
                <li>
                  Crea el proyecto en Supabase y ejecuta{' '}
                  <code className="font-mono">supabase/schema.sql</code> en el SQL Editor.
                </li>
                <li>
                  Sube el código a GitHub; <code className="font-mono">.gitignore</code> protege{' '}
                  <code className="font-mono">.env*</code> y archivos locales.
                </li>
                <li>
                  Conecta el repositorio en Render (<code className="font-mono">npm run build</code>{' '}
                  y <code className="font-mono">npm start</code>) y define{' '}
                  <code className="font-mono">GEMINI_API_KEY</code>,{' '}
                  <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code>,{' '}
                  <code className="font-mono">SUPABASE_URL</code> y{' '}
                  <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>.
                </li>
              </ol>
            </div>
          </div>

          {/* Copyable SQL */}
          <div className="lg:col-span-7">
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-950 text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
                <span className="font-mono text-xs text-stone-300">supabase/schema.sql</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-700 px-2.5 py-1 text-xs font-medium text-stone-200 hover:bg-stone-800 cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar SQL</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="flex-1 overflow-x-auto p-4 font-mono text-xs leading-relaxed text-stone-200">
                <code>{SUPABASE_SCHEMA_PREVIEW}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
