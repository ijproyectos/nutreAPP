"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarPlus,
  CreditCard,
  ListFilter,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatoFechaSinAnio, tiempoRelativo } from "@/lib/format";
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
  sinProximoTurnoIds,
  proximoTurnoPorPaciente,
  destinoInicial,
}: {
  conversacionesIniciales: Conversacion[];
  pacientesDisponibles: { id: string; nombre: string }[];
  /** RF-050 rediseño: "Orden por atención, no por fecha" — pacientes sin
   * próximo turno se muestran primero en la lista, sin importar cuándo
   * fue el último mensaje. */
  sinProximoTurnoIds: string[];
  /** Fecha ISO del próximo turno de cada paciente que sí tiene uno —
   * chip verde "Turno D mmm" del mockup. */
  proximoTurnoPorPaciente: Record<string, string>;
  /** /app/chats?paciente=<id>, desde el botón "Chat" de la ficha. */
  destinoInicial?: Destino | null;
}) {
  const queryClient = useQueryClient();
  const [destino, setDestino] = useState<Destino | null>(destinoInicial ?? null);
  const [busqueda, setBusqueda] = useState("");
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mensajesFinRef = useRef<HTMLDivElement>(null);

  const sinTurnoSet = useMemo(() => new Set(sinProximoTurnoIds), [sinProximoTurnoIds]);

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
  const activaSinTurno = !!(
    conversacionActiva?.tipo === "paciente" && sinTurnoSet.has(conversacionActiva.id)
  );
  const activaProximoTurno =
    conversacionActiva?.tipo === "paciente"
      ? proximoTurnoPorPaciente[conversacionActiva.id]
      : undefined;

  const conversacionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return conversaciones;
    return conversaciones.filter((c) => c.nombre.toLowerCase().includes(q));
  }, [conversaciones, busqueda]);

  // "Orden por atención, no por fecha": los pacientes sin próximo turno
  // van primero, conservando entre ellos (y entre el resto) el orden por
  // actividad reciente que ya trae `conversaciones` — Array.sort es
  // estable, así que alcanza con un comparador de prioridad.
  const conversacionesOrdenadas = useMemo(() => {
    return [...conversacionesFiltradas].sort((a, b) => {
      const pa = a.tipo === "paciente" && sinTurnoSet.has(a.id) ? 0 : 1;
      const pb = b.tipo === "paciente" && sinTurnoSet.has(b.id) ? 0 : 1;
      return pa - pb;
    });
  }, [conversacionesFiltradas, sinTurnoSet]);

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
      <div className="flex w-[328px] shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-[#F2EBF0] px-[18px] pt-[22px] pb-3.5">
          <p className="mb-[13px] font-heading text-[22px] leading-none tracking-[-.01em]">
            Chats
          </p>
          <div className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-background px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente"
              className="w-full border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {conversaciones.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-[#C6CEB6] bg-positive px-[18px] py-2.5 text-[11px] leading-tight text-positive-foreground">
            <ListFilter className="size-3.5 shrink-0" strokeWidth={1.7} />
            Orden por atención, no por fecha
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {conversaciones.length === 0 && (
            <div className="p-[22px_18px] px-[22px] py-[38px] text-center">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-[13px] border border-accent-foreground/15 bg-accent text-primary">
                <MessageCircle className="size-5" strokeWidth={1.6} />
              </div>
              <p className="font-heading text-[19px] leading-tight tracking-[-.005em]">
                Sin conversaciones
              </p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Los chats aparecen acá cuando un paciente escribe desde su
                acceso. Todavía no escribió ninguno.
              </p>
            </div>
          )}

          {conversaciones.length > 0 && conversacionesOrdenadas.length === 0 && (
            <p className="p-4 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}

          {conversacionesOrdenadas.map((c) => {
            const activo = destino?.tipo === c.tipo && destino?.id === c.id;
            const sinTurno = c.tipo === "paciente" && sinTurnoSet.has(c.id);
            const proximaFecha = c.tipo === "paciente" ? proximoTurnoPorPaciente[c.id] : undefined;
            return (
              <button
                key={`${c.tipo}-${c.id}`}
                type="button"
                onClick={() => setDestino({ tipo: c.tipo, id: c.id })}
                className={`flex w-full items-start gap-2.5 border-b border-[#F2EBF0] px-[18px] py-3.5 text-left transition-colors ${
                  activo
                    ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]"
                    : sinTurno
                      ? "bg-[#FEFAF9] shadow-[inset_3px_0_0_#B4483A] hover:bg-[#FCF3F0]"
                      : "hover:bg-muted"
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold ${
                    c.tipo === "grupo"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-accent text-primary"
                  }`}
                >
                  {c.tipo === "grupo" ? <Users className="size-4" /> : iniciales(c.nombre)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13.5px] font-semibold">{c.nombre}</span>
                    {c.ultimaActividad && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {tiempoRelativo(c.ultimaActividad)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] text-[#4C4455]">
                      {c.ultimoMensaje ?? "Sin mensajes todavía"}
                    </p>
                    {c.noLeidos > 0 && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#C4792F] text-[10px] font-bold text-white">
                        {c.noLeidos}
                      </span>
                    )}
                  </div>
                  {c.tipo === "paciente" &&
                    (sinTurno ? (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] border border-[#EFCFC7] bg-[#FBEAE6] px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-destructive">
                        <span className="size-1.5 shrink-0 rounded-full bg-[#B4483A]" />
                        Sin próximo turno
                      </span>
                    ) : proximaFecha ? (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-[6px] border border-[#C6CEB6] bg-positive px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-positive-foreground">
                        <span className="size-1.5 shrink-0 rounded-full bg-[#9CAF88]" />
                        Turno {formatoFechaSinAnio(proximaFecha)}
                      </span>
                    ) : null)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-border p-3">
          <NuevoGrupoDialog
            pacientesDisponibles={pacientesDisponibles}
            onCreado={(grupoId) => {
              setDestino({ tipo: "grupo", id: grupoId });
              queryClient.invalidateQueries({ queryKey: ["conversaciones"] });
            }}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col bg-background">
        {!conversacionActiva || !destino ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-10 text-center">
            <div className="mb-1.5 flex size-[46px] items-center justify-center rounded-[14px] border border-accent-foreground/15 bg-accent text-primary">
              <MessageCircle className="size-5" strokeWidth={1.6} />
            </div>
            <p className="font-heading text-[21px] leading-tight tracking-[-.01em]">
              Ninguna conversación abierta
            </p>
            <p className="max-w-[340px] text-[13.5px] text-muted-foreground">
              Arriba de la lista están las que necesitan atención: pacientes
              sin próximo turno agendado.
            </p>
            <Link
              href="/app"
              className="mt-3 flex items-center gap-1.5 border-b border-transparent text-[12.5px] font-bold text-primary hover:border-primary"
            >
              Ver la Bandeja de hoy
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3.5 border-b border-border bg-card px-6 py-3.5">
              <div
                className={`flex size-[38px] shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold ${
                  conversacionActiva.tipo === "grupo"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-accent text-primary"
                }`}
              >
                {conversacionActiva.tipo === "grupo" ? (
                  <Users className="size-4" />
                ) : (
                  iniciales(conversacionActiva.nombre)
                )}
              </div>
              <div>
                <p className="text-[14.5px] font-bold">{conversacionActiva.nombre}</p>
                {conversacionActiva.tipo === "paciente" &&
                  (activaSinTurno || activaProximoTurno) && (
                    <div className="mt-1 flex items-center gap-2.5">
                      {activaSinTurno ? (
                        <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#EFCFC7] bg-[#FBEAE6] px-2.5 py-0.5 text-[11px] font-bold text-destructive">
                          <span className="size-1.5 shrink-0 rounded-full bg-[#B4483A]" />
                          Sin próximo turno
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-[6px] border border-[#C6CEB6] bg-positive px-2.5 py-0.5 text-[11px] font-bold text-positive-foreground">
                          <span className="size-1.5 shrink-0 rounded-full bg-[#9CAF88]" />
                          Turno {formatoFechaSinAnio(activaProximoTurno as string)}
                        </span>
                      )}
                      {activaSinTurno && (
                        <Link
                          href={`/app/agenda?paciente=${conversacionActiva.id}`}
                          className="border-b border-transparent text-[11.5px] font-bold text-primary hover:border-primary"
                        >
                          Agendar →
                        </Link>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-6">
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
              className="flex flex-col gap-2.5 border-t border-border bg-card px-5 pt-3.5 pb-4"
            >
              {errorEnvio && (
                <p className="rounded-[11px] border border-[#EFCFC7] bg-[#FDF7F5] px-3 py-2 text-[12.5px] text-destructive">
                  {errorEnvio}
                </p>
              )}

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

              {conversacionActiva.tipo === "paciente" && (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/app/agenda?paciente=${conversacionActiva.id}`}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[#E7D9E5] bg-[#F6EFF5] px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-[#CDB6CB] hover:bg-[#EDE1EC]"
                  >
                    <CalendarPlus className="size-3.5" strokeWidth={1.6} />
                    Agendar turno
                  </Link>
                  <Link
                    href={`/app/cobros?paciente=${conversacionActiva.id}`}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[#E7D9E5] bg-[#F6EFF5] px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:border-[#CDB6CB] hover:bg-[#EDE1EC]"
                  >
                    <CreditCard className="size-3.5" strokeWidth={1.6} />
                    Cobrar
                  </Link>
                </div>
              )}

              <div className="flex items-center gap-2.5">
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
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribir un mensaje"
                  className="h-[42px] flex-1 rounded-[10px] border border-input bg-background px-3.5 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_0_0_3px_var(--accent)]"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-10 shrink-0"
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
