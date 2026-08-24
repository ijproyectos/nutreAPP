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
