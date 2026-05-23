function StatCard({ variant = "k1", icon, value, label, sublabel }) {
  return (
    <div className={`kpi ${variant}`}>
      <div className="kpi-ico">{icon}</div>
      <div className="kpi-val">{value}</div>
      <div className="kpi-lbl">{label}</div>
      {sublabel ? <div className="kpi-sub">{sublabel}</div> : null}
    </div>
  );
}

export default StatCard;
