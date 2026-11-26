import { expect, test } from "@playwright/test";

const token = process.env.ADMIN_API_TOKEN;
const testCpf = "98765432100";

test("navigates the mobile site and closes the donation dialog with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Quem nós somos" })).toBeVisible();
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(page.getByRole("link", { name: "Projetos", exact: true })).toBeHidden();
  await menu.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Modo escuro" })).toBeFocused();
  await menu.click();
  await page.getByRole("link", { name: "Projetos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cestas Solidárias" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const trigger = page.getByRole("button", { name: "Ver orientações para doação" });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("registers, reloads, edits and deletes a volunteer through the UI", async ({ page, request }) => {
  if (!token || !process.env.DATABASE_URL?.split("?")[0].endsWith("_test")) {
    throw new Error("Configure ADMIN_API_TOKEN e um banco dedicado com nome terminado em _test.");
  }
  const headers = { Authorization: `Bearer ${token}` };
  async function cleanupPreviousRun() {
    const response = await request.get("/api/admin/volunteers?limit=100", { headers });
    expect(response.ok()).toBeTruthy();
    const records: { id: string; nome: string }[] = await response.json();
    for (const record of records.filter((item) => item.nome === "Pessoa Teste Navegador")) {
      const details = await request.get(`/api/admin/volunteers/${record.id}`, { headers });
      if ((await details.json()).cpf === testCpf) {
        await request.delete(`/api/admin/volunteers/${record.id}`, { headers });
      }
    }
  }

  await cleanupPreviousRun();
  try {
    await page.goto("/#/cadastro");
    const form = page.locator("form");
    await form.getByLabel("Nome completo").fill("Pessoa Teste Navegador");
    await form.getByLabel("Email").fill("navegador@example.org");
    await form.getByLabel("Data de nascimento").fill("1990-03-15");
    await form.getByLabel("CPF").fill(testCpf);
    await form.getByLabel("Telefone").fill("48912345678");
    await form.getByLabel("CEP").fill("88000000");
    await form.getByLabel("Endereço (rua e número)").fill("Rua de Exemplo, 42");
    await form.getByLabel("Cidade").fill("Florianópolis");
    await form.getByLabel("Estado").selectOption("SC");
    await form.getByLabel("Por que quer ser voluntário?").fill("Gostaria de apoiar as atividades da comunidade.");
    await form.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByText("Solicitação de cadastro recebida.")).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Voluntários cadastrados:/)).toBeVisible();

    await page.getByRole("link", { name: "Área administrativa" }).click();
    await page.getByLabel("Token administrativo").fill("invalid-token");
    await page.getByRole("button", { name: "Acessar" }).click();
    await expect(page.getByRole("alert")).toHaveText("Credencial administrativa inválida.");
    await page.getByLabel("Token administrativo").fill(token);
    await page.getByRole("button", { name: "Acessar" }).click();
    await page.getByRole("button", { name: "Pessoa Teste Navegador" }).click();
    await expect(form.getByLabel("Cidade")).toHaveValue("Florianópolis");
    await form.getByLabel("Cidade").fill("São José");
    let allowSave = () => {};
    const saveGate = new Promise<void>((resolve) => { allowSave = resolve; });
    await page.route("**/api/admin/volunteers/*", async (route) => {
      if (route.request().method() === "PUT") await saveGate;
      await route.continue();
    });
    try {
      await form.getByRole("button", { name: "Salvar alterações" }).click();
      await expect(page.getByRole("button", { name: "Sair" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Voltar à lista" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Excluir cadastro" })).toBeDisabled();
    } finally {
      allowSave();
    }
    await expect(page.getByText("Cadastro atualizado.")).toBeVisible();
    await page.getByRole("button", { name: "Voltar à lista" }).click();
    await page.getByRole("button", { name: "Pessoa Teste Navegador" }).click();
    await expect(form.getByLabel("Cidade")).toHaveValue("São José");
    await page.getByRole("button", { name: "Excluir cadastro" }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await expect(page.getByText("Cadastro excluído.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pessoa Teste Navegador" })).toHaveCount(0);
  } finally {
    await cleanupPreviousRun();
  }
});

test("aligns the header and project cards and exposes the registration link", async ({ page }) => {
  await page.goto("/#/projetos");
  const cards = page.getByRole("article");
  await expect(cards).toHaveCount(3);
  const theme = page.getByRole("button", { name: "Modo escuro" });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const content = (await page.getByRole("main").boundingBox())!;
    const brand = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const themeBox = (await theme.boundingBox())!;
    expect(brand.x).toBeGreaterThan(content.x);
    expect(themeBox.x + themeBox.width).toBeLessThanOrEqual(content.x + content.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  for (const card of await cards.all()) {
    const statusBeforeTitle = await card.evaluate((element) => {
      const status = element.querySelector(".badge")!.getBoundingClientRect();
      const title = element.querySelector("h3")!.getBoundingClientRect();
      return status.bottom <= title.top;
    });
    expect(statusBeforeTitle).toBe(true);
  }
  await theme.click();
  const registration = page.getByRole("link", { name: "Quero me cadastrar como voluntário" });
  await expect(registration).toHaveCSS("color", "rgb(255, 255, 255)");
  await registration.click();
  await expect(page.getByRole("heading", { name: "Formulário de Cadastro" })).toBeVisible();
});
