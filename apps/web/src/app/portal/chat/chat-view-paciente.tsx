"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tiempoRelativo } from "@/lib/format";
import { MessageBubble } from "@/app/app/chats/message-bubble";
import {
  enviarMensajePaciente,
  obtenerConversacionesPaciente,
  obtenerMensajesChatPaciente,
  type ConversacionPaciente,
  type Destino,
} from "./actions";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ChatViewPaciente({
  pacienteId,
  conversacionesIniciales,
}: {
  pacienteId: string;
  conversacionesIniciales: ConversacionPaciente[];
}) {
  const queryClient = useQueryClient();
  const [destino, setDestino] = useState<Destino>({ tipo: "paciente", id: pacienteId });
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mensajesFinRef = useRef<HTMLDivElement>(null);

  const { data: conversaciones = conversacionesIniciales } = useQuery({
    queryKey: ["conversaciones-paciente"],
    queryFn: obtenerConversacionesPaciente,
    initialData: conversacionesIniciales,
    refetchInterval: 10_000,
  });

  const { data: mensajes = [] } = useQuery({
    queryKey: ["mensajes-paciente", destino.tipo, destino.id],
    queryFn: () => obtenerMensajesChatPaciente(destino),
    refetchInterval: 4_000,
  });

  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes]);

  const conversacionActiva = conversaciones.find(
    (c) => c.tipo === destino.tipo && c.id === destino.id
  );

  // Mismo criterio que ChatsView (app/chats/chats-view.tsx): handler
  // manual en vez de useActionState + useEffect, para poder limpiar el
  // input/adjunto e invalidar las queries en el mismo evento que el
  // envío, sin el lint de "setState síncrono en un efecto".
  async function handleEnviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim() && !archivo) return;

    setEnviando(true);
    setErrorEnvio(null);

    const fd = new FormData();
    fd.set("destino_tipo", destino.tipo);
    fd.set("destino_id", destino.id);
    fd.set("contenido", texto.trim());
    if (archivo) fd.set("archivo", archivo);

    const resultado = await enviarMensajePaciente({ status: "idle" }, fd);
    setEnviando(false);

    if (resultado.status === "error") {
      setErrorEnvio(resultado.error);
      return;
    }

    setTexto("");
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    queryClient.invalidateQueries({ queryKey: ["mensajes-paciente", destino.tipo, destino.id] });
    queryClient.invalidateQueries({ queryKey: ["conversaciones-paciente"] });
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {conversaciones.length > 1 && (
        <div className="flex w-64 shrink-0 flex-col divide-y divide-border border-r border-border bg-card">
          {conversaciones.map((c) => {
            const activo = destino.tipo === c.tipo && destino.id === c.id;
            return (
              <button
                key={`${c.tipo}-${c.id}`}
                type="button"
                onClick={() => setDestino({ tipo: c.tipo, id: c.id })}
                className={`flex items-center gap-2.5 p-3 text-left text-sm transition-colors ${
                  activo ? "bg-accent" : "hover:bg-muted"
                }`}
              >
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    c.tipo === "grupo" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
                  }`}
                >
                  {c.tipo === "grupo" ? <Users className="size-4" /> : iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.nombre}</p>
                  {c.ultimaActividad && (
                    <p className="text-xs text-muted-foreground">{tiempoRelativo(c.ultimaActividad)}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              conversacionActiva?.tipo === "grupo" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"
            }`}
          >
            {conversacionActiva?.tipo === "grupo" ? (
              <Users className="size-4" />
            ) : (
              iniciales(conversacionActiva?.nombre ?? "")
            )}
          </div>
          <p className="font-semibold">{conversacionActiva?.nombre ?? "Chat"}</p>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay mensajes acá — escribile a tu nutricionista.
            </p>
          )}
          {mensajes.map((m) => (
            <MessageBubble
              key={m.id}
              mensaje={m}
              propio={m.remitente === "paciente" && (destino.tipo === "paciente" || m.remitentePacienteId === pacienteId)}
              mostrarNombreRemitente={destino.tipo === "grupo"}
            />
          ))}
          <div ref={mensajesFinRef} />
        </div>

        <form onSubmit={handleEnviar} className="flex flex-col gap-2 border-t border-border p-3">
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
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-4" />
            </Button>
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribí tu mensaje…"
              className="flex-1"
            />
            <Button type="submit" size="icon-sm" disabled={enviando || (!texto.trim() && !archivo)}>
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
