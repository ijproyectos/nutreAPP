import { ConfiguracionNav } from "./configuracion-nav";

export default function ConfiguracionLayout({
  children,
}: LayoutProps<"/app/configuracion">) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold text-primary">Configuración</h1>
      <div className="flex gap-6">
        <ConfiguracionNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
