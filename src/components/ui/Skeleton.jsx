/**
 * Skeletons de carga — reemplazan los spinners "Cargando…".
 * Muestran la forma del contenido que va a llegar, lo que hace la espera menos
 * brusca y evita el salto de layout. Se apoyan en las clases .ot-skel
 * (src/styles/primitives.css), que ya respetan prefers-reduced-motion.
 *
 * Uso:
 *   <Skeleton w={120} h={16} />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />           // placeholder de tarjeta genérica
 *   <SkeletonRows rows={5} />  // placeholder de filas de tabla/lista
 */

function toCss(v) {
  return typeof v === "number" ? `${v}px` : v;
}

export function Skeleton({ w, h = 12, r, circle = false, className = "", style }) {
  return (
    <span
      aria-hidden="true"
      className={`ot-skel ${circle ? "ot-skel--circle" : ""} ${className}`}
      style={{
        display: "block",
        width: w != null ? toCss(w) : "100%",
        height: toCss(circle && w != null ? w : h),
        borderRadius: r != null ? toCss(r) : undefined,
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = "60%", className = "" }) {
  return (
    <span className={className} aria-hidden="true" style={{ display: "block" }}>
      {Array.from({ length: lines }).map((_, i) => (
        <span
          key={i}
          className="ot-skel ot-skel--text"
          style={{ display: "block", width: i === lines - 1 ? lastWidth : "100%" }}
        />
      ))}
    </span>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`ot-card ot-card-pad ${className}`} aria-hidden="true" aria-busy="true">
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
        <Skeleton w={42} h={42} circle />
        <div style={{ flex: 1 }}>
          <Skeleton w="45%" h={12} />
          <Skeleton w="70%" h={20} style={{ marginTop: 8 }} />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonRows({ rows = 5, className = "" }) {
  return (
    <div className={className} aria-hidden="true" aria-busy="true" style={{ display: "grid", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="ot-card"
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}
        >
          <Skeleton w={38} h={38} circle />
          <div style={{ flex: 1 }}>
            <Skeleton w="35%" h={11} />
            <Skeleton w="55%" h={14} style={{ marginTop: 7 }} />
          </div>
          <Skeleton w={70} h={26} r={999} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
