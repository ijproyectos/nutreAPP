export function formatoMoneda(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}

export function edadDesde(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mesDiff = hoy.getMonth() - nacimiento.getMonth();
  if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export function formatoFechaCorta(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** Para precargar un `<input type="date">` a partir de un timestamp ISO —
 * usa getters locales (no UTC) a propósito: esto corre en el navegador del
 * profesional, así que "local" es su zona horaria real, que es la que
 * tiene que ver en el campo. Ver turno-form-dialog.tsx para el porqué la
 * conversión inversa (form -> ISO) también se hace en el cliente. */
export function paraInputFecha(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Idem, para `<input type="time">`. */
export function paraInputHora(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function tiempoRelativo(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const segundos = Math.round((new Date().getTime() - d.getTime()) / 1000);

  if (segundos < 60) return "recién";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos}min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas}h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `hace ${dias}d`;
  const semanas = Math.round(dias / 7);
  if (semanas < 5) return `hace ${semanas} sem`;
  const meses = Math.round(dias / 30);
  return `hace ${meses} mes${meses === 1 ? "" : "es"}`;
}
