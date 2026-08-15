import { useMemo } from "react";
import "./phoneInput.css";

/**
 * Campo de teléfono con selector de lada (código de país). El valor que entra y
 * sale es un solo string: `"+52 5512345678"` (lada + espacio + dígitos). Si el
 * número está vacío, el valor es "" (para no guardar solo la lada).
 *
 * Compatibilidad: si llega un número viejo sin lada (solo dígitos), se asume +52
 * (México). Los links de WhatsApp/tel siguen funcionando porque toman los dígitos.
 */
export const COUNTRY_CODES = [
  { cc: "+52", flag: "🇲🇽", name: "México" },
  { cc: "+1", flag: "🇺🇸", name: "EE.UU. / Canadá" },
  { cc: "+34", flag: "🇪🇸", name: "España" },
  { cc: "+54", flag: "🇦🇷", name: "Argentina" },
  { cc: "+55", flag: "🇧🇷", name: "Brasil" },
  { cc: "+56", flag: "🇨🇱", name: "Chile" },
  { cc: "+57", flag: "🇨🇴", name: "Colombia" },
  { cc: "+51", flag: "🇵🇪", name: "Perú" },
  { cc: "+58", flag: "🇻🇪", name: "Venezuela" },
  { cc: "+593", flag: "🇪🇨", name: "Ecuador" },
  { cc: "+591", flag: "🇧🇴", name: "Bolivia" },
  { cc: "+595", flag: "🇵🇾", name: "Paraguay" },
  { cc: "+598", flag: "🇺🇾", name: "Uruguay" },
  { cc: "+502", flag: "🇬🇹", name: "Guatemala" },
  { cc: "+503", flag: "🇸🇻", name: "El Salvador" },
  { cc: "+504", flag: "🇭🇳", name: "Honduras" },
  { cc: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { cc: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { cc: "+507", flag: "🇵🇦", name: "Panamá" },
  { cc: "+809", flag: "🇩🇴", name: "Rep. Dominicana" },
];

const DEFAULT_CC = "+52";
// Ladas de más largas a más cortas: así "+593" gana sobre "+59"/"+5" al parsear.
const CC_BY_LENGTH = COUNTRY_CODES.map((c) => c.cc).sort((a, b) => b.length - a.length);

/** Divide un valor almacenado en { cc, national }. Tolera números viejos sin lada. */
export function parsePhone(value) {
  const v = String(value || "").trim();
  if (!v) return { cc: DEFAULT_CC, national: "" };
  if (v.startsWith("+")) {
    const match = CC_BY_LENGTH.find((cc) => v.startsWith(cc));
    if (match) return { cc: match, national: v.slice(match.length).replace(/\D/g, "") };
    // "+" con lada desconocida: separa por el primer espacio.
    const [head, ...rest] = v.split(" ");
    return { cc: head, national: rest.join("").replace(/\D/g, "") };
  }
  return { cc: DEFAULT_CC, national: v.replace(/\D/g, "") };
}

/** Une lada + número al formato almacenado; vacío si no hay número. */
export function joinPhone(cc, national) {
  const digits = String(national || "").replace(/\D/g, "");
  return digits ? `${cc} ${digits}` : "";
}

export default function PhoneInput({ value, onChange, inputClassName = "", placeholder = "10 dígitos", disabled = false, id }) {
  const { cc, national } = useMemo(() => parsePhone(value), [value]);

  const setCc = (nextCc) => onChange(joinPhone(nextCc, national));
  const setNational = (nextNational) => onChange(joinPhone(cc, nextNational));

  return (
    <div className={`phone-input ${disabled ? "is-disabled" : ""}`}>
      <select
        className="phone-cc"
        value={cc}
        onChange={(e) => setCc(e.target.value)}
        disabled={disabled}
        aria-label="Código de país"
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.cc} value={c.cc}>{c.flag} {c.cc}</option>
        ))}
      </select>
      <input
        id={id}
        className={inputClassName}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={national}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setNational(e.target.value)}
      />
    </div>
  );
}
