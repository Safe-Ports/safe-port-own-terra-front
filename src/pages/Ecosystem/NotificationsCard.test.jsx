import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/test/mocks/server";
import NotificationsCard from "./NotificationsCard.jsx";

const API = "http://127.0.0.1:8000/api/v1";
const now = new Date().toISOString();

function renderCard() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NotificationsCard />
    </QueryClientProvider>
  );
}

describe("Notificaciones de Mi Día", () => {
  it("lista las notificaciones y las marca como leídas", async () => {
    let items = [
      { id: "n1", type: "contract", title: "Contrato por aprobar", body: "Lote A-01", is_read: false, created_at: now, relative_time: "hace 5 min" },
      { id: "n2", type: "payment", title: "Pago registrado", body: null, is_read: true, created_at: now, relative_time: "hace 1 h" },
    ];
    const marked = [];
    server.use(
      http.get(`${API}/notifications`, () =>
        HttpResponse.json({ items, total: items.length, unread_count: items.filter((n) => !n.is_read).length })),
      http.patch(`${API}/notifications/:id/read`, ({ params }) => {
        marked.push(params.id);
        items = items.map((n) => (n.id === params.id ? { ...n, is_read: true } : n));
        return HttpResponse.json({ ok: true });
      }),
    );

    renderCard();

    expect(await screen.findByText("Contrato por aprobar")).toBeInTheDocument();
    expect(screen.getByText("Pago registrado")).toBeInTheDocument();
    expect(screen.getByText("Hoy")).toBeInTheDocument();
    expect(screen.getByText(/1 sin leer/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Marcar como leída: Contrato por aprobar" }));
    await waitFor(() => expect(marked).toEqual(["n1"]));
    await waitFor(() => expect(screen.queryByText("Marcar todas como leídas")).not.toBeInTheDocument());
  });

  it("sin notificaciones lo dice en vez de quedar vacío", async () => {
    server.use(http.get(`${API}/notifications`, () => HttpResponse.json({ items: [], total: 0, unread_count: 0 })));
    renderCard();
    expect(await screen.findByText("No tienes notificaciones.")).toBeInTheDocument();
  });
});
