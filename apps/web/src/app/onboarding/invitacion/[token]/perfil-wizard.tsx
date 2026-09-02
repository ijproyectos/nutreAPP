"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  completarSeccionPerfil,
  type Seccion,
} from "./wizard-actions";

const ORDEN: Seccion[] = [
  "datos_personales",
  "contacto",
  "antecedentes",
  "habitos",
  "consentimiento",
];

const ESTIMADO_SEGUNDOS: Record<Seccion, number> = {
  datos_personales: 40,
  contacto: 30,
  antecedentes: 50,
  habitos: 50,
  consentimiento: 10,
};

const TITULO: Record<Seccion, string> = {
  datos_personales: "Empecemos por lo básico",
  contacto: "¿Cómo te contactamos?",
  antecedentes: "Antecedentes de salud",
  habitos: "Hábitos y actividad",
  consentimiento: "Antes de terminar",
};

const SUBTITULO: Record<Seccion, string> = {
  datos_personales: "Tres cosas y seguimos. Nada de esto se comparte con nadie.",
  contacto: "Para poder avisarte de turnos y recordatorios.",
  antecedentes: "Ayuda a armar un plan seguro para vos. Podés dejar en blanco lo que no aplique.",
  habitos: "Así el plan se ajusta a tu rutina real, no a una genérica.",
  consentimiento: "Necesitamos tu autorización para usar estos datos en tu plan.",
};

type Valores = {
  nombre: string;
  fecha_nacimiento: string;
  sexo_biologico: "femenino" | "masculino" | "";
  telefono: string;
  condiciones: string;
  alergias: string;
  medicacion: string;
  habitos_comidas: string;
  habitos_quien_cocina: string;
  habitos_movimiento: string;
  consentimiento_datos: boolean;
};

export function PerfilWizard({
  valoresIniciales,
  seccionesPendientes,
  profesionalNombre,
}: {
  valoresIniciales: Valores;
  /** Ya en orden — page.tsx filtra las que tienen *_completado_at seteado. */
  seccionesPendientes: Seccion[];
  profesionalNombre: string;
}) {
  const router = useRouter();
  const [pasoIdx, setPasoIdx] = useState(0);
  const [valores, setValores] = useState(valoresIniciales);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (seccionesPendientes.length === 0) {
    // No debería renderizarse — page.tsx redirige a /portal cuando no hay
    // secciones pendientes. Defensivo por si el estado quedó desalineado.
    router.replace("/portal");
    return null;
  }

  const seccion = seccionesPendientes[pasoIdx];
  const numeroGlobal = ORDEN.indexOf(seccion) + 1;
  const restante = seccionesPendientes
    .slice(pasoIdx)
    .reduce((sum, s) => sum + ESTIMADO_SEGUNDOS[s], 0);

  function actualizar<K extends keyof Valores>(campo: K, valor: Valores[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  function datosDeSeccion(s: Seccion): Record<string, unknown> {
    switch (s) {
      case "datos_personales":
        return {
          nombre: valores.nombre || undefined,
          fecha_nacimiento: valores.fecha_nacimiento || undefined,
          sexo_biologico: valores.sexo_biologico || undefined,
        };
      case "contacto":
        return { telefono: valores.telefono || undefined };
      case "antecedentes":
        return {
          condiciones: valores.condiciones || undefined,
          alergias: valores.alergias || undefined,
          medicacion: valores.medicacion || undefined,
        };
      case "habitos":
        return {
          habitos_comidas: valores.habitos_comidas || undefined,
          habitos_quien_cocina: valores.habitos_quien_cocina || undefined,
          habitos_movimiento: valores.habitos_movimiento || undefined,
        };
      case "consentimiento":
        return { aceptado: valores.consentimiento_datos };
    }
  }

  function continuar() {
    if (seccion === "datos_personales" && !valores.nombre.trim()) {
      setError("Contanos cómo te llamás para seguir.");
      return;
    }
    if (seccion === "consentimiento" && !valores.consentimiento_datos) {
      setError("Necesitamos que aceptes para poder armar tu plan.");
      return;
    }
    setError(null);

    startTransition(async () => {
      const resultado = await completarSeccionPerfil(
        seccion,
        datosDeSeccion(seccion)
      );
      if (resultado.status === "error") {
        setError(resultado.error);
        return;
      }
      if (pasoIdx + 1 < seccionesPendientes.length) {
        setPasoIdx((i) => i + 1);
      } else {
        router.push("/portal");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <Card className="flex w-full max-w-lg flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {profesionalNombre
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{profesionalNombre}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1">
            {ORDEN.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  i < numeroGlobal - 1
                    ? "bg-primary"
                    : i === numeroGlobal - 1
                      ? "bg-primary/60"
                      : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Paso {numeroGlobal} de {ORDEN.length} · queda ~{restante}s
          </p>
        </div>

        <div>
          <h1 className="text-xl font-bold text-primary">{TITULO[seccion]}</h1>
          <p className="text-sm text-muted-foreground">{SUBTITULO[seccion]}</p>
        </div>

        <div className="flex flex-col gap-4">
          {seccion === "datos_personales" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Cómo te llamás</Label>
                <Input
                  id="nombre"
                  value={valores.nombre}
                  onChange={(e) => actualizar("nombre", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fecha_nacimiento">
                  Fecha de nacimiento{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={valores.fecha_nacimiento}
                  onChange={(e) =>
                    actualizar("fecha_nacimiento", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Sirve para calcular tu requerimiento.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Sexo biológico{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  {(["femenino", "masculino"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => actualizar("sexo_biologico", opcion)}
                      className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                        valores.sexo_biologico === opcion
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-input text-foreground hover:bg-muted"
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Se usa solo para calcular tu requerimiento calórico.
                </p>
              </div>
            </>
          )}

          {seccion === "contacto" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="telefono">
                Teléfono{" "}
                <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="telefono"
                value={valores.telefono}
                onChange={(e) => actualizar("telefono", e.target.value)}
                placeholder="11 3880-7642"
              />
            </div>
          )}

          {seccion === "antecedentes" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="condiciones">
                  Condiciones de salud{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="condiciones"
                  value={valores.condiciones}
                  onChange={(e) => actualizar("condiciones", e.target.value)}
                  placeholder="Ej. hipotiroidismo, diabetes, ninguna…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alergias">
                  Alergias{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="alergias"
                  value={valores.alergias}
                  onChange={(e) => actualizar("alergias", e.target.value)}
                  placeholder="Ej. maní, sin alergias…"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="medicacion">
                  Medicación actual{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="medicacion"
                  value={valores.medicacion}
                  onChange={(e) => actualizar("medicacion", e.target.value)}
                />
              </div>
            </>
          )}

          {seccion === "habitos" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habitos_comidas">
                  ¿Cómo son tus comidas en un día típico?{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="habitos_comidas"
                  value={valores.habitos_comidas}
                  onChange={(e) =>
                    actualizar("habitos_comidas", e.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habitos_quien_cocina">
                  ¿Quién cocina en tu casa?{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="habitos_quien_cocina"
                  value={valores.habitos_quien_cocina}
                  onChange={(e) =>
                    actualizar("habitos_quien_cocina", e.target.value)
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habitos_movimiento">
                  ¿Cuánto te movés en la semana?{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  id="habitos_movimiento"
                  value={valores.habitos_movimiento}
                  onChange={(e) =>
                    actualizar("habitos_movimiento", e.target.value)
                  }
                  placeholder="Ej. camino 30min 3 veces por semana"
                />
              </div>
            </>
          )}

          {seccion === "consentimiento" && (
            <label className="group/field-label flex items-start gap-3 rounded-lg border border-input p-3">
              <Checkbox
                checked={valores.consentimiento_datos}
                onCheckedChange={(checked) =>
                  actualizar("consentimiento_datos", checked === true)
                }
              />
              <span className="text-sm">
                Acepto que mis datos de salud se usen para armar mi plan
                alimentario y hacerle seguimiento con mi nutricionista.
              </span>
            </label>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={continuar} disabled={pending} className="gap-1.5">
            {pending
              ? "Guardando…"
              : seccion === "consentimiento"
                ? "Finalizar"
                : "Continuar →"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
