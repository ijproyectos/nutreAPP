"use client";

import { useActionState, useRef, useState } from "react";
import { cambiarEstadoTurno, type TurnoFormState } from "./actions";

const initialState: TurnoFormState = { status: "idle" };

const OPCIONES = [
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "en_curso", label: "En curso" },
  { value: "cancelado", label: "Cancelado" },
] as const;

/** Select nativo (no el Select de shadcn/Base UI) a propósito: cambiar de
 * valor tiene que disparar el submit del form apenas se elige una opción,
 * y con un <select> nativo el valor ya está actualizado en el DOM cuando
 * dispara onChange — sin eso hay que lidiar con el timing async del
 * componente compuesto para nada de valor acá.
 *
 * Controlado (value + onChange), no defaultValue: un <form action={...}>
 * resetea sus campos no controlados en cuanto termina la transición de la
 * action (React 19), pase lo que pase con el resultado — como
 * cambiarEstadoTurno nunca lanza (siempre devuelve { status }), ese
 * reset no se puede evitar devolviendo un error. Con el valor controlado,
 * el render siguiente vuelve a fijar el `<select>` al estado real
 * (`estadoActual`, que llega fresco por `revalidatePath`) sin importar
 * qué haya hecho el reset nativo de por medio. */
export function EstadoTurnoSelect({
  turnoId,
  estadoActual,
}: {
  turnoId: string;
  estadoActual: string;
}) {
  const [state, formAction] = useActionState(cambiarEstadoTurno, initialState);
  const [valor, setValor] = useState(estadoActual);
  const formRef = useRef<HTMLFormElement>(null);

  // Si la última acción falló, mostrar el valor real (`estadoActual`, la
  // verdad conocida antes de intentar el cambio) en vez del optimista que
  // se había elegido — sin esto quedaría mostrando una opción que nunca
  // se guardó. Derivado en el render, no en un efecto.
  const valorMostrado = state.status === "error" ? estadoActual : valor;

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="turno_id" value={turnoId} />
      <select
        name="estado"
        value={valorMostrado}
        onChange={(e) => {
          setValor(e.target.value);
          // El value ya quedó actualizado en el estado de React antes de
          // este requestSubmit — el <select> nativo también ya refleja
          // la nueva opción en el momento en que dispara onChange.
          formRef.current?.requestSubmit();
        }}
        className="h-7 rounded-md border border-border bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        {OPCIONES.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {state.status === "error" && (
        <span className="text-xs text-destructive">{state.error}</span>
      )}
    </form>
  );
}
