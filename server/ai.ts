import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from '@google/genai';
import type { ChatCitedVenue, ItemType, Venue, VenueType } from '../src/types.ts';
import { listVenues } from './db.ts';

interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantChatResponse {
  reply: string;
  citedVenues: ChatCitedVenue[];
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY no está configurada en el servidor. Configúrala en Settings > Secrets o en tus variables de entorno.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const searchCatalogDeclaration: FunctionDeclaration = {
  name: 'search_catalog',
  description:
    'Busca locales registrados (tiendas, escuelas, estudios) y sus instrumentos, clases o servicios con precios en la base de datos real.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          'Palabra clave de instrumento, clase, servicio, marca o zona (ej. "guitarra", "piano", "mezcla", "principiante", "Roma Norte"). Opcional.',
      },
      venue_type: {
        type: Type.STRING,
        description: 'Filtrar por tipo de local: "tienda", "escuela", "estudio" o "all".',
      },
      item_type: {
        type: Type.STRING,
        description: 'Filtrar por tipo de oferta: "instrumento", "clase", "servicio" o "all".',
      },
      max_price: {
        type: Type.NUMBER,
        description: 'Precio máximo en USD para filtrar ofertas. Opcional.',
      },
    },
  },
};

const listAllVenuesDeclaration: FunctionDeclaration = {
  name: 'list_all_venues',
  description:
    'Obtiene el listado completo de todos los locales musicales registrados en la base de datos con dirección, contacto, coordenadas y resumen de catálogo.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      venue_type: {
        type: Type.STRING,
        description: 'Opcional: "tienda", "escuela", "estudio" o "all".',
      },
    },
  },
};

function toCitedVenue(v: Venue): ChatCitedVenue {
  return {
    id: v.id,
    name: v.name,
    type: v.type,
    neighborhood: v.neighborhood,
    latitude: v.latitude,
    longitude: v.longitude,
  };
}

async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  citedMap: Record<string, ChatCitedVenue>
): Promise<Record<string, unknown>> {
  if (name === 'list_all_venues') {
    const rawType = typeof args.venue_type === 'string' ? args.venue_type : 'all';
    const validVenueType: VenueType | 'all' =
      rawType === 'tienda' || rawType === 'escuela' || rawType === 'estudio' ? rawType : 'all';
    const venues = await listVenues({ venueType: validVenueType });

    for (const v of venues) {
      citedMap[v.id] = toCitedVenue(v);
    }

    return {
      total_venues: venues.length,
      venues: venues.map((v) => ({
        id: v.id,
        name: v.name,
        type: v.type,
        address: v.address,
        neighborhood: v.neighborhood,
        contact_phone: v.contact_phone,
        contact_email: v.contact_email,
        hours: v.hours,
        latitude: v.latitude,
        longitude: v.longitude,
        items: v.items.map((item) => ({
          item_type: item.item_type,
          category: item.category,
          name: item.name,
          price: item.price,
          currency: item.currency,
          price_unit: item.price_unit,
          available: item.available,
        })),
      })),
    };
  }

  if (name === 'search_catalog') {
    const query = typeof args.query === 'string' ? args.query.trim().toLowerCase() : '';
    const rawVenueType = typeof args.venue_type === 'string' ? args.venue_type : 'all';
    const rawItemType = typeof args.item_type === 'string' ? args.item_type : 'all';
    const maxPrice = typeof args.max_price === 'number' ? args.max_price : undefined;

    const validVenueType: VenueType | 'all' =
      rawVenueType === 'tienda' || rawVenueType === 'escuela' || rawVenueType === 'estudio'
        ? rawVenueType
        : 'all';
    const validItemType: ItemType | 'all' =
      rawItemType === 'instrumento' || rawItemType === 'clase' || rawItemType === 'servicio'
        ? rawItemType
        : 'all';

    const allVenues = await listVenues({ venueType: validVenueType });
    const matches: Array<{
      venue_id: string;
      venue_name: string;
      venue_type: VenueType;
      address: string;
      neighborhood: string;
      contact_phone: string;
      hours: string;
      matching_items: Array<{
        item_type: ItemType;
        category: string;
        name: string;
        description: string;
        price: number;
        currency: string;
        price_unit: string;
      }>;
    }> = [];

    for (const venue of allVenues) {
      const matchingItems = venue.items.filter((item) => {
        if (validItemType !== 'all' && item.item_type !== validItemType) return false;
        if (maxPrice !== undefined && item.price > maxPrice) return false;
        if (!query) return true;

        const haystack = `${item.name} ${item.category} ${item.description} ${venue.name} ${venue.neighborhood} ${venue.address}`.toLowerCase();
        // Match normalized or singular/plural stems (e.g. guitarras -> guitarra)
        const normalizedQuery = query.endsWith('s') && query.length > 4 ? query.slice(0, -1) : query;
        return haystack.includes(query) || haystack.includes(normalizedQuery);
      });

      const venueHeaderMatches =
        query &&
        `${venue.name} ${venue.neighborhood} ${venue.address} ${venue.description}`
          .toLowerCase()
          .includes(query);

      if (matchingItems.length > 0 || (venueHeaderMatches && validItemType === 'all')) {
        citedMap[venue.id] = toCitedVenue(venue);
        matches.push({
          venue_id: venue.id,
          venue_name: venue.name,
          venue_type: venue.type,
          address: venue.address,
          neighborhood: venue.neighborhood,
          contact_phone: venue.contact_phone,
          hours: venue.hours,
          matching_items: (matchingItems.length > 0 ? matchingItems : venue.items).map((item) => ({
            item_type: item.item_type,
            category: item.category,
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency,
            price_unit: item.price_unit,
          })),
        });
      }
    }

    return {
      query: query || 'todos',
      total_matches: matches.length,
      results: matches,
    };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  maxAttempts = 3
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('429');
      if (!isTransient || attempt === maxAttempts) {
        break;
      }
      const delayMs = 600 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const rawMsg = lastError instanceof Error ? lastError.message : String(lastError);
  if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE')) {
    throw new Error(
      'El servicio de Gemini está experimentando alta demanda temporal (503). Por favor intenta de nuevo en unos segundos.'
    );
  }
  throw lastError instanceof Error ? lastError : new Error(rawMsg);
}

export async function runAssistantChat(
  message: string,
  history: ChatTurnInput[] = []
): Promise<AssistantChatResponse> {
  const ai = getAiClient();
  const citedMap: Record<string, ChatCitedVenue> = {};

  const systemInstruction = `Eres el Asistente Musical de Sonora Hub, un sistema web conectado a una base de datos real de tiendas de instrumentos musicales, escuelas de música y estudios de grabación.

Reglas estrictas:
1. SIEMPRE consulta las herramientas disponibles (search_catalog o list_all_venues) antes de responder preguntas sobre tiendas, escuelas, estudios, instrumentos disponibles, clases o precios registrados. Nunca inventes locales ni precios que no estén en la base de datos.
2. Responde en español claro, amable, directo y bien estructurado (usa listas breves con nombre del local, dirección/colonia, teléfono y precios exactos con su unidad).
3. Si el usuario hace una pregunta pedagógica general (por ejemplo: "¿Qué instrumento es recomendable para comenzar a estudiar música?"), combina tu orientación musical experta (explicando opciones como guitarra acústica, piano digital/teclado o ukulele según objetivos) con recomendaciones reales consultadas del catálogo (locales donde comprar instrumentos de iniciación o escuelas con cursos de iniciación).
4. Si no encuentras un ítem exacto en la base de datos, dilo con honestidad y sugiere alternativas cercanas que sí existan en el catálogo.`;

  const contents: Content[] = [
    ...history.slice(-8).map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ];

  const tools = [{ functionDeclarations: [searchCatalogDeclaration, listAllVenuesDeclaration] }];

  let currentResponse = await generateWithRetry(ai, {
    model: 'gemini-4-hydrogen',
    contents,
    config: {
      systemInstruction,
      tools,
    },
  });

  // Allow up to 4 tool-call rounds
  for (let round = 0; round < 4; round++) {
    const functionCalls = currentResponse.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      break;
    }

    const modelContent = currentResponse.candidates?.[0]?.content;
    if (modelContent) {
      contents.push(modelContent);
    }

    const responseParts = [];
    for (const call of functionCalls) {
      const toolResult = await executeToolCall(
        call.name ?? '',
        (call.args ?? {}) as Record<string, unknown>,
        citedMap
      );
      responseParts.push({
        functionResponse: {
          id: call.id,
          name: call.name ?? '',
          response: toolResult,
        },
      });
    }

    contents.push({
      role: 'user',
      parts: responseParts,
    });

    currentResponse = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });
  }

  const replyText =
    currentResponse.text?.trim() ||
    'No pude generar una respuesta en este momento. Intenta reformular tu consulta.';

  return {
    reply: replyText,
    citedVenues: Object.values(citedMap),
  };
}
