/* Sprite de iconos de marca + navegación (propuesta Aurora) */
function EcoSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      {/* LANDS */}
      <symbol id="eco-g-lands" viewBox="0 0 56 56">
        <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinejoin="round">
          <rect x="13" y="14" width="13" height="11" rx="2.5" />
          <rect x="30" y="14" width="13" height="14" rx="2.5" />
          <rect x="13" y="29" width="13" height="13" rx="2.5" />
          <rect x="30" y="32" width="13" height="10" rx="2.5" />
        </g>
        <circle cx="36.5" cy="20.5" r="2.6" fill="#fff" />
      </symbol>
      {/* NEIGHBORHOODS */}
      <symbol id="eco-g-neighb" viewBox="0 0 56 56">
        <g fill="#fff">
          <rect x="13" y="24" width="10" height="18" rx="2" />
          <rect x="24" y="14" width="10" height="28" rx="2" />
          <rect x="35" y="29" width="9" height="13" rx="2" />
        </g>
        <g fill="#1E3D2B" opacity=".32">
          <rect x="16" y="28" width="2.6" height="2.6" rx=".6" /><rect x="20" y="28" width="2.6" height="2.6" rx=".6" />
          <rect x="16" y="33" width="2.6" height="2.6" rx=".6" /><rect x="20" y="33" width="2.6" height="2.6" rx=".6" />
          <rect x="27" y="18" width="2.6" height="2.6" rx=".6" /><rect x="31" y="18" width="2.6" height="2.6" rx=".6" />
          <rect x="27" y="23" width="2.6" height="2.6" rx=".6" /><rect x="31" y="23" width="2.6" height="2.6" rx=".6" />
          <rect x="27" y="28" width="2.6" height="2.6" rx=".6" /><rect x="31" y="28" width="2.6" height="2.6" rx=".6" />
          <rect x="37.6" y="33" width="2.6" height="2.6" rx=".6" />
        </g>
      </symbol>
      {/* HOMES */}
      <symbol id="eco-g-homes" viewBox="0 0 56 56">
        <g fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 41 V30 H22 V23 H30 V41" />
          <line x1="11" y1="41" x2="33" y2="41" />
          <line x1="39" y1="13" x2="39" y2="41" />
          <line x1="39" y1="16" x2="23" y2="16" />
          <line x1="39" y1="16" x2="43" y2="16" />
          <line x1="27" y1="16" x2="27" y2="21" />
        </g>
        <rect x="24.2" y="21" width="5.6" height="4.4" rx="1.2" fill="#fff" />
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
      <symbol id="eco-brand" viewBox="0 0 24 24"><path d="M3 21L12 3L21 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M7 15H17" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="10" r="1.6" fill="#fff" /></symbol>
    </svg>
  );
}

export default EcoSprite;
