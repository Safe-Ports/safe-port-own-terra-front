import "./sky-scene.css";

// Momento del día para el saludo y el cielo. Lo comparten el inicio de Properties
// (administración), el portal de comunidad (residentes) y la Actividad de Lands.
export function skyPeriod(hour) {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

export function greeting(hour) {
  if (hour >= 5 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

const STARS = [[520,40],[600,90],[690,36],[760,110],[930,48],[860,150],[640,150],[980,120],[420,70],[330,30]];

function House({ x, y, windowFill }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect x="112" y="6" width="14" height="30" fill="var(--sky-roof)"/>
    <path d="M0 50 L80 0 L160 50Z" fill="var(--sky-roof)"/>
    <rect x="14" y="46" width="132" height="92" rx="4" fill="var(--sky-wall)"/>
    <rect x="66" y="84" width="28" height="54" rx="3" fill="var(--sky-door)"/>
    <circle cx="88" cy="113" r="2.2" fill={windowFill}/>
    <rect className="sky-window" x="28" y="66" width="26" height="24" rx="3" fill={windowFill}/>
    <rect className="sky-window" x="106" y="66" width="26" height="24" rx="3" fill={windowFill}/>
  </g>;
}

// Terreno lotificado: estacas que marcan los lotes y un letrero sobre la colina.
function Land() {
  return <g>
    {[640, 690, 740, 790, 840, 890, 940].map((x) => <rect key={x} x={x} y={232 - (x - 640) * 0.035} width="4" height="22" rx="1" fill="var(--sky-door)"/>)}
    <path d="M642 238 L942 228" stroke="var(--sky-door)" strokeWidth="1.5" opacity=".6"/>
    <g transform="translate(800 150)">
      <rect x="18" y="40" width="6" height="52" fill="var(--sky-door)"/>
      <rect x="0" y="0" width="92" height="46" rx="4" fill="var(--sky-wall)"/>
      <rect x="10" y="12" width="56" height="7" rx="3" fill="var(--sky-roof)"/>
      <rect x="10" y="26" width="38" height="6" rx="3" fill="var(--sky-roof)" opacity=".55"/>
    </g>
  </g>;
}

function Building({ x, y, windowFill, lit, floors = 6 }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect x="-6" y="-8" width="132" height="12" rx="4" fill="var(--sky-roof)"/>
    <rect x="0" y="0" width="120" height={floors * 27 + 34} rx="5" fill="var(--sky-wall)"/>
    {Array.from({ length: floors }, (_, row) => [0, 1, 2].map((col) => <rect key={`${row}-${col}`} className={lit && (row + col) % 3 === 1 ? "sky-window is-dim" : "sky-window"} x={14 + col * 34} y={16 + row * 27} width="22" height="16" rx="2" fill={windowFill}/>))}
    <rect x="47" y={floors * 27 + 14} width="26" height="20" rx="2" fill="var(--sky-door)"/>
  </g>;
}

/**
 * Cielo según la hora con colinas y la casa, el edificio, la comunidad completa o un terreno.
 * Se anima con suavidad (estrellas, sol o luna, nubes); sin movimiento si la persona
 * lo pidió en su sistema. El contenedor necesita la clase `sky-host is-<periodo>`.
 */
function SkyScene({ period, kind = "building" }) {
  const lit = period === "dusk" || period === "night";
  const windowFill = lit ? "#f6cf84" : "#dbe8f4";
  return <svg className="sky-scene" viewBox="0 0 1000 300" aria-hidden="true" preserveAspectRatio="xMaxYMax slice">
    {period === "night" ? <>
      {STARS.map(([x, y], index) => <circle key={`${x}-${y}`} className="sky-star" style={{ animationDelay: `${(index % 5) * 0.7}s` }} cx={x} cy={y} r="1.8" fill="#f3ead6"/>)}
      <g className="sky-orb"><circle cx="900" cy="70" r="24" fill="#f3ead6"/><circle cx="911" cy="63" r="22" fill="var(--sky-top)"/></g>
    </> : <circle className="sky-orb" cx="900" cy={period === "day" ? 70 : 150} r={period === "day" ? 30 : 38} fill={period === "day" ? "#fbe7b5" : "#f7c58f"} opacity=".95"/>}
    {period !== "night" ? <g className="sky-clouds" fill="#fff" opacity={period === "day" ? .75 : .35}>
      <g className="sky-cloud"><ellipse cx="560" cy="64" rx="44" ry="13"/><ellipse cx="584" cy="54" rx="26" ry="15"/></g>
      <g className="sky-cloud is-slow"><ellipse cx="760" cy="112" rx="34" ry="10"/><ellipse cx="778" cy="104" rx="20" ry="11"/></g>
    </g> : null}
    <path d="M0 236 C160 208 300 226 460 210 C620 194 760 220 1000 196 L1000 300 L0 300Z" fill="var(--sky-hill-far)"/>
    <path d="M0 262 C200 244 380 258 560 246 C720 236 860 252 1000 242 L1000 300 L0 300Z" fill="var(--sky-hill-near)"/>
    {kind === "house" ? <House x={748} y={150} windowFill={windowFill}/> : null}
    {kind === "building" ? <Building x={770} y={70} windowFill={windowFill} lit={lit}/> : null}
    {kind === "land" ? <Land/> : null}
    {kind === "community" ? <>
      <Building x={780} y={97} windowFill={windowFill} lit={lit} floors={5}/>
      <g transform="translate(860 178) scale(.72)"><House x={0} y={0} windowFill={windowFill}/></g>
    </> : null}
    <g fill="var(--sky-tree)"><circle cx="740" cy="252" r="18"/><circle cx="724" cy="261" r="12"/><rect x="738" y="258" width="5" height="22"/><circle cx="960" cy="262" r="15"/><circle cx="120" cy="270" r="14"/><circle cx="104" cy="276" r="9"/></g>
  </svg>;
}

export default SkyScene;
