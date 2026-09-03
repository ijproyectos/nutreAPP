import { notFound } from "next/navigation";
import { Proximamente } from "@/components/proximamente";
import { TODAS_LAS_SECCIONES } from "../secciones";

// Catch-all para las 16 secciones del mockup sin diseño real todavía
// (una sola de las 17 capturas mostraba contenido — "Cuenta", que tiene
// su propia ruta en ../cuenta/). notFound() para cualquier slug que no
// esté en el mapa — no queremos una ruta "Próximamente" abierta a
// cualquier string.
export default async function SeccionConfiguracionPage(
  props: PageProps<"/app/configuracion/[seccion]">
) {
  const { seccion } = await props.params;
  const item = TODAS_LAS_SECCIONES.find((s) => s.slug === seccion);

  if (!item || item.slug === "cuenta") notFound();

  return <Proximamente titulo={item.label} descripcion={item.descripcion} />;
}
