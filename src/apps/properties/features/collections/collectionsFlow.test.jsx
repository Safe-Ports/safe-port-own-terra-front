import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentReviewPanel from "./PaymentReviewPanel";
import ReportPaymentSheet from "./ReportPaymentSheet";

const mocks = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("@/context/AppContext", () => ({ useAppContext: () => ({ showToast: mocks.showToast }) }));

const wrap = (ui) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const charges = [
  { id: "c1", concept: "Cuota de octubre", amount: "1850.00", paid_amount: "0", currency: "MXN", due_date: "2026-10-11" },
  { id: "c2", concept: "Cuota de noviembre", amount: "1850.00", paid_amount: "0", currency: "MXN", due_date: "2026-11-11" },
];

// Vista previa (COLLECTIONS_API_READY = false): el reporte viaja por localStorage.
describe("cobranza con comprobante · vista previa", () => {
  beforeEach(() => { window.localStorage.clear(); mocks.showToast.mockReset(); });

  it("the resident reports a payment with evidence and it lands in the admin inbox", async () => {
    const onDone = vi.fn();
    wrap(<ReportPaymentSheet charges={charges} initialChargeIds={["c1"]} context={{ personaName: "Laura Méndez", propertyLabel: "Casa 202" }} onClose={() => {}} onDone={onDone}/>);
    const dialog = screen.getByRole("dialog", { name: "Reportar un pago" });
    expect(within(dialog).getByLabelText("Monto pagado")).toHaveValue("1850.00");

    fireEvent.click(within(dialog).getByRole("checkbox", { name: /Cuota de noviembre/ }));
    expect(within(dialog).getByLabelText("Monto pagado")).toHaveValue("3700.00");

    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar comprobante" }));
    expect(within(dialog).getByText("Adjunta la foto o PDF de tu comprobante.")).toBeInTheDocument();

    const evidence = new File(["fake-image"], "comprobante.png", { type: "image/png" });
    fireEvent.change(within(dialog).getByTestId("payment-evidence-input"), { target: { files: [evidence] } });
    fireEvent.change(within(dialog).getByLabelText(/Referencia/), { target: { value: "0045821" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Enviar comprobante" }));

    await waitFor(() => expect(screen.getByRole("dialog", { name: "Recibimos tu comprobante" })).toBeInTheDocument());
    expect(onDone).toHaveBeenCalled();
    const stored = JSON.parse(window.localStorage.getItem("ownterra_preview_payment_reports"));
    expect(stored[0]).toMatchObject({ status: "submitted", amount: 3700, charge_ids: ["c1", "c2"], reference: "0045821", persona_name: "Laura Méndez" });
  });

  it("the admin rejects with a reason, and confirming needs an amount", async () => {
    window.localStorage.setItem("ownterra_preview_payment_reports", JSON.stringify([
      { id: "r1", status: "submitted", charge_ids: ["c1"], amount: 1850, currency: "MXN", paid_on: "2026-10-12", method: "transfer", reference: "0045821", persona_name: "Laura Méndez", property_label: "Casa 202", charges: [charges[0]], evidence: { filename: "comprobante.png", content_type: "image/png", url: "data:image/png;base64,AAAA" }, created_at: "2026-10-12T18:00:00Z" },
    ]));
    wrap(<PaymentReviewPanel community={{ id: "community-1", name: "Jacarandas" }}/>);
    fireEvent.click(await screen.findByRole("button", { name: /Revisar pago de Laura Méndez/ }));
    const dialog = screen.getByRole("dialog", { name: "Pago de Laura Méndez" });
    expect(within(dialog).getByRole("img", { name: "Comprobante comprobante.png" })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Rechazar/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar comprobante" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Explica al residente");
    fireEvent.change(within(dialog).getByLabelText("Motivo del rechazo"), { target: { value: "No se ve la fecha del depósito." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Rechazar comprobante" }));

    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith(expect.stringContaining("rechazado"), "success"));
    const stored = JSON.parse(window.localStorage.getItem("ownterra_preview_payment_reports"));
    expect(stored[0]).toMatchObject({ status: "rejected", rejection_reason: "No se ve la fecha del depósito." });
    await waitFor(() => expect(screen.getByText(/No hay pagos por revisar/)).toBeInTheDocument());
  });
});
