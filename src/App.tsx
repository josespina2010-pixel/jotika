import { APIProvider } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useState } from 'react';
import { AssistantSection } from './components/AssistantSection';
import { CatalogSection } from './components/CatalogSection';
import { DeploymentSection } from './components/DeploymentSection';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MapSection } from './components/MapSection';
import { VenueDetailDrawer } from './components/VenueDetailDrawer';
import { VenueFormModal } from './components/VenueFormModal';
import type { CatalogItemInput, HealthStatus, ItemType, Venue, VenueInput, VenueType } from './types';

export default function App() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [venueTypeFilter, setVenueTypeFilter] = useState<VenueType | 'all'>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Map & Modals
  const [selectedMapVenueId, setSelectedMapVenueId] = useState<string | null>(null);
  const [detailVenueId, setDetailVenueId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const fetchVenues = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/venues');
      const data = (await res.json()) as { venues?: Venue[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Error cargando el catálogo.');
      }
      const loaded = data.venues ?? [];
      setVenues(loaded);
      setSelectedMapVenueId((prev) => prev ?? (loaded[0]?.id || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red cargando locales.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = (await res.json()) as HealthStatus;
        setHealth(data);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchVenues();
    fetchHealth();

    if (!mapsApiKey) {
      fetch('/api/public-config')
        .then((r) => r.json())
        .then((d: { googleMapsApiKey?: string }) => {
          if (d.googleMapsApiKey) {
            setMapsApiKey(d.googleMapsApiKey);
          }
        })
        .catch(() => {});
    }
  }, [fetchVenues, fetchHealth, mapsApiKey]);

  const handleSaveVenue = async (payload: VenueInput, editingId?: string) => {
    const url = editingId ? `/api/venues/${editingId}` : '/api/venues';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { venue?: Venue; error?: string };
    if (!res.ok || !data.venue) {
      throw new Error(data.error || 'No se pudo guardar el local.');
    }
    await fetchVenues();
    await fetchHealth();
    setSelectedMapVenueId(data.venue.id);
  };

  const handleDeleteVenue = async (venueId: string) => {
    const res = await fetch(`/api/venues/${venueId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error || 'No se pudo eliminar el local.');
    }
    if (selectedMapVenueId === venueId) setSelectedMapVenueId(null);
    if (detailVenueId === venueId) setDetailVenueId(null);
    await fetchVenues();
    await fetchHealth();
  };

  const handleAddItem = async (venueId: string, item: CatalogItemInput) => {
    const res = await fetch(`/api/venues/${venueId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo agregar la oferta.');
    }
    await fetchVenues();
    await fetchHealth();
  };

  const handleUpdateItem = async (itemId: string, item: CatalogItemInput) => {
    const res = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo actualizar la oferta.');
    }
    await fetchVenues();
    await fetchHealth();
  };

  const handleDeleteItem = async (itemId: string) => {
    const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchVenues();
      await fetchHealth();
    }
  };

  const handleReseed = async () => {
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    });
    if (res.ok) {
      await fetchVenues();
      await fetchHealth();
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const focusVenueOnMap = (venueId: string) => {
    setSelectedMapVenueId(venueId);
    scrollToSection('mapa');
  };

  const detailVenue = venues.find((v) => v.id === detailVenueId) ?? null;

  const content = (
    <div className="min-h-screen bg-[#F8F7F4] text-[#141413]">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Header
        onCreateVenue={() => {
          setEditingVenue(null);
          setFormOpen(true);
        }}
      />

      <main>
        <HeroSection
          venues={venues}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onJumpToCatalog={() => scrollToSection('catalogo')}
          onJumpToAssistant={() => scrollToSection('asistente')}
        />

        <CatalogSection
          venues={venues}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          venueTypeFilter={venueTypeFilter}
          onVenueTypeChange={setVenueTypeFilter}
          itemTypeFilter={itemTypeFilter}
          onItemTypeChange={setItemTypeFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          onSelectVenueDetail={(venue) => setDetailVenueId(venue.id)}
          onFocusVenueOnMap={(venue) => focusVenueOnMap(venue.id)}
          onEditVenue={(venue) => {
            setEditingVenue(venue);
            setFormOpen(true);
          }}
          onDeleteVenue={handleDeleteVenue}
          onCreateVenue={() => {
            setEditingVenue(null);
            setFormOpen(true);
          }}
        />

        <MapSection
          venues={venues}
          selectedVenueId={selectedMapVenueId}
          onSelectVenueId={setSelectedMapVenueId}
          onOpenDetail={(venue) => setDetailVenueId(venue.id)}
          onEditVenue={(venue) => {
            setEditingVenue(venue);
            setFormOpen(true);
          }}
          hasMapsApiKey={Boolean(mapsApiKey)}
        />

        <AssistantSection onJumpToVenueOnMap={(venueId) => focusVenueOnMap(venueId)} />

        <DeploymentSection
          health={health}
          onReseed={handleReseed}
          onRefreshHealth={fetchHealth}
        />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>Sonora Hub · Directorio de tiendas, escuelas y estudios musicales</p>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#catalogo" className="hover:text-stone-900">
              Catálogo
            </a>
            <a href="#mapa" className="hover:text-stone-900">
              Mapa
            </a>
            <a href="#asistente" className="hover:text-stone-900">
              Asistente IA
            </a>
            <a href="#despliegue" className="hover:text-stone-900">
              Supabase &amp; Render
            </a>
          </div>
        </div>
      </footer>

      <VenueDetailDrawer
        venue={detailVenue}
        onClose={() => setDetailVenueId(null)}
        onEditVenue={(venue) => {
          setEditingVenue(venue);
          setFormOpen(true);
        }}
        onFocusOnMap={(venue) => focusVenueOnMap(venue.id)}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
      />

      <VenueFormModal
        isOpen={formOpen}
        editingVenue={editingVenue}
        hasMapsApiKey={Boolean(mapsApiKey)}
        onClose={() => {
          setFormOpen(false);
          setEditingVenue(null);
        }}
        onSave={handleSaveVenue}
      />
    </div>
  );

  if (mapsApiKey) {
    return (
      <APIProvider apiKey={mapsApiKey} language="es" region="MX" libraries={['marker', 'places']}>
        {content}
      </APIProvider>
    );
  }

  return content;
}
