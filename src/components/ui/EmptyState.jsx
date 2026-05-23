function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-6 py-10 text-center shadow-soft">
      <div className="text-5xl opacity-30">{icon}</div>
      <div className="font-['Playfair_Display'] text-xl text-[#1A1410]">{title}</div>
      <div className="max-w-[280px] text-sm leading-6 text-[#8C8070]">{description}</div>
      {action || null}
    </div>
  );
}

export default EmptyState;
