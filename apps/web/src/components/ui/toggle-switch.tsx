"use client";

/** Interruptor on/off del sistema de diseño (44×26, pulgar de 20×20) —
 * no hay Switch de shadcn/Base UI instalado en este repo, y hasta ahora
 * ninguna pantalla necesitaba uno (las preferencias booleanas existentes
 * usaban Checkbox). Primer uso real: "Mostrar en tu link de reservas"
 * (editor de catálogo) y "Avisar a los pacientes activos" (aumento de
 * precios), ambos en /app/cobros. */
export function ToggleSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={`flex h-[26px] w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors ${
        checked ? "justify-end border-primary bg-primary" : "justify-start border-input bg-muted"
      }`}
    >
      <span className="size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(36,28,44,.24)]" />
    </button>
  );
}
