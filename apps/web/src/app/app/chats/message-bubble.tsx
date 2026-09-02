import { Check, CheckCheck, FileText } from "lucide-react";
import type { MensajeChat } from "./actions";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Detecta links dentro del texto y los renderiza clickeables — sin esto
 * un link que manda el paciente/profesional es texto plano sin poder
 * abrirlo desde el chat. */
function linkify(texto: string) {
  const partes = texto.split(URL_REGEX);
  return partes.map((parte, i) =>
    URL_REGEX.test(parte) ? (
      <a
        key={i}
        href={parte}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {parte}
      </a>
    ) : (
      <span key={i}>{parte}</span>
    )
  );
}

export function MessageBubble({
  mensaje,
  propio,
  mostrarNombreRemitente,
}: {
  mensaje: MensajeChat;
  /** true si este mensaje lo mandó el profesional (dueño de la sesión
   * actual) — determina el lado y el color de la burbuja. */
  propio: boolean;
  /** Grupos con más de un paciente: mostrar quién mandó cada mensaje
   * ajeno, porque puede ser cualquiera de los miembros. */
  mostrarNombreRemitente: boolean;
}) {
  const esImagen = mensaje.archivoTipo?.startsWith("image/");

  return (
    <div className={`flex ${propio ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[70%] flex-col gap-1 rounded-2xl px-4 py-2.5 text-sm ${
          propio
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card"
        }`}
      >
        {mostrarNombreRemitente && !propio && (
          <p className="text-xs font-semibold opacity-80">
            {mensaje.remitenteNombre ?? "Paciente"}
          </p>
        )}

        {mensaje.archivoUrl && esImagen && (
          <a href={mensaje.archivoUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage, no un asset optimizable por next/image */}
            <img
              src={mensaje.archivoUrl}
              alt={mensaje.archivoNombre ?? "Adjunto"}
              className="max-h-64 rounded-lg object-cover"
            />
          </a>
        )}

        {mensaje.archivoUrl && !esImagen && (
          <a
            href={mensaje.archivoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg bg-background/40 px-3 py-2 underline-offset-2 hover:underline"
          >
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{mensaje.archivoNombre ?? "Adjunto"}</span>
          </a>
        )}

        {mensaje.contenido && (
          <p className="whitespace-pre-wrap break-words">
            {linkify(mensaje.contenido)}
          </p>
        )}

        <div
          className={`flex items-center justify-end gap-1 text-[11px] ${
            propio ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {new Date(mensaje.createdAt).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {propio &&
            (mensaje.leido ? (
              <CheckCheck className="size-3.5" />
            ) : (
              <Check className="size-3.5" />
            ))}
        </div>
      </div>
    </div>
  );
}
