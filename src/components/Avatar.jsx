import React from "react";

export default function Avatar({ name = "?", size = 36, color, src, className = "" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    background: color || "linear-gradient(145deg,var(--leaf),var(--mid))",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: Math.round(size * 0.36) + "px",
    flexShrink: 0,
    overflow: "hidden",
  };

  if (src) {
    return (
      <div className={`avatar ${className}`} style={style} aria-hidden>
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }

  return (
    <div className={`avatar ${className}`} style={style} aria-hidden>
      {initials}
    </div>
  );
}
