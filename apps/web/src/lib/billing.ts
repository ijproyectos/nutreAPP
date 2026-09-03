import "server-only";

/**
 * Cobro online — RF-070/071, explícitamente Fase 2 del PRD original
 * (`docs/product-prd-original.md` §3.6: "Cobro online integrado (link de
 * pago)"). `docs/architecture.md` ya documentaba este archivo como el
 * lugar donde va a vivir cuando se construya (Mercado Pago Checkout Pro).
 *
 * `crearLinkDePago` es un stub a propósito, no una integración a medias:
 * ningún código de este repo lo llama todavía. `/app/cobros` (RF-070) es
 * 100% registro manual — el profesional marca "cobrado" a mano, no hay
 * botón de "cobrar online" en la UI. Cuando se integre Mercado Pago, este
 * archivo es el único punto de contacto a tocar (mismo criterio que
 * `lib/ai/generar-plan.ts`/`lib/email/enviar.ts`: un solo lugar por
 * servicio externo).
 */

export type ResultadoLinkDePago =
  | { disponible: true; url: string }
  | { disponible: false; motivo: string };

// Firma real del stub que va a necesitar el id cuando se integre Mercado
// Pago; el prefijo _ solo no alcanza acá porque es el único parámetro (el
// linter no tiene argsIgnorePattern configurado, a diferencia de otros repos).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function crearLinkDePago(_cobroId: string): Promise<ResultadoLinkDePago> {
  return {
    disponible: false,
    motivo: "El cobro online todavía no está integrado — registralo manualmente.",
  };
}
