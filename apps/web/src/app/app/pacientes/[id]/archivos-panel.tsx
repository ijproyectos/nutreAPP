import Link from "next/link";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { formatoFechaCorta } from "@/lib/format";
import type { DocumentoPaciente } from "@/lib/queries/documentos";
import { SubirDocumentoDialog } from "./subir-documento-dialog";

/** Tab "Archivos" del rediseño — agrupa lo que ya existía
 * (Laboratorios, con su flujo de revisión propio, sin tocar) más
 * documentos genéricos nuevos (informes, fotos) y un listado de planes
 * enviados que linkea al tab Plan alimentario. Deliberadamente NO
 * incluye "Informes de consulta" como PDFs auto-generados — no hay
 * infra de generación de PDF en el proyecto (ver CLAUDE.md,
 * Configuración → Plantillas de certificados); las devoluciones viven
 * en el Chat (tab Consulta → "Enviar como devolución"), no acá. */
export function ArchivosPanel({
  pacienteId,
  pacienteNombre,
  ultimaActividad,
  laboratoriosSection,
  documentos,
  planesEnviados,
}: {
  pacienteId: string;
  pacienteNombre: string;
  /** Texto real ya armado en page.tsx ("Lo último que subió fue..."), o
   * null si no hay nada todavía. */
  ultimaActividad: string | null;
  laboratoriosSection: ReactNode;
  documentos: DocumentoPaciente[];
  planesEnviados: { id: string; enviadoAt: string }[];
}) {
  const totalArchivos = documentos.length + planesEnviados.length;

  return (
    <div className="max-w-[820px]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-[13.5px] leading-[1.55] text-muted-foreground text-pretty">
          {ultimaActividad ?? `${pacienteNombre} todavía no tiene archivos cargados.`}
        </p>
        <div className="flex shrink-0 gap-2">
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hola ${pacienteNombre}! ¿Me podés mandar un estudio actualizado cuando puedas?`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center rounded-[9px] border border-input bg-card px-3.5 py-2 text-[12.5px] font-semibold text-foreground transition-colors hover:border-[#C8BFC9]"
          >
            Pedirle un estudio
          </a>
          <SubirDocumentoDialog pacienteId={pacienteId} />
        </div>
      </div>

      <div className="pb-9">
        <div className="mb-2 flex items-baseline gap-2.5 border-b border-border pb-2">
          <span className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Laboratorios y estudios
          </span>
        </div>
        {laboratoriosSection}
      </div>

      <div className="pb-9">
        <div className="mb-2 flex items-baseline gap-2.5 border-b border-border pb-2">
          <span className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Documentos
          </span>
          <span className="text-[11.5px] tabular-nums text-muted-foreground">
            {documentos.length === 1 ? "1 archivo" : `${documentos.length} archivos`}
          </span>
        </div>
        {documentos.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Sin documentos todavía.</p>
        ) : (
          documentos.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3.5 border-b border-[#F2EBF0] py-2.5 last:border-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-input bg-card">
                <FileText className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.nombre}</p>
                <p className="truncate text-[12.5px] tabular-nums text-muted-foreground">
                  {formatoFechaCorta(d.createdAt)}
                </p>
              </div>
              {d.archivoUrl && (
                <a
                  href={d.archivoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[12.5px] font-bold text-primary hover:underline"
                >
                  Ver
                </a>
              )}
            </div>
          ))
        )}
      </div>

      <div>
        <div className="mb-2 flex items-baseline gap-2.5 border-b border-border pb-2">
          <span className="text-[10.5px] font-bold tracking-[.13em] text-muted-foreground uppercase">
            Planes enviados
          </span>
          <span className="text-[11.5px] tabular-nums text-muted-foreground">
            {planesEnviados.length === 1 ? "1 plan" : `${planesEnviados.length} planes`}
          </span>
        </div>
        {planesEnviados.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">Todavía no le enviaste ningún plan.</p>
        ) : (
          planesEnviados.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3.5 border-b border-[#F2EBF0] py-2.5 last:border-0"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-input bg-card">
                <FileText className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Plan alimentario</p>
                <p className="truncate text-[12.5px] tabular-nums text-muted-foreground">
                  Enviado el {formatoFechaCorta(p.enviadoAt)}
                </p>
              </div>
              <Link
                href="?tab=plan"
                scroll={false}
                className="shrink-0 text-[12.5px] font-bold text-primary hover:underline"
              >
                Ver
              </Link>
            </div>
          ))
        )}
      </div>

      {totalArchivos === 0 && documentos.length === 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-[#D8CDD7] bg-card px-4.5 py-5 text-center">
          <p className="text-[13.5px] leading-[1.55] text-muted-foreground text-pretty">
            Subí un PDF, una foto de un laboratorio o un informe — queda en la historia de{" "}
            {pacienteNombre} con la fecha en que lo subiste.
          </p>
        </div>
      )}
    </div>
  );
}
