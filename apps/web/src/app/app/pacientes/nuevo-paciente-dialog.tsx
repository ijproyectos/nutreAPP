"use client";

import { useActionState, useState } from "react";
import { Copy, Check, UserPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { crearPaciente, type CrearPacienteState } from "./actions";

const initialState: CrearPacienteState = { status: "idle" };

/** Link de WhatsApp para mandar la invitación — RF-020, canal principal
 * ahora que el envío automático por mail no llega a pacientes reales
 * sin dominio verificado en Resend (ver src/lib/email/enviar.ts). Con
 * teléfono cargado abre la conversación directo con ese contacto; sin
 * teléfono, deja elegir el contacto en WhatsApp. */
function whatsappHref(telefono: string, nombre: string, link: string) {
  const texto = encodeURIComponent(
    `Hola ${nombre}! Te dejo el link para sumarte a NutrIA: ${link}`
  );
  const numero = telefono.replace(/[^\d]/g, "");
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://api.whatsapp.com/send?text=${texto}`;
}

export function NuevoPacienteDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    crearPaciente,
    initialState
  );
  const [copied, setCopied] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");

  const inviteLink =
    state.status === "success" && typeof window !== "undefined"
      ? `${window.location.origin}/onboarding/invitacion/${state.token}`
      : null;

  async function copiarLink() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reseteamos el estado visual de "copiado" acá (no en un efecto)
        // para la próxima vez que se abra — el estado del form action en
        // sí se resetea solo porque useActionState vive en este componente.
        if (!next) {
          setCopied(false);
          setNombre("");
          setTelefono("");
        }
      }}
    >
      <Button
        variant="default"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <UserPlus className="size-4" />
        Nuevo paciente
      </Button>

      <DialogContent className="sm:max-w-md">
        {state.status === "success" ? (
          <>
            <DialogHeader>
              <DialogTitle>Paciente creado</DialogTitle>
              <DialogDescription>
                Mandale este link por WhatsApp — cuando lo abra e inicie
                sesión con Google, va a quedar vinculado automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2">
              <code className="flex-1 truncate text-xs">{inviteLink}</code>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={copiarLink}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="gap-1.5"
                nativeButton={false}
                render={
                  <a
                    href={whatsappHref(telefono, nombre, inviteLink ?? "")}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <MessageCircle className="size-4" />
                Enviar por WhatsApp
              </Button>
              <Button onClick={() => setOpen(false)}>Listo</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Nuevo paciente</DialogTitle>
              <DialogDescription>
                Se crea la ficha y una invitación — el paciente entra recién
                cuando acepta el link con su cuenta de Google.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="telefono">
                  Teléfono{" "}
                  <span className="text-muted-foreground">
                    (opcional — con código de país, ej. 5491122334455)
                  </span>
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_nacimiento">
                  Fecha de nacimiento{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  type="date"
                />
              </div>
              {state.status === "error" && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Creando…" : "Crear e invitar"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
