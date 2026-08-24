import "server-only";
import { Resend } from "resend";

// Email transaccional: invitación a paciente (RF-020) y recordatorio manual
// de turno (RF-042). Mismo criterio que src/lib/laboratorios/parsear.ts —
// nunca lanza. Un mail que no sale no puede tumbar el flujo principal
// (crear paciente, recordar turno), así que todo error queda logueado y
// se devuelve como { enviado: false } para que el caller decida qué mostrar.
//
// Nota: sin dominio verificado en Resend, el remitente de sandbox
// (onboarding@resend.dev) solo entrega al email dueño de la cuenta de
// Resend — a cualquier otro destinatario le va a devolver error. Es
// esperable mientras no se verifique un dominio propio.

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL || "NutrIA <onboarding@resend.dev>";

type ResultadoEnvio = { enviado: boolean; error?: string };

async function enviar(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<ResultadoEnvio> {
  if (!resend) {
    console.error("[email] RESEND_API_KEY no configurada — no se envió el mail.");
    return { enviado: false, error: "Envío de email no configurado." };
  }

  try {
    const { error } = await resend.emails.send({ from: FROM, ...params });
    if (error) {
      console.error("[email] Resend devolvió error:", error);
      return { enviado: false, error: error.message };
    }
    return { enviado: true };
  } catch (err) {
    console.error("[email] Falló el envío:", err);
    return { enviado: false, error: "No se pudo enviar el email." };
  }
}

export async function enviarInvitacionPaciente(params: {
  email: string;
  nombrePaciente: string;
  link: string;
}): Promise<ResultadoEnvio> {
  return enviar({
    to: params.email,
    subject: "Te invitaron a NutrIA",
    html: `<p>Hola ${params.nombrePaciente},</p>
<p>Tu nutricionista te invitó a sumarte a NutrIA. Entrá a este link e iniciá sesión con tu cuenta de Google para empezar:</p>
<p><a href="${params.link}">${params.link}</a></p>`,
  });
}

export async function enviarRecordatorioTurno(params: {
  email: string;
  nombrePaciente: string;
  fechaHora: string;
}): Promise<ResultadoEnvio> {
  const fecha = new Date(params.fechaHora).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return enviar({
    to: params.email,
    subject: "Recordatorio de tu turno",
    html: `<p>Hola ${params.nombrePaciente},</p>
<p>Te recordamos tu turno del ${fecha}. Si todavía no lo confirmaste, respondé este mail o avisale a tu nutricionista.</p>`,
  });
}
