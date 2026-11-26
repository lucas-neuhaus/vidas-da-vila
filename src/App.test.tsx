import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "./App";
import { VolunteerForm } from "./VolunteerForm";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("keeps the theme preference and renders the catalog received from the API", async () => {
  window.history.replaceState(null, "", "/#/projetos");
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
    slug: "example", title: "Projeto de teste", description: "Descrição", status: "active", label: "Ativo",
  }])));
  vi.stubGlobal("fetch", fetch);
  const { unmount } = render(<App />);
  expect(await screen.findByRole("heading", { name: "Projeto de teste" })).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith("/api/projects", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Modo escuro" }));
  expect(document.documentElement.dataset.tema).toBe("escuro");
  unmount();
  render(<App />);
  expect(screen.getByRole("button", { name: "Modo claro" }).getAttribute("aria-pressed")).toBe("true");
});

test("allows a failed catalog request to be retried", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network"))
    .mockResolvedValueOnce(new Response("[]")));
  window.history.replaceState(null, "", "/#/projetos");
  render(<App />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  expect(await screen.findByText("Nenhum projeto disponível.")).toBeTruthy();
});

test("formats values and submits a volunteer through the shared form", async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<VolunteerForm action="Cadastrar" onSave={save} />);
  const values = {
    "Nome completo": "Pessoa Exemplo", Email: "voluntaria@example.org",
    "Data de nascimento": "1990-03-15", CPF: "12345678909", Telefone: "48912345678",
    CEP: "88000000", "Endereço (rua e número)": "Rua de Exemplo, 42", Cidade: "Florianópolis",
    Estado: "SC", "Por que quer ser voluntário?": "Gostaria de ajudar nas atividades da comunidade.",
  };
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  const button = screen.getByRole("button", { name: "Cadastrar" });
  const form = button.closest("form")!;
  expect(within(form).getByLabelText<HTMLInputElement>("CPF").value).toBe("123.456.789-09");
  fireEvent.submit(form);
  expect(save).toHaveBeenCalledWith(expect.objectContaining({
    cpf: "123.456.789-09", telefone: "(48) 91234-5678", cep: "88000-000",
  }));
  expect(await screen.findByRole("button", { name: "Cadastrar" })).toBeTruthy();
});
