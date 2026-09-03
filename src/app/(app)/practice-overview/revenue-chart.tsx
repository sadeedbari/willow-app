import type { MonthPoint } from "./data";

export function RevenueChart({ months }: { months: MonthPoint[] }) {
  const w = 560;
  const h = 170;
  const pad = 32;
  const max = Math.max(...months.map((m) => m.cents), 1) * 1.1;

  const pts = months.map((m, i) => {
    const x = pad + i * ((w - pad * 2) / (months.length - 1));
    const y = h - pad - (m.cents / max) * (h - pad * 1.6);
    return [x, y] as const;
  });

  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1][0]},${h - pad} L${pts[0][0]},${h - pad} Z`;

  const gridLines = [0, 1, 2, 3].map((i) => {
    const y = pad + i * ((h - pad * 1.6) / 3);
    return <line key={i} x1={pad} y1={y} x2={w - pad} y2={y} stroke="var(--border)" strokeWidth="1" />;
  });

  const labels = pts.map(([x], i) => (
    <text key={i} x={x} y={h - 8} fontSize="11" fill="var(--text-3)" textAnchor="middle">
      {months[i].label}
    </text>
  ));

  const dots = pts.map(([x, y], i) => (
    <circle
      key={i}
      cx={x}
      cy={y}
      r={i === pts.length - 1 ? 4.5 : 3}
      fill={i === pts.length - 1 ? "#8F86D6" : "var(--surface)"}
      stroke="#8F86D6"
      strokeWidth="2"
    />
  ));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      <defs>
        <linearGradient id="revenue-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8F86D6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#8F86D6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines}
      <path d={area} fill="url(#revenue-gradient)" />
      <path d={path} fill="none" stroke="#8F86D6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {dots}
      {labels}
    </svg>
  );
}
