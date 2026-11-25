import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  CatalogItem,
  CatalogItemInput,
  HealthStatus,
  ItemType,
  Venue,
  VenueInput,
  VenueType,
} from '../src/types.ts';
import { INITIAL_VENUES_SEED } from './seedData.ts';

const LOCAL_DATA_DIR = path.resolve(process.cwd(), 'data');
const LOCAL_STORE_FILE = path.join(LOCAL_DATA_DIR, 'catalog.json');

interface LocalStorePayload {
  venues: Venue[];
}

function getSupabaseCredentials(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();

  if (
    !url ||
    !key ||
    url.includes('YOUR_PROJECT_ID') ||
    key.includes('MY_SUPABASE_')
  ) {
    return null;
  }
  return { url, key };
}

let cachedClient: SupabaseClient | null = null;
let cachedCredKey = '';

function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds) {
    return null;
  }
  const cacheKey = `${creds.url}::${creds.key}`;
  if (!cachedClient || cachedCredKey !== cacheKey) {
    cachedClient = createClient(creds.url, creds.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedCredKey = cacheKey;
  }
  return cachedClient;
}

function ensureLocalStoreInitialized(): LocalStorePayload {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORE_FILE)) {
    const now = new Date().toISOString();
    const seeded: Venue[] = INITIAL_VENUES_SEED.map((seed) => {
      const venueId = randomUUID();
      return {
        id: venueId,
        name: seed.name,
        type: seed.type,
        address: seed.address,
        neighborhood: seed.neighborhood ?? '',
        contact_phone: seed.contact_phone,
        contact_email: seed.contact_email ?? '',
        hours: seed.hours ?? 'Lun–Sáb 10:00–19:00',
        latitude: seed.latitude,
        longitude: seed.longitude,
        description: seed.description ?? '',
        image_url: seed.image_url ?? '',
        created_at: now,
        updated_at: now,
        items: (seed.items ?? []).map((item) => ({
          id: randomUUID(),
          venue_id: venueId,
          item_type: item.item_type,
          category: item.category,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          currency: item.currency || 'USD',
          price_unit: item.price_unit || 'unidad',
          available: item.available ?? true,
          created_at: now,
        })),
      };
    });
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify({ venues: seeded }, null, 2), 'utf8');
  }

  const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
  return JSON.parse(raw) as LocalStorePayload;
}

function writeLocalStore(payload: LocalStorePayload): void {
  if (!fs.existsSync(LOCAL_DATA_DIR)) {
    fs.mkdirSync(LOCAL_DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function normalizeVenueRow(row: Record<string, unknown>, items: CatalogItem[]): Venue {
  return {
    id: String(row.id),
    name: String(row.name),
    type: row.type as VenueType,
    address: String(row.address),
    neighborhood: String(row.neighborhood ?? ''),
    contact_phone: String(row.contact_phone),
    contact_email: String(row.contact_email ?? ''),
    hours: String(row.hours ?? ''),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    description: String(row.description ?? ''),
    image_url: String(row.image_url ?? ''),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    items,
  };
}

function normalizeItemRow(row: Record<string, unknown>): CatalogItem {
  return {
    id: String(row.id),
    venue_id: String(row.venue_id),
    item_type: row.item_type as ItemType,
    category: String(row.category),
    name: String(row.name),
    description: String(row.description ?? ''),
    price: Number(row.price),
    currency: String(row.currency ?? 'USD'),
    price_unit: String(row.price_unit ?? 'unidad'),
    available: Boolean(row.available ?? true),
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const supabase = getSupabaseClient();
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('MY_GEMINI_API_KEY')
  );
  const mapsConfigured = Boolean(
    process.env.VITE_GOOGLE_MAPS_API_KEY &&
      !process.env.VITE_GOOGLE_MAPS_API_KEY.includes('MY_GOOGLE_MAPS_API_KEY')
  );

  if (supabase) {
    try {
      const [{ count: venueCount, error: vErr }, { count: itemCount, error: iErr }] =
        await Promise.all([
          supabase.from('venues').select('id', { count: 'exact', head: true }),
          supabase.from('catalog_items').select('id', { count: 'exact', head: true }),
        ]);

      if (vErr || iErr) {
        const errMsg = vErr?.message || iErr?.message || 'Error consultando Supabase';
        const local = ensureLocalStoreInitialized();
        return {
          ok: true,
          storageMode: 'local',
          supabaseConfigured: true,
          supabaseError: `${errMsg}. Ejecuta supabase/schema.sql en tu proyecto Supabase.`,
          geminiConfigured,
          mapsConfigured,
          venueCount: local.venues.length,
          itemCount: local.venues.reduce((acc, v) => acc + v.items.length, 0),
        };
      }

      return {
        ok: true,
        storageMode: 'supabase',
        supabaseConfigured: true,
        supabaseError: null,
        geminiConfigured,
        mapsConfigured,
        venueCount: venueCount ?? 0,
        itemCount: itemCount ?? 0,
      };
    } catch (err) {
      const local = ensureLocalStoreInitialized();
      return {
        ok: true,
        storageMode: 'local',
        supabaseConfigured: true,
        supabaseError: err instanceof Error ? err.message : 'Error conectando con Supabase',
        geminiConfigured,
        mapsConfigured,
        venueCount: local.venues.length,
        itemCount: local.venues.reduce((acc, v) => acc + v.items.length, 0),
      };
    }
  }

  const local = ensureLocalStoreInitialized();
  return {
    ok: true,
    storageMode: 'local',
    supabaseConfigured: false,
    supabaseError: null,
    geminiConfigured,
    mapsConfigured,
    venueCount: local.venues.length,
    itemCount: local.venues.reduce((acc, v) => acc + v.items.length, 0),
  };
}

export async function seedDatabase(force = false): Promise<{ inserted: number; storageMode: 'supabase' | 'local' }> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { count, error: countErr } = await supabase
      .from('venues')
      .select('id', { count: 'exact', head: true });

    if (countErr) {
      throw new Error(`Supabase no está listo: ${countErr.message}`);
    }

    if ((count ?? 0) > 0 && !force) {
      return { inserted: 0, storageMode: 'supabase' };
    }

    if (force && (count ?? 0) > 0) {
      const { error: delErr } = await supabase
        .from('venues')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (delErr) {
        throw new Error(`No se pudieron limpiar los registros previos: ${delErr.message}`);
      }
    }

    let inserted = 0;
    for (const seed of INITIAL_VENUES_SEED) {
      const { data: venueRow, error: vErr } = await supabase
        .from('venues')
        .insert({
          name: seed.name,
          type: seed.type,
          address: seed.address,
          neighborhood: seed.neighborhood ?? '',
          contact_phone: seed.contact_phone,
          contact_email: seed.contact_email ?? '',
          hours: seed.hours ?? 'Lun–Sáb 10:00–19:00',
          latitude: seed.latitude,
          longitude: seed.longitude,
          description: seed.description ?? '',
          image_url: seed.image_url ?? '',
        })
        .select('*')
        .single();

      if (vErr || !venueRow) {
        throw new Error(vErr?.message || 'Error insertando local en Supabase');
      }

      if (seed.items && seed.items.length > 0) {
        const itemsPayload = seed.items.map((item) => ({
          venue_id: venueRow.id,
          item_type: item.item_type,
          category: item.category,
          name: item.name,
          description: item.description ?? '',
          price: Number(item.price),
          currency: item.currency || 'USD',
          price_unit: item.price_unit || 'unidad',
          available: item.available ?? true,
        }));
        const { error: iErr } = await supabase.from('catalog_items').insert(itemsPayload);
        if (iErr) {
          throw new Error(iErr.message);
        }
      }
      inserted += 1;
    }

    return { inserted, storageMode: 'supabase' };
  }

  if (force && fs.existsSync(LOCAL_STORE_FILE)) {
    fs.unlinkSync(LOCAL_STORE_FILE);
  }
  const store = ensureLocalStoreInitialized();
  return { inserted: store.venues.length, storageMode: 'local' };
}

export interface VenueFilterParams {
  search?: string;
  venueType?: VenueType | 'all';
  itemType?: ItemType | 'all';
  category?: string;
}

export async function listVenues(filters: VenueFilterParams = {}): Promise<Venue[]> {
  let venues: Venue[] = [];
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data: venueRows, error: vErr } = await supabase
      .from('venues')
      .select('*')
      .order('created_at', { ascending: true });

    if (!vErr && venueRows) {
      if (venueRows.length === 0) {
        // Auto-seed once if Supabase tables exist and are completely empty
        try {
          await seedDatabase(false);
          const { data: reseeded } = await supabase
            .from('venues')
            .select('*')
            .order('created_at', { ascending: true });
          const { data: itemRows } = await supabase
            .from('catalog_items')
            .select('*')
            .order('created_at', { ascending: true });
          const itemsByVenue: Record<string, CatalogItem[]> = {};
          for (const rawItem of itemRows ?? []) {
            const norm = normalizeItemRow(rawItem as Record<string, unknown>);
            if (!itemsByVenue[norm.venue_id]) itemsByVenue[norm.venue_id] = [];
            itemsByVenue[norm.venue_id].push(norm);
          }
          venues = (reseeded ?? []).map((row) =>
            normalizeVenueRow(row as Record<string, unknown>, itemsByVenue[String(row.id)] ?? [])
          );
        } catch {
          venues = ensureLocalStoreInitialized().venues;
        }
      } else {
        const { data: itemRows, error: iErr } = await supabase
          .from('catalog_items')
          .select('*')
          .order('created_at', { ascending: true });
        if (iErr) {
          throw new Error(iErr.message);
        }
        const itemsByVenue: Record<string, CatalogItem[]> = {};
        for (const rawItem of itemRows ?? []) {
          const norm = normalizeItemRow(rawItem as Record<string, unknown>);
          if (!itemsByVenue[norm.venue_id]) itemsByVenue[norm.venue_id] = [];
          itemsByVenue[norm.venue_id].push(norm);
        }
        venues = venueRows.map((row) =>
          normalizeVenueRow(row as Record<string, unknown>, itemsByVenue[String(row.id)] ?? [])
        );
      }
    } else {
      venues = ensureLocalStoreInitialized().venues;
    }
  } else {
    venues = ensureLocalStoreInitialized().venues;
  }

  const q = filters.search?.trim().toLowerCase() ?? '';
  const venueType = filters.venueType && filters.venueType !== 'all' ? filters.venueType : null;
  const itemType = filters.itemType && filters.itemType !== 'all' ? filters.itemType : null;
  const category = filters.category && filters.category !== 'all' ? filters.category.toLowerCase() : null;

  return venues.filter((venue) => {
    if (venueType && venue.type !== venueType) return false;

    if (itemType) {
      const hasItemType = venue.items.some((item) => item.item_type === itemType);
      if (!hasItemType) return false;
    }

    if (category) {
      const hasCategory = venue.items.some(
        (item) =>
          item.category.toLowerCase().includes(category) ||
          item.name.toLowerCase().includes(category)
      );
      if (!hasCategory) return false;
    }

    if (q) {
      const venueMatch =
        venue.name.toLowerCase().includes(q) ||
        venue.address.toLowerCase().includes(q) ||
        venue.neighborhood.toLowerCase().includes(q) ||
        venue.description.toLowerCase().includes(q);

      const itemMatch = venue.items.some(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );

      if (!venueMatch && !itemMatch) return false;
    }

    return true;
  });
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const all = await listVenues();
  return all.find((v) => v.id === id) ?? null;
}

function defaultImageForType(type: VenueType): string {
  if (type === 'escuela') return '/src/assets/images/venue_music_school_1795624958211.jpg';
  if (type === 'estudio') return '/src/assets/images/venue_recording_studio_1795624958382.jpg';
  return '/src/assets/images/venue_music_store_1795624957572.jpg';
}

export async function createVenue(input: VenueInput): Promise<Venue> {
  const supabase = getSupabaseClient();
  const imageUrl = input.image_url?.trim() || defaultImageForType(input.type);

  if (supabase) {
    const { data: venueRow, error: vErr } = await supabase
      .from('venues')
      .insert({
        name: input.name.trim(),
        type: input.type,
        address: input.address.trim(),
        neighborhood: (input.neighborhood ?? '').trim(),
        contact_phone: input.contact_phone.trim(),
        contact_email: (input.contact_email ?? '').trim(),
        hours: (input.hours ?? 'Lun–Sáb 10:00–19:00').trim(),
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        description: (input.description ?? '').trim(),
        image_url: imageUrl,
      })
      .select('*')
      .single();

    if (!vErr && venueRow) {
      let insertedItems: CatalogItem[] = [];
      if (input.items && input.items.length > 0) {
        const { data: itemRows, error: iErr } = await supabase
          .from('catalog_items')
          .insert(
            input.items.map((item) => ({
              venue_id: venueRow.id,
              item_type: item.item_type,
              category: item.category.trim(),
              name: item.name.trim(),
              description: (item.description ?? '').trim(),
              price: Number(item.price),
              currency: item.currency || 'USD',
              price_unit: item.price_unit || 'unidad',
              available: item.available ?? true,
            }))
          )
          .select('*');

        if (iErr) {
          throw new Error(iErr.message);
        }
        insertedItems = (itemRows ?? []).map((r) => normalizeItemRow(r as Record<string, unknown>));
      }
      return normalizeVenueRow(venueRow as Record<string, unknown>, insertedItems);
    }
  }

  const store = ensureLocalStoreInitialized();
  const now = new Date().toISOString();
  const venueId = randomUUID();
  const newVenue: Venue = {
    id: venueId,
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    neighborhood: (input.neighborhood ?? '').trim(),
    contact_phone: input.contact_phone.trim(),
    contact_email: (input.contact_email ?? '').trim(),
    hours: (input.hours ?? 'Lun–Sáb 10:00–19:00').trim(),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    description: (input.description ?? '').trim(),
    image_url: imageUrl,
    created_at: now,
    updated_at: now,
    items: (input.items ?? []).map((item) => ({
      id: randomUUID(),
      venue_id: venueId,
      item_type: item.item_type,
      category: item.category.trim(),
      name: item.name.trim(),
      description: (item.description ?? '').trim(),
      price: Number(item.price),
      currency: item.currency || 'USD',
      price_unit: item.price_unit || 'unidad',
      available: item.available ?? true,
      created_at: now,
    })),
  };

  store.venues.push(newVenue);
  writeLocalStore(store);
  return newVenue;
}

export async function updateVenue(id: string, input: VenueInput): Promise<Venue | null> {
  const supabase = getSupabaseClient();
  const imageUrl = input.image_url?.trim() || defaultImageForType(input.type);

  if (supabase) {
    const { data: venueRow, error: vErr } = await supabase
      .from('venues')
      .update({
        name: input.name.trim(),
        type: input.type,
        address: input.address.trim(),
        neighborhood: (input.neighborhood ?? '').trim(),
        contact_phone: input.contact_phone.trim(),
        contact_email: (input.contact_email ?? '').trim(),
        hours: (input.hours ?? 'Lun–Sáb 10:00–19:00').trim(),
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        description: (input.description ?? '').trim(),
        image_url: imageUrl,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (!vErr && venueRow) {
      if (input.items) {
        const { error: delErr } = await supabase.from('catalog_items').delete().eq('venue_id', id);
        if (delErr) throw new Error(delErr.message);

        if (input.items.length > 0) {
          const { error: insErr } = await supabase.from('catalog_items').insert(
            input.items.map((item) => ({
              venue_id: id,
              item_type: item.item_type,
              category: item.category.trim(),
              name: item.name.trim(),
              description: (item.description ?? '').trim(),
              price: Number(item.price),
              currency: item.currency || 'USD',
              price_unit: item.price_unit || 'unidad',
              available: item.available ?? true,
            }))
          );
          if (insErr) throw new Error(insErr.message);
        }
      }

      const { data: itemRows } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('venue_id', id)
        .order('created_at', { ascending: true });

      return normalizeVenueRow(
        venueRow as Record<string, unknown>,
        (itemRows ?? []).map((r) => normalizeItemRow(r as Record<string, unknown>))
      );
    }
  }

  const store = ensureLocalStoreInitialized();
  const idx = store.venues.findIndex((v) => v.id === id);
  if (idx === -1) return null;

  const existing = store.venues[idx];
  const now = new Date().toISOString();
  const updatedItems: CatalogItem[] = input.items
    ? input.items.map((item) => ({
        id: randomUUID(),
        venue_id: id,
        item_type: item.item_type,
        category: item.category.trim(),
        name: item.name.trim(),
        description: (item.description ?? '').trim(),
        price: Number(item.price),
        currency: item.currency || 'USD',
        price_unit: item.price_unit || 'unidad',
        available: item.available ?? true,
        created_at: now,
      }))
    : existing.items;

  const updated: Venue = {
    ...existing,
    name: input.name.trim(),
    type: input.type,
    address: input.address.trim(),
    neighborhood: (input.neighborhood ?? '').trim(),
    contact_phone: input.contact_phone.trim(),
    contact_email: (input.contact_email ?? '').trim(),
    hours: (input.hours ?? existing.hours).trim(),
    latitude: Number(input.latitude),
    longitude: Number(input.longitude),
    description: (input.description ?? '').trim(),
    image_url: imageUrl,
    updated_at: now,
    items: updatedItems,
  };

  store.venues[idx] = updated;
  writeLocalStore(store);
  return updated;
}

export async function deleteVenue(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('venues').delete().eq('id', id);
    if (!error) return true;
  }

  const store = ensureLocalStoreInitialized();
  const prevLen = store.venues.length;
  store.venues = store.venues.filter((v) => v.id !== id);
  if (store.venues.length === prevLen) return false;
  writeLocalStore(store);
  return true;
}

export async function addCatalogItem(venueId: string, input: CatalogItemInput): Promise<CatalogItem | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('catalog_items')
      .insert({
        venue_id: venueId,
        item_type: input.item_type,
        category: input.category.trim(),
        name: input.name.trim(),
        description: (input.description ?? '').trim(),
        price: Number(input.price),
        currency: input.currency || 'USD',
        price_unit: input.price_unit || 'unidad',
        available: input.available ?? true,
      })
      .select('*')
      .single();

    if (!error && data) {
      return normalizeItemRow(data as Record<string, unknown>);
    }
  }

  const store = ensureLocalStoreInitialized();
  const venue = store.venues.find((v) => v.id === venueId);
  if (!venue) return null;

  const newItem: CatalogItem = {
    id: randomUUID(),
    venue_id: venueId,
    item_type: input.item_type,
    category: input.category.trim(),
    name: input.name.trim(),
    description: (input.description ?? '').trim(),
    price: Number(input.price),
    currency: input.currency || 'USD',
    price_unit: input.price_unit || 'unidad',
    available: input.available ?? true,
    created_at: new Date().toISOString(),
  };

  venue.items.push(newItem);
  writeLocalStore(store);
  return newItem;
}

export async function updateCatalogItem(
  itemId: string,
  input: CatalogItemInput
): Promise<CatalogItem | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('catalog_items')
      .update({
        item_type: input.item_type,
        category: input.category.trim(),
        name: input.name.trim(),
        description: (input.description ?? '').trim(),
        price: Number(input.price),
        currency: input.currency || 'USD',
        price_unit: input.price_unit || 'unidad',
        available: input.available ?? true,
      })
      .eq('id', itemId)
      .select('*')
      .maybeSingle();

    if (!error && data) {
      return normalizeItemRow(data as Record<string, unknown>);
    }
  }

  const store = ensureLocalStoreInitialized();
  for (const venue of store.venues) {
    const idx = venue.items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      const updated: CatalogItem = {
        ...venue.items[idx],
        item_type: input.item_type,
        category: input.category.trim(),
        name: input.name.trim(),
        description: (input.description ?? '').trim(),
        price: Number(input.price),
        currency: input.currency || 'USD',
        price_unit: input.price_unit || 'unidad',
        available: input.available ?? true,
      };
      venue.items[idx] = updated;
      writeLocalStore(store);
      return updated;
    }
  }
  return null;
}

export async function deleteCatalogItem(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('catalog_items').delete().eq('id', itemId);
    if (!error) return true;
  }

  const store = ensureLocalStoreInitialized();
  let removed = false;
  for (const venue of store.venues) {
    const prevLen = venue.items.length;
    venue.items = venue.items.filter((i) => i.id !== itemId);
    if (venue.items.length < prevLen) {
      removed = true;
    }
  }
  if (removed) {
    writeLocalStore(store);
  }
  return removed;
}
