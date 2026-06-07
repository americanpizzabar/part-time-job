"use client";

interface SyncBarometerProps {
  accuracy: number;
  genres?: { label: string; accuracy: number }[];
}

export default function SyncBarometer({ accuracy, genres }: SyncBarometerProps) {
  const pct = Math.max(0, Math.min(100, Math.round(accuracy)));
  const particleCount = Math.round(pct / 5);
  const particles = Array.from({ length: particleCount });

  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-950 to-indigo-950 border border-fuchsia-500/30 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_80%_10%,#a855f733,transparent_60%)]" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧠</span>
          <h3 className="text-fuchsia-300 font-bold text-sm tracking-wide">脳内ネットワーク同期率</h3>
        </div>

        {/* Big percentage */}
        <div className="text-center mb-3">
          <div className="text-5xl font-black text-fuchsia-300 drop-shadow-[0_0_12px_#d946efaa] font-mono">
            {pct}<span className="text-2xl align-top">%</span>
          </div>
          <div className="text-[10px] text-fuchsia-400/70 tracking-[0.3em] uppercase mt-0.5">
            sync rate
          </div>
        </div>

        {/* Linear gauge */}
        <div className="h-3 w-full rounded-full overflow-hidden bg-black/50 ring-1 ring-fuchsia-500/20 mb-3">
          <div
            className="h-full rounded-full transition-all duration-700 animate-pulse"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg,#7c3aed,#d946ef,#22d3ee)",
              boxShadow: "0 0 14px #d946efcc",
            }}
          />
        </div>

        {/* Particle field — denser with higher accuracy */}
        <div className="flex flex-wrap gap-1.5 justify-center min-h-[18px] mb-1">
          {particles.map((_, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse"
              style={{
                boxShadow: "0 0 6px #67e8f9",
                animationDelay: `${(i % 10) * 0.12}s`,
              }}
            />
          ))}
        </div>

        {/* Genre breakdown */}
        {genres && genres.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {genres.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-indigo-200/80 w-20 truncate">{g.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, g.accuracy))}%`,
                      background: "linear-gradient(90deg,#6366f1,#22d3ee)",
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-300 w-9 text-right">{Math.round(g.accuracy)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
