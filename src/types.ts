export type VenueType = 'tienda' | 'escuela' | 'estudio';

export type ItemType = 'instrumento' | 'clase' | 'servicio';

export interface CatalogItem {
  id: string;
  venue_id: string;
  item_type: ItemType;
  category: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  price_unit: string;
  available: boolean;
  created_at?: string;
}

export interface Venue {
  id: string;
  name: string;
  type: VenueType;
  address: string;
  neighborhood: string;
  contact_phone: string;
  contact_email: string;
  hours: string;
  latitude: number;
  longitude: number;
  description: string;
  image_url: string;
  created_at?: string;
  updated_at?: string;
  items: CatalogItem[];
}

export interface VenueInput {
  name: string;
  type: VenueType;
  address: string;
  neighborhood?: string;
  contact_phone: string;
  contact_email?: string;
  hours?: string;
  latitude: number;
  longitude: number;
  description?: string;
  image_url?: string;
  items?: Omit<CatalogItem, 'id' | 'venue_id' | 'created_at'>[];
}

export interface CatalogItemInput {
  item_type: ItemType;
  category: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  price_unit?: string;
  available?: boolean;
}

export interface HealthStatus {
  ok: boolean;
  storageMode: 'supabase' | 'local';
  supabaseConfigured: boolean;
  supabaseError?: string | null;
  geminiConfigured: boolean;
  mapsConfigured: boolean;
  venueCount: number;
  itemCount: number;
}

export interface ChatCitedVenue {
  id: string;
  name: string;
  type: VenueType;
  neighborhood: string;
  latitude: number;
  longitude: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citedVenues?: ChatCitedVenue[];
  timestamp: string;
}
