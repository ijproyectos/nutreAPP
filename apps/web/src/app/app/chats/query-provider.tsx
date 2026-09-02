"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** RF-050: mensajería con polling simple (decisión ya documentada en
 * docs/architecture.md — Realtime queda de mejora, no bloqueante para el
 * MVP). TanStack Query es la única pieza del proyecto que hace fetch +
 * cache del lado del cliente fuera de Server Components, y este es su
 * único uso real hoy — por eso el provider vive acá adentro de /chats en
 * vez de en el layout global. `useState(() => new QueryClient())` es el
 * patrón estándar para que cada sesión de navegador tenga su propia
 * instancia sin recrearla en cada render. */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
