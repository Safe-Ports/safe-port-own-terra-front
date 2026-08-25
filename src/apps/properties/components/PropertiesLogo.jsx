function PropertiesLogo({ className = "", compact = false, title = "OwnTerra Properties" }) {
  return (
    <span className={`properties-logo ${compact ? "is-compact" : ""} ${className}`.trim()} aria-label={title} role="img">
      <img src="/icons/app-properties.png" alt="" aria-hidden="true" />
      {!compact ? <span><strong>OWN<span>TERRA</span></strong><small>PROPERTIES</small></span> : null}
    </span>
  );
}

export default PropertiesLogo;
