"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Search, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { tiempoRelativo } from "@/lib/format";
import type { Conversacion } from "@/lib/queries/chats";
import {
  enviarMensaje,
  marcarConversacionLeida,
  obtenerConversacionesAction,
  obtenerMensajesChat,
  type Destino,
} from "./actions";
import { MessageBubble } from "./message-bubble";
import { NuevoGrupoDialog } from "./nuevo-grupo-dialog";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ChatsView({
  conversacionesIniciales,
  pacientesDisponibles,
}: {
  conversacionesIniciales: Conversacion[];
  pacientesDisponibles: { id: string; nombre: string }[];
}) {
  const queryClient = useQueryClient();
  const [destino, setDestino] = useState<Destino | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mensajesFinRef = useRef<HTMLDivElement>(null);

  const { data: conversaciones = conversacionesIniciales } = useQuery({
    queryKey: ["conversaciones"],
    queryFn: obtenerConversacionesAction,
    initialData: conversacionesIniciales,
    refetchInterval: 10_000, // RF-050: polling simple, no Realtime (ver docs/architecture.md)
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ["mensajes", destino?.tipo, destino?.id],
    queryFn: () => obtenerMensajesChat(destino as Destino),
    enabled: !!destino,
    refetchInterval: 4_000,
  });

  // Marcar como leído al abrir una conversación 1:1 — side effect real
  // (llamada a Supabase), no cálculo de render, por eso va en useEffect.
  useEffect(() => {
    if (destino?.tipo === "paciente") {
      marcarConversacionLeida(destino.id);
    }
  }, [destino]);

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  const conversacionActiva = conversaciones.find(
    (c) => destino && c.tipo === destino.tipo && c.id === destino.id
  );

  const conversacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return conversaciones;
    return conversaciones.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [conversaciones, busqueda]);

  // Handler manual (await directo) en vez de useActionState + <form
  // action={fn}>, mismo motivo que NuevoGrupoDialog: acá hace falta
  // limpiar el input/adjunto e invalidar las queries de TanStack Query
  // justo cuando la action resuelve con éxito — hacerlo desde un
  // useEffect que observe el resultado de useActionState dispara el
  // lint de React (setState síncrono en un efecto).
  async function handleEnviar(e: FormEvent) {
    e.preventDefault();
    if (!destino || (!texto.trim() && !archivo)) return;

    setEnviando(true);
    setErrorEnvio(null);

    const fd = new FormData();
    fd.set("destino_tipo", destino.tipo);
    fd.set("destino_id", destino.id);
    fd.set("contenido", texto.trim());
    if (archivo) fd.set("archivo", archivo);

    const resultado = await enviarMensaje({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setErrorEnvio(resultado.error);
      return;
    }

    setTexto("");
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    queryClient.invalidateQueries({ queryKey: ["mensajes", destino.tipo, destino.id] });
    queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
  }

  // h-screen, no h-full: `main` en app-shell.tsx es flex-1 sin altura fija
  // propia, así que h-full no tiene contra qué resolver. El nav fijo de la
  // sidebar no supera la altura de la ventana en uso normal, así que esto
  // no genera doble scroll en la práctica.
  return (
    <div className="flex h-screen">
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center justify-between gap-2 border-b border-border p-3">
          <p className="text-sm font-semibold">Chats</p>
          <NuevoGrupoDialog
            pacientesDisponibles={pacientesDisponibles}
            onCreado={(grupoId) => {
              setDestino({ tipo: "grupo", id: grupoId });
              queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
            }}
          />
        </div>

        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversacionesFiltradas.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {busqueda ? "Sin resultados." : "Todavía no hay conversaciones."}
            </p>
          )}
          {conversacionesFiltradas.map((c) => {
            const activo = destino?.tipo === c.tipo && destino?.id === c.id;
            return (
              <button
                key={`${c.tipo}-${c.id}`}
                type="button"
                onClick={() => setDestino({ tipo: c.tipo, id: c.id })}
                className={`flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors ${
                  activo ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    c.tipo === "grupo"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {c.tipo === "grupo" ? <Users className="size-4" /> : iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{c.nombre}</p>
                    {c.ultimaActividad && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {tiempoRelativo(c.ultimaActividad)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted-foreground">
                      {c.ultimoMensaje ??
                        (c.tipo === "grupo" ? "Sin mensajes todavía" : "Sin mensajes todavía")}
                    </p>
                    {c.noLeidos > 0 && (
                      <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full bg-primary p-0 text-primary-foreground">
                        {c.noLeidos}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {!conversacionActiva || !destino ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Elegí una conversación para empezar.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border p-4">
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  conversacionActiva.tipo === "grupo"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {conversacionActiva.tipo === "grupo" ? (
                  <Users className="size-4" />
                ) : (
                  iniciales(conversacionActiva.nombre)
                )}
              </div>
              <p className="font-semibold">{conversacionActiva.nombre}</p>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {mensajes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Todavía no hay mensajes en esta conversación.
                </p>
              )}
              {mensajes.map((m) => (
                <MessageBubble
                  key={m.id}
                  mensaje={m}
                  propio={m.remitente === "profesional"}
                  mostrarNombreRemitente={conversacionActiva.tipo === "grupo"}
                />
              ))}
              <div ref={mensajesFinRef} />
            </div>

            <form
              onSubmit={handleEnviar}
              className="flex flex-col gap-2 border-t border-border p-3"
            >
              {archivo && (
                <div className="flex w-fit items-center gap-2 rounded-lg bg-muted px-2.5 py-1 text-xs">
                  <Paperclip className="size-3.5" />
                  <span className="max-w-48 truncate">{archivo.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setArchivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              {errorEnvio && <p className="text-xs text-destructive">{errorEnvio}</p>}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
                <Input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribí tu respuesta…"
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={enviando || (!texto.trim() && !archivo)}
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
