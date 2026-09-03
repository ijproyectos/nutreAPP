"use server";

import { getAuthorizedProfesional } from "@/lib/dal";

/** Escapa un valor para CSV — comillas dobles alrededor si tiene coma,
 * comilla o salto de línea, duplicando comillas internas (RFC 4180). */
function celdaCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** RF sin asignar (Configuración → Exportar datos). Solo pacientes —
 * es el dato que más pide un profesional que se va o quiere un backup
 * propio, y es el único listado que ya trae todo en una sola query sin
 * asumir nada de otro módulo. Historia clínica/laboratorios/planes
 * quedan afuera de este export (dato clínico más sensible, exportarlo
 * junto ameritaría su propia pantalla con confirmación aparte, no un
 * click de "descargar todo"). */
export type ExportarCsvResultado =
  | { status: "success"; csv: string }
  | { status: "error"; error: string };

export async function exportarPacientesCsv(): Promise<ExportarCsvResultado> {
  const { supabase, profesional } = await getAuthorizedProfesional();

  const { data, error } = await supabase
    .from("pacientes")
    .select(
      "nombre, email, telefono, fecha_nacimiento, estado, dni, obra_social, sede, motivo_consulta, created_at"
    )
    .eq("profesional_id", profesional.id)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[exportarPacientesCsv] select falló:", error);
    return { status: "error", error: "No se pudo exportar. Intentá de nuevo." };
  }

  const encabezados = [
    "Nombre",
    "Email",
    "Teléfono",
    "Fecha de nacimiento",
    "Estado",
    "DNI",
    "Obra social",
    "Sede",
    "Motivo de consulta",
    "Alta",
  ];

  const filas = (data ?? []).map((p) =>
    [
      p.nombre,
      p.email,
      p.telefono ?? "",
      p.fecha_nacimiento ?? "",
      p.estado,
      p.dni ?? "",
      p.obra_social ?? "",
      p.sede ?? "",
      p.motivo_consulta ?? "",
      p.created_at,
    ]
      .map((v) => celdaCsv(String(v)))
      .join(",")
  );

  return { status: "success", csv: [encabezados.join(","), ...filas].join("\n") };
}
