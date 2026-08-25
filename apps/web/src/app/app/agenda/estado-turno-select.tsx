"use client";

import { useActionState, useRef } from "react";
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
 * componente compuesto para nada de valor acá. */
export function EstadoTurnoSelect({
  turnoId,
  estadoActual,
}: {
  turnoId: string;
  estadoActual: string;
}) {
  const [state, formAction] = useActionState(cambiarEstadoTurno, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="turno_id" value={turnoId} />
      <select
        name="estado"
        defaultValue={estadoActual}
        onChange={() => formRef.current?.requestSubmit()}
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
