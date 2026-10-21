function Checkbox({ id, checked, onChange, required = false, children }) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-xs leading-5 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-forest focus:ring-forest"
      />
      <span>{children}</span>
    </label>
  );
}

export default Checkbox;
