/**
 * Estado vacío con CTA. Ahora usa tokens (no hex hardcodeado), así que respeta
 * el tema. `action` sigue siendo libre (puedes pasar tu <Button> o <Link>), pero
 * si pasas `ctaLabel` + `onCta` (o `ctaTo`) renderiza un CTA con estilo por
 * defecto para no repetir markup en cada página.
 *
 * `tone` ajusta el color del icono: "empty" (neutro), "success" (todo al día),
 * "warning" (algo requiere atención).
 */
import { Link } from "react-router-dom";

const TONE = {
  empty: "text-forest opacity-30",
  success: "text-leaf",
  warning: "text-danger",
};

const CTA_CLS =
  "inline-flex items-center gap-2 rounded-xl bg-moss px-4 py-2 text-sm font-semibold text-cream shadow-soft transition hover:bg-forest";

function EmptyState({ icon, title, description, action, ctaLabel, onCta, ctaTo, tone = "empty" }) {
  let cta = null;
  if (ctaLabel && ctaTo) cta = <Link to={ctaTo} className={CTA_CLS}>{ctaLabel}</Link>;
  else if (ctaLabel) cta = <button type="button" onClick={onCta} className={CTA_CLS}>{ctaLabel}</button>;

  return (
    <div className="ot-card flex min-h-[240px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className={`text-5xl ${TONE[tone] || TONE.empty}`}>{icon}</div>
      <div className="font-display text-xl text-forest">{title}</div>
      {description ? (
        <div className="max-w-[320px] text-sm leading-6 text-muted">{description}</div>
      ) : null}
      {action || cta || null}
    </div>
  );
}

export default EmptyState;
