"use client";

interface RadarDatum {
  label: string;
  accuracy: number; // 0-100
}

/**
 * Pure-SVG 4-axis radar chart for genre accuracy.
 * No external libraries. Works on white cards.
 */
export default function AccuracyRadar({ data }: { data: RadarDatum[] }) {
  const size = 240;
  const center = size / 2;
  const maxR = 92; // radius for 100%

  // 4 axes, starting at top (12 o'clock) going clockwise.
  const axes = data.slice(0, 4);
  const n = Math.max(axes.length, 1);

  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const pointAt = (i: number, ratio: number) => {
    const a = angleFor(i);
    return {
      x: center + Math.cos(a) * maxR * ratio,
      y: center + Math.sin(a) * maxR * ratio,
    };
  };

  const rings = [0.25, 0.5, 0.75, 1];

  // Grid polygon path for a given ratio
  const ringPath = (ratio: number) =>
    axes
      .map((_, i) => {
        const p = pointAt(i, ratio);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  // Data polygon
  const dataPath =
    axes
      .map((d, i) => {
        const p = pointAt(i, Math.min(100, Math.max(0, d.accuracy)) / 100);
        return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      role="img"
      aria-label="ジャンル別正答率レーダーチャート"
    >
      {/* grid rings */}
      {rings.map((r, idx) => (
        <path
          key={r}
          d={ringPath(r)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={1}
          opacity={idx === rings.length - 1 ? 1 : 0.7}
        />
      ))}

      {/* axes lines */}
      {axes.map((_, i) => {
        const p = pointAt(i, 1);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}

      {/* data polygon */}
      <path d={dataPath} fill="#6366f1" fillOpacity={0.25} stroke="#6366f1" strokeWidth={2} />

      {/* data vertices */}
      {axes.map((d, i) => {
        const p = pointAt(i, Math.min(100, Math.max(0, d.accuracy)) / 100);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />;
      })}

      {/* axis labels */}
      {axes.map((d, i) => {
        const p = pointAt(i, 1.18);
        const anchor =
          Math.abs(p.x - center) < 6 ? "middle" : p.x > center ? "start" : "end";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            fill="#374151"
          >
            {d.label}
            <tspan fontSize={10} fontWeight={400} fill="#6366f1" dx={2}>
              {Math.round(d.accuracy)}%
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
