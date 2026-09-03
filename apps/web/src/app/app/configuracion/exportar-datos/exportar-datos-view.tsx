"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportarPacientesCsv } from "./actions";

export function ExportarDatosView() {
  const [descargando, setDescargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExportar() {
    setDescargando(true);
    setError(null);

    const resultado = await exportarPacientesCsv();
    setDescargando(false);

    if (resultado.status === "error") {
      setError(resultado.error);
      return;
    }

    // Descarga client-side normal (Blob + <a> temporal) — no hay nada
    // especial acá, es la app real de NutrIA, no un artifact con
    // descargas bloqueadas.
    const blob = new Blob([resultado.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pacientes-nutria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-md rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Exportar datos</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Descargá tu cartera de pacientes en CSV — nombre, contacto, DNI,
        obra social, sede y motivo de consulta. Historia clínica,
        laboratorios y planes no se incluyen acá.
      </p>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <Button onClick={handleExportar} disabled={descargando} className="gap-1.5">
        <Download className="size-4" />
        {descargando ? "Generando…" : "Exportar pacientes (CSV)"}
      </Button>
    </div>
  );
}
