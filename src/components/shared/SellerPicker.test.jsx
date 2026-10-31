import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import SellerPicker, { matchSellers } from "./SellerPicker";
import { orgService } from "@/services/orgService";
import { userService } from "@/services/userService";

const ctx = { canCreate: true };
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ canUseFeature: () => ctx.canCreate, showToast: vi.fn() }),
}));

const TEAM = [
  { id: "u1", name: "Vera Vendedora", email: "vera@ot.mx" },
  { id: "u2", name: "José Núñez", email: "jose@ot.mx" },
];

function renderPicker(props = {}) {
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SellerPicker value="" onChange={onChange} {...props} />
    </QueryClientProvider>,
  );
  return onChange;
}

beforeEach(() => {
  ctx.canCreate = true;
  vi.restoreAllMocks();
  vi.spyOn(orgService, "listUsers").mockResolvedValue({ items: TEAM });
});

it("busca por nombre o correo sin importar acentos", () => {
  expect(matchSellers(TEAM, "jose").map((u) => u.id)).toEqual(["u2"]);
  expect(matchSellers(TEAM, "vera@").map((u) => u.id)).toEqual(["u1"]);
  expect(matchSellers(TEAM, "")).toEqual([]);
});

it("si el vendedor ya existe se selecciona de la lista", async () => {
  const onChange = renderPicker();
  fireEvent.change(screen.getByRole("textbox", { name: /Buscar vendedor/ }), { target: { value: "Vera" } });
  fireEvent.click(await screen.findByRole("button", { name: /Vera Vendedora/ }));
  expect(onChange).toHaveBeenCalledWith("u1", TEAM[0]);
});

it("si no existe ofrece registrarlo con el nombre que se escribió", async () => {
  renderPicker();
  await waitFor(() => expect(orgService.listUsers).toHaveBeenCalled());
  fireEvent.change(screen.getByRole("textbox", { name: /Buscar vendedor/ }), { target: { value: "Ana Pérez" } });
  fireEvent.click(await screen.findByRole("button", { name: /registrar «Ana Pérez»/ }));
  expect(screen.getByRole("group", { name: "Registrar vendedor" })).toBeTruthy();
  expect(screen.getByDisplayValue("Ana Pérez")).toBeTruthy();
});

it("un correo que ya es del equipo no crea un duplicado: asigna al existente", async () => {
  const create = vi.spyOn(userService, "create");
  const onChange = renderPicker();
  await waitFor(() => expect(orgService.listUsers).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: /Nuevo/ }));
  const group = screen.getByRole("group", { name: "Registrar vendedor" });
  fireEvent.change(group.querySelector('input[type="email"]'), { target: { value: "VERA@ot.mx" } });
  expect(screen.getByRole("status").textContent).toContain("Vera Vendedora");
  fireEvent.click(screen.getByRole("button", { name: "Usar a Vera Vendedora" }));
  expect(onChange).toHaveBeenCalledWith("u1", TEAM[0]);
  expect(create).not.toHaveBeenCalled();
});

it("sin permiso de equipo no ofrece el alta", async () => {
  ctx.canCreate = false;
  renderPicker();
  await waitFor(() => expect(orgService.listUsers).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: /Nuevo/ })).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: /Buscar vendedor/ }), { target: { value: "Nadie" } });
  expect(await screen.findByText(/Pide a un administrador/)).toBeTruthy();
});
