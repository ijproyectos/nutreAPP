import { RegistroForm } from "./registro-form";

export default function RegistroPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Registrar</h1>
        <p className="text-sm text-muted-foreground">
          Contale a tu nutricionista cómo vas.
        </p>
      </div>
      <RegistroForm />
    </div>
  );
}
