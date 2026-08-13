import { T } from "@/lib/theme";

// Shown instantly on every tab switch while the server renders — so a tap
// always gives immediate feedback instead of feeling frozen.
function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="fm-shimmer"
          style={{
            height: 14,
            width: `${[70, 90, 55, 80][i % 4]}%`,
            borderRadius: 6,
            background: T.rule,
          }}
        />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <div style={{ padding: "0 20px 24px" }}>
      <div style={{ padding: "18px 0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          className="fm-shimmer"
          style={{ height: 11, width: 120, borderRadius: 6, background: T.rule }}
        />
        <div
          className="fm-shimmer"
          style={{ height: 30, width: 160, borderRadius: 8, background: T.rule }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  );
}
