import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AmountInput, { cleanAmount, formatAmount } from "./AmountInput";

describe("formatAmount / cleanAmount", () => {
  it("agrupa miles con comas y conserva el decimal mientras se escribe", () => {
    expect(formatAmount("1250000")).toBe("1,250,000");
    expect(formatAmount("1250000.5")).toBe("1,250,000.5");
    expect(formatAmount("1250000.")).toBe("1,250,000.");
    expect(formatAmount(450000)).toBe("450,000");
    expect(formatAmount("")).toBe("");
  });

  it("limpia comas, letras, ceros a la izquierda y decimales de más", () => {
    expect(cleanAmount("1,250,000.507")).toBe("1250000.50");
    expect(cleanAmount("$ 00450")).toBe("450");
    expect(cleanAmount("12.3.4")).toBe("12.34");
    expect(cleanAmount("99.9", 0)).toBe("99");
  });
});

describe("AmountInput", () => {
  function Controlled({ onValue }) {
    const [value, setValue] = useState("");
    return <AmountInput aria-label="Importe" value={value} onChange={(event) => { setValue(event.target.value); onValue(event.target.value); }} />;
  }

  it("muestra la cantidad con separadores y entrega el número limpio", () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByLabelText("Importe");
    fireEvent.change(input, { target: { value: "1500000" } });
    expect(input).toHaveValue("1,500,000");
    expect(onValue).toHaveBeenLastCalledWith("1500000");
    fireEvent.change(input, { target: { value: "1,500,000.25" } });
    expect(input).toHaveValue("1,500,000.25");
    expect(onValue).toHaveBeenLastCalledWith("1500000.25");
  });
});
