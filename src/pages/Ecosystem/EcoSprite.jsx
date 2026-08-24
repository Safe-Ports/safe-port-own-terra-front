/* Sprite de iconos de marca + navegación (propuesta Aurora) */
function EcoSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      {/* LANDS — logo de hoja */}
      <symbol id="eco-g-lands" viewBox="0 0 274 297">
        <image href="/icons/app-lands.png" width="274" height="297" />
      </symbol>
      {/* PROPERTIES (internal key: neighb) — logo de casa */}
      <symbol id="eco-g-neighb" viewBox="0 0 282 303">
        <image href="/icons/app-properties.png" width="282" height="303" />
      </symbol>
      {/* HOMES (ahora "OwnTerra Construction") — logo de grúa */}
      <symbol id="eco-g-homes" viewBox="0 0 247 267">
        <image href="/icons/app-construction.png" width="247" height="267" />
      </symbol>
      {/* FINANZAS — logo de gráfica ascendente */}
      <symbol id="eco-g-finanzas" viewBox="0 0 274 300">
        <image href="/icons/app-finanzas.png" width="274" height="300" />
      </symbol>
      {/* nav */}
      <symbol id="eco-n-grid" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></g></symbol>
      <symbol id="eco-n-vault" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="5" x2="12" y2="9" /></g></symbol>
      <symbol id="eco-n-users" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0111 0" /><path d="M16 6.5a3 3 0 010 6M17 20a5.5 5.5 0 00-3-4.9" /></g></symbol>
      <symbol id="eco-n-chart" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="20" y2="20" /><rect x="6" y="11" width="3.5" height="6" rx="1" /><rect x="14.5" y="7" width="3.5" height="10" rx="1" /></g></symbol>
      <symbol id="eco-n-calendar" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M8 3v4M16 3v4M3 10h18" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></g></symbol>
      <symbol id="eco-n-shield" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></g></symbol>
      <symbol id="eco-n-gear" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></g></symbol>
      <symbol id="eco-n-sun" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g></symbol>
      <symbol id="eco-n-forms" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></g></symbol>
      <symbol id="eco-n-box" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></g></symbol>
      <symbol id="eco-n-warning" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4 3 20h18L12 4z" /><line x1="12" y1="10" x2="12" y2="14" /><line x1="12" y1="17" x2="12" y2="17.01" /></g></symbol>
      <symbol id="eco-n-doc" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" /></g></symbol>
      <symbol id="eco-n-card" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="6" y1="15" x2="10" y2="15" /></g></symbol>
      <symbol id="eco-n-check" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></g></symbol>
      <symbol id="eco-brand" viewBox="0 0 24 24"><path d="M3 21L12 3L21 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M7 15H17" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="10" r="1.6" fill="#fff" /></symbol>
    </svg>
  );
}

export default EcoSprite;
