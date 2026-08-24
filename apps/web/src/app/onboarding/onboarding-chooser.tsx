"use client";

import { useActionState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { altaProfesional, aceptarInvitacionInput } from "./actions";

export function OnboardingChooser({ userEmail }: { userEmail: string }) {
  const [profesionalState, profesionalAction, profesionalPending] =
    useActionState(altaProfesional, null);
  const [invitacionState, invitacionAction, invitacionPending] =
    useActionState(aceptarInvitacionInput, null);

  return (
    <Card className="w-full max-w-md p-2">
      <CardHeader>
        <CardTitle className="text-xl">¡Bienvenido/a a NutrIA!</CardTitle>
        <CardDescription>
          Iniciaste sesión como <strong>{userEmail}</strong>. Contanos qué
          rol tenés para armarte el acceso correcto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profesional">
          <TabsList className="w-full">
            <TabsTrigger value="profesional" className="flex-1">
              Soy profesional
            </TabsTrigger>
            <TabsTrigger value="paciente" className="flex-1">
              Fui invitado/a como paciente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profesional" className="pt-4">
            <form action={profesionalAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nombre">Tu nombre</Label>
                <Input id="nombre" name="nombre" required autoComplete="name" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="consultorio">
                  Nombre del consultorio{" "}
                  <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="consultorio" name="consultorio" />
              </div>
              {profesionalState?.error && (
                <p className="text-sm text-destructive">
                  {profesionalState.error}
                </p>
              )}
              <Button type="submit" disabled={profesionalPending}>
                {profesionalPending ? "Creando…" : "Crear mi cuenta"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="paciente" className="pt-4">
            <form action={invitacionAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="token">Link de invitación</Label>
                <Input
                  id="token"
                  name="token"
                  placeholder="Pegá acá el link que te mandó tu nutricionista"
                  required
                />
              </div>
              {invitacionState?.error && (
                <p className="text-sm text-destructive">
                  {invitacionState.error}
                </p>
              )}
              <Button type="submit" disabled={invitacionPending}>
                {invitacionPending ? "Verificando…" : "Continuar"}
              </Button>
              <p className="text-xs text-muted-foreground">
                ¿No tenés un link? Pedile a tu nutricionista que te invite
                desde NutrIA — sin invitación no se puede crear una cuenta de
                paciente.
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
