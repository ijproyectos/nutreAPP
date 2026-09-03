import { getAuthorizedProfesional } from "@/lib/dal";
import { CuentaView } from "./cuenta-view";

export default async function CuentaPage() {
  const { supabase, profesional, user } = await getAuthorizedProfesional();

  const { data: datos, error } = await supabase
    .from("profesionales")
    .select(
      "nombre, apellido, telefono, matricula_nacional, matricula_provincial, profesion, especialidades, avatar_url, firma_url"
    )
    .eq("id", profesional.id)
    .maybeSingle();

  if (error) {
    console.error("[CuentaPage] select de profesionales falló:", error);
    throw new Error("No se pudo cargar la cuenta.");
  }

  let avatarUrl: string | null = null;
  let firmaUrl: string | null = null;
  if (datos?.avatar_url) {
    const { data } = await supabase.storage
      .from("profesional-archivos")
      .createSignedUrl(datos.avatar_url, 300);
    avatarUrl = data?.signedUrl ?? null;
  }
  if (datos?.firma_url) {
    const { data } = await supabase.storage
      .from("profesional-archivos")
      .createSignedUrl(datos.firma_url, 300);
    firmaUrl = data?.signedUrl ?? null;
  }

  return (
    <CuentaView
      email={user.email ?? ""}
      valoresIniciales={{
        nombre: datos?.nombre ?? profesional.nombre,
        apellido: datos?.apellido ?? "",
        telefono: datos?.telefono ?? "",
        matriculaNacional: datos?.matricula_nacional ?? "",
        matriculaProvincial: datos?.matricula_provincial ?? "",
        profesion: datos?.profesion ?? "",
        especialidades: datos?.especialidades ?? [],
      }}
      avatarUrl={avatarUrl}
      firmaUrl={firmaUrl}
    />
  );
}
