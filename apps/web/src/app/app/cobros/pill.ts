/** Clases del botón-pill usado por los grupos de opciones excluyentes de
 * este módulo (Modalidad/Qué es en editor-servicio-dialog.tsx, %/Sobre
 * qué en aumento-precios-dialog.tsx) — antes duplicado idéntico en los
 * dos archivos, hallazgo de `code-reviewer` en el pre-commit-orchestrator. */
export function pill(activo: boolean) {
  return activo
    ? "border-[#D8C4D6] bg-accent text-primary"
    : "border-input bg-background text-[#4C4455] hover:border-[#C8BFC9]";
}
