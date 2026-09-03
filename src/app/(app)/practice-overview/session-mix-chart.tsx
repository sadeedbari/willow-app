import type { SessionMixSlice } from "./data";

export function SessionMixChart({ slices }: { slices: SessionMixSlice[] }) {
  const r = 54;
  const cx = 64;
  const cy = 64;
  const circ = 2 * Math.PI * r;

  const rotations = slices.reduce<number[]>((acc, s, i) => {
    acc.push(i === 0 ? -90 : acc[i - 1] + 360 * (slices[i - 1].pct / 100));
    return acc;
  }, []);

  const arcs = slices.map((s, i) => {
    const len = circ * (s.pct / 100);
    return (
      <circle
        key={s.type}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={s.color}
        strokeWidth="16"
        strokeDasharray={`${len} ${circ - len}`}
        transform={`rotate(${rotations[i]} ${cx} ${cy})`}
      />
    );
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="128" height="128" viewBox="0 0 128 128">{arcs}</svg>
      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <div key={s.type} className="flex items-center gap-2 text-[12.8px] text-foreground">
            <span className="h-[9px] w-[9px] flex-none rounded-[2px]" style={{ background: s.color }} />
            {s.label}
            <b className="ml-3.5 tabular-nums">{s.pct}%</b>
          </div>
        ))}
        {!slices.length && <p className="text-[12.8px] text-text-3">No sessions in the last 30 days.</p>}
      </div>
    </div>
  );
}
