import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5";

const PlanIASchema = z.object({
  resumen: z
    .string()
    .describe("Resumen del enfoque general del plan, 1-2 oraciones."),
  dias: z
    .array(
      z.object({
        dia: z.string().describe('ej. "Lunes", "Martes"'),
        comidas: z.array(
          z.object({
            nombre: z
              .string()
              .describe("ej. Desayuno, Almuerzo, Merienda, Cena"),
            descripcion: z.string(),
          })
        ),
        nota: z
          .string()
          .optional()
          .describe("Justificación breve de ese día, si aplica."),
      })
    )
    .min(1),
  consideraciones_laboratorio: z
    .string()
    .optional()
    .describe(
      "Cómo influyeron los valores de laboratorio validados en el plan, si había alguno. Omitir si no había laboratorio."
    ),
});

export type PlanIA = z.infer<typeof PlanIASchema>;

export type GenerarPlanInput = {
  paciente: {
    nombre: string;
    edad: number | null;
    objetivo?: string | null;
  };
  notasProfesional?: string | null;
  ultimaMedicion?: { fecha: string; peso: number | null } | null;
  laboratorioValidado?: {
    fecha: string;
    valores: Record<string, number>;
  } | null;
};

export type GenerarPlanResultado =
  | { ok: true; contenido: string; crudo: PlanIA }
  | { ok: false; error: string; reintentable: boolean };

function construirPrompt(input: GenerarPlanInput): string {
  const partes: string[] = [];

  partes.push(
    `Paciente: ${input.paciente.nombre}${
      input.paciente.edad !== null ? `, ${input.paciente.edad} años` : ""
    }.`
  );

  if (input.paciente.objetivo) {
    partes.push(`Objetivo: ${input.paciente.objetivo}.`);
  }

  if (input.notasProfesional) {
    partes.push(`Notas del profesional: ${input.notasProfesional}`);
  }

  if (input.ultimaMedicion?.peso != null) {
    partes.push(
      `Última medición registrada (${input.ultimaMedicion.fecha}): peso ${input.ultimaMedicion.peso}kg.`
    );
  }

  if (
    input.laboratorioValidado &&
    Object.keys(input.laboratorioValidado.valores).length > 0
  ) {
    const valoresTexto = Object.entries(input.laboratorioValidado.valores)
      .map(([clave, valor]) => `${clave.replace(/_/g, " ")}: ${valor}`)
      .join(", ");
    partes.push(
      `Laboratorio validado más reciente (${input.laboratorioValidado.fecha}): ${valoresTexto}. Ajustá el plan si algún valor lo amerita (ej. hierro bajo, azúcares altos, etc.) y explicalo en "consideraciones_laboratorio".`
    );
  } else {
    partes.push(
      "No hay laboratorio validado disponible todavía — no inventes valores ni supongas resultados."
    );
  }

  partes.push(
    "Armá un borrador de plan alimentario semanal (7 días), con comidas concretas y una nota breve de justificación por día cuando corresponda. Es un borrador: un profesional en nutrición lo va a revisar y editar antes de enviarlo, así que priorizá que sea un buen punto de partida, no una prescripción final."
  );

  return partes.join("\n");
}

function formatearComoMarkdown(plan: PlanIA): string {
  const bloques: string[] = [`## Resumen\n\n${plan.resumen}`];

  for (const dia of plan.dias) {
    const comidas = dia.comidas
      .map((c) => `- **${c.nombre}**: ${c.descripcion}`)
      .join("\n");
    let bloque = `## ${dia.dia}\n\n${comidas}`;
    if (dia.nota) bloque += `\n\n_${dia.nota}_`;
    bloques.push(bloque);
  }

  if (plan.consideraciones_laboratorio) {
    bloques.push(
      `## Consideraciones de laboratorio\n\n${plan.consideraciones_laboratorio}`
    );
  }

  return bloques.join("\n\n");
}

/**
 * Genera un borrador de plan alimentario con Claude. Nunca se envía al
 * paciente directamente — el resultado siempre entra como `borrador_ia`
 * (RF de generación de plan con IA), y solo se vuelve visible para el
 * paciente cuando el profesional lo edita/confirma y lo envía.
 */
export async function generarPlanConIA(
  input: GenerarPlanInput
): Promise<GenerarPlanResultado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error:
        "No hay una API key de Anthropic configurada en el servidor. Avisale al administrador.",
      reintentable: false,
    };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      system:
        "Sos un asistente que arma borradores de planes alimentarios semanales para nutricionistas profesionales en LATAM. Respondé siempre en español rioplatense neutro. No diagnostiques ni prescribas tratamientos médicos — este es un borrador de plan alimentario que un profesional en nutrición matriculado va a revisar, corregir y validar antes de que llegue al paciente.",
      messages: [{ role: "user", content: construirPrompt(input) }],
      output_config: {
        format: zodOutputFormat(PlanIASchema),
      },
    });

    if (!response.parsed_output) {
      return {
        ok: false,
        error:
          "La IA no devolvió un plan con el formato esperado. Podés reintentar o escribir el plan manualmente.",
        reintentable: true,
      };
    }

    return {
      ok: true,
      contenido: formatearComoMarkdown(response.parsed_output),
      crudo: response.parsed_output,
    };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        error:
          "Se alcanzó el límite de uso de la IA por ahora. Esperá un momento y reintentá, o escribí el plan manualmente.",
        reintentable: true,
      };
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        error:
          "La API key de Anthropic no es válida. Avisale al administrador.",
        reintentable: false,
      };
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return {
        ok: false,
        error: "La IA tardó demasiado en responder. Reintentá en un momento.",
        reintentable: true,
      };
    }
    if (error instanceof Anthropic.APIError) {
      return {
        ok: false,
        error: `Error de la IA (${error.status}). Reintentá o escribí el plan manualmente.`,
        reintentable: true,
      };
    }
    return {
      ok: false,
      error:
        "No se pudo generar el plan por un error inesperado. Reintentá o escribí el plan manualmente.",
      reintentable: true,
    };
  }
}
