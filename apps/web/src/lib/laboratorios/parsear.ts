import { getDocumentProxy, extractText } from "unpdf";

export type ValoresLaboratorio = Record<string, number>;

/**
 * Patrones simples para analitos comunes de laboratorio en español —
 * "expresiones regulares simples sobre patrones típicos", no OCR/NLP.
 * Cada regex busca la etiqueta seguida (a poca distancia) de un número,
 * ignorando la unidad. El profesional revisa y corrige todo esto al
 * validar — esto es solo un punto de partida, no tiene que ser perfecto.
 */
const PATRONES: { clave: string; regex: RegExp }[] = [
  { clave: "glucosa", regex: /glucosa[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  {
    clave: "colesterol_total",
    regex: /colesterol\s*total[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
  { clave: "hdl", regex: /\bhdl\b[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  { clave: "ldl", regex: /\bldl\b[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  {
    clave: "trigliceridos",
    regex: /triglic[eé]ridos[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
  { clave: "hierro", regex: /\bhierro\b[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  {
    clave: "vitamina_d",
    regex:
      /(?:vitamina\s*d\b|25[\s-]?oh[\s-]?vitamina\s*d)[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
  { clave: "tsh", regex: /\btsh\b[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  {
    clave: "creatinina",
    regex: /creatinina[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
  { clave: "urea", regex: /\burea\b[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i },
  {
    clave: "hemoglobina",
    regex: /hemoglobina[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
  {
    clave: "hematocrito",
    regex: /hematocrito[^\d\n]{0,25}(\d{1,4}[.,]?\d{0,2})/i,
  },
];

async function extraerTextoPdf(bytes: Uint8Array): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch {
    // PDF escaneado sin capa de texto, corrupto, etc. — no es un error
    // fatal, el laboratorio queda con valores vacíos para carga manual.
    return null;
  }
}

export function parsearValoresDesdeTexto(texto: string): ValoresLaboratorio {
  const valores: ValoresLaboratorio = {};
  for (const { clave, regex } of PATRONES) {
    const match = texto.match(regex);
    if (!match) continue;
    const numero = Number(match[1].replace(",", "."));
    if (!Number.isNaN(numero)) valores[clave] = numero;
  }
  return valores;
}

/**
 * Punto de entrada: intenta extraer valores de un archivo subido. Solo
 * soporta PDF con capa de texto — imágenes escaneadas se dejan sin
 * procesar (sin OCR en esta versión, ver docs/architecture.md). Nunca
 * lanza: si algo falla, devuelve `{}` y el profesional carga a mano.
 */
export async function parsearLaboratorio(
  bytes: Uint8Array,
  contentType: string
): Promise<ValoresLaboratorio> {
  if (contentType !== "application/pdf") return {};

  const texto = await extraerTextoPdf(bytes);
  if (!texto) return {};

  return parsearValoresDesdeTexto(texto);
}
