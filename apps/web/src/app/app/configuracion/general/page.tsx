import { getAuthorizedProfesional } from "@/lib/dal";
import { GeneralView } from "./general-view";

export default async function GeneralPage() {
  const { profesional } = await getAuthorizedProfesional();
  return <GeneralView consultorioInicial={profesional.consultorio ?? ""} />;
}
