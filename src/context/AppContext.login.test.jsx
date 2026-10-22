import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppProvider, useAppContext } from "./AppContext";

// Todas las queries de datos (clientes, fraccionamientos, contratos...) se disparan
// en cuanto currentUser existe — hay que darles algo que resolver, aunque esta
// prueba no las use, o React Query se queda colgado esperando.
vi.mock("@/services/clientService", () => ({ clientService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/inmuebleService", () => ({ inmuebleService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/lotService", () => ({ lotService: {} }));
vi.mock("@/services/contractService", () => ({ contractService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/paymentService", () => ({ paymentService: { list: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock("@/services/documentService", () => ({
  documentService: { list: vi.fn().mockResolvedValue({ items: [] }) },
  filenameForDocument: vi.fn(),
  toBackendEntityType: vi.fn(),
}));
vi.mock("@/services/notificationService", () => ({ notificationService: { unreadCount: vi.fn().mockResolvedValue(0) } }));
vi.mock("@/services/appointmentService", () => ({ appointmentService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("@/services/folderService", () => ({ folderService: {} }));

const apiPost = vi.fn();
const apiGet = vi.fn();
// `api.js` es el dueño de los tokens: `startSession` los guarda al iniciar sesión
// y `readSessionTokens` los relee al persistir el perfil. El mock los implementa
// de verdad contra localStorage —no como no-ops— porque justamente lo que se
// prueba acá es qué termina guardado en la sesión.
const SESSION_KEY = "lm_session";
vi.mock("@/services/api", () => ({
  default: { post: (...a) => apiPost(...a), get: (...a) => apiGet(...a) },
  startSession: ({ access_token, refresh_token }) => {
    const previa = JSON.parse(window.localStorage.getItem("lm_session") || "null") || {};
    window.localStorage.setItem(
      "lm_session",
      JSON.stringify({ ...previa, token: access_token, refresh_token })
    );
  },
  readSessionTokens: () => {
    const s = JSON.parse(window.localStorage.getItem("lm_session") || "null");
    return s?.token ? { token: s.token, refresh_token: s.refresh_token } : null;
  },
  replaceSessionTokens: vi.fn(),
}));

function Probe() {
  const { currentUser, login } = useAppContext();
  return (
    <div>
      <button onClick={() => login({ identifier: "a@b.com", password: "x", remember: true })}>login</button>
      <div data-testid="tours-seen">{JSON.stringify(currentUser?.tours_seen ?? "sin-currentUser")}</div>
    </div>
  );
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppProvider>
          <Probe />
        </AppProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sesión: tours_seen debe sobrevivir al login", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiPost.mockReset();
    apiGet.mockReset();
    apiGet.mockResolvedValue({ data: { user: {}, organization: null } });
  });

  it("el login trae los tours ya vistos del servidor, no los descarta", async () => {
    // Escenario real reportado: un usuario terminó/saltó el tour de bienvenida (el
    // servidor ya tiene tours_seen: ["ecosistema"]), cierra sesión y vuelve a entrar.
    // Si el login arma la sesión local SIN copiar ese campo, tours_seen queda
    // `undefined`, y el efecto de auto-lanzar la bienvenida (que solo se fija en la
    // sesión local, no vuelve a preguntarle al servidor) lo interpreta como "nunca
    // visto" — el tour reaparece de la nada, aunque el usuario ya lo había hecho.
    apiPost.mockResolvedValue({
      data: {
        access_token: "tok",
        refresh_token: "ref",
        user: {
          id: 1,
          name: "Ana",
          email: "a@b.com",
          role: "admin",
          apps: [],
          permissions: [],
          tours_seen: ["ecosistema"],
        },
        organization: { id: 1, name: "Org" },
      },
    });

    renderApp();
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByText("login"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("tours-seen").textContent).toBe(JSON.stringify(["ecosistema"]))
    );
  });
});
