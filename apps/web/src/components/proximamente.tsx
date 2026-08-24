import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function Proximamente({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="p-6">
      <Card className="mx-auto max-w-2xl p-6">
        <CardHeader className="p-0">
          <CardTitle className="text-xl">{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
