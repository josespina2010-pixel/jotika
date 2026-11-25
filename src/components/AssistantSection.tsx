import { MapPin, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatVenueType } from '../lib/labels';
import type { ChatCitedVenue, ChatMessage } from '../types';

interface AssistantSectionProps {
  onJumpToVenueOnMap: (venueId: string) => void;
}

const TEST_PROMPTS = [
  '¿Qué tiendas registradas venden guitarras?',
  '¿Qué instrumento es recomendable para comenzar a estudiar música?',
  '¿Qué escuelas del catálogo ofrecen clases de piano?',
];

export function AssistantSection({ onJumpToVenueOnMap }: AssistantSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hola. Soy el asistente musical conectado al catálogo real de Sonora Hub. Puedes preguntarme qué tiendas venden un instrumento, qué escuelas dan clases de piano o qué instrumento conviene para empezar.',
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        citedVenues?: ChatCitedVenue[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener respuesta del asistente.');
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || '',
        citedVenues: data.citedVenues ?? [],
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      }, 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error consultando al asistente Gemini.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="asistente" className="border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4 space-y-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
              Asistente inteligente con acceso al catálogo
            </h2>
            <p className="text-sm leading-relaxed text-stone-600">
              Impulsado por Gemini desde el servidor. Cada pregunta consulta en vivo los locales,
              instrumentos, clases y precios almacenados en la base de datos.
            </p>

            <div className="pt-2 space-y-2">
              <p className="text-xs font-medium text-stone-500">Consultas rápidas de prueba</p>
              <div className="flex flex-col gap-2">
                {TEST_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border border-stone-200 bg-[#F8F7F4] px-3.5 py-2.5 text-left text-xs font-medium text-stone-800 hover:border-amber-700 hover:bg-amber-50/70 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="flex h-[500px] flex-col overflow-hidden rounded-xl border border-stone-200 bg-[#F8F7F4]">
              {/* Messages */}
              <div ref={listRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-stone-900 text-stone-50'
                          : 'border border-stone-200 bg-white text-stone-800'
                      }`}
                    >
                      {msg.content}

                      {msg.citedVenues && msg.citedVenues.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-2.5">
                          {msg.citedVenues.map((venue) => (
                            <button
                              key={venue.id}
                              type="button"
                              onClick={() => onJumpToVenueOnMap(venue.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-[#F8F7F4] px-2.5 py-1 text-xs font-medium text-stone-800 hover:border-amber-700 hover:text-amber-900 cursor-pointer"
                            >
                              <MapPin className="h-3 w-3 text-amber-700" aria-hidden="true" />
                              <span>
                                {venue.name} ({formatVenueType(venue.type)})
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="mt-1 font-mono text-[11px] text-stone-400 tabular-nums">
                      {msg.role === 'user' ? 'Tú' : 'Asistente'} · {msg.timestamp}
                    </span>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start">
                    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-500">
                      Consultando registros del catálogo y redactando respuesta...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    {error}
                  </div>
                )}
              </div>

              {/* Input bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2 border-t border-stone-200 bg-white p-3"
              >
                <label htmlFor="assistant-chat-input" className="sr-only">
                  Escribe una pregunta para el asistente musical
                </label>
                <input
                  id="assistant-chat-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta por instrumentos, precios, clases de piano o estudios..."
                  className="h-10 flex-1 rounded-lg border border-stone-300 bg-[#F8F7F4] px-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-700 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
