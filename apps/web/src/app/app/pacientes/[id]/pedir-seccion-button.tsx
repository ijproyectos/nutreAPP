"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registrarEnvioWhatsApp } from "../actions";

/** Mismo criterio que whatsappHref del alta de paciente: con teléfono
 * cargado abre la conversación directo, sin teléfono deja elegir el
 * contacto en WhatsApp. El link siempre es el mismo (sin `?paso=`) — el
 * wizard ya resume solo en la primera sección pendiente (ver
 * perfil-wizard.tsx), así que "Pedir" una sección puntual y "Reenviar
 * solo lo pendiente" mandan el mismo link; lo que cambia es el texto. */
function whatsappHref(telefono: string | null, texto: string, link: string) {
  const mensaje = encodeURIComponent(`${texto} ${link}`);
  const numero = (telefono ?? "").replace(/[^\d]/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${mensaje}`
    : `https://api.whatsapp.com/send?text=${mensaje}`;
}

export function PedirSeccionButton({
  token,
  telefono,
  link,
  texto,
  label,
  variant = "outline",
}: {
  token: string;
  telefono: string | null;
  /** Link absoluto ya armado server-side (ver headers() en page.tsx) —
   * nada de window.location acá para no depender de un mount en cliente. */
  link: string;
  texto: string;
  label: string;
  variant?: "outline" | "default";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className="gap-1.5"
      nativeButton={false}
      render={
        <a
          href={whatsappHref(telefono, texto, link)}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            // Fire-and-forget: es logging, no debe bloquear ni condicionar
            // la apertura de WhatsApp (que sigue como navegación normal
            // del <a>, no interceptada).
            registrarEnvioWhatsApp(token);
          }}
        />
      }
    >
      <Send className="size-3.5" />
      {label}
    </Button>
  );
}
