/** Gráfico de peso — SVG a mano (línea + área + último punto
 * destacado), sin librería de gráficos (no hay ninguna en el stack, ver
 * package.json, y no amerita sumar una para esto). Reemplaza al
 * `Sparkline` que vivía en el viejo historia-clinica-panel.tsx —
 * mismos datos, un poco más fiel al mockup (área tintada + etiqueta del
 * último valor). `width="100%"` + `preserveAspectRatio="none"` lo hace
 * responsive sin ResizeObserver: el viewBox fijo solo define la
 * proporción, no el tamaño real en pantalla. */
export function PesoChart({ pesos }: { pesos: number[] }) {
  if (pesos.length < 2) return null;

  const w = 460;
  const h = 92;
  const pad = 8;
  const min = Math.min(...pesos) - 0.6;
  const max = Math.max(...pesos) + 0.6;
  const rango = max - min || 1;

  const puntos = pesos.map((v, i) => [
    pad + (i * (w - pad * 2)) / (pesos.length - 1),
    pad + (1 - (v - min) / rango) * (h - pad * 2),
  ]);

  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const ultimo = puntos[puntos.length - 1];
  const area = `${linea} L${ultimo[0].toFixed(1)} ${h} L${puntos[0][0].toFixed(1)} ${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      className="block overflow-visible"
      aria-hidden="true"
    >
      <path d={area} fill="var(--accent)" />
      <path d={linea} fill="none" stroke="var(--primary)" strokeWidth={1.6} strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === puntos.length - 1 ? 3.4 : 2}
          fill={i === puntos.length - 1 ? "var(--primary)" : "#C8BFC9"}
        />
      ))}
      <text
        x={ultimo[0]}
        y={ultimo[1] - 11}
        textAnchor="end"
        style={{ fill: "var(--primary)", fontSize: 11, fontWeight: 600 }}
      >
        {pesos[pesos.length - 1]}
      </text>
    </svg>
  );
}
