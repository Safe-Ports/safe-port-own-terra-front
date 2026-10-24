import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PostCard from "./PostCard";

const post = { id: "a1", title: "Corte de agua el sábado", body: "De 9:00 a 13:00.", audience: "all", is_urgent: false, published_at: "2026-10-14T10:00:00Z", reaction_counts: { like: 2 }, my_reaction: null, comment_count: 1, comments: [{ id: "k1", body: "Gracias por avisar", created_at: "2026-10-14T11:00:00Z", author: { name: "Pedro Ruiz", unit_label: "Depto 301" } }] };

describe("PostCard", () => {
  it("a neighbor reacts, picks another reaction and comments", async () => {
    const onReact = vi.fn(); const onComment = vi.fn(async () => {});
    render(<PostCard post={post} communityName="Jacarandas" onReact={onReact} onComment={onComment}/>);
    const card = screen.getByRole("article", { name: "Corte de agua el sábado" });
    expect(within(card).getByText("Pedro R. · Depto 301")).toBeInTheDocument();
    expect(within(card).getByText("2 vecinos")).toBeInTheDocument();

    fireEvent.click(within(card).getByRole("button", { name: "Me gusta" }));
    expect(onReact).toHaveBeenLastCalledWith("like");
    fireEvent.click(within(card).getByRole("button", { name: "Más reacciones" }));
    fireEvent.click(within(card).getByRole("button", { name: "Me encanta" }));
    expect(onReact).toHaveBeenLastCalledWith("love");

    fireEvent.click(within(card).getByRole("button", { name: "Publicar comentario" }));
    expect(onComment).not.toHaveBeenCalled();
    fireEvent.change(within(card).getByLabelText("Comentar en Corte de agua el sábado"), { target: { value: "Enterada, gracias" } });
    fireEvent.click(within(card).getByRole("button", { name: "Publicar comentario" }));
    await waitFor(() => expect(onComment).toHaveBeenCalledWith("Enterada, gracias"));
  });

  it("the admin sees reads and can hide a neighbor's comment, but not react", () => {
    const onHide = vi.fn();
    render(<PostCard post={{ ...post, read_count: 12 }} mode="staff" onComment={vi.fn()} onHideComment={onHide}/>);
    expect(screen.getByText(/12 lecturas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Me gusta" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ocultar/ }));
    expect(onHide).toHaveBeenCalledWith("k1", true);
  });
});
