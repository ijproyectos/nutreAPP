"use client";

import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  actualizarCuenta,
  subirAvatar,
  subirFirma,
  type ActualizarCuentaState,
  type SubirArchivoPerfilState,
} from "./actions";

const initialCuentaState: ActualizarCuentaState = { status: "idle" };
const initialSubirState: SubirArchivoPerfilState = { status: "idle" };

function iniciales(nombre: string, apellido: string) {
  const base = `${nombre} ${apellido}`.trim();
  return base
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** "Subir" / "Subir firma" — mismo patrón en las dos tarjetas: click abre
 * el file picker, elegir un archivo sube de una (sin un paso de
 * "confirmar" aparte, igual que el mockup). */
function SubirArchivo({ accion, label }: { accion: typeof subirAvatar; label: string }) {
  const [state, formAction, pending] = useActionState(accion, initialSubirState);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (!archivo) return;
          const fd = new FormData();
          fd.set("archivo", archivo);
          // startTransition, no una llamada directa: el dispatcher de
          // useActionState fuera de una transición no marca `pending`
          // (React exige `ReactSharedInternals.T` seteado para eso) y
          // tira un console.error ("called outside of a transition") en
          // cada subida — confirmado contra el runtime de React 19
          // instalado, no es un nitpick teórico.
          startTransition(() => formAction(fd));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-3.5" />
        {pending ? "Subiendo…" : label}
      </Button>
      {state.status === "error" && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}

export function CuentaView({
  email,
  valoresIniciales,
  avatarUrl,
  firmaUrl,
}: {
  email: string;
  valoresIniciales: {
    nombre: string;
    apellido: string;
    telefono: string;
    matriculaNacional: string;
    matriculaProvincial: string;
    profesion: string;
    especialidades: string[];
  };
  avatarUrl: string | null;
  firmaUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    actualizarCuenta,
    initialCuentaState
  );

  const [nombre, setNombre] = useState(valoresIniciales.nombre);
  const [apellido, setApellido] = useState(valoresIniciales.apellido);
  const [telefono, setTelefono] = useState(valoresIniciales.telefono);
  const [matriculaNacional, setMatriculaNacional] = useState(
    valoresIniciales.matriculaNacional
  );
  const [matriculaProvincial, setMatriculaProvincial] = useState(
    valoresIniciales.matriculaProvincial
  );
  const [profesion, setProfesion] = useState(valoresIniciales.profesion);
  const [especialidades, setEspecialidades] = useState<string[]>(
    valoresIniciales.especialidades
  );
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState("");

  function agregarEspecialidad() {
    const valor = nuevaEspecialidad.trim();
    if (!valor || especialidades.includes(valor)) {
      setNuevaEspecialidad("");
      return;
    }
    setEspecialidades((prev) => [...prev, valor]);
    setNuevaEspecialidad("");
  }

  function quitarEspecialidad(valor: string) {
    setEspecialidades((prev) => prev.filter((e) => e !== valor));
  }

  function handleKeyDownEspecialidad(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      agregarEspecialidad();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
        <h2 className="text-lg font-semibold">Identidad</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Gestioná tu información personal
        </p>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
                <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
              ) : (
                iniciales(nombre, apellido) || "?"
              )}
            </div>
            <SubirArchivo accion={subirAvatar} label="Subir" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nombre">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nombre"
                name="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                name="apellido"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
              />
              {/* El mockup marca Apellido como obligatorio, pero
                  `profesionales.nombre` ya venía como "nombre completo"
                  desde el alta (altaProfesional) — no se puede exigir acá
                  sin romper cuentas existentes que nunca lo cargaron. */}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="11 3880-7642"
            />
            <p className="text-xs text-muted-foreground">
              Para que te escribamos nosotros desde NutrIA. Tus pacientes no lo ven.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="matricula_nacional">Matrícula Nacional (MN)</Label>
              <Input
                id="matricula_nacional"
                name="matricula_nacional"
                value={matriculaNacional}
                onChange={(e) => setMatriculaNacional(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="matricula_provincial">Matrícula Provincial (MP)</Label>
              <Input
                id="matricula_provincial"
                name="matricula_provincial"
                value={matriculaProvincial}
                onChange={(e) => setMatriculaProvincial(e.target.value)}
                placeholder="Ej: 12345"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profesion">Profesión</Label>
            <Input
              id="profesion"
              name="profesion"
              value={profesion}
              onChange={(e) => setProfesion(e.target.value)}
              placeholder="Nutrición"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nueva_especialidad">Especialidad</Label>
            <Input
              id="nueva_especialidad"
              value={nuevaEspecialidad}
              onChange={(e) => setNuevaEspecialidad(e.target.value)}
              onKeyDown={handleKeyDownEspecialidad}
              onBlur={agregarEspecialidad}
              placeholder="Escribí y presioná Enter para agregar"
            />
            {especialidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {especialidades.map((e) => (
                  <Badge key={e} variant="secondary" className="gap-1 pr-1">
                    {e}
                    <input type="hidden" name="especialidades" value={e} />
                    <button
                      type="button"
                      onClick={() => quitarEspecialidad(e)}
                      className="rounded-full p-0.5 hover:bg-background/50"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {state.status === "error" && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.status === "success" && (
            <p className="text-sm text-primary">Guardado.</p>
          )}

          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Seguridad</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            <Label>Dirección de email</Label>
            <Input value={email} disabled />
          </div>
          {/* El mockup tiene "Enviar email de recuperación" de
              contraseña — no aplica acá: el login es solo Google OAuth
              (src/app/login/), no hay contraseña propia de NutrIA que
              resetear. Se reemplaza por esta nota en vez de construir un
              flujo que no tiene nada que hacer. */}
          <p className="mt-3 text-sm text-muted-foreground">
            Iniciás sesión con Google — no hay una contraseña de NutrIA
            que gestionar acá. Para más seguridad, revisá la verificación
            en dos pasos desde tu cuenta de Google.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Firma digital</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Se incluirá en los certificados. Recomendamos PNG con fondo
            transparente.
          </p>
          {firmaUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
            <img
              src={firmaUrl}
              alt="Firma digital"
              className="mb-3 h-16 rounded border border-border bg-muted object-contain p-2"
            />
          )}
          <SubirArchivo accion={subirFirma} label="Subir firma" />
        </div>
      </div>
    </div>
  );
}
