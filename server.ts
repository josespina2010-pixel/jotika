import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import type { CatalogItemInput, VenueInput, VenueType } from './src/types.ts';
import { runAssistantChat } from './server/ai.ts';
import {
  addCatalogItem,
  createVenue,
  deleteCatalogItem,
  deleteVenue,
  getHealthStatus,
  getVenueById,
  listVenues,
  seedDatabase,
  updateCatalogItem,
  updateVenue,
} from './server/db.ts';

function isValidVenueType(val: unknown): val is VenueType {
  return val === 'tienda' || val === 'escuela' || val === 'estudio';
}

function validateVenuePayload(body: unknown): { data?: VenueInput; error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Cuerpo de solicitud inválido.' };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || b.name.trim().length < 2) {
    return { error: 'El nombre del local es obligatorio (mínimo 2 caracteres).' };
  }
  if (!isValidVenueType(b.type)) {
    return { error: 'El tipo debe ser tienda, escuela o estudio.' };
  }
  if (typeof b.address !== 'string' || b.address.trim().length < 5) {
    return { error: 'La dirección es obligatoria.' };
  }
  if (typeof b.contact_phone !== 'string' || b.contact_phone.trim().length < 5) {
    return { error: 'El teléfono de contacto es obligatorio.' };
  }
  const lat = Number(b.latitude);
  const lng = Number(b.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return { error: 'La latitud debe ser un número válido entre -90 y 90.' };
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: 'La longitud debe ser un número válido entre -180 y 180.' };
  }

  let validatedItems: VenueInput['items'];
  if (Array.isArray(b.items)) {
    validatedItems = [];
    for (const rawItem of b.items) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as Record<string, unknown>;
      const itemType = item.item_type;
      if (itemType !== 'instrumento' && itemType !== 'clase' && itemType !== 'servicio') {
        return { error: 'Cada elemento del catálogo debe tener tipo instrumento, clase o servicio.' };
      }
      if (typeof item.name !== 'string' || !item.name.trim()) {
        return { error: 'Cada elemento del catálogo debe incluir un nombre.' };
      }
      const price = Number(item.price);
      if (!Number.isFinite(price) || price < 0) {
        return { error: 'El precio de cada elemento debe ser un número válido >= 0.' };
      }
      validatedItems.push({
        item_type: itemType,
        category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
        name: item.name.trim(),
        description: typeof item.description === 'string' ? item.description.trim() : '',
        price,
        currency: typeof item.currency === 'string' && item.currency.trim() ? item.currency.trim() : 'USD',
        price_unit: typeof item.price_unit === 'string' && item.price_unit.trim() ? item.price_unit.trim() : 'unidad',
        available: item.available !== false,
      });
    }
  }

  return {
    data: {
      name: b.name.trim(),
      type: b.type,
      address: b.address.trim(),
      neighborhood: typeof b.neighborhood === 'string' ? b.neighborhood.trim() : '',
      contact_phone: b.contact_phone.trim(),
      contact_email: typeof b.contact_email === 'string' ? b.contact_email.trim() : '',
      hours: typeof b.hours === 'string' ? b.hours.trim() : 'Lun–Sáb 10:00–19:00',
      latitude: lat,
      longitude: lng,
      description: typeof b.description === 'string' ? b.description.trim() : '',
      image_url: typeof b.image_url === 'string' ? b.image_url.trim() : '',
      items: validatedItems,
    },
  };
}

function validateItemPayload(body: unknown): { data?: CatalogItemInput; error?: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Cuerpo de solicitud inválido.' };
  }
  const b = body as Record<string, unknown>;
  if (b.item_type !== 'instrumento' && b.item_type !== 'clase' && b.item_type !== 'servicio') {
    return { error: 'El tipo de oferta debe ser instrumento, clase o servicio.' };
  }
  if (typeof b.name !== 'string' || b.name.trim().length < 2) {
    return { error: 'El nombre de la oferta es obligatorio.' };
  }
  if (typeof b.category !== 'string' || !b.category.trim()) {
    return { error: 'La categoría es obligatoria.' };
  }
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'El precio debe ser un número válido >= 0.' };
  }
  return {
    data: {
      item_type: b.item_type,
      category: b.category.trim(),
      name: b.name.trim(),
      description: typeof b.description === 'string' ? b.description.trim() : '',
      price,
      currency: typeof b.currency === 'string' && b.currency.trim() ? b.currency.trim() : 'USD',
      price_unit: typeof b.price_unit === 'string' && b.price_unit.trim() ? b.price_unit.trim() : 'unidad',
      available: b.available !== false,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Public runtime configuration (Google Maps browser key only, never private secrets)
  app.get('/api/public-config', (_req: Request, res: Response) => {
    const rawKey = process.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || '';
    const googleMapsApiKey =
      rawKey && !rawKey.includes('MY_GOOGLE_MAPS_API_KEY') ? rawKey : '';
    res.json({ googleMapsApiKey });
  });

  // Health and DB connection status
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const status = await getHealthStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Error verificando estado del servidor',
      });
    }
  });

  // Seed initial 6 locations
  app.post('/api/seed', async (req: Request, res: Response) => {
    try {
      const force = Boolean(req.body?.force);
      const result = await seedDatabase(force);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error poblando la base de datos',
      });
    }
  });

  // Venues CRUD + Search/Filter
  app.get('/api/venues', async (req: Request, res: Response) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const venueType =
        req.query.venueType === 'tienda' ||
        req.query.venueType === 'escuela' ||
        req.query.venueType === 'estudio'
          ? req.query.venueType
          : 'all';
      const itemType =
        req.query.itemType === 'instrumento' ||
        req.query.itemType === 'clase' ||
        req.query.itemType === 'servicio'
          ? req.query.itemType
          : 'all';
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;

      const venues = await listVenues({ search, venueType, itemType, category });
      res.json({ venues });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error consultando locales',
      });
    }
  });

  app.get('/api/venues/:id', async (req: Request, res: Response) => {
    try {
      const venue = await getVenueById(String(req.params.id));
      if (!venue) {
        res.status(404).json({ error: 'Local no encontrado.' });
        return;
      }
      res.json({ venue });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error consultando el local',
      });
    }
  });

  app.post('/api/venues', async (req: Request, res: Response) => {
    const validated = validateVenuePayload(req.body);
    if (validated.error || !validated.data) {
      res.status(400).json({ error: validated.error });
      return;
    }
    try {
      const venue = await createVenue(validated.data);
      res.status(201).json({ venue });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error creando el local',
      });
    }
  });

  app.put('/api/venues/:id', async (req: Request, res: Response) => {
    const validated = validateVenuePayload(req.body);
    if (validated.error || !validated.data) {
      res.status(400).json({ error: validated.error });
      return;
    }
    try {
      const venue = await updateVenue(String(req.params.id), validated.data);
      if (!venue) {
        res.status(404).json({ error: 'Local no encontrado.' });
        return;
      }
      res.json({ venue });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error actualizando el local',
      });
    }
  });

  app.delete('/api/venues/:id', async (req: Request, res: Response) => {
    try {
      const ok = await deleteVenue(String(req.params.id));
      if (!ok) {
        res.status(404).json({ error: 'Local no encontrado.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error eliminando el local',
      });
    }
  });

  // Catalog Items CRUD
  app.post('/api/venues/:id/items', async (req: Request, res: Response) => {
    const validated = validateItemPayload(req.body);
    if (validated.error || !validated.data) {
      res.status(400).json({ error: validated.error });
      return;
    }
    try {
      const item = await addCatalogItem(String(req.params.id), validated.data);
      if (!item) {
        res.status(404).json({ error: 'Local no encontrado.' });
        return;
      }
      res.status(201).json({ item });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error agregando oferta al catálogo',
      });
    }
  });

  app.put('/api/items/:itemId', async (req: Request, res: Response) => {
    const validated = validateItemPayload(req.body);
    if (validated.error || !validated.data) {
      res.status(400).json({ error: validated.error });
      return;
    }
    try {
      const item = await updateCatalogItem(String(req.params.itemId), validated.data);
      if (!item) {
        res.status(404).json({ error: 'Elemento no encontrado.' });
        return;
      }
      res.json({ item });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error actualizando elemento',
      });
    }
  });

  app.delete('/api/items/:itemId', async (req: Request, res: Response) => {
    try {
      const ok = await deleteCatalogItem(String(req.params.itemId));
      if (!ok) {
        res.status(404).json({ error: 'Elemento no encontrado.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Error eliminando elemento',
      });
    }
  });

  // Gemini AI Assistant endpoint
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
      return;
    }
    const history = Array.isArray(req.body?.history)
      ? req.body.history.filter(
          (h: unknown): h is { role: 'user' | 'assistant'; content: string } =>
            Boolean(h) &&
            typeof h === 'object' &&
            ((h as { role?: unknown }).role === 'user' ||
              (h as { role?: unknown }).role === 'assistant') &&
            typeof (h as { content?: unknown }).content === 'string'
        )
      : [];

    try {
      const result = await runAssistantChat(message, history);
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error:
          err instanceof Error
            ? err.message
            : 'Error al consultar el asistente inteligente de Gemini.',
      });
    }
  });

  // Serve Vite in development or static dist/ in production (Render)
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Sonora Hub server running on http://0.0.0.0:${port}`);
  });
}

startServer();
